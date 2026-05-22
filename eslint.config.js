//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  {
    ignores: [
      'dist/**',
      '.wrangler/**',
      '.agents/**',
      '.claude/**',
      '.codex/**',
    ],
  },
  ...tanstackConfig.map((config) => ({
    ...config,
    rules: {
      ...config.rules,
      'pnpm/json-enforce-catalog': 'off',
    },
  })),
]
