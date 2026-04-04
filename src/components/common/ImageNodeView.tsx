import { useCallback, useRef, useState } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Size presets (percentage of parent container)
// ---------------------------------------------------------------------------
const SIZE_PRESETS = [
  { label: 'S', value: '25%' },
  { label: 'M', value: '50%' },
  { label: 'L', value: '75%' },
  { label: 'Full', value: '100%' },
] as const

// ---------------------------------------------------------------------------
// Alignment options
// ---------------------------------------------------------------------------
const ALIGNMENTS = [
  { value: 'left', icon: AlignLeft },
  { value: 'center', icon: AlignCenter },
  { value: 'right', icon: AlignRight },
] as const

// ---------------------------------------------------------------------------
// ImageNodeView
// ---------------------------------------------------------------------------
export function ImageNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const { src, alt, title, width, textAlign } = node.attrs
  const containerRef = useRef<HTMLDivElement>(null)
  const [resizing, setResizing] = useState(false)

  // ---- Justify classes based on alignment ----
  const justifyClass =
    textAlign === 'left'
      ? 'justify-start'
      : textAlign === 'right'
        ? 'justify-end'
        : 'justify-center'

  // ---- Drag-to-resize ----
  const onResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setResizing(true)

      const parent = containerRef.current?.parentElement
      if (!parent) return
      const parentWidth = parent.getBoundingClientRect().width

      const onMouseMove = (ev: MouseEvent) => {
        const parentRect = parent.getBoundingClientRect()
        // Width = distance from left edge of parent to cursor
        let newPx: number
        if (textAlign === 'right') {
          newPx = parentRect.right - ev.clientX
        } else if (textAlign === 'center') {
          const center = parentRect.left + parentWidth / 2
          newPx = Math.abs(ev.clientX - center) * 2
        } else {
          newPx = ev.clientX - parentRect.left
        }
        const pct = Math.max(10, Math.min(100, Math.round((newPx / parentWidth) * 100)))
        updateAttributes({ width: `${pct}%` })
      }

      const onMouseUp = () => {
        setResizing(false)
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [textAlign, updateAttributes],
  )

  const btnBase =
    'h-7 px-1.5 flex items-center justify-center rounded text-xs font-medium transition-colors'
  const btnIdle = 'text-muted-foreground hover:text-foreground hover:bg-accent'
  const btnActive = 'bg-primary/15 text-primary'
  const divider = 'w-px h-4 bg-border mx-0.5'

  return (
    <NodeViewWrapper
      className={cn('flex my-4', justifyClass)}
      data-drag-handle
    >
      <div
        ref={containerRef}
        className={cn(
          'relative group inline-block',
          selected && 'ring-2 ring-primary rounded-lg',
        )}
        style={{ width: width || '100%', maxWidth: '100%' }}
      >
        {/* Floating toolbar — visible on select */}
        {selected && (
          <div
            className="absolute -top-10 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 rounded-lg border border-border bg-popover px-1.5 py-1 shadow-md"
            contentEditable={false}
          >
            {/* Size presets */}
            {SIZE_PRESETS.map((s) => (
              <button
                key={s.label}
                type="button"
                className={cn(btnBase, width === s.value ? btnActive : btnIdle)}
                onClick={() => updateAttributes({ width: s.value })}
                title={`Resize to ${s.value}`}
              >
                {s.label}
              </button>
            ))}

            <div className={divider} />

            {/* Alignment */}
            {ALIGNMENTS.map((a) => {
              const Icon = a.icon
              return (
                <button
                  key={a.value}
                  type="button"
                  className={cn(
                    btnBase,
                    textAlign === a.value ? btnActive : btnIdle,
                  )}
                  onClick={() => updateAttributes({ textAlign: a.value })}
                  title={`Align ${a.value}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              )
            })}

            <div className={divider} />

            {/* Delete */}
            <button
              type="button"
              className={cn(btnBase, 'text-destructive hover:bg-destructive/10')}
              onClick={deleteNode}
              title="Delete image"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Image */}
        <img
          src={src}
          alt={alt || ''}
          title={title || undefined}
          className="rounded-lg h-auto w-full block"
          draggable={false}
        />

        {/* Resize handle — bottom-right corner */}
        {selected && (
          <div
            className={cn(
              'absolute bottom-1 right-1 w-3 h-3 rounded-sm bg-primary cursor-nwse-resize opacity-80 hover:opacity-100',
              resizing && 'opacity-100',
            )}
            onMouseDown={onResizeStart}
            contentEditable={false}
          />
        )}
      </div>
    </NodeViewWrapper>
  )
}
