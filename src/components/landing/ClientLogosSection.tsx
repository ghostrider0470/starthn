import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

type ClientItem = {
  name: string
  logo?: string
  darkLogo?: string
  href?: string
  showLabel?: boolean
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

function ClientCell({ item }: { item: ClientItem }) {
  const { t } = useTranslation('landing')
  const alt = t('clients.logoAlt', {
    name: item.name,
    defaultValue: `${item.name} logo`,
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
              title={item.name}
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
                title={item.name}
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

  if (item.href) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer external"
        aria-label={t('clients.openClient', {
          name: item.name,
          defaultValue: `${item.name} - open client website`,
        })}
        className="group block w-44 flex-shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4"
        itemProp="funder"
        itemScope
        itemType="https://schema.org/Organization"
      >
        <meta itemProp="name" content={item.name} />
        <meta itemProp="url" content={item.href} />
        {content}
      </a>
    )
  }

  return (
    <div
      className="group block w-44 flex-shrink-0"
      itemProp="funder"
      itemScope
      itemType="https://schema.org/Organization"
    >
      <meta itemProp="name" content={item.name} />
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
  items: ClientItem[]
  direction: 'left' | 'right'
  duration: number
  paused: boolean
}) {
  const tripled = [...items, ...items, ...items]
  return (
    <div className="flex w-max gap-4" style={{
      animation: `marquee-${direction} ${duration}s linear infinite`,
      animationPlayState: paused ? 'paused' : 'running',
    }}>
      {tripled.map((item, i) => (
        <ClientCell key={`${item.name}-${i}`} item={item} />
      ))}
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

  const [row1, row2] = useMemo(() => {
    const arr = [...items]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    const mid = Math.ceil(arr.length / 2)
    // Split into two halves — each row shows different clients simultaneously
    return [arr.slice(0, mid), arr.slice(mid)]
  }, [])

  return (
    <section
      aria-labelledby="clients-heading"
      className="relative overflow-hidden border-y border-border/60 bg-background py-10 md:py-12"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      itemScope
      itemType="https://schema.org/Organization"
    >
      <style>{MARQUEE_CSS}</style>

      <div className={cn(designSystem.spacing.page.container, 'max-w-6xl')}>
        <motion.h2
          id="clients-heading"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="mb-8 text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
        >
          {t('clients.title')}
        </motion.h2>
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
          <MarqueeRow items={row1} direction="left" duration={28} paused={paused} />
        </div>
        <div className="overflow-hidden">
          <MarqueeRow items={row2} direction="right" duration={22} paused={paused} />
        </div>
      </div>
    </section>
  )
}
