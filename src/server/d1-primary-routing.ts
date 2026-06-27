export const DEFAULT_D1_PRIMARY_REQUIRED_BINDINGS = ['DB', 'JWT_SECRET'] as const

type EnvLike = Record<string, unknown> | null | undefined

export function isD1PrimaryEnabled(env: EnvLike): boolean {
  return String(env?.D1_PRIMARY ?? '').toLowerCase() === 'true'
}

export function getD1PrimaryMissingBindings(
  env: EnvLike,
  requiredBindings: readonly string[] = DEFAULT_D1_PRIMARY_REQUIRED_BINDINGS,
): string[] {
  if (!isD1PrimaryEnabled(env)) return []
  return requiredBindings.filter((name) => !env?.[name])
}

