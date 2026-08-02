/**
 * Best-effort reverse geocode via MapTiler (same key used for the map tiles).
 * Returns null on any failure so callers can degrade gracefully.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const config = useRuntimeConfig()
    const key = config.public.maptilerKey as string
    if (!key) return null

    const url = `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${key}&limit=1`
    const data = await $fetch<{ features?: { place_name?: string }[] }>(url)
    return data.features?.[0]?.place_name ?? null
  } catch {
    return null
  }
}
