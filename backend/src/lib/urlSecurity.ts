/**
 * URL Security Utilities
 *
 * SSRF protection: validates URLs before server-side fetching.
 */

import { URL } from 'url'

/**
 * Check if a URL points to a private/internal network address.
 * Returns true if the URL is unsafe to fetch from the server.
 */
export function isPrivateUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()
    return (
      hostname === 'localhost' ||
      hostname.startsWith('127.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.2') ||
      hostname.startsWith('172.3') ||
      hostname === '0.0.0.0' ||
      hostname === '[::]' ||
      hostname === '[::1]' ||
      hostname === '169.254.169.254' ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local') ||
      parsed.protocol === 'file:'
    )
  } catch {
    return true // Invalid URLs are treated as unsafe
  }
}

/**
 * Assert that a URL is safe to fetch (not private/internal).
 * Throws if the URL points to a private address.
 */
export function assertPublicUrl(url: string): void {
  if (isPrivateUrl(url)) {
    throw new Error('URL points to a private or internal address')
  }
}
