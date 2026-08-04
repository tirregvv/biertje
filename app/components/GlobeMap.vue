<script setup lang="ts">
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import gsap from 'gsap'

const props = withDefaults(
  defineProps<{
    sessions: { id: string; lat: number; lng: number; displayName: string; drinkType: string; expiresAt: string }[]
    /** The signed-in user's own live location, if geolocation permission has been granted. */
    myLocation?: { lat: number; lng: number } | null
    /** Percentage (0-100) between the map's min and max zoom before country labels appear. */
    countryLabelZoomThreshold?: number
    /** Percentage (0-100) between the map's min and max zoom before continent labels appear. */
    continentLabelZoomThreshold?: number
    /** Fraction (0-1) of this component's own height currently covered by UI docked to the
     * bottom (the drawer sheet) — the globe re-centers into the remaining space instead of
     * treating that covered area as if it were still visible. */
    bottomOverlay?: number
  }>(),
  { myLocation: null, countryLabelZoomThreshold: 15, continentLabelZoomThreshold: 5, bottomOverlay: 0 }
)

const emit = defineEmits<{ (e: 'select', sessionId: string | null): void; (e: 'interact'): void }>()

const config = useRuntimeConfig()
const mapEl = ref<HTMLDivElement | null>(null)
let map: maplibregl.Map | null = null
const markers = new Map<string, maplibregl.Marker>()
let myLocationMarker: maplibregl.Marker | null = null
let rotationFrame: number | null = null
let userInteracted = false
let focusedSessionId: string | null = null
let mapReady = false
let pendingFocusId: string | null = null
let introTween: gsap.core.Tween | null = null

/**
 * Zoom needed for the visible globe sphere to reach a target diameter, as a fraction of container
 * width. This is **empirically calibrated**, not derived from MapLibre's public radius formula
 * (`worldSize / (2*PI)`, from `getGlobeRadiusPixels`) — that formula describes *local* pixel scale
 * at the map center (matching flat/globe zoom levels for tile rendering), not the sphere's overall
 * on-screen silhouette diameter, which is a separate perspective-camera projection question. An
 * earlier version of this function used that formula directly and was measurably wrong (~30-40%
 * too zoomed out), which is what made the intro's resting zoom look too small.
 *
 * Calibrated by rendering a real maplibre-gl globe (no tiles needed — the *sphere's silhouette
 * size* is pure camera/projection geometry, independent of what's drawn on its surface) at a
 * range of zooms and container sizes, and measuring the rendered disc's pixel width directly from
 * screenshots. Diameter scales as `C(height) * 2^zoom` (confirmed independent of container width —
 * only height drives MapLibre's FOV-based scale), and `C(height)` fit a clean `k * ln(height)`
 * curve (k≈21.05) to within ~1% across heights from 400px to 1200px. Solving for zoom:
 *   targetDiameterPx = fillFraction * widthPx = k * ln(heightPx) * 2^zoom
 *   zoom = log2(fillFraction * widthPx / (k * ln(heightPx)))
 */
function fillZoomForSize(widthPx: number, heightPx: number, fillFraction: number) {
  const GLOBE_DIAMETER_CONSTANT = 21.05
  const targetDiameterPx = widthPx * fillFraction
  return Math.log2(targetDiameterPx / (GLOBE_DIAMETER_CONSTANT * Math.log(Math.max(heightPx, 2))))
}

/** Waits (up to timeoutMs) for the geolocation watch in the layout to report a position, so the
 * intro can fly to it instead of sitting on a generic center — but never hangs the intro forever
 * if permission is denied or the fix is slow. */
function waitForLocation(timeoutMs: number): Promise<{ lat: number; lng: number } | null> {
  if (props.myLocation) return Promise.resolve(props.myLocation)
  return new Promise((resolve) => {
    let settled = false
    const stop = watch(
      () => props.myLocation,
      (loc) => {
        if (loc && !settled) {
          settled = true
          stop()
          resolve(loc)
        }
      }
    )
    setTimeout(() => {
      if (!settled) {
        settled = true
        stop()
        resolve(null)
      }
    }, timeoutMs)
  })
}

