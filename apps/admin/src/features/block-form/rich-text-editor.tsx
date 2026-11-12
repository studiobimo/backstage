import { RICH_TEXT } from '@studiobimo/backstage'
import Blockquote from '@tiptap/extension-blockquote'
import { ListItem } from '@tiptap/extension-list'
import { type Editor, EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  BoldIcon,
  Heading2Icon,
  Heading3Icon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  type LucideIcon,
  TextQuoteIcon
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover'
import { Toggle } from '@/components/ui/toggle'
import { Toolbar, ToolbarButton, ToolbarGroup, ToolbarSeparator } from '@/components/ui/toolbar'
import { cn } from '@/lib/utils'

import { blockValue, type BlockValue } from './value.ts'

const isSafeHref = (href: string) => RICH_TEXT.safeHref.test(href)

const richTextExtensions = [
  StarterKit.configure({
    heading: { levels: [...RICH_TEXT.headingLevels] },
    code: false,
    codeBlock: false,
    horizontalRule: false,
    strike: false,
    underline: false,
    listItem: false,
    blockquote: false,
    link: { openOnClick: false, autolink: true, isAllowedUri: isSafeHref }
  }),
  ListItem.extend({ content: 'paragraph+' }),
  Blockquote.extend({ content: 'paragraph+' })
]

interface Tool {
  name: string
  icon: LucideIcon
  isActive: (editor: Editor) => boolean
  run: (editor: Editor) => void
}

const tools: Tool[][] = [
  [
    {
      name: 'bold',
      icon: BoldIcon,
      isActive: (editor) => editor.isActive('bold'),
      run: (editor) => editor.chain().focus().toggleBold().run()
    },
    {
      name: 'italic',
      icon: ItalicIcon,
      isActive: (editor) => editor.isActive('italic'),
      run: (editor) => editor.chain().focus().toggleItalic().run()
    }
  ],
  [
    {
      name: 'heading2',
      icon: Heading2Icon,
      isActive: (editor) => editor.isActive('heading', { level: 2 }),
      run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run()
    },
    {
      name: 'heading3',
      icon: Heading3Icon,
      isActive: (editor) => editor.isActive('heading', { level: 3 }),
      run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run()
    }
  ],
  [
    {
      name: 'bulletList',
      icon: ListIcon,
      isActive: (editor) => editor.isActive('bulletList'),
      run: (editor) => editor.chain().focus().toggleBulletList().run()
    },
    {
      name: 'orderedList',
      icon: ListOrderedIcon,
      isActive: (editor) => editor.isActive('orderedList'),
      run: (editor) => editor.chain().focus().toggleOrderedList().run()
    },
    {
      name: 'blockquote',
      icon: TextQuoteIcon,
      isActive: (editor) => editor.isActive('blockquote'),
      run: (editor) => editor.chain().focus().toggleBlockquote().run()
    }
  ]
]

function ToolToggle({ editor, tool }: { editor: Editor; tool: Tool }) {
  const { t } = useTranslation('blockForm')
  const pressed = useEditorState({
    editor,
    selector: ({ editor: current }) => tool.isActive(current)
  })
  const Icon = tool.icon
  return (
    <ToolbarButton
      render={
        <Toggle
          size="sm"
          aria-label={t(`richText.tools.${tool.name}`)}
          pressed={pressed}
          onPressedChange={() => tool.run(editor)}
        />
      }
    >
      <Icon />
    </ToolbarButton>
  )
}

interface LinkFormProps {
  initialHref: string
  active: boolean
  onApply: (href: string) => void
}

function LinkForm({ initialHref, active, onApply }: LinkFormProps) {
  const { t } = useTranslation('blockForm')
  const [href, setHref] = useState(initialHref)
  const invalid = href !== '' && !isSafeHref(href)
  const apply = () => {
    if (!invalid) onApply(href)
  }
  return (
    <div className="flex flex-col gap-2">
      <Input
        value={href}
        placeholder={t('richText.link.placeholder')}
        aria-label={t('richText.link.address')}
        aria-invalid={invalid || undefined}
        onChange={(event) => setHref(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          apply()
        }}
      />
      {invalid && (
        <p className="text-destructive-foreground text-xs">{t('richText.link.invalid')}</p>
      )}
      <div className="flex justify-end gap-2">
        {active && (
          <Button type="button" size="sm" variant="ghost" onClick={() => onApply('')}>
            {t('richText.link.remove')}
          </Button>
        )}
        <Button type="button" size="sm" onClick={apply} disabled={invalid}>
          {t('richText.link.apply')}
        </Button>
      </div>
    </div>
  )
}

function LinkTool({ editor }: { editor: Editor }) {
  const { t } = useTranslation('blockForm')
  const [open, setOpen] = useState(false)
  const current = useEditorState({
    editor,
    selector: ({ editor: state }) => ({
      active: state.isActive('link'),
      href: String(state.getAttributes('link').href ?? '')
    })
  })

  function apply(href: string) {
    const chain = editor.chain().focus().extendMarkRange('link')
    if (href === '') chain.unsetLink().run()
    else chain.setLink({ href }).run()
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <ToolbarButton
            render={
              <Toggle size="sm" pressed={current.active} aria-label={t('richText.tools.link')} />
            }
          />
        }
      >
        <LinkIcon />
      </PopoverTrigger>
      <PopoverPopup className="w-72">
        <LinkForm initialHref={current.href} active={current.active} onApply={apply} />
      </PopoverPopup>
    </Popover>
  )
}

