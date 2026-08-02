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
  }>(),
  { myLocation: null, countryLabelZoomThreshold: 15, continentLabelZoomThreshold: 5 }
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

  map.on('load', () => {
    syncMarkers()
    syncMyLocationMarker()

    // Intro: swoop in from a wide starfield view to the resting zoom level.
    const introTarget = { zoom: 0.4 }
    gsap.to(introTarget, {
      zoom: 1.4,
      duration: 2.2,
      ease: 'power2.out',
      onUpdate: () => map?.setZoom(introTarget.zoom),
      onComplete: () => {
        startIdleRotation()
        mapReady = true
        tryFocusPending()
      }
    })
  })

  /** Any interaction with the globe — pan/rotate, pinch/scroll zoom, or a marker tap (whose own
   * mousedown bubbles here too) — should get the sheet out of the way, not just marker selection. */
  const onInteractionStart = () => {
    userInteracted = true
    emit('interact')
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
