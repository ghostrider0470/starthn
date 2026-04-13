import { cn } from '@/lib/utils'
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout'
import { useTranslation } from 'react-i18next'
import type { SectionConfig } from '@/hooks/useScrollSections'

interface SideNavigationProps {
    activeSection: string
    scrollToSection: (id: string) => void
    sections: SectionConfig[]
}

export function SideNavigation({
    activeSection,
    scrollToSection,
    sections,
}: SideNavigationProps) {
    const layout = useResponsiveLayout()
    const { t } = useTranslation()

    if (!layout.navVisible) {
        return null
    }

    const activeIndex = Math.max(0, sections.findIndex((s) => s.id === activeSection))
    const progress = sections.length > 0 ? ((activeIndex + 1) / sections.length) * 100 : 0

    return (
        <nav className="fixed right-5 top-1/2 -translate-y-1/2 z-50 hidden md:block">
            <div
                className={cn(
                    'relative overflow-hidden backdrop-blur-md',
                    'py-2 px-3',
                    'bg-card/75 border border-border rounded-xl shadow-sm',
                    'dark:bg-background/85 dark:border-primary/20'
                )}
                style={{
                    boxShadow: 'var(--nav-shadow)',
                }}
            >

                {/* Navigation rows */}
                <div className="relative z-20 flex flex-col">
                    {sections.map(({ id, label }, index) => {
                        const isActive = activeSection === id
                        const num = String(index + 1).padStart(2, '0')

                        return (
                            <button
                                key={id}
                                onClick={() => scrollToSection(id)}
                                className={cn(
                                    'group relative flex items-center gap-1.5 text-left',
                                    'py-1.5 px-2 -mx-1 rounded-lg',
                                    'transition-all duration-300 ease-out',
                                    'whitespace-nowrap',
                                    isActive && 'bg-secondary dark:bg-primary/10'
                                )}
                                aria-label={label}
                            >
                                {/* Active indicator */}
                                {isActive && (
                                    <span
                                        className={cn(
                                            'absolute right-0 top-1 bottom-1 w-[2px] rounded-full',
                                            // Light: solid dark bar
                                            'bg-foreground',
                                            // Dark: glowing primary bar
                                            'dark:bg-primary'
                                        )}
                                        style={{
                                            boxShadow:
                                                'var(--tw-shadow, none)',
                                        }}
                                    />
                                )}

                                {/* Section number — hidden on tablet, visible on lg+ */}
                                <span
                                    className={cn(
                                        'hidden lg:inline',
                                        'text-[10px] tabular-nums shrink-0 transition-colors duration-300',
                                        isActive
                                            ? 'text-foreground dark:text-primary'
                                            : 'text-muted-foreground/60 group-hover:text-muted-foreground dark:text-muted-foreground/60 dark:group-hover:text-muted-foreground'
                                    )}
                                >
                                    {num}
                                </span>

                                {/* Label */}
                                <span
                                    className={cn(
                                        'text-xs uppercase tracking-wide transition-colors duration-300',
                                        isActive
                                            ? 'text-foreground font-semibold dark:text-primary'
                                            : 'text-muted-foreground group-hover:text-foreground dark:text-muted-foreground dark:group-hover:text-foreground'
                                    )}
                                >
                                    {label}
                                </span>
                            </button>
                        )
                    })}
                </div>

                {/* Separator */}
                <div className="relative z-20 mx-1 my-1.5 border-t border-border dark:border-border" />

                {/* Progress bar + counter */}
                <div className="relative z-20 px-1">
                    {/* Progress bar track */}
                    <div className="h-1.5 w-full rounded-full bg-secondary dark:bg-muted/70 overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                                width: `${progress}%`,
                                background: 'linear-gradient(90deg, var(--primary), var(--accent))',
                            }}
                        />
                    </div>

                    {/* Labels row */}
                    <div className="flex items-center justify-between mt-1">
                        <span className="text-[9px] text-muted-foreground/70 dark:text-muted-foreground/60 tracking-widest uppercase">
                            {t('sideNav.scroll')}
                        </span>
                        <span className="text-[9px] text-muted-foreground/70 dark:text-muted-foreground tabular-nums">
                            {activeIndex + 1}/{sections.length}
                        </span>
                    </div>
                </div>
            </div>

            <style>{`
                :root { --nav-shadow: 0 1px 3px oklch(from var(--foreground) l c h / 0.08), 0 4px 12px oklch(from var(--foreground) l c h / 0.04); }
                .dark { --nav-shadow: 0 1px 3px oklch(from var(--foreground) l c h / 0.12), 0 4px 16px oklch(from var(--foreground) l c h / 0.08); }
            `}</style>
        </nav>
    )
}
