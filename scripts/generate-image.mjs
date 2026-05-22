#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const defaults = {
  apiVersion: '2024-02-01',
  deployment: 'gpt-image-2',
  size: '1024x1024',
  quality: 'low',
  outputCompression: 100,
  outputFormat: 'png',
  n: 1,
}

loadEnvFile('.env')
loadEnvFile('.env.local')

const args = parseArgs(process.argv.slice(2))

if (args.help || !args.prompt && !args['prompt-file']) {
  printHelp()
  process.exit(args.help ? 0 : 1)
}

const prompt = args.prompt ?? readTextFile(args['prompt-file'])
const output = args.output ? resolve(String(args.output)) : resolve(`generated_image.${args.format ?? defaults.outputFormat}`)
const endpoint = normalizeEndpoint(String(args.endpoint ?? process.env.AZURE_OPENAI_ENDPOINT ?? ''))
const deployment = String(args.deployment ?? process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT ?? defaults.deployment)
const apiVersion = String(args['api-version'] ?? process.env.AZURE_OPENAI_API_VERSION ?? defaults.apiVersion)
const apiKey = process.env.AZURE_OPENAI_API_KEY ?? process.env.AZURE_API_KEY
const authMode = String(args['auth-mode'] ?? process.env.AZURE_OPENAI_AUTH_MODE ?? 'bearer').toLowerCase()
const outputFormat = String(args.format ?? defaults.outputFormat)
const force = Boolean(args.force)

if (!endpoint) fail('Missing Azure endpoint. Set AZURE_OPENAI_ENDPOINT or pass --endpoint.')
if (!apiKey) fail('Missing API key. Set AZURE_OPENAI_API_KEY or AZURE_API_KEY in your environment.')
if (existsSync(output) && !force) {
  fail(`Output already exists: ${output}\nPass --force to replace it.`)
}

const requestUrl = `${endpoint}/openai/deployments/${encodeURIComponent(deployment)}/images/generations?api-version=${encodeURIComponent(apiVersion)}`
const headers = {
  'Content-Type': 'application/json',
  ...authHeaders(authMode, apiKey),
}

const body = {
  prompt,
  size: String(args.size ?? defaults.size),
  quality: String(args.quality ?? defaults.quality),
  output_compression: Number(args.compression ?? defaults.outputCompression),
  output_format: outputFormat,
  n: Number(args.n ?? defaults.n),
}

console.log(`Generating image with ${deployment} -> ${output}`)

const response = await fetch(requestUrl, {
  method: 'POST',
  headers,
  body: JSON.stringify(body),
})

const text = await response.text()
let json
try {
  json = JSON.parse(text)
} catch {
  fail(`Azure returned non-JSON response (${response.status}):\n${text}`)
}

if (!response.ok) {
  const message = json?.error?.message ?? JSON.stringify(json, null, 2)
  fail(`Azure image generation failed (${response.status}):\n${message}`)
}

const image = json?.data?.[0]
if (!image) fail(`Azure response did not contain an image:\n${JSON.stringify(json, null, 2)}`)

let bytes
if (image.b64_json) {
  bytes = Buffer.from(image.b64_json, 'base64')
} else if (image.url) {
  const imageResponse = await fetch(image.url)
  if (!imageResponse.ok) fail(`Could not download generated image URL (${imageResponse.status}).`)
  bytes = Buffer.from(await imageResponse.arrayBuffer())
} else {
  fail(`Azure response image did not include b64_json or url:\n${JSON.stringify(image, null, 2)}`)
}

mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, bytes)
console.log(`Wrote ${formatBytes(bytes.length)} to ${output}`)

function parseArgs(argv) {
  const parsed = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith('--')) fail(`Unknown positional argument: ${arg}`)
    const key = arg.slice(2)
    if (key === 'help' || key === 'force') {
      parsed[key] = true
      continue
    }
    const value = argv[i + 1]
    if (!value || value.startsWith('--')) fail(`Missing value for --${key}`)
    parsed[key] = value
    i += 1
  }
  return parsed
}

function loadEnvFile(path) {
  if (!existsSync(path)) return
  const content = readFileSync(path, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    const [, key, rawValue] = match
    if (process.env[key]) continue
    process.env[key] = rawValue.replace(/^["']|["']$/g, '')
  }
}

function readTextFile(path) {
  if (!path) fail('Missing --prompt or --prompt-file.')
  return readFileSync(resolve(String(path)), 'utf8').trim()
}

function normalizeEndpoint(value) {
  return value.replace(/\/+$/, '')
}

function authHeaders(mode, key) {
  if (mode === 'api-key') return { 'api-key': key }
  if (mode === 'bearer') return { Authorization: `Bearer ${key}` }
  fail('--auth-mode must be "bearer" or "api-key".')
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} bytes`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

function printHelp() {
  console.log(`
Generate or replace a site image with Azure OpenAI.

Required:
  AZURE_OPENAI_ENDPOINT  Azure resource endpoint, for example https://...cognitiveservices.azure.com
  AZURE_API_KEY          API key or bearer token. AZURE_OPENAI_API_KEY also works.

Usage:
  npm run image:generate -- --prompt "A professional photo of recycled textile filling" --output src/assets/product_filling.png --force

Options:
  --prompt <text>          Prompt to generate.
  --prompt-file <path>     Read prompt from a text file.
  --output <path>          Output image path. Existing files require --force.
  --force                  Replace an existing output file.
  --endpoint <url>         Azure endpoint. Defaults to AZURE_OPENAI_ENDPOINT.
  --deployment <name>      Deployment name. Default: ${defaults.deployment}
  --api-version <version>  Azure API version. Default: ${defaults.apiVersion}
  --auth-mode <mode>       bearer or api-key. Default: bearer.
  --size <size>            Image size. Default: ${defaults.size}
  --quality <quality>      Quality. Default: ${defaults.quality}
  --compression <number>   Output compression. Default: ${defaults.outputCompression}
  --format <format>        png, jpeg, or webp. Default: ${defaults.outputFormat}
  --n <number>             Number of images to request. The first image is saved.
`)
}