function startIdleRotation() {
  if (!map) return
  const rotate = () => {
    if (!map || userInteracted) return
    const center = map.getCenter()
    center.lng -= 0.06
    map.setCenter(center)
    rotationFrame = requestAnimationFrame(rotate)
  }
  rotationFrame = requestAnimationFrame(rotate)
}

function stopIdleRotation() {
  if (rotationFrame) cancelAnimationFrame(rotationFrame)
  rotationFrame = null
}

function buildMarkerEl(session: (typeof props.sessions)[number]) {
  const el = document.createElement('button')
  el.className =
    'flex h-10 w-10 items-center justify-center rounded-full border-2 border-amber-300 bg-neutral-900/90 text-lg shadow-lg shadow-black/40 transition-transform active:scale-90'
  el.textContent = DRINK_EMOJI[session.drinkType] ?? '🍻'
  el.title = session.displayName
  el.addEventListener('click', () => flyToSession(session))
  return el
}

/**
 * Markers at (or very near) the same coordinates would otherwise stack exactly on top of each
 * other, leaving only the topmost one clickable. Groups them by rounded coordinate (~11m) and
 * arranges each group in a small pixel-space circle — offsets stay visually constant across zoom
 * levels (unlike a lat/lng nudge), and a small radius keeps them still overlapping a bit as requested.
 */
