// Dev-only: Vite resolves import.meta.glob at build time, creating lazy
// import chunks for every locale file. In production the ASSETS binding is
// used instead. Keeping this in a separate module that is only dynamically
// imported in the dev branch means the 137 locale chunks are never parsed
// at Worker cold-start in production.
export const localeModules = import.meta.glob('/public/locales/**/*.json')
