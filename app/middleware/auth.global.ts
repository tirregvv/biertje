const publicRoutes = new Set(['/login', '/signup'])

export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()

  if (!loggedIn.value && !publicRoutes.has(to.path)) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
  if (loggedIn.value && publicRoutes.has(to.path)) {
    return navigateTo('/')
  }
})
