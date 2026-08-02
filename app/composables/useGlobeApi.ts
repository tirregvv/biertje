import type { InjectionKey, Ref } from 'vue'

export type GlobeApi = {
  flyToLocation: (lat: number, lng: number) => void
  focusSession: (sessionId: string) => void
}

const globeApiKey: InjectionKey<Ref<GlobeApi | null>> = Symbol('globeApi')

/**
 * The mounted <GlobeMap>'s exposed methods, shared from the layout (which owns the instance) down
 * to whichever page needs to call them. This is provide/inject, not useState — useState is for
 * serializable app *data*, and this is a live instance handle holding functions; the docs'
 * "must be JSON-serializable" warning on useState rules it out for this on principle, not just
 * because ssr is off here.
 */
export function provideGlobeApi(ref: Ref<GlobeApi | null>) {
  provide(globeApiKey, ref)
}

export function useGlobeApi() {
  const injected = inject(globeApiKey)
  if (!injected) throw new Error('useGlobeApi() called outside the layout that provides it')
  return injected
}
