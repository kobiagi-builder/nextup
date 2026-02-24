const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:5173';
const TEST_EMAIL = 'kobiagi+nextuptest@gmail.com';
const TEST_PASSWORD = 'Qwerty12345';
const BLOG_URL = 'https://kobiagi.substack.com/p/the-rise-of-the-8th-moat-power';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    // Step 1: Navigate to app
    console.log('1. Navigating to app...');
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.screenshot({ path: '/tmp/pw-01-initial.png', fullPage: true });
    console.log('   Current URL:', page.url());

    // Step 2: Login
    console.log('2. Logging in...');
    // Check if we're on a login page or need to navigate there
    const currentUrl = page.url();
    if (!currentUrl.includes('/login') && !currentUrl.includes('/auth')) {
      // Maybe already logged in or redirected
      console.log('   Current page:', currentUrl);
      // Look for login-related elements
      const hasEmailInput = await page.locator('input[type="email"], input[name="email"]').count();
      if (hasEmailInput === 0) {
        // Try navigating to login
        await page.goto(`${TARGET_URL}/login`, { waitUntil: 'networkidle', timeout: 10000 });
      }
    }

    await page.screenshot({ path: '/tmp/pw-02-login-page.png', fullPage: true });

    // Fill login form
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(TEST_EMAIL);

    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
    await passwordInput.fill(TEST_PASSWORD);

    await page.screenshot({ path: '/tmp/pw-03-credentials-filled.png', fullPage: true });

    // Submit login
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();
    console.log('   Login submitted, waiting for navigation...');

    // Wait for redirect after login
    await page.waitForURL(url => !url.toString().includes('/login') && !url.toString().includes('/auth'), { timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    console.log('   Logged in! Current URL:', page.url());
    await page.screenshot({ path: '/tmp/pw-04-logged-in.png', fullPage: true });

    // Step 3: Navigate to Settings
    console.log('3. Navigating to Settings...');
    await page.goto(`${TARGET_URL}/settings`, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForLoadState('networkidle');
    console.log('   Settings page loaded:', page.url());
    await page.screenshot({ path: '/tmp/pw-05-settings.png', fullPage: true });

    // Step 4: Find and click "Add Reference" button
    console.log('4. Looking for Add Reference button...');

    // Scroll down to find Writing References section if needed
    const addRefBtn = page.locator('button:has-text("Add Reference"), button:has-text("Add Your First Reference")').first();
    await addRefBtn.scrollIntoViewIfNeeded();
    await addRefBtn.waitFor({ state: 'visible', timeout: 10000 });
    await page.screenshot({ path: '/tmp/pw-06-before-add-ref.png', fullPage: true });
    await addRefBtn.click();
    console.log('   Clicked Add Reference button');

    // Step 5: Wait for dialog to open
    console.log('5. Waiting for upload dialog...');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/pw-07-dialog-open.png', fullPage: true });

    // Step 6: Click Publication tab
    console.log('6. Clicking Publication tab...');
    const pubTab = page.locator('button:has-text("Publication")').first();
    await pubTab.waitFor({ state: 'visible', timeout: 5000 });
    await pubTab.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/pw-08-publication-tab.png', fullPage: true });

    // Step 7: Fill in the blog URL
    console.log('7. Filling blog URL...');
    const urlInput = page.locator('input[placeholder*="linkedin"], input[placeholder*="https://"], input[type="url"]').first();
    await urlInput.waitFor({ state: 'visible', timeout: 5000 });
    await urlInput.fill(BLOG_URL);
    await page.waitForTimeout(1500); // Wait for platform detection
    await page.screenshot({ path: '/tmp/pw-09-url-filled.png', fullPage: true });

    // Check for platform detection
    const platformBadge = page.locator('text=/[Ss]ubstack.*detected/i');
    const hasPlatformDetection = await platformBadge.count();
    if (hasPlatformDetection > 0) {
      console.log('   Platform detected: Substack');
    }

    // Step 8: Submit the reference
    console.log('8. Submitting reference...');
    const addBtn = page.locator('button:has-text("Add Reference")').last();
    await addBtn.waitFor({ state: 'visible', timeout: 5000 });
    await addBtn.click();
    console.log('   Reference submitted!');

    // Wait for dialog to close and reference to appear
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/pw-10-reference-added.png', fullPage: true });

    console.log('\n=== DONE ===');
    console.log('Screenshots saved to /tmp/pw-01 through pw-10');
    console.log('Current URL:', page.url());

    // Keep browser open for 5 seconds so user can see the result
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('ERROR:', error.message);
    await page.screenshot({ path: '/tmp/pw-error.png', fullPage: true });
    console.log('Error screenshot saved to /tmp/pw-error.png');
  } finally {
    await browser.close();
  }
})();
