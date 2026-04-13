import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Tag, Loader2 } from 'lucide-react'
import { usePublicTags } from '@/hooks/useTagQueries'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface TagComboboxProps {
  selectedTags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export function TagCombobox({ selectedTags, onChange, placeholder = 'Search and add tags…' }: TagComboboxProps) {
  const { data: allTags = [], isLoading } = usePublicTags()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = allTags.filter(
    (tag) =>
      !selectedTags.includes(tag.label) &&
      (query === '' || tag.label.toLowerCase().includes(query.toLowerCase())),
  )

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const addTag = useCallback(
    (label: string) => {
      onChange([...selectedTags, label])
      setQuery('')
      setOpen(false)
      inputRef.current?.focus()
    },
    [selectedTags, onChange],
  )

  const removeTag = useCallback(
    (label: string) => {
      onChange(selectedTags.filter((t) => t !== label))
    },
    [selectedTags, onChange],
  )

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[activeIndex]) addTag(filtered[activeIndex].label)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    } else if (e.key === 'Backspace' && query === '' && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1])
    }
  }

  useEffect(() => {
    if (!listRef.current) return
    const item = listRef.current.children[activeIndex] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const hasNoTags = !isLoading && allTags.length === 0
  const showDropdown = open && !hasNoTags && (filtered.length > 0 || (query !== '' && filtered.length === 0))

  return (
    <div ref={containerRef} className="relative">
      {/* Input area */}
      <div
        onClick={() => inputRef.current?.focus()}
        className={cn(
          'flex flex-wrap gap-1.5 min-h-[2.5rem] w-full rounded-md border bg-background px-3 py-2 cursor-text',
          'transition-colors',
          open ? 'ring-1 ring-primary/30 border-primary/40' : 'border-input hover:border-primary/30',
          hasNoTags && 'opacity-60 cursor-not-allowed',
        )}
      >
        {selectedTags.map((label) => (
          <Badge key={label} variant="secondary" className="gap-1 pr-1 h-6 shrink-0">
            <Tag className="h-3 w-3 text-muted-foreground" />
            {label}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(label) }}
              className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        <input
          ref={inputRef}
          value={query}
          disabled={hasNoTags}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[140px] bg-transparent outline-none text-sm placeholder:text-muted-foreground/40 disabled:cursor-not-allowed"
        />

        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground self-center ml-auto shrink-0" />
        )}
      </div>

      {/* No tags in DB hint */}
      {hasNoTags && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          No tags found.{' '}
          <a
            href="/admin/tags"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Create tags in Tag Management
          </a>{' '}
          first.
        </p>
      )}

      {/* Dropdown */}
      {showDropdown && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full overflow-y-auto rounded-md border bg-popover shadow-md"
          style={{ maxHeight: '13rem' }}
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground italic">
              No tags match "{query}"
            </li>
          ) : (
            filtered.map((tag, idx) => (
              <li
                key={tag.id}
                onMouseDown={(e) => { e.preventDefault(); addTag(tag.label) }}
                onMouseEnter={() => setActiveIndex(idx)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer select-none',
                  idx === activeIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50',
                )}
              >
                <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {tag.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
