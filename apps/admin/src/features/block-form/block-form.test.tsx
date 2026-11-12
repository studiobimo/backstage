import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import i18n from '@/i18n/config'

import { BlockForm } from './block-form.tsx'
import { everyKindSchema, locales } from './test-fixtures.ts'

const TIMING = { fullFormFlowTimeoutMs: 20_000 } as const

function setup(props: Partial<React.ComponentProps<typeof BlockForm>> = {}) {
  const onSubmit = vi.fn()
  const user = userEvent.setup({ delay: null })
  render(<BlockForm schema={everyKindSchema} locales={locales} onSubmit={onSubmit} {...props} />)
  return { user, onSubmit }
}

const restoreEnglish = async () => {
  cleanup()
  await i18n.changeLanguage('en')
}

const group = (name: string) => screen.getByRole('group', { name: new RegExp(`^${name}`) })
const textbox = (name: string) => screen.getByRole('textbox', { name })

async function choose(user: ReturnType<typeof userEvent.setup>, field: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: field }))
  await user.click(await screen.findByRole('option', { name: option }))
}

describe('BlockForm fields', () => {
  afterEach(restoreEnglish)

  it('renders a control for every field kind', () => {
    setup()
    expect(textbox('Title')).toBeInTheDocument()
    expect(textbox('Slug').tagName).toBe('INPUT')
    expect(textbox('Columns')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /Featured/ })).not.toBeChecked()
    expect(screen.getByRole('combobox', { name: 'Theme' })).toHaveTextContent('light')
    expect(within(group('Cta')).getByRole('textbox', { name: 'Address' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Choose Picture' })).toBeInTheDocument()
    expect(within(group('Details')).getByRole('textbox', { name: 'Credit' })).toBeInTheDocument()
    expect(within(group('Items')).getByText('No items yet')).toBeInTheDocument()
  })

  it('marks optional fields and counts characters against a limit', async () => {
    const { user } = setup()
    await user.type(textbox('Slug'), 'abc')
    expect(screen.getByText('3/5')).toBeInTheDocument()
  })
})

describe('BlockForm errors', () => {
  afterEach(restoreEnglish)

  it('shows no error until a field is touched or the form is saved', () => {
    setup()
    expect(screen.queryByText('This field is required.')).not.toBeInTheDocument()
  })

  it('shows an error on its field once the field is changed', async () => {
    const { user } = setup()
    const slug = textbox('Slug')
    await user.type(slug, 'abcdefg')
    expect(slug).toHaveAccessibleDescription('Use 5 characters or fewer.')
    await user.clear(slug)
    await user.type(slug, 'AB')
    expect(slug).toHaveAccessibleDescription('Enter a valid value.')
    await user.clear(slug)
    expect(slug).toHaveAccessibleDescription('This field is required.')
  })

  it('shows every error when saving an incomplete form, and does not submit', async () => {
    const { user, onSubmit } = setup()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(textbox('Slug')).toHaveAccessibleDescription('This field is required.')
    expect(
      within(group('Cta')).getByRole('textbox', { name: 'Address' })
    ).toHaveAccessibleDescription('This field is required.')
    expect(textbox('Columns')).toHaveAccessibleDescription('This field is required.')
    expect(group('Items')).toHaveTextContent('Add at least 1 items.')
    expect(screen.getByText(/fields need attention/)).toBeInTheDocument()
  })

  it('shows the errors in Spanish when the editor works in Spanish', async () => {
    await i18n.changeLanguage('es')
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(textbox('Slug')).toHaveAccessibleDescription('Este campo es obligatorio.')
    expect(group('Items')).toHaveTextContent('Añade al menos 1 elementos.')
    await user.type(textbox('Columns'), '9')
    await user.tab()
    expect(textbox('Columns')).toHaveValue('4')
    expect(textbox('Columns')).not.toHaveAccessibleDescription()
  })
})

describe('BlockForm locales', () => {
  afterEach(restoreEnglish)

  it('edits one locale at a time and flags the missing translation', async () => {
    const { user } = setup()
    await user.type(textbox('Title'), 'Fresh coffee')
    const spanish = screen.getByRole('button', { name: /Spanish/ })
    expect(spanish).toHaveTextContent('1 missing')
    await user.click(spanish)
    expect(spanish).toHaveAttribute('aria-pressed', 'true')
    expect(textbox('Title')).toHaveValue('')
    expect(screen.getByText('Not translated')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Copy English' }))
    expect(textbox('Title')).toHaveValue('Fresh coffee')
    expect(spanish).not.toHaveTextContent('missing')
  })

  it('asks for the required localized fields in the default language only', async () => {
    const { user } = setup()
    const optionalMarks = () => screen.queryAllByText('Optional').length
    const inEnglish = optionalMarks()
    expect(screen.getAllByText('Required')).toHaveLength(2)
    await user.type(textbox('Title'), 'Fresh coffee')
    expect(screen.getAllByText('Required')).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: /Spanish/ }))
    expect(screen.queryByText('Required')).not.toBeInTheDocument()
    expect(optionalMarks()).toBe(inEnglish + 2)
  })

  it('opens the locale with errors when saving finds them only there', async () => {
    const { user } = setup({ value: { title: { es: '' } } })
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('button', { name: /Spanish/ })).toHaveAttribute('aria-pressed', 'true')
    expect(textbox('Title')).toHaveAccessibleDescription('This field is required.')
  })
})

