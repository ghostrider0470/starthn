export interface ContactFormData {
  name: string
  email: string
  company?: string
  subject: string
  message: string
  turnstileToken: string
}

export interface ContactApiResponse {
  success: boolean
  message: string
  errors?: Record<string, string>
}

/**
 * Uses a plain fetch call to /api/contact (the SWA managed function).
 * This intentionally does NOT use the authenticated api.ts instance because:
 * - The function is on the same SWA origin (no base URL needed)
 * - It's a public endpoint (no auth headers)
 */
export async function submitContactForm(data: ContactFormData): Promise<ContactApiResponse> {
  const apiUrl = import.meta.env.VITE_API_URL || '/api'
  const response = await fetch(`${apiUrl}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Request failed with status ${response.status}`)
  }
  return response.json()
}
