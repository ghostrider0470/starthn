import axios from 'axios'

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
 * Uses a plain axios call to /api/contact (the SWA managed function).
 * This intentionally does NOT use the authenticated api.ts instance because:
 * - The function is on the same SWA origin (no base URL needed)
 * - It's a public endpoint (no auth headers)
 */
export async function submitContactForm(data: ContactFormData): Promise<ContactApiResponse> {
  const response = await axios.post<ContactApiResponse>('/api/contact', data)
  return response.data
}
