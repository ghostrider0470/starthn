import { FC, useEffect, useCallback, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TiptapLink from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import Blockquote from '@tiptap/extension-blockquote'
import Heading from '@tiptap/extension-heading'
import Image from '@tiptap/extension-image'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import { Extension, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ImageNodeView } from './ImageNodeView'
import { TextStyle } from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import { Toggle } from '@/components/ui/toggle'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link as LinkIcon,
  Quote,
  Undo,
  Minus,
  Plus,
  Eraser,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Indent,
  Outdent,
  SeparatorHorizontal,
  ImageIcon,
  Table2 as Table2Icon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Custom Font Size Extension
// ---------------------------------------------------------------------------

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize?.replace(/['"]+/g, ''),
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {}
              return { style: `font-size: ${attributes.fontSize}` }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }: { chain: any }) =>
          chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }: { chain: any }) =>
          chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    } as any
  },
})

// ---------------------------------------------------------------------------
// Custom Indent Extension
// ---------------------------------------------------------------------------

const IndentExtension = Extension.create({
  name: 'indent',
  addOptions() {
    return {
      types: ['paragraph', 'heading', 'blockquote', 'bulletList', 'orderedList'],
      minIndent: 0,
      maxIndent: 8,
    }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const paddingLeft = element.style.paddingLeft
              return paddingLeft ? parseInt(paddingLeft, 10) / 40 : 0
            },
            renderHTML: (attributes) => {
              if (!attributes.indent) return {}
              return { style: `padding-left: ${attributes.indent * 40}px` }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      indent:
        () =>
        ({ tr, state, dispatch }: { tr: any; state: any; dispatch: any }) => {
          const { selection } = state
          tr = tr.setSelection(selection)
          const { from, to } = selection
          let changed = false

          state.doc.nodesBetween(from, to, (node: any, pos: number, parent: any) => {
            if (
              parent?.type.name === 'listItem' &&
              (node.type.name === 'paragraph' || node.type.name === 'heading')
            )
              return true

            if (this.options.types.includes(node.type.name)) {
              const indent = (node.attrs.indent || 0) + 1
              if (indent <= this.options.maxIndent) {
                tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent })
                changed = true
              }
              return false
            }
            return true
          })

          if (changed && dispatch) dispatch(tr)
          return changed
        },
      outdent:
        () =>
        ({ tr, state, dispatch }: { tr: any; state: any; dispatch: any }) => {
          const { selection } = state
          tr = tr.setSelection(selection)
          const { from, to } = selection
          let changed = false

          state.doc.nodesBetween(from, to, (node: any, pos: number, parent: any) => {
            if (
              parent?.type.name === 'listItem' &&
              (node.type.name === 'paragraph' || node.type.name === 'heading')
            )
              return true

            if (this.options.types.includes(node.type.name)) {
              const indent = (node.attrs.indent || 0) - 1
              if (indent >= this.options.minIndent) {
                tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent })
                changed = true
              }
              return false
            }
            return true
          })

          if (changed && dispatch) dispatch(tr)
          return changed
        },
    } as any
  },
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RichTextEditorProps {
  content: string
  onUpdate: (content: string) => void
  validationError?: string
  placeholder?: string
  minHeight?: string
  onImageUpload?: (file: File) => Promise<{ url: string }>
}

