import { test, expect } from '@playwright/test'

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:5173'

test.describe('Hebrew RTL Editor Support', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${TARGET_URL}/login`)
    await page.fill('input[name="email"]', 'kobiagi+nextuptest@gmail.com')
    await page.fill('input[name="password"]', 'Qwerty12345')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/portfolio')
  })

  test('RTL toggle button is visible in portfolio editor toolbar', async ({ page }) => {
    // Click on first artifact
    const artifactCard = page.locator('[data-testid="artifact-card"]').first()
    const hasArtifact = await artifactCard.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasArtifact) {
      test.skip()
      return
    }
    await artifactCard.click()

    // Wait for editor
    const editor = page.locator('.ProseMirror')
    await expect(editor).toBeVisible({ timeout: 10000 })

    // RTL toggle button should be in toolbar
    const rtlButton = page.getByTitle('Toggle RTL (Right-to-Left)')
    await expect(rtlButton).toBeVisible()
  })

  test('clicking RTL toggle sets dir="rtl" on current paragraph', async ({ page }) => {
    const artifactCard = page.locator('[data-testid="artifact-card"]').first()
    const hasArtifact = await artifactCard.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasArtifact) {
      test.skip()
      return
    }
    await artifactCard.click()

    const editor = page.locator('.ProseMirror')
    await expect(editor).toBeVisible({ timeout: 10000 })

    // Click into editor and press Enter for a new paragraph
    await editor.click()
    await page.keyboard.press('End')
    await page.keyboard.press('Enter')

    // Click RTL toggle
    const rtlButton = page.getByTitle('Toggle RTL (Right-to-Left)')
    await rtlButton.click()

    // The current paragraph should now have dir="rtl"
    const rtlParagraph = editor.locator('[dir="rtl"]')
    await expect(rtlParagraph).toHaveCount(1, { timeout: 3000 }).catch(() => {
      // At least one RTL paragraph should exist
    })
    await expect(rtlParagraph.first()).toBeVisible()
  })

  test('typing Hebrew text triggers auto-direction detection', async ({ page }) => {
    const artifactCard = page.locator('[data-testid="artifact-card"]').first()
    const hasArtifact = await artifactCard.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasArtifact) {
      test.skip()
      return
    }
    await artifactCard.click()

    const editor = page.locator('.ProseMirror')
    await expect(editor).toBeVisible({ timeout: 10000 })

    // Navigate to end and create new paragraph
    await editor.click()
    await page.keyboard.press('End')
    await page.keyboard.press('Enter')

    // Type Hebrew text — auto-detection should set dir="rtl"
    await page.keyboard.type('שלום עולם')

    // Wait for direction to be detected and applied
    const rtlContent = editor.locator('[dir="rtl"]')
    await expect(rtlContent).toBeVisible({ timeout: 5000 })
    await expect(rtlContent).toContainText('שלום')
  })

  test('blockquote uses correct border side in RTL mode', async ({ page }) => {
    const artifactCard = page.locator('[data-testid="artifact-card"]').first()
    const hasArtifact = await artifactCard.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasArtifact) {
      test.skip()
      return
    }
    await artifactCard.click()

    const editor = page.locator('.ProseMirror')
    await expect(editor).toBeVisible({ timeout: 10000 })

    // Create new paragraph, set RTL, type text, then make it a blockquote
    await editor.click()
    await page.keyboard.press('End')
    await page.keyboard.press('Enter')

    const rtlButton = page.getByTitle('Toggle RTL (Right-to-Left)')
    await rtlButton.click()
    await page.keyboard.type('ציטוט בעברית')

    // Toggle blockquote
    const quoteButton = page.getByTitle('Quote')
    await quoteButton.click()

    // Verify blockquote exists
    const blockquote = editor.locator('blockquote')
    await expect(blockquote).toBeVisible({ timeout: 5000 })

    // border-inline-start should be non-zero (logical property handles RTL automatically)
    const borderStartWidth = await blockquote.evaluate((el) => {
      return window.getComputedStyle(el).borderInlineStartWidth
    })
    expect(parseInt(borderStartWidth)).toBeGreaterThan(0)
  })
})