export interface RichTextEditorProps {
  value: BlockValue | undefined
  onChange: (value: BlockValue | undefined) => void
  onBlur: () => void
  labelId: string
  describedBy?: string
  invalid: boolean
}

const contentStyles =
  'min-h-28 px-3 py-2 text-base outline-none sm:text-sm [&_blockquote]:border-s-2 [&_blockquote]:ps-3 [&_blockquote]:text-muted-foreground [&_h2]:font-semibold [&_h2]:text-lg [&_h3]:font-semibold [&_h3]:text-base [&_ol]:list-decimal [&_ol]:ps-5 [&_ul]:list-disc [&_ul]:ps-5 [&_a]:text-primary [&_a]:underline [&>*+*]:mt-2'

const sameDocument = (editor: Editor, value: BlockValue | undefined) =>
  value === undefined ? editor.isEmpty : JSON.stringify(editor.getJSON()) === JSON.stringify(value)

function useExternalValue(editor: Editor, value: BlockValue | undefined) {
  useEffect(() => {
    if (sameDocument(editor, value)) return
    editor.commands.setContent(value ?? '', { emitUpdate: false })
  }, [editor, value])
}

export default function RichTextEditor({
  value,
  onChange,
  onBlur,
  labelId,
  describedBy,
  invalid
}: RichTextEditorProps) {
  const { t } = useTranslation('blockForm')
  const editor = useEditor({
    extensions: richTextExtensions,
    content: value ?? '',
    injectCSS: false,
    onUpdate: ({ editor: current }) => {
      const json = blockValue.safeParse(current.getJSON())
      onChange(current.isEmpty || !json.success ? undefined : json.data)
    },
    onBlur,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-labelledby': labelId,
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
        ...(invalid ? { 'aria-invalid': 'true' } : {}),
        class: contentStyles
      }
    }
  })
  useExternalValue(editor, value)
  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-lg border border-input bg-background shadow-xs/5 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/24 dark:bg-input/32',
        invalid &&
          'border-destructive/36 focus-within:border-destructive/64 focus-within:ring-destructive/16'
      )}
    >
      <Toolbar
        aria-label={t('richText.toolbar')}
        className="flex flex-wrap items-center gap-0.5 border-b bg-muted/48 p-1"
      >
        {tools.map((group, index) => (
          <ToolbarGroup key={group[0].name} className="flex items-center gap-0.5">
            {index > 0 && <ToolbarSeparator className="mx-1 h-5" />}
            {group.map((tool) => (
              <ToolToggle key={tool.name} editor={editor} tool={tool} />
            ))}
          </ToolbarGroup>
        ))}
        <ToolbarSeparator className="mx-1 h-5" />
        <LinkTool editor={editor} />
      </Toolbar>
      <EditorContent editor={editor} />
    </div>
  )
}
