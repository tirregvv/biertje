<script setup lang="ts">
const { toasts, dismiss } = useToast()
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 pt-[env(safe-area-inset-top)] px-4 pt-3">
    <TransitionGroup
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <button
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-900/95 px-4 py-3 text-left shadow-lg shadow-black/40 backdrop-blur"
        @click="dismiss(toast.id)"
      >
        <p class="text-sm font-medium">{{ toast.title }}</p>
        <p v-if="toast.body" class="mt-0.5 text-xs text-neutral-400">{{ toast.body }}</p>
      </button>
    </TransitionGroup>
  </div>
</template>
