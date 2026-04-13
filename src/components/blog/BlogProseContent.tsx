import { cn } from '@/lib/utils'
import { designSystem } from '@/lib/design-system'

const proseStyles = cn(
  designSystem.typography.body.base,
  'leading-7',
  '[&_h2]:text-primary [&_h2]:font-bold [&_h2]:text-2xl [&_h2]:mt-8 [&_h2]:mb-3',
  '[&_h3]:text-primary [&_h3]:font-bold [&_h3]:text-xl [&_h3]:mt-6 [&_h3]:mb-2',
  '[&_h4]:text-primary/90 [&_h4]:font-semibold [&_h4]:text-lg [&_h4]:mt-4 [&_h4]:mb-2',
  '[&_p]:my-4 [&_p:empty]:min-h-[1em]',
  '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-4',
  '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-4',
  '[&_li]:my-1',
  '[&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-4',
  '[&_a]:text-primary [&_a]:underline [&_a]:decoration-primary/40 [&_a]:underline-offset-2 [&_a]:hover:text-primary/80',
  '[&_hr]:border-border [&_hr]:my-6',
  '[&_strong]:font-semibold',
  '[&_img]:rounded-lg [&_img]:max-w-full [&_img]:h-auto [&_img]:my-6',
)

interface BlogProseContentProps {
  content: string[]
  slug?: string
  className?: string
  /** Text direction — pass locale-derived 'rtl'/'ltr', or omit for auto-detection */
  dir?: 'rtl' | 'ltr' | 'auto'
}

/** Extract HTML from a single content block (object or string) */
function blockToHtml(item: any): string {
  // Already an object (D1 returns parsed JSON)
  if (typeof item === 'object' && item !== null) {
    if (Array.isArray(item)) return item.map(blockToHtml).join('')
    return item.text ?? item.content ?? item.html ?? ''
  }
  // String handling
  if (typeof item !== 'string') return ''
  if (item.startsWith('<')) return item
  if (item.startsWith('{') || item.startsWith('[')) {
    try { return blockToHtml(JSON.parse(item)) } catch { return item }
  }
  return `<p>${item}</p>`
}

/** Parse content blocks — handles raw HTML, JSON strings, parsed objects, or plain text */
function parseContentToHtml(content: any[]): string {
  return content.map(blockToHtml).join('')
}

export function BlogProseContent({ content, slug, className, dir = 'auto' }: BlogProseContentProps) {
  const html = parseContentToHtml(content)

  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      className={cn(proseStyles, className)}
      dir={dir}
    />
  )
}
