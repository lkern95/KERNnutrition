import { describe, it, expect } from 'vitest'
import { EXTERNAL_LINKS, LINK_TEXTS, validateExternalLink, getAllLinks } from './constants'

describe('External Links Configuration', () => {


  it('should have valid support email', () => {
    expect(EXTERNAL_LINKS.SUPPORT_EMAIL).toBe('mailto:lk@kerncares.de')
    expect(EXTERNAL_LINKS.SUPPORT_EMAIL).toMatch(/^mailto:[^@]+@[^@]+\.[a-z]+$/i)
  })

  it('should have consistent link texts', () => {
    expect(LINK_TEXTS.SUPPORT_CONTACT).toBe('Support kontaktieren')
  })

  it('should validate external links correctly', () => {
    expect(validateExternalLink('https://github.com/user/repo')).toBe(true)
    expect(validateExternalLink('mailto:user@example.com')).toBe(true)
    expect(validateExternalLink('invalid-url')).toBe(false)
    expect(validateExternalLink('')).toBe(false)
  })

  it('should return all links with texts', () => {
    const allLinks = getAllLinks()
    expect(allLinks).toHaveProperty('SUPPORT_EMAIL')
    expect(allLinks).toHaveProperty('texts')
    expect(allLinks.texts).toHaveProperty('SUPPORT_CONTACT')
  })

  it('should have all required links defined', () => {
    const requiredLinks = ['SUPPORT_EMAIL', 'PRIVACY_POLICY', 'TERMS_OF_SERVICE']
    requiredLinks.forEach(linkKey => {
      expect(EXTERNAL_LINKS).toHaveProperty(linkKey)
      expect(typeof EXTERNAL_LINKS[linkKey as keyof typeof EXTERNAL_LINKS]).toBe('string')
    })
  })



  it('should have support email pointing to correct domain', () => {
    expect(EXTERNAL_LINKS.SUPPORT_EMAIL).toContain('lk@kerncares.de')
  })
})
