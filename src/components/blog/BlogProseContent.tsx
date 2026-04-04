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
  '[&_a]:text-primary [&_a]:underline',
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

export function BlogProseContent({ content, slug, className, dir = 'auto' }: BlogProseContentProps) {
  if (content.length === 1 && content[0].startsWith('<')) {
    return (
      <div
        dangerouslySetInnerHTML={{ __html: content[0] }}
        className={cn(proseStyles, className)}
        dir={dir}
      />
    )
  }

  return (
    <>
      {content.map((paragraph, index) => (
        <p
          key={slug ? `${slug}-${index}` : index}
          className={cn(designSystem.typography.body.base, 'leading-7', className)}
          dir={dir}
        >
          {paragraph}
        </p>
      ))}
    </>
  )
}
