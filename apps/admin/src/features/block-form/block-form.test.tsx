import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import i18n from '@/i18n/config'

import { BlockForm } from './block-form.tsx'
import { everyKindSchema } from './test-fixtures.ts'

function setup(props: Partial<React.ComponentProps<typeof BlockForm>> = {}) {
  const onSubmit = vi.fn()
  const user = userEvent.setup()
  render(<BlockForm schema={everyKindSchema} onSubmit={onSubmit} {...props} />)
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
    expect(textbox('Slug').tagName).toBe('INPUT')
    expect(textbox('Columns')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /Featured/ })).not.toBeChecked()
    expect(screen.getByRole('combobox', { name: 'Theme' })).toHaveTextContent('light')
    expect(within(group('Cta')).getByRole('textbox', { name: 'Address' })).toBeInTheDocument()
    expect(within(group('Picture')).getByRole('textbox', { name: 'Image' })).toBeInTheDocument()
    expect(within(group('Details')).getByRole('textbox', { name: 'Credit' })).toBeInTheDocument()
  })

  it('marks optional fields and counts characters against a limit', async () => {
    const { user } = setup()
    expect(group('Picture')).toHaveTextContent('Alternative textOptional')
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
    expect(screen.getByText(/fields need attention/)).toBeInTheDocument()
  })

  it('shows the errors in Spanish when the editor works in Spanish', async () => {
    await i18n.changeLanguage('es')
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(textbox('Slug')).toHaveAccessibleDescription('Este campo es obligatorio.')
    await user.type(textbox('Columns'), '9')
    await user.tab()
    expect(textbox('Columns')).toHaveValue('4')
    expect(textbox('Columns')).not.toHaveAccessibleDescription()
  })
})

describe('BlockForm content', () => {
  afterEach(restoreEnglish)

  it('submits the typed content once every error is fixed', async () => {
    const { user, onSubmit } = setup()
    await user.type(textbox('Slug'), 'abc')
    await user.type(textbox('Columns'), '3')
    await choose(user, 'Size', 'm')
    await user.click(screen.getByRole('switch', { name: /Featured/ }))
    await user.type(within(group('Cta')).getByRole('textbox', { name: 'Address' }), '/about')
    await user.type(within(group('Picture')).getByRole('textbox', { name: 'Image' }), 'img-1')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledWith({
      cta: { href: '/about', label: '' },
      picture: { id: 'img-1', alt: '' },
      theme: 'light',
      size: 'm',
      columns: 3,
      featured: true,
      slug: 'abc',
      details: {}
    })
  })

  it('starts from the content it is given', () => {
    setup({ value: { slug: 'abc', cta: { href: '/menu' } } })
    expect(textbox('Slug')).toHaveValue('abc')
    expect(within(group('Cta')).getByRole('textbox', { name: 'Address' })).toHaveValue('/menu')
  })

  it('says so when the schema has a shape it cannot render', () => {
    setup({ schema: { type: 'object', properties: { x: { type: 'null' } } } })
    expect(screen.getByRole('alert')).toHaveTextContent('cannot show')
  })
})
