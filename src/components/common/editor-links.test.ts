import { describe, expect, it } from 'vitest'
import { getEditorLinkAttributes } from './editor-links'

describe('getEditorLinkAttributes', () => {
  it('opens absolute links to other sites in a new tab without nofollow', () => {
    expect(getEditorLinkAttributes(' https://www.fia.ba/ ')).toEqual({
      href: 'https://www.fia.ba/',
      target: '_blank',
      rel: 'noopener noreferrer',
    })
  })

  it('keeps links to the site itself as plain followed links', () => {
    for (const href of [
      '/bs-BA/contact',
      '#kontakt',
      'https://www.starthn.ba/bs-BA/services/tax-consulting',
      'https://starthn.ba/bs-BA',
      'mailto:klijenti@starthn.ba',
      'tel:+38761221368',
    ]) {
      expect(getEditorLinkAttributes(href)).toEqual({ href, target: null, rel: null })
    }
  })

  it('does not treat look-alike hosts as internal', () => {
    expect(getEditorLinkAttributes('https://starthn.ba.example.com/').target).toBe('_blank')
  })
})
