const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:5173';
const SESSION_DIR = '/tmp/pw-style-test-v2-2026-03-20_02-02-16';
const ARTIFACT_ID = '719cbfc9-5e09-4b4e-b918-e0d733463345';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  try {
    // Login
    console.log('🔐 Logging in...');
    await page.goto(`${TARGET_URL}/auth/login`);
    await page.waitForSelector('#email', { timeout: 10000 });
    await page.fill('#email', 'kobiagi+nextuptest@gmail.com');
    await page.fill('#password', 'Qwerty12345');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/portfolio', { timeout: 15000 });
    console.log('✅ Logged in');

    // Navigate to artifact
    console.log('📄 Navigating to artifact...');
    await page.goto(`${TARGET_URL}/portfolio/artifacts/${ARTIFACT_ID}`);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SESSION_DIR}/05-artifact-page.png` });

    // Look for approve/write button
    console.log('🔍 Looking for approval/write button...');

    // Try various button texts
    const buttonTexts = [
      'Approve',
      'Write',
      'Start Writing',
      'Approve & Write',
      'Generate Content',
      'Create Content',
    ];

    let clicked = false;
    for (const text of buttonTexts) {
      const btn = page.locator(`button:has-text("${text}")`).first();
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`✅ Found button: "${text}"`);
        await btn.click();
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      // Try the chat approach - send a message
      console.log('📨 No button found, trying chat approach...');
      const chatInput = page.locator('textarea, input[placeholder*="message" i], [contenteditable="true"]').first();
      if (await chatInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await chatInput.fill('Please approve the skeleton and write the full content now.');
        // Find send button
        const sendBtn = page.locator('button[type="submit"], button:has(svg)').last();
        await sendBtn.click();
        console.log('✅ Sent chat message to trigger writing');
        clicked = true;
      }
    }

    if (!clicked) {
      // List all visible buttons for debugging
      const buttons = await page.locator('button:visible').allTextContents();
      console.log('Available buttons:', buttons.filter(b => b.trim()).join(', '));
      await page.screenshot({ path: `${SESSION_DIR}/05-no-button-found.png` });
    }

    // Wait for content to be written
    console.log('⏳ Waiting for content creation (up to 3 minutes)...');
    for (let i = 0; i < 36; i++) {
      await page.waitForTimeout(5000);
      if (i % 6 === 0) {
        console.log(`  ... ${i * 5}s elapsed`);
        await page.screenshot({ path: `${SESSION_DIR}/06-writing-${i}.png` });
      }

      // Check page for status change
      const pageText = await page.textContent('body');
      if (pageText && (pageText.includes('humanity_checking') || pageText.includes('creating_visuals') || pageText.includes('complete'))) {
        console.log('✅ Content writing complete!');
        break;
      }
    }

    await page.screenshot({ path: `${SESSION_DIR}/07-final.png` });
    console.log('Done. Check DB for results.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: `${SESSION_DIR}/error-trigger.png` });
  } finally {
    await browser.close();
  }
})();
