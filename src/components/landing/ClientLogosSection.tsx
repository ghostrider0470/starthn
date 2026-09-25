import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FadeIn } from '@/components/animations/FadeIn'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

export type ClientItem = {
  name: string
  logo?: string
  darkLogo?: string
  href?: string
  showLabel?: boolean
}

export function splitClientLogoRows(items: Array<ClientItem>) {
  const mid = Math.ceil(items.length / 2)
  return [items.slice(0, mid), items.slice(mid)] as const
}

const MARQUEE_CSS = `
  @keyframes marquee-left {
    from { transform: translateX(0); }
    to   { transform: translateX(-33.333%); }
  }
  @keyframes marquee-right {
    from { transform: translateX(-33.333%); }
    to   { transform: translateX(0); }
  }
`

/**
 * One client logo. The first marquee copy renders the real (focusable) link;
 * the two copies that only exist to make the loop seamless pass `decorative`
 * and render a hidden, link-free duplicate, so each client URL appears once
 * in the HTML and keyboard/screen-reader users meet each client once.
 */
function ClientCell({
  item,
  decorative = false,
}: {
  item: ClientItem
  decorative?: boolean
}) {
  const { t } = useTranslation('landing')
  const alt = decorative
    ? ''
    : t('clients.logoAlt', {
        name: item.name,
        defaultValue: `${item.name} logo`,
      })
  const openLabel = t('clients.openClient', {
    name: item.name,
    defaultValue: `${item.name} - open client website`,
  })
  const logoClassName =
    'max-h-full max-w-full object-contain transition-opacity duration-300 group-hover:opacity-80'

  const content = (
    <>
      <div className="flex h-14 w-full items-center justify-center px-3">
        {item.logo ? (
          <>
            <img
              src={item.logo}
              alt={alt}
              title={decorative ? undefined : item.name}
              width={200}
              height={56}
              loading="lazy"
              decoding="async"
              className={cn(logoClassName, item.darkLogo && 'dark:hidden')}
            />
            {item.darkLogo && (
              <img
                src={item.darkLogo}
                alt={alt}
                title={decorative ? undefined : item.name}
                width={200}
                height={56}
                loading="lazy"
                decoding="async"
                className={cn(logoClassName, 'hidden dark:block')}
              />
            )}
          </>
        ) : (
          <span className="font-heading text-sm font-bold uppercase tracking-wide text-foreground/70">
            {item.name}
          </span>
        )}
      </div>
      {item.showLabel && (
        <span className="block text-center text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
          {item.name}
        </span>
      )}
    </>
  )

  if (decorative) {
    return (
      <div
        aria-hidden="true"
        className="group block w-44 flex-shrink-0"
        data-client-logo={item.name}
      >
        {content}
      </div>
    )
  }

  if (item.href) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer external"
        aria-label={`${alt}. ${openLabel}`}
        className="group block w-44 flex-shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4"
        data-client-logo={item.name}
      >
        {content}
      </a>
    )
  }

  return (
    <div className="group block w-44 flex-shrink-0" data-client-logo={item.name}>
      {content}
    </div>
  )
}

function MarqueeRow({
  items,
  direction,
  duration,
  paused,
}: {
  items: Array<ClientItem>
  direction: 'left' | 'right'
  duration: number
  paused: boolean
}) {
  // Three copies keep the -33.333% keyframe loop seamless. Only the first
  // copy is interactive; copies 2 and 3 are decorative duplicates.
  return (
    <div className="flex w-max gap-4" style={{
      animation: `marquee-${direction} ${duration}s linear infinite`,
      animationPlayState: paused ? 'paused' : 'running',
    }}>
      {[0, 1, 2].flatMap((copy) =>
        items.map((item, i) => (
          <ClientCell
            key={`${item.name}-${copy * items.length + i}`}
            item={item}
            decorative={copy > 0}
          />
        )),
      )}
    </div>
  )
}

export function ClientLogosSection() {
  const { t } = useTranslation('landing')
  const rawItems = t('clients.items', { returnObjects: true })
  const items: Array<ClientItem> = Array.isArray(rawItems)
    ? (rawItems as Array<ClientItem>)
    : []

  const [paused, setPaused] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const sectionRef = useRef<HTMLElement | null>(null)

  const [row1, row2] = useMemo(() => splitClientLogoRows(items), [items])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    if (!('IntersectionObserver' in window)) {
      setIsActive(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsActive(entry.isIntersecting),
      { threshold: 0.15 },
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      aria-labelledby="clients-heading"
      className="relative overflow-hidden border-y border-border/60 bg-background py-10 md:py-12"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <style>{MARQUEE_CSS}</style>

      <div className={cn(designSystem.spacing.page.container, 'max-w-6xl')}>
        <FadeIn
          as="h2"
          id="clients-heading"
          duration={0.4}
          className="mb-8 text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
        >
          {t('clients.title')}
        </FadeIn>
      </div>

      {/* Edge fade masks */}
      <div
        className="relative"
        style={{
          maskImage:
            'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
        }}
      >
        <div className="mb-5 overflow-hidden">
          <MarqueeRow
            items={row1}
            direction="left"
            duration={28}
            paused={paused || !isActive}
          />
        </div>
        <div className="overflow-hidden">
          <MarqueeRow
            items={row2}
            direction="right"
            duration={22}
            paused={paused || !isActive}
          />
        </div>
      </div>
    </section>
  )
}
