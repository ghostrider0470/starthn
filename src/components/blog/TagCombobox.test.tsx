import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TagCombobox } from './TagCombobox'

const tags = [
  {
    id: 'tag-1',
    slug: 'tax',
    lang: 'en-US',
    label: 'Tax',
    translations: {},
  },
]

vi.mock('@/hooks/useTagQueries', () => ({
  usePublicTags: () => ({
    data: tags,
    isLoading: false,
  }),
}))

describe('TagCombobox', () => {
  it('stores selected tags as slugs for D1 associations', () => {
    const onChange = vi.fn()

    render(<TagCombobox selectedTags={[]} onChange={onChange} placeholder="Add tag" />)

    fireEvent.focus(screen.getByPlaceholderText('Add tag'))
    fireEvent.mouseDown(screen.getByText('Tax'))

    expect(onChange).toHaveBeenCalledWith(['tax'])
  })

  it('shows labels for existing slug selections', () => {
    render(<TagCombobox selectedTags={['tax']} onChange={vi.fn()} />)

    expect(screen.getByText('Tax')).toBeTruthy()
  })
})