function computeMarkerOffsets(): Map<string, [number, number]> {
  const groups = new Map<string, (typeof props.sessions)[number][]>()
  for (const session of props.sessions) {
    const key = `${session.lat.toFixed(4)},${session.lng.toFixed(4)}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(session)
  }

  const OFFSET_RADIUS = 9
  const offsets = new Map<string, [number, number]>()
  for (const group of groups.values()) {
    if (group.length === 1) {
      offsets.set(group[0].id, [0, 0])
      continue
    }
    group
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id))
      .forEach((session, i) => {
        const angle = (2 * Math.PI * i) / group.length
        offsets.set(session.id, [Math.round(Math.cos(angle) * OFFSET_RADIUS), Math.round(Math.sin(angle) * OFFSET_RADIUS)])
      })
  }
  return offsets
}

function syncMarkers() {
  if (!map) return
  const offsets = computeMarkerOffsets()
  const seen = new Set<string>()
  for (const session of props.sessions) {
    seen.add(session.id)
    const offset = offsets.get(session.id) ?? [0, 0]
    const existing = markers.get(session.id)
    if (existing) {
      existing.setLngLat([session.lng, session.lat])
      existing.setOffset(offset)
      continue
    }
    const marker = new maplibregl.Marker({ element: buildMarkerEl(session), offset }).setLngLat([session.lng, session.lat]).addTo(map)
    marker.getElement().style.zIndex = '10'
    markers.set(session.id, marker)
  }
  for (const [id, marker] of markers) {
    if (!seen.has(id)) {
      marker.remove()
      markers.delete(id)
    }
  }
}

function syncMyLocationMarker() {
  if (!map) return
  if (!props.myLocation) {
    myLocationMarker?.remove()
    myLocationMarker = null
    return
  }

  if (myLocationMarker) {
    myLocationMarker.setLngLat([props.myLocation.lng, props.myLocation.lat])
    return
  }

  const el = document.createElement('div')
  // Reuses MapLibre's own bundled "blue dot" styling (maplibre-gl.css) instead of a custom marker.
  el.className = 'maplibregl-user-location-dot'
  myLocationMarker = new maplibregl.Marker({ element: el }).setLngLat([props.myLocation.lng, props.myLocation.lat]).addTo(map)
  // Marker stacking follows DOM order, not creation order — pin this behind friend markers explicitly.
  myLocationMarker.getElement().style.zIndex = '0'
}

function flyToSession(session: { id: string; lat: number; lng: number }) {
  if (!map) return
  userInteracted = true

  if (focusedSessionId === session.id) {
    // Second click on the same marker: lose focus — reset the tilt/rotation only, keep the current zoom.
    focusedSessionId = null
    emit('select', null)
    map.flyTo({
      center: map.getCenter(),
      zoom: map.getZoom(),
      pitch: 0,
      bearing: 0,
      duration: 1600,
      easing: (t) => gsap.parseEase('power2.inOut')(t)
    })
    return
  }

  focusedSessionId = session.id
  emit('select', session.id)
  map.flyTo({
    center: [session.lng, session.lat],
    zoom: 17.5,
    pitch: 60,
    duration: 2400,
    easing: (t) => gsap.parseEase('power3.inOut')(t)
  })
}

/**
 * Place labels (OpenMapTiles `place` layer, e.g. `class: country`/`continent`) are hidden until
 * the map is zoomed past a percentage of its min/max zoom range — matched by id/filter since
 * MapTiler's default styles don't expose a stable layer-id convention across style flavors.
 */
function applyPlaceLabelZoomThreshold(classKeyword: string, thresholdPercent: number) {
  if (!map) return
  const style = map.getStyle()
  if (!style?.layers) return

  const minZoom = map.getMinZoom()
  const maxZoom = map.getMaxZoom()
  const targetZoom = minZoom + (maxZoom - minZoom) * (thresholdPercent / 100)

  for (const layer of style.layers as any[]) {
    if (layer.type !== 'symbol' || layer['source-layer'] !== 'place') continue
    const matches =
      layer.id.toLowerCase().includes(classKeyword) ||
      JSON.stringify(layer.filter ?? '').toLowerCase().includes(classKeyword)
    if (matches) {
      map.setLayerZoomRange(layer.id, targetZoom, layer.maxzoom ?? 24)
    }
  }
}

function bottomPaddingPx() {
  return (mapEl.value?.getBoundingClientRect().height ?? 0) * props.bottomOverlay
}

/** Re-centers the visible globe into whatever space is left above the sheet. maplibre's `padding`
 * shifts where a given center coordinate lands on screen without touching the actual geographic
 * center, so this animates smoothly alongside the sheet's own transition instead of jumping. */
function applyBottomOverlay() {
  if (!map) return
  map.easeTo({
    padding: { top: 0, bottom: bottomPaddingPx(), left: 0, right: 0 },
    duration: 320,
    easing: (t) => gsap.parseEase('power2.inOut')(t)
  })
}

function flyToLocation(lat: number, lng: number) {
  if (!map) return
  userInteracted = true
  map.flyTo({ center: [lng, lat], zoom: 16, pitch: 45, duration: 2000, easing: (t) => gsap.parseEase('power3.inOut')(t) })
}

/**
 * Focus a friend's marker from outside the component (e.g. navigating here from the friends
 * page). If the map/intro isn't ready yet, the request is queued and retried once it is, and
 * again whenever the sessions list updates (in case the marker hasn't arrived over WS yet).
 */
function focusSession(sessionId: string) {
  pendingFocusId = sessionId
  tryFocusPending()
}

function tryFocusPending() {
  if (!mapReady || !pendingFocusId) return
  const session = props.sessions.find((s) => s.id === pendingFocusId)
  if (!session) return
  pendingFocusId = null
  flyToSession(session)
}

defineExpose({ flyToLocation, focusSession })

onMounted(() => {
  if (!mapEl.value) return
  if (!config.public.maptilerKey) return

  map = new maplibregl.Map({
    container: mapEl.value,
    style: `https://api.maptiler.com/maps/hybrid/style.json?key=${config.public.maptilerKey}`,
    zoom: 0.4,
    center: [10, 30],
    padding: { top: 0, bottom: bottomPaddingPx(), left: 0, right: 0 },
    attributionControl: false
  })

  map.on('style.load', () => {
    map?.setProjection({ type: 'globe' })
    map?.setSky({
      'sky-color': 'rgb(5, 5, 12)',
      'sky-horizon-blend': 0.5,
      'horizon-color': 'rgb(36, 24, 60)',
      'horizon-fog-blend': 0.6,
      'fog-color': 'rgb(20, 20, 30)',
      'fog-ground-blend': 0.5,
      'atmosphere-blend': 0.8
    })
    applyPlaceLabelZoomThreshold('country', props.countryLabelZoomThreshold)
    applyPlaceLabelZoomThreshold('continent', props.continentLabelZoomThreshold)
  })

  map.on('load', async () => {
    syncMarkers()
    syncMyLocationMarker()

    const startCenter = map.getCenter()
    const startZoom = map.getZoom()

    // Wait briefly for the user's location so the spin actually lands somewhere meaningful — if
    // it never arrives (denied/slow), the spin still plays out and lands back on the start center.
    const location = await waitForLocation(4000)
    if (!map) return // component may have unmounted while we were waiting

    const targetLat = location?.lat ?? startCenter.lat
    const targetLng = location?.lng ?? startCenter.lng
    const mapRect = mapEl.value?.getBoundingClientRect()
    const targetZoom = fillZoomForSize(mapRect?.width ?? 0, mapRect?.height ?? 0, 0.95)

    // A full 360° spin that still lands exactly on the target: travel the shortest-path direction
    // (spinning the globe by moving the center's longitude, same idiom as the idle rotation below —
    // bearing/pitch stay put), but go one extra full revolution around before the final approach.
    // The extra revolution must be added in the shortest path's OWN direction — adding a flat +360
    // regardless of sign can net out to *less* than one full turn when the shortest path is negative
    // (e.g. shortest=-84: naively 360-84=276, not a full spin; going -360-84=-444 the same way is).
    const shortestDelta = (((targetLng - startCenter.lng + 180) % 360) + 360) % 360 - 180
    const spinDirection = shortestDelta < 0 ? -1 : 1
    const spinLng = startCenter.lng + shortestDelta + spinDirection * 360

    const introState = { lng: startCenter.lng, lat: startCenter.lat, zoom: startZoom }
    introTween = gsap.to(introState, {
      lng: spinLng,
      lat: targetLat,
      zoom: targetZoom,
      duration: 3.6,
      ease: 'power2.inOut',
      onUpdate: () => map?.jumpTo({ center: [introState.lng, introState.lat], zoom: introState.zoom }),
      onComplete: () => {
        introTween = null
        startIdleRotation()
        mapReady = true
        tryFocusPending()
      }
    })
  })

  /** Any interaction with the globe — pan/rotate, pinch/scroll zoom, or a marker tap (whose own
   * mousedown bubbles here too) — should get the sheet out of the way, not just marker selection.
   * It should also hand control back immediately rather than fighting the (now several-second)
   * intro spin: an early tap kills the tween in place and unblocks anything waiting on mapReady. */
  const onInteractionStart = () => {
    userInteracted = true
    emit('interact')
    if (!mapReady && introTween) {
      introTween.kill()
      introTween = null
      mapReady = true
      tryFocusPending()
    }
  }
  map.on('mousedown', onInteractionStart)
  map.on('touchstart', onInteractionStart)
  map.on('wheel', onInteractionStart)
})

watch(
  () => props.sessions,
  () => {
    syncMarkers()
    tryFocusPending()
  },
  { deep: true }
)

watch(() => props.myLocation, syncMyLocationMarker, { deep: true })

watch(() => props.bottomOverlay, applyBottomOverlay)

onBeforeUnmount(() => {
  stopIdleRotation()
  myLocationMarker?.remove()
  map?.remove()
})
</script>

<template>
  <!--
    z-0 (not z-index:auto) matters here: it makes this its own stacking context, so a marker's
    z-index:10 (set to keep overlapping markers clickable) stays contained within it instead of
    escaping past this element's un-stacked-context siblings — e.g. the bottom sheet, which would
    otherwise render *behind* an auto-positioned marker despite coming later in the DOM.
  -->
  <div class="relative z-0 h-full w-full">
    <div ref="mapEl" class="h-full w-full" />
    <div
      v-if="!config.public.maptilerKey"
      class="absolute inset-0 flex items-center justify-center bg-neutral-950 px-8 text-center text-sm text-neutral-400"
    >
      Set <code class="rounded bg-white/10 px-1">MAPTILER_KEY</code> in .env to load the globe.
    </div>
  </div>
</template>
