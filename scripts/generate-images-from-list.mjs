#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const args = parseArgs(process.argv.slice(2))
const listPath = resolve(String(args.list ?? 'scripts/image-prompts.example.json'))
const force = Boolean(args.force)

if (args.help) {
  printHelp()
  process.exit(0)
}

if (!existsSync(listPath)) {
  console.error(`List file not found: ${listPath}`)
  process.exit(1)
}

const items = JSON.parse(readFileSync(listPath, 'utf8'))
if (!Array.isArray(items)) {
  console.error('Prompt list must be a JSON array.')
  process.exit(1)
}

for (const item of items) {
  if (!item.prompt || !item.output) {
    console.error('Each prompt item needs "prompt" and "output".')
    process.exit(1)
  }

  const commandArgs = [
    'scripts/generate-image.mjs',
    '--prompt',
    item.prompt,
    '--output',
    item.output,
  ]

  for (const key of ['size', 'quality', 'format', 'compression', 'deployment', 'api-version', 'auth-mode']) {
    if (item[key]) commandArgs.push(`--${key}`, String(item[key]))
  }

  if (force) commandArgs.push('--force')

  const result = spawnSync(process.execPath, commandArgs, {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
  })

  if (result.status !== 0) process.exit(result.status ?? 1)
}

function parseArgs(argv) {
  const parsed = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith('--')) {
      console.error(`Unknown positional argument: ${arg}`)
      process.exit(1)
    }
    const key = arg.slice(2)
    if (key === 'help' || key === 'force') {
      parsed[key] = true
      continue
    }
    const value = argv[i + 1]
    if (!value || value.startsWith('--')) {
      console.error(`Missing value for --${key}`)
      process.exit(1)
    }
    parsed[key] = value
    i += 1
  }
  return parsed
}

function printHelp() {
  console.log(`
Generate multiple site images from a JSON list.

Usage:
  npm run image:generate-list -- --list scripts/image-prompts.example.json --force

Options:
  --list <path>  JSON file with { "output": "...", "prompt": "..." } items.
  --force        Allow replacing existing files.
`)
}
