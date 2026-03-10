/**
 * Text Direction Detection Utilities
 *
 * Detects text direction based on Unicode character ranges.
 * Supports Hebrew, Arabic, and other RTL scripts.
 */

/**
 * Detect text direction based on first strong directional character.
 */
export function detectTextDirection(text: string): 'rtl' | 'ltr' {
  const rtlRegex = /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0780-\u07BF\u0860-\u086F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
  const ltrRegex = /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/

  for (const char of text) {
    if (rtlRegex.test(char)) return 'rtl'
    if (ltrRegex.test(char)) return 'ltr'
  }
  return 'ltr'
}

/**
 * Check if a string contains any RTL characters.
 */
export function containsRTL(text: string): boolean {
  return /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F]/.test(text)
}
