/**
 * External Links Configuration
 * 
 * Zentrale Verwaltung aller externen Verlinkungen für KERNnutrition
 */

export const EXTERNAL_LINKS = {
  // Support & Contact
  SUPPORT_EMAIL: 'mailto:lk@kerncares.de',
  // Documentation & Guides
  PRIVACY_POLICY: '#', // TODO: Add privacy policy link when available
  TERMS_OF_SERVICE: '#', // TODO: Add terms of service link when available
  // Social Media (for future use)
  TWITTER: '#', // TODO: Add social media links when available
  LINKEDIN: '#', // TODO: Add social media links when available
} as const

// Link text constants for consistency
export const LINK_TEXTS = {
  SUPPORT_CONTACT: 'Support kontaktieren',
  PRIVACY_POLICY: 'Datenschutz',
  TERMS_OF_SERVICE: 'Nutzungsbedingungen',
} as const

// Helper function to validate external links
export const validateExternalLink = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Helper function to get all configured links
export const getAllLinks = () => ({
  ...EXTERNAL_LINKS,
  texts: LINK_TEXTS
})
