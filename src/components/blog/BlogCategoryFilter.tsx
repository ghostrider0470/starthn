import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Search } from 'lucide-react'
import type { Category } from '@/services/category.service'
import { localizeBlogCategory } from '@/lib/blog-i18n'
import { Badge } from '@/components/ui/badge'
import { designSystem } from '@/lib/design-system'
import { cn } from '@/lib/utils'

const MAX_VISIBLE_PILLS = 8

interface BlogCategoryFilterProps {
  categories: Category[]
  locale: string
  selectedCategory: string
  onSelectCategory: (category: string) => void
  selectedSubcategory?: string
  onSelectSubcategory?: (subcategory: string) => void
}

export function BlogCategoryFilter({
  categories,
  locale,
  selectedCategory,
  onSelectCategory,
  selectedSubcategory = '',
  onSelectSubcategory,
}: BlogCategoryFilterProps) {
  const { t } = useTranslation('blog')
  const [showAll, setShowAll] = useState(false)
  const [catSearch, setCatSearch] = useState('')

  const topLevelCategories = categories.filter((c) => !c.parentId)

  const selectedCategoryObj = topLevelCategories.find(
    (c) => c.slug === selectedCategory || c.label === selectedCategory,
  )
  const subcategories = selectedCategoryObj
    ? categories.filter((c) => c.parentId === selectedCategoryObj.id)
    : []

  const allCategories = [
    { value: 'All', label: t('filters.all') },
    ...topLevelCategories.map((category) => ({
      value: category.slug,
      label: localizeBlogCategory(categories, category.label, locale),
    })),
  ]

  const hasOverflow = topLevelCategories.length > MAX_VISIBLE_PILLS
  const visibleCategories = hasOverflow && !showAll
    ? allCategories.slice(0, MAX_VISIBLE_PILLS + 1)
    : allCategories

  // When showing all with search (for large category counts)
  const filteredForDropdown = catSearch.trim()
    ? allCategories.filter(
        (c) =>
          c.value === 'All' ||
          c.label.toLowerCase().includes(catSearch.toLowerCase()),
      )
    : visibleCategories

  const displayCategories = hasOverflow && showAll ? filteredForDropdown : visibleCategories

  return (
    <div className="space-y-2">
      <div className={cn('flex flex-wrap items-center', designSystem.spacing.gap.sm)}>
        {displayCategories.map((category) => {
          const isSelected = category.value === selectedCategory

          return (
            <Badge
              asChild
              key={category.value}
              variant={isSelected ? 'default' : 'outline'}
              className="min-h-9 px-3.5 py-1.5 text-sm"
            >
              <button
                type="button"
                onClick={() => {
                  onSelectCategory(category.value)
                  onSelectSubcategory?.('')
                }}
                aria-pressed={isSelected}
                className="cursor-pointer"
              >
                {category.label}
              </button>
            </Badge>
          )
        })}

        {hasOverflow && (
          <button
            onClick={() => { setShowAll(!showAll); setCatSearch('') }}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {showAll
              ? t('filters.showLess', 'Show less')
              : t('filters.showMore', `+${topLevelCategories.length - MAX_VISIBLE_PILLS} more`)}
            <ChevronDown className={cn('h-3 w-3 transition-transform', showAll && 'rotate-180')} />
          </button>
        )}
      </div>

      {/* Search within categories when expanded and there are many */}
      {hasOverflow && showAll && topLevelCategories.length > 20 && (
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <input
            type="text"
            value={catSearch}
            onChange={(e) => setCatSearch(e.target.value)}
            placeholder={t('filters.searchCategories', 'Search categories...')}
            className="w-full rounded-lg border bg-background pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20"
          />
        </div>
      )}

      {/* Subcategories */}
      {subcategories.length > 0 && onSelectSubcategory && (
        <div className={cn('flex flex-wrap pl-1', designSystem.spacing.gap.sm)}>
          <Badge
            asChild
            variant={!selectedSubcategory ? 'secondary' : 'outline'}
            className="min-h-7 px-2.5 py-1 text-xs"
          >
            <button
              type="button"
              onClick={() => onSelectSubcategory('')}
              aria-pressed={!selectedSubcategory}
              className="cursor-pointer"
            >
              {t('filters.all')}
            </button>
          </Badge>
          {subcategories.map((sub) => {
            const isSelected = sub.slug === selectedSubcategory
            return (
              <Badge
                asChild
                key={sub.id}
                variant={isSelected ? 'secondary' : 'outline'}
                className="min-h-7 px-2.5 py-1 text-xs"
              >
                <button
                  type="button"
                  onClick={() => onSelectSubcategory(sub.slug)}
                  aria-pressed={isSelected}
                  className="cursor-pointer"
                >
                  {localizeBlogCategory(categories, sub.label, locale)}
                </button>
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}
