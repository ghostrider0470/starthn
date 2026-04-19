import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

type ClientItem = {
  name: string
  logo?: string
  href?: string
  showLabel?: boolean
}

function ClientCell({ item }: { item: ClientItem }) {
  const content = (
    <>
      <div className="flex h-14 w-full items-center justify-center md:h-16">
        {item.logo ? (
          <img
            src={item.logo}
            alt={`${item.name} — klijent Start HN`}
            title={item.name}
            width={160}
            height={64}
            loading="lazy"
            decoding="async"
            className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="font-heading text-base font-bold uppercase tracking-wide text-foreground">
            {item.name}
          </span>
        )}
      </div>
      {item.showLabel && (
        <span className="text-center text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70 transition-colors group-hover:text-foreground">
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
        aria-label={`${item.name} — otvori u novoj kartici`}
        className="group flex w-full flex-col items-center justify-end gap-2 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background rounded-md"
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
      className="group flex w-full flex-col items-center justify-end gap-2 px-3"
      itemProp="funder"
      itemScope
      itemType="https://schema.org/Organization"
    >
      <meta itemProp="name" content={item.name} />
      {content}
    </div>
  )
}

export function ClientLogosSection() {
  const { t } = useTranslation('landing')
  const rawItems = t('clients.items', { returnObjects: true })
  const items: ClientItem[] = Array.isArray(rawItems) ? (rawItems as ClientItem[]) : []

  return (
    <section
      aria-labelledby="clients-heading"
      className="relative border-y border-border/60 bg-background py-14 md:py-16"
      itemScope
      itemType="https://schema.org/Organization"
    >
      <div className={cn(designSystem.spacing.page.container, 'max-w-6xl')}>
        <motion.h2
          id="clients-heading"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="mb-10 text-center text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground"
        >
          {t('clients.title')}
        </motion.h2>
        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.06 } },
          }}
          className="mx-auto grid max-w-5xl grid-cols-2 items-center gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-5"
        >
          {items.map((item) => (
            <motion.li
              key={item.name}
              variants={{
                hidden: { opacity: 0, y: 8 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center justify-center"
            >
              <ClientCell item={item} />
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  )
}