interface EditorToolbarProps {
  editor: ReturnType<typeof useEditor> | null
  onImageUpload?: (file: File) => Promise<{ url: string }>
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

const FONT_SIZES = [
  '8px', '9px', '10px', '11px', '12px', '14px', '16px',
  '18px', '20px', '24px', '30px', '36px', '48px', '60px', '72px',
]

const EditorToolbar: FC<EditorToolbarProps> = ({ editor, onImageUpload }) => {
  const [tablePickerOpen, setTablePickerOpen] = useState(false)
  const [hoverCell, setHoverCell] = useState<[number, number] | null>(null)

  if (!editor) return null

  const handleImageUpload = () => {
    if (!onImageUpload) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be under 5 MB')
        return
      }
      try {
        const { url } = await onImageUpload(file)
        editor.chain().focus().setImage({ src: url, alt: file.name }).run()
      } catch {
        alert('Failed to upload image')
      }
    }
    input.click()
  }

  const addLink = () => {
    const url = window.prompt('Enter URL:')
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }

  const toggleClass =
    'data-[state=on]:bg-primary/20 data-[state=on]:text-primary hover:bg-primary/10 transition-colors h-8 w-8 p-0 shrink-0 rounded-md'
  const dividerClass = 'w-px h-6 bg-border mx-1.5 self-center shrink-0'

  const getCurrentHeading = () => {
    if (editor.isActive('heading', { level: 2 })) return 'h2'
    if (editor.isActive('heading', { level: 3 })) return 'h3'
    if (editor.isActive('heading', { level: 4 })) return 'h4'
    return 'p'
  }

  const getCurrentFontSize = () => {
    const attrs = editor.getAttributes('textStyle')
    if (attrs.fontSize) return attrs.fontSize
    if (editor.isActive('heading', { level: 2 })) return '24px'
    if (editor.isActive('heading', { level: 3 })) return '20px'
    if (editor.isActive('heading', { level: 4 })) return '18px'
    return '16px'
  }

  const getCurrentAlignmentIcon = () => {
    if (editor.isActive({ textAlign: 'center' })) return <AlignCenter className="h-4 w-4" />
    if (editor.isActive({ textAlign: 'right' })) return <AlignRight className="h-4 w-4" />
    if (editor.isActive({ textAlign: 'justify' })) return <AlignJustify className="h-4 w-4" />
    return <AlignLeft className="h-4 w-4" />
  }

  const adjustFontSize = (delta: number) => {
    const current = getCurrentFontSize()
    let currentIndex = FONT_SIZES.indexOf(current)
    if (currentIndex === -1) currentIndex = 6
    const newIndex = Math.max(0, Math.min(FONT_SIZES.length - 1, currentIndex + delta))
    ;(editor.chain().focus() as any).setFontSize(FONT_SIZES[newIndex]).run()
  }

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border bg-muted/40 sticky top-0 z-10 overflow-x-auto rounded-t-xl">
      {/* Style Selection */}
      <Select
        value={getCurrentHeading()}
        onValueChange={(value) => {
          const chain = editor.chain().focus() as any
          if (value === 'p') {
            chain.setParagraph().unsetFontSize().run()
          } else {
            const level = parseInt(value.replace('h', '')) as 2 | 3 | 4
            chain.toggleHeading({ level }).unsetFontSize().run()
          }
        }}
      >
        <SelectTrigger className="h-9 w-auto min-w-[120px] bg-background border border-border hover:bg-accent text-xs gap-3 px-3 shadow-none font-medium rounded-md">
          <SelectValue placeholder="Style" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="p">Normal text</SelectItem>
          <SelectItem value="h2">Heading 1</SelectItem>
          <SelectItem value="h3">Heading 2</SelectItem>
          <SelectItem value="h4">Heading 3</SelectItem>
        </SelectContent>
      </Select>

      <div className={dividerClass} />

      {/* Font Size */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => adjustFontSize(-1)}
          className="h-9 w-9 flex items-center justify-center hover:bg-accent text-foreground transition-colors rounded-md"
          title="Decrease font size"
        >
          <Minus className="h-4 w-4" />
        </button>
        <Select
          value={getCurrentFontSize()}
          onValueChange={(value) => (editor.chain().focus() as any).setFontSize(value).run()}
        >
          <SelectTrigger className="h-9 w-[60px] bg-background border border-border hover:bg-accent text-xs px-2 justify-center shadow-none rounded-md font-medium">
            <span>{getCurrentFontSize().replace('px', '')}</span>
          </SelectTrigger>
          <SelectContent className="min-w-[70px]">
            {FONT_SIZES.map((size) => (
              <SelectItem key={size} value={size} className="text-xs justify-center text-center">
                {size.replace('px', '')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          onClick={() => adjustFontSize(1)}
          className="h-9 w-9 flex items-center justify-center hover:bg-accent text-foreground transition-colors rounded-md"
          title="Increase font size"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className={dividerClass} />

      {/* Basic Formatting */}
      <div className="flex items-center gap-0.5">
        <Toggle
          size="sm"
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          className={toggleClass}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          className={toggleClass}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('underline')}
          onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
          className={toggleClass}
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Toggle>
      </div>

      <div className={dividerClass} />

      {/* Link, Quote, HR */}
      <div className="flex items-center gap-0.5">
        <Toggle
          size="sm"
          pressed={editor.isActive('link')}
          onPressedChange={addLink}
          className={toggleClass}
          title="Insert link"
        >
          <LinkIcon className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('blockquote')}
          onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
          className={toggleClass}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </Toggle>
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="h-8 w-8 flex items-center justify-center hover:bg-accent text-foreground transition-colors rounded-md p-0 shrink-0"
          title="Insert horizontal line"
        >
          <SeparatorHorizontal className="h-4 w-4" />
        </button>
        {onImageUpload && (
          <button
            type="button"
            onClick={handleImageUpload}
            className="h-8 w-8 flex items-center justify-center hover:bg-accent text-foreground transition-colors rounded-md p-0 shrink-0"
            title="Insert image"
          >
            <ImageIcon className="h-4 w-4" />
          </button>
        )}

        {/* Table */}
        <Popover open={tablePickerOpen} onOpenChange={setTablePickerOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'h-8 w-8 flex items-center justify-center hover:bg-accent text-foreground transition-colors rounded-md p-0 shrink-0',
                editor.isActive('table') && 'bg-primary/20 text-primary',
              )}
              title="Table"
            >
              <Table2Icon className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="p-3 w-auto" align="start" side="bottom">
            {!editor.isActive('table') ? (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Insert Table</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '3px' }}>
                  {Array.from({ length: 6 }, (_, row) =>
                    Array.from({ length: 8 }, (_, col) => (
                      <div
                        key={`${row}-${col}`}
                        className={cn(
                          'w-5 h-5 border rounded-sm cursor-pointer transition-colors',
                          hoverCell && row <= hoverCell[0] && col <= hoverCell[1]
                            ? 'bg-primary/40 border-primary/60'
                            : 'border-border/60 bg-background hover:bg-muted',
                        )}
                        onMouseEnter={() => setHoverCell([row, col])}
                        onMouseLeave={() => setHoverCell(null)}
                        onClick={() => {
                          editor
                            .chain()
                            .focus()
                            .insertTable({ rows: row + 2, cols: col + 1, withHeaderRow: true })
                            .run()
                          setTablePickerOpen(false)
                          setHoverCell(null)
                        }}
                      />
                    )),
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center h-4">
                  {hoverCell ? `${hoverCell[1] + 1} × ${hoverCell[0] + 2} table` : ''}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5 min-w-[160px]">
                <p className="text-xs font-medium text-muted-foreground mb-1 px-1">Rows</p>
                <button
                  type="button"
                  className="text-sm text-left px-2 py-1.5 rounded hover:bg-accent transition-colors"
                  onClick={() => { editor.chain().focus().addRowBefore().run(); setTablePickerOpen(false) }}
                >
                  Add row above
                </button>
                <button
                  type="button"
                  className="text-sm text-left px-2 py-1.5 rounded hover:bg-accent transition-colors"
                  onClick={() => { editor.chain().focus().addRowAfter().run(); setTablePickerOpen(false) }}
                >
                  Add row below
                </button>
                <button
                  type="button"
                  className="text-sm text-left px-2 py-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors"
                  onClick={() => { editor.chain().focus().deleteRow().run(); setTablePickerOpen(false) }}
                >
                  Delete row
                </button>
                <div className="h-px bg-border my-1" />
                <p className="text-xs font-medium text-muted-foreground mb-1 px-1">Columns</p>
                <button
                  type="button"
                  className="text-sm text-left px-2 py-1.5 rounded hover:bg-accent transition-colors"
                  onClick={() => { editor.chain().focus().addColumnBefore().run(); setTablePickerOpen(false) }}
                >
                  Add column left
                </button>
                <button
                  type="button"
                  className="text-sm text-left px-2 py-1.5 rounded hover:bg-accent transition-colors"
                  onClick={() => { editor.chain().focus().addColumnAfter().run(); setTablePickerOpen(false) }}
                >
                  Add column right
                </button>
                <button
                  type="button"
                  className="text-sm text-left px-2 py-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors"
                  onClick={() => { editor.chain().focus().deleteColumn().run(); setTablePickerOpen(false) }}
                >
                  Delete column
                </button>
                <div className="h-px bg-border my-1" />
                <button
                  type="button"
                  className="text-sm text-left px-2 py-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors"
                  onClick={() => { editor.chain().focus().deleteTable().run(); setTablePickerOpen(false) }}
                >
                  Delete table
                </button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      <div className={dividerClass} />

      {/* Alignment */}
      <Select
        value={
          editor.isActive({ textAlign: 'center' })
            ? 'center'
            : editor.isActive({ textAlign: 'right' })
              ? 'right'
              : editor.isActive({ textAlign: 'justify' })
                ? 'justify'
                : 'left'
        }
        onValueChange={(value) => editor.chain().focus().setTextAlign(value).run()}
      >
        <SelectTrigger className="h-9 w-auto bg-transparent border-none hover:bg-accent px-2 gap-1.5 shadow-none rounded-md">
          {getCurrentAlignmentIcon()}
        </SelectTrigger>
        <SelectContent className="min-w-[50px]">
          <SelectItem value="left" className="justify-center">
            <AlignLeft className="h-4 w-4" />
          </SelectItem>
          <SelectItem value="center" className="justify-center">
            <AlignCenter className="h-4 w-4" />
          </SelectItem>
          <SelectItem value="right" className="justify-center">
            <AlignRight className="h-4 w-4" />
          </SelectItem>
          <SelectItem value="justify" className="justify-center">
            <AlignJustify className="h-4 w-4" />
          </SelectItem>
        </SelectContent>
      </Select>

      <div className={dividerClass} />

      {/* Lists */}
      <div className="flex items-center gap-0.5">
        <Toggle
          size="sm"
          pressed={editor.isActive('bulletList')}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          className={toggleClass}
          title="Bulleted list"
        >
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('orderedList')}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          className={toggleClass}
          title="Numbered list"
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>
      </div>

      <div className={dividerClass} />

      {/* Indent / Outdent */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => {
            if (editor.can().liftListItem('listItem')) {
              editor.chain().focus().liftListItem('listItem').run()
            } else {
              ;(editor.chain().focus() as any).outdent().run()
            }
          }}
          className="h-9 w-9 flex items-center justify-center hover:bg-accent text-foreground transition-colors rounded-md"
          title="Decrease indent"
        >
          <Outdent className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (editor.can().sinkListItem('listItem')) {
              editor.chain().focus().sinkListItem('listItem').run()
            } else {
              ;(editor.chain().focus() as any).indent().run()
            }
          }}
          className="h-9 w-9 flex items-center justify-center hover:bg-accent text-foreground transition-colors rounded-md"
          title="Increase indent"
        >
          <Indent className="h-4 w-4" />
        </button>
      </div>

      <div className={dividerClass} />

      {/* Clear Formatting */}
      <button
        type="button"
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        className="h-9 w-9 flex items-center justify-center hover:bg-accent text-foreground transition-colors rounded-md"
        title="Clear formatting"
      >
        <Eraser className="h-4 w-4" />
      </button>

      <div className="flex-grow" />

      {/* Undo / Redo */}
      <div className="flex items-center gap-1 border-l border-border pl-2 ml-1">
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="h-9 w-9 flex items-center justify-center hover:bg-accent text-foreground rounded-md transition-colors disabled:opacity-20 shrink-0"
        >
          <Undo className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="h-9 w-9 flex items-center justify-center hover:bg-accent text-foreground rounded-md transition-colors disabled:opacity-20 shrink-0"
        >
          <Undo className="h-4 w-4 scale-x-[-1]" />
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

