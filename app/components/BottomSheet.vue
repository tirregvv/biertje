<script setup lang="ts">
/**
 * Draggable sheet that snaps between named breakpoints (fractions of its own height, e.g.
 * { peek: 0.42, full: 0.94 }). Not tied to any specific content — the header slot renders
 * fixed (non-scrolling) chrome like a settings button, the default slot is the scrollable body.
 */
const props = defineProps<{
  snapPoints: Record<string, number>
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', key: string): void
  (e: 'settled', key: string): void
  (e: 'dragging', isDragging: boolean): void
}>()

const sheetEl = ref<HTMLElement | null>(null)
const contentEl = ref<HTMLElement | null>(null)
const dragging = ref(false)
const dragTranslateY = ref<number | null>(null)

const sortedSnaps = computed(() => Object.entries(props.snapPoints).sort((a, b) => a[1] - b[1]))
const fullKey = computed(() => sortedSnaps.value[sortedSnaps.value.length - 1][0])
const contentScrollable = computed(() => props.modelValue === fullKey.value)

function fractionFor(key: string) {
  return props.snapPoints[key] ?? sortedSnaps.value[0][1]
}

function translateYForFraction(fraction: number, height: number) {
  return height * (1 - fraction)
}

function currentTranslate() {
  const height = sheetEl.value?.getBoundingClientRect().height ?? 0
  return translateYForFraction(fractionFor(props.modelValue), height)
}

function nearestSnapKey(translate: number, height: number) {
  let best = sortedSnaps.value[0][0]
  let bestDist = Infinity
  for (const [key, fraction] of sortedSnaps.value) {
    const dist = Math.abs(translateYForFraction(fraction, height) - translate)
    if (dist < bestDist) {
      bestDist = dist
      best = key
    }
  }
  return best
}

/** Minimum pointer travel, in px, before a press commits to dragging the sheet — below this,
 * the gesture is left alone so ordinary clicks/taps on buttons inside the sheet still fire. */
const DRAG_ENGAGE_THRESHOLD = 8

let pointerId: number | null = null
let origin: 'handle' | 'content' = 'content'
let startX = 0
let startY = 0
let startTranslate = 0
let lastY = 0
let lastT = 0
let velocity = 0
let mode: 'pending' | 'dragging' | 'ignoring' | 'none' = 'none'

/**
 * Tracking is done via window-level listeners rather than relying on the element the press
 * started on (or pointer capture pointed at a different element than the one listening) —
 * otherwise the drag silently stops updating the moment the cursor leaves that element's
 * bounds (e.g. onto the globe), and a release outside it never reaches our pointerup handler,
 * leaving the sheet stuck mid-drag and unresponsive to snap-state changes afterwards.
 */
function beginTracking(e: PointerEvent, from: 'handle' | 'content') {
  pointerId = e.pointerId
  origin = from
  startX = e.clientX
  startY = e.clientY
  lastY = e.clientY
  lastT = performance.now()
  velocity = 0
  startTranslate = dragTranslateY.value ?? currentTranslate()
  mode = 'pending'
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

function endTracking() {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
  pointerId = null
  mode = 'none'
}

/** Handle/header area: always drags, regardless of scroll position — but still waits for the
 * engage threshold so clicking the back/settings buttons that live in the header slot works. */
function onHandlePointerDown(e: PointerEvent) {
  beginTracking(e, 'handle')
}

/** Content area: only drags the sheet when collapsed, or scrolled to top and pulling down. */
function onContentPointerDown(e: PointerEvent) {
  beginTracking(e, 'content')
}

function updateDrag(dy: number) {
  if (!sheetEl.value) return
  const height = sheetEl.value.getBoundingClientRect().height
  const minT = translateYForFraction(sortedSnaps.value[sortedSnaps.value.length - 1][1], height)
  const maxT = translateYForFraction(sortedSnaps.value[0][1], height)
  dragTranslateY.value = Math.min(maxT, Math.max(minT, startTranslate + dy))
}

function engageDrag() {
  mode = 'dragging'
  dragging.value = true
  emit('dragging', true)
}

function onPointerMove(e: PointerEvent) {
  if (pointerId === null || e.pointerId !== pointerId || mode === 'none') return
  const dy = e.clientY - startY

  if (mode === 'pending') {
    const dx = e.clientX - startX
    if (Math.hypot(dx, dy) < DRAG_ENGAGE_THRESHOLD) return

    const scrollTop = contentEl.value?.scrollTop ?? 0
    const shouldDragSheet = origin === 'handle' || !contentScrollable.value || (scrollTop <= 0 && dy > 0)
    if (shouldDragSheet) {
      engageDrag()
    } else {
      mode = 'ignoring'
      return
    }
  }

  if (mode !== 'dragging') return
  e.preventDefault()
  updateDrag(dy)

  const now = performance.now()
  const dt = now - lastT
  if (dt > 0) velocity = (e.clientY - lastY) / dt
  lastY = e.clientY
  lastT = now
}

function settle() {
  if (!sheetEl.value) return
  const height = sheetEl.value.getBoundingClientRect().height
  const current = dragTranslateY.value ?? currentTranslate()
  const VELOCITY_THRESHOLD = 0.5

  let targetKey: string
  const idx = sortedSnaps.value.findIndex(([key]) => key === props.modelValue)
  if (velocity < -VELOCITY_THRESHOLD && idx < sortedSnaps.value.length - 1) {
    targetKey = sortedSnaps.value[idx + 1][0]
  } else if (velocity > VELOCITY_THRESHOLD && idx > 0) {
    targetKey = sortedSnaps.value[idx - 1][0]
  } else {
    targetKey = nearestSnapKey(current, height)
  }

  dragTranslateY.value = null
  dragging.value = false
  emit('dragging', false)
  if (targetKey !== props.modelValue) emit('update:modelValue', targetKey)
  emit('settled', targetKey)
}

function onPointerUp(e: PointerEvent) {
  if (pointerId === null || e.pointerId !== pointerId) return
  if (mode === 'dragging') settle()
  endTracking()
}

onBeforeUnmount(() => {
  if (pointerId !== null) endTracking()
})

const sheetStyle = computed(() => ({
  transform:
    dragTranslateY.value !== null
      ? `translateY(${dragTranslateY.value}px)`
      : `translateY(calc((1 - ${fractionFor(props.modelValue)}) * 100%))`,
  transition: dragging.value ? 'none' : 'transform 320ms cubic-bezier(0.32, 0.72, 0, 1)'
}))
</script>

<template>
  <div
    ref="sheetEl"
    class="absolute inset-0 flex flex-col rounded-t-3xl bg-white text-neutral-900 shadow-[0_-8px_30px_rgba(0,0,0,0.35)]"
    :style="sheetStyle"
  >
    <div
      class="shrink-0 touch-none select-none"
      @pointerdown="onHandlePointerDown"
    >
      <div class="flex justify-center pt-2.5">
        <div class="h-1.5 w-10 rounded-full bg-neutral-300" />
      </div>
      <slot name="header" />
    </div>

    <div
      ref="contentEl"
      class="min-h-0 flex-1 overscroll-contain"
      :class="contentScrollable ? 'overflow-y-auto' : 'overflow-hidden'"
      @pointerdown="onContentPointerDown"
    >
      <slot />
    </div>
  </div>
</template>
