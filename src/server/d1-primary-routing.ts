export function isD1PrimaryEnabled(env: Record<string, unknown>): boolean {
  return env?.D1_PRIMARY === 'true' || env?.D1_PRIMARY === true
}

export function getD1PrimaryMissingBindings(env: Record<string, unknown>): string[] {
  const missing: string[] = []
  if (!env?.DB) missing.push('DB')
  if (!env?.JWT_SECRET) missing.push('JWT_SECRET')
  return missing
}
