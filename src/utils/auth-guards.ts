import authService from '@/services/auth.service'
import { redirect } from '@tanstack/react-router'

export function checkFirstTimeSetup() {
  const token = authService.getAccessToken()
  
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      
      // If user needs first-time setup, redirect them
      if (payload.is_first_time_setup === 'true') {
        throw redirect({
          to: '/first-time-setup' as any
        })
      }
    } catch (error) {
      // If it's not a redirect error, log it
      if (!(error instanceof Error && error.message?.includes('redirect'))) {
        console.error('Failed to decode token:', error)
      } else {
        // Re-throw redirect errors
        throw error
      }
    }
  }
}

export function requireAuth() {
  if (!authService.isAuthenticated()) {
    throw redirect({
      to: '/login' as any,
      search: {
        // @ts-ignore route search params
        redirect: window.location.pathname
      }
    })
  }
}