export const RichTextEditor: FC<RichTextEditorProps> = ({
  content,
  onUpdate,
  validationError,
  placeholder = 'Start writing your content...',
  minHeight = '300px',
  onImageUpload,
}) => {
  const uploadAndInsert = useCallback(
    async (file: File, editor: ReturnType<typeof useEditor> | null) => {
      if (!onImageUpload || !editor) return
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be under 5 MB')
        return
      }
      try {
        const { url } = await onImageUpload(file)
        editor.chain().focus().setImage({ src: url, alt: file.name }).run()
      } catch {
        alert('Failed to upload image')
      }
    },
    [onImageUpload],
  )

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        link: false,
        underline: false,
        horizontalRule: {},
      }),
      Heading.configure({ levels: [2, 3, 4] }),
      BulletList.configure({ HTMLAttributes: { class: 'list-disc ml-4' } }),
      OrderedList.configure({ HTMLAttributes: { class: 'list-decimal ml-4' } }),
      ListItem,
      Blockquote,
      TiptapLink.configure({ openOnClick: false }),
      Underline,
      TextStyle,
      FontSize,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      IndentExtension,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Image.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            width: {
              default: '100%',
              parseHTML: (element) => element.style.width || '100%',
              renderHTML: () => ({}), // handled in renderHTML below
            },
            textAlign: {
              default: 'center',
              parseHTML: (element) => {
                const ml = element.style.marginLeft
                const mr = element.style.marginRight
                if (ml === 'auto' && mr === 'auto') return 'center'
                if (ml === 'auto' && mr !== 'auto') return 'right'
                return 'left'
              },
              renderHTML: () => ({}),
            },
          }
        },
        renderHTML({ node, HTMLAttributes }) {
          const width = node.attrs.width || '100%'
          const textAlign = node.attrs.textAlign || 'center'
          let style = `width: ${width}; display: block`
          if (textAlign === 'center') {
            style += '; margin-left: auto; margin-right: auto'
          } else if (textAlign === 'right') {
            style += '; margin-left: auto; margin-right: 0'
          } else {
            style += '; margin-left: 0; margin-right: auto'
          }
          return [
            'img',
            mergeAttributes(HTMLAttributes, { style }),
          ]
        },
        addNodeView() {
          return ReactNodeViewRenderer(ImageNodeView)
        },
      }).configure({
        inline: false,
        allowBase64: false,
      }),
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn('focus:outline-none min-h-[180px]', 'prose-none'),
        'data-placeholder': placeholder,
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved || !onImageUpload || !event.dataTransfer?.files.length) return false
        const file = event.dataTransfer.files[0]
        if (!file?.type.startsWith('image/')) return false
        event.preventDefault()
        uploadAndInsert(file, editorRef.current)
        return true
      },
      handlePaste: (_view, event) => {
        if (!onImageUpload) return false
        const file = event.clipboardData?.files[0]
        if (!file?.type.startsWith('image/')) return false
        event.preventDefault()
        uploadAndInsert(file, editorRef.current)
        return true
      },
    },
    onUpdate: ({ editor }) =>
      onUpdate(editor.getHTML().replace(/<p><\/p>/g, '<p><br></p>')),
  })

  // Keep a ref to the editor for use in drop/paste handlers (avoids stale closure)
  const editorRef = useRef(editor)
  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  useEffect(() => {
    if (editor && content !== editor.getHTML().replace(/<p><\/p>/g, '<p><br></p>')) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  // ── Image upload helper for context menu ─────────────────
  const handleImageUploadContext = () => {
    if (!onImageUpload || !editor) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5 MB'); return }
      try {
        const { url } = await onImageUpload(file)
        editor.chain().focus().setImage({ src: url, alt: file.name }).run()
      } catch { alert('Failed to upload image') }
    }
    input.click()
  }

  // ── Context menu ──────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setContextMenu(null) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [contextMenu])

  const closeAfter = (fn: () => void) => {
    fn()
    setContextMenu(null)
    editor?.chain().focus().run()
  }

  const menuItemClass = 'w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors rounded-sm cursor-pointer flex items-center gap-2'
  const menuDestructClass = 'w-full text-left px-3 py-1.5 text-sm hover:bg-destructive/10 text-destructive transition-colors rounded-sm cursor-pointer'
  const menuLabelClass = 'px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide select-none'
  const menuSepClass = 'my-1 h-px bg-border'

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'border rounded-xl overflow-hidden bg-card/50 transition-all duration-200',
          validationError
            ? 'border-destructive shadow-[0_0_0_1px_rgba(239,68,68,0.2)]'
            : 'border-border focus-within:border-primary/40 focus-within:bg-card/70',
        )}
      >
        <EditorToolbar editor={editor} onImageUpload={onImageUpload} />
        <div
          className={cn(
            'p-4 text-foreground/90',
            '[&_.ProseMirror]:outline-none',
            '[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground/50 [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none',
            '[&_.ProseMirror_h2]:text-primary [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h2]:my-3',
            '[&_.ProseMirror_h3]:text-primary [&_.ProseMirror_h3]:font-bold [&_.ProseMirror_h3]:text-xl [&_.ProseMirror_h3]:my-2',
            '[&_.ProseMirror_h4]:text-primary/90 [&_.ProseMirror_h4]:font-semibold [&_.ProseMirror_h4]:text-lg [&_.ProseMirror_h4]:my-2',
            '[&_.ProseMirror_p]:my-2 [&_.ProseMirror_p]:text-base',
            '[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ul]:my-2',
            '[&_.ProseMirror_ul_ul]:list-[circle]',
            '[&_.ProseMirror_ul_ul_ul]:list-[square]',
            '[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_ol]:my-2',
            '[&_.ProseMirror_ol_ol]:list-[lower-alpha]',
            '[&_.ProseMirror_ol_ol_ol]:list-[lower-roman]',
            '[&_.ProseMirror_li]:my-1',
            '[&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-primary [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:text-muted-foreground',
            '[&_.ProseMirror_a]:text-primary [&_.ProseMirror_a]:underline',
            '[&_.ProseMirror_hr]:border-border [&_.ProseMirror_hr]:my-4',
            '[&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table]:my-4',
            '[&_.ProseMirror_table_td]:border [&_.ProseMirror_table_td]:border-border [&_.ProseMirror_table_td]:p-2 [&_.ProseMirror_table_td]:align-top [&_.ProseMirror_table_td]:min-w-[3em] [&_.ProseMirror_table_td]:text-sm',
            '[&_.ProseMirror_table_th]:border [&_.ProseMirror_table_th]:border-border [&_.ProseMirror_table_th]:p-2 [&_.ProseMirror_table_th]:font-semibold [&_.ProseMirror_table_th]:bg-muted/60 [&_.ProseMirror_table_th]:text-foreground [&_.ProseMirror_table_th]:text-sm',
            '[&_.ProseMirror_.selectedCell]:bg-primary/10 [&_.ProseMirror_.selectedCell]:outline [&_.ProseMirror_.selectedCell]:outline-1 [&_.ProseMirror_.selectedCell]:outline-primary/40',
            `[&_.ProseMirror]:min-h-[calc(${minHeight}-2rem)]`,
          )}
          style={{ minHeight }}
          onContextMenu={(e) => {
            e.preventDefault()
            setContextMenu({ x: e.clientX, y: e.clientY })
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>

      {validationError && (
        <p className="text-sm text-destructive flex items-center gap-1.5 mt-1">
          {validationError}
        </p>
      )}

      {/* Right-click context menu */}
      {contextMenu && editor && (
        <div
          className="fixed z-[200] bg-popover border border-border rounded-lg shadow-xl py-1.5 min-w-[190px]"
          style={{
            left: Math.min(contextMenu.x + 4, (typeof window !== 'undefined' ? window.innerWidth : 800) - 200),
            top: Math.min(contextMenu.y + 4, (typeof window !== 'undefined' ? window.innerHeight : 600) - 320),
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {editor.isActive('table') ? (
            <>
              <div className={menuLabelClass}>Rows</div>
              <button type="button" className={menuItemClass} onClick={() => closeAfter(() => editor.chain().addRowBefore().run())}>Add row above</button>
              <button type="button" className={menuItemClass} onClick={() => closeAfter(() => editor.chain().addRowAfter().run())}>Add row below</button>
              <button type="button" className={menuDestructClass} onClick={() => closeAfter(() => editor.chain().deleteRow().run())}>Delete row</button>
              <div className={menuSepClass} />
              <div className={menuLabelClass}>Columns</div>
              <button type="button" className={menuItemClass} onClick={() => closeAfter(() => editor.chain().addColumnBefore().run())}>Add column left</button>
              <button type="button" className={menuItemClass} onClick={() => closeAfter(() => editor.chain().addColumnAfter().run())}>Add column right</button>
              <button type="button" className={menuDestructClass} onClick={() => closeAfter(() => editor.chain().deleteColumn().run())}>Delete column</button>
              <div className={menuSepClass} />
              <button type="button" className={menuDestructClass} onClick={() => closeAfter(() => editor.chain().deleteTable().run())}>Delete table</button>
            </>
          ) : (
            <>
              <div className={menuLabelClass}>Format</div>
              <button type="button" className={menuItemClass} onClick={() => closeAfter(() => editor.chain().toggleBold().run())}>
                <span className="font-bold text-xs w-4">B</span> Bold
              </button>
              <button type="button" className={menuItemClass} onClick={() => closeAfter(() => editor.chain().toggleItalic().run())}>
                <span className="italic text-xs w-4">I</span> Italic
              </button>
              <button type="button" className={menuItemClass} onClick={() => closeAfter(() => editor.chain().toggleUnderline().run())}>
                <span className="underline text-xs w-4">U</span> Underline
              </button>
              <div className={menuSepClass} />
              <div className={menuLabelClass}>Insert</div>
              <button type="button" className={menuItemClass} onClick={() => closeAfter(() => editor.chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}>
                <Table2Icon className="h-3.5 w-3.5" /> Insert table (3×3)
              </button>
              {onImageUpload && (
                <button type="button" className={menuItemClass} onClick={() => { setContextMenu(null); handleImageUploadContext() }}>
                  <ImageIcon className="h-3.5 w-3.5" /> Insert image
                </button>
              )}
              <button type="button" className={menuItemClass} onClick={() => {
                const url = window.prompt('Enter URL:')
                if (url) closeAfter(() => editor.chain().extendMarkRange('link').setLink({ href: url }).run())
                else setContextMenu(null)
              }}>
                <LinkIcon className="h-3.5 w-3.5" /> Insert link
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
