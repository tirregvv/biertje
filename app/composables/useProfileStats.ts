export type ProfileStats = {
  allTimeDrinks: number
  drinksThisWeek: number
  friendsCount: number
}

export function useProfileStats() {
  return useFetch<ProfileStats>('/api/profile/stats', { key: 'profile-stats' })
}