const richDoc = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Menu' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Fresh', marks: [{ type: 'bold' }] },
        { type: 'hardBreak' },
        { type: 'text', text: 'daily', marks: [{ type: 'italic' }] }
      ]
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'One' }] }]
        }
      ]
    },
    {
      type: 'orderedList',
      attrs: { start: 1, type: null },
      content: [
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Two' }] }]
        }
      ]
    },
    {
      type: 'blockquote',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Quote' }] }]
    }
  ]
}

describe('BlockForm rich text', () => {
  afterEach(restoreEnglish)

  it('edits rich text with a labelled editor and a formatting toolbar', async () => {
    setup()
    expect(await screen.findByRole('textbox', { name: 'Body' })).toHaveAttribute(
      'contenteditable',
      'true'
    )
    const toolbar = screen.getAllByRole('toolbar', { name: 'Formatting' })[0]
    for (const tool of [
      'Bold',
      'Italic',
      'Heading',
      'Subheading',
      'Bulleted list',
      'Numbered list',
      'Quote',
      'Link'
    ]) {
      expect(within(toolbar).getByRole('button', { name: tool })).toBeInTheDocument()
    }
  })

  it('keeps every node rich text allows, unchanged, through the editor', async () => {
    const { user, onSubmit } = setup({
      value: {
        note: richDoc,
        slug: 'abc',
        columns: 1,
        size: 's',
        cta: { href: '/' },
        picture: { id: 'i' },
        items: [{ name: 'x' }]
      }
    })
    expect(await screen.findByRole('textbox', { name: /Note/ })).toHaveTextContent('Menu')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ note: richDoc }))
  })
})

describe('BlockForm rich text copied from another locale', () => {
  afterEach(restoreEnglish)

  it('shows the copied body in the editor and saves it', async () => {
    const { user, onSubmit } = setup({
      value: {
        body: { en: richDoc },
        title: { en: 'Fresh', es: 'Fresh' },
        slug: 'abc',
        columns: 1,
        size: 's',
        cta: { href: '/' },
        picture: { id: 'i' },
        items: [{ name: 'x' }]
      }
    })
    await user.click(screen.getByRole('button', { name: /Spanish/ }))
    expect(await screen.findByRole('textbox', { name: /Body/ })).not.toHaveTextContent('Menu')
    await user.click(screen.getByRole('button', { name: 'Copy English' }))
    expect(await screen.findByRole('textbox', { name: /Body/ })).toHaveTextContent('Menu')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ body: { en: richDoc, es: richDoc } })
    )
  })
})

describe('BlockForm rich text errors', () => {
  afterEach(restoreEnglish)

  it('shows an error on the editor when its content breaks the schema', async () => {
    const unsafe = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href: 'ftp://x' } }] }
          ]
        }
      ]
    }
    const { user } = setup({ value: { note: unsafe } })
    const note = await screen.findByRole('textbox', { name: /Note/ })
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(note).toHaveAttribute('aria-invalid', 'true')
    expect(note).toHaveAccessibleDescription(/formatting the site cannot show/)
  })
})

describe('BlockForm content', () => {
  afterEach(restoreEnglish)

  it(
    'submits the typed content once every error is fixed',
    async () => {
      const { user, onSubmit } = setup({ value: { picture: { id: 'img-1', alt: '' } } })
      await user.type(textbox('Title'), 'Hello')
      await user.type(textbox('Slug'), 'abc')
      await user.type(textbox('Columns'), '3')
      await choose(user, 'Size', 'm')
      await user.click(screen.getByRole('switch', { name: /Featured/ }))
      await user.type(within(group('Cta')).getByRole('textbox', { name: 'Address' }), '/about')
      await user.click(screen.getByRole('button', { name: 'Add item' }))
      await user.keyboard('One')
      await user.click(screen.getByRole('button', { name: 'Save' }))
      expect(onSubmit).toHaveBeenCalledWith({
        title: { en: 'Hello' },
        body: {},
        alt: {},
        cta: { href: '/about', label: '' },
        picture: { id: 'img-1', alt: '' },
        theme: 'light',
        size: 'm',
        columns: 3,
        featured: true,
        slug: 'abc',
        items: [{ name: 'One' }],
        details: {}
      })
    },
    TIMING.fullFormFlowTimeoutMs
  )

  it('adds and removes list items, up to the limit', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Add item' }))
    await user.keyboard('A')
    const add = screen.getByRole('button', { name: 'Add item' })
    await user.click(add)
    expect(add).toBeDisabled()
    expect(group('Items')).toHaveTextContent('2 items')
    await user.click(screen.getByRole('button', { name: 'Remove A' }))
    expect(group('Items')).toHaveTextContent('1 item')
    expect(screen.queryByRole('button', { name: 'Remove A' })).not.toBeInTheDocument()
  })

  it('gives each item a named handle to reorder it with', async () => {
    setup({ value: { items: [{ name: 'First' }, { name: 'Second' }] } })
    expect(await screen.findByRole('button', { name: 'Reorder First' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reorder Second' })).toBeInTheDocument()
  })

  it('starts from the content it is given', () => {
    setup({ value: { slug: 'abc', title: { en: 'Hi' } } })
    expect(textbox('Slug')).toHaveValue('abc')
    expect(textbox('Title')).toHaveValue('Hi')
  })

  it('says so when the schema has a shape it cannot render', () => {
    setup({ schema: { type: 'object', properties: { x: { type: 'null' } } } })
    expect(screen.getByRole('alert')).toHaveTextContent('cannot show')
  })
})
