// playwright-helpers.js
// Reusable utility functions for Playwright automation

const { chromium, firefox, webkit } = require('playwright');
const fs = require('fs');
const path = require('path');

// Session directory for screenshots and artifacts
let _sessionDir = null;

/**
 * Parse extra HTTP headers from environment variables.
 * Supports two formats:
 * - PW_HEADER_NAME + PW_HEADER_VALUE: Single header (simple, common case)
 * - PW_EXTRA_HEADERS: JSON object for multiple headers (advanced)
 * Single header format takes precedence if both are set.
 * @returns {Object|null} Headers object or null if none configured
 */
function getExtraHeadersFromEnv() {
  const headerName = process.env.PW_HEADER_NAME;
  const headerValue = process.env.PW_HEADER_VALUE;

  if (headerName && headerValue) {
    return { [headerName]: headerValue };
  }

  const headersJson = process.env.PW_EXTRA_HEADERS;
  if (headersJson) {
    try {
      const parsed = JSON.parse(headersJson);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed;
      }
      console.warn('PW_EXTRA_HEADERS must be a JSON object, ignoring...');
    } catch (e) {
      console.warn('Failed to parse PW_EXTRA_HEADERS as JSON:', e.message);
    }
  }

  return null;
}

/**
 * Launch browser with standard configuration
 * @param {string} browserType - 'chromium', 'firefox', or 'webkit'
 * @param {Object} options - Additional launch options
 */
async function launchBrowser(browserType = 'chromium', options = {}) {
  const defaultOptions = {
    headless: process.env.HEADLESS !== 'false',
    slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  };
  
  const browsers = { chromium, firefox, webkit };
  const browser = browsers[browserType];
  
  if (!browser) {
    throw new Error(`Invalid browser type: ${browserType}`);
  }
  
  return await browser.launch({ ...defaultOptions, ...options });
}

/**
 * Create a new page with viewport and user agent
 * @param {Object} context - Browser context
 * @param {Object} options - Page options
 */
async function createPage(context, options = {}) {
  const page = await context.newPage();
  
  if (options.viewport) {
    await page.setViewportSize(options.viewport);
  }
  
  if (options.userAgent) {
    await page.setExtraHTTPHeaders({
      'User-Agent': options.userAgent
    });
  }
  
  // Set default timeout
  page.setDefaultTimeout(options.timeout || 30000);
  
  return page;
}

/**
 * Smart wait for page to be ready
 * @param {Object} page - Playwright page
 * @param {Object} options - Wait options
 */
async function waitForPageReady(page, options = {}) {
  const waitOptions = {
    waitUntil: options.waitUntil || 'networkidle',
    timeout: options.timeout || 30000
  };
  
  try {
    await page.waitForLoadState(waitOptions.waitUntil, { 
      timeout: waitOptions.timeout 
    });
  } catch (e) {
    console.warn('Page load timeout, continuing...');
  }
  
  // Additional wait for dynamic content if selector provided
  if (options.waitForSelector) {
    await page.waitForSelector(options.waitForSelector, { 
      timeout: options.timeout 
    });
  }
}

/**
 * Safe click with retry logic
 * @param {Object} page - Playwright page
 * @param {string} selector - Element selector
 * @param {Object} options - Click options
 */
async function safeClick(page, selector, options = {}) {
  const maxRetries = options.retries || 3;
  const retryDelay = options.retryDelay || 1000;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await page.waitForSelector(selector, { 
        state: 'visible',
        timeout: options.timeout || 5000 
      });
      await page.click(selector, {
        force: options.force || false,
        timeout: options.timeout || 5000
      });
      return true;
    } catch (e) {
      if (i === maxRetries - 1) {
        console.error(`Failed to click ${selector} after ${maxRetries} attempts`);
        throw e;
      }
      console.log(`Retry ${i + 1}/${maxRetries} for clicking ${selector}`);
      await page.waitForTimeout(retryDelay);
    }
  }
}

/**
 * Safe text input with clear before type
 * @param {Object} page - Playwright page
 * @param {string} selector - Input selector
 * @param {string} text - Text to type
 * @param {Object} options - Type options
 */
async function safeType(page, selector, text, options = {}) {
  await page.waitForSelector(selector, { 
    state: 'visible',
    timeout: options.timeout || 10000 
  });
  
  if (options.clear !== false) {
    await page.fill(selector, '');
  }
  
  if (options.slow) {
    await page.type(selector, text, { delay: options.delay || 100 });
  } else {
    await page.fill(selector, text);
  }
}

/**
 * Extract text from multiple elements
 * @param {Object} page - Playwright page
 * @param {string} selector - Elements selector
 */
async function extractTexts(page, selector) {
  await page.waitForSelector(selector, { timeout: 10000 });
  return await page.$$eval(selector, elements => 
    elements.map(el => el.textContent?.trim()).filter(Boolean)
  );
}

/**
 * Create a timestamped session directory for screenshots and test artifacts.
 * All screenshots and files from this test session will be stored here.
 * Call cleanupSessionDir() when testing is complete.
 * @param {string} prefix - Optional prefix for the folder name (default: 'pw-test')
 * @returns {string} Absolute path to the session directory
 */
function createSessionDir(prefix = 'pw-test') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  const dirName = `${prefix}-${timestamp}`;
  const dirPath = path.join('/tmp', dirName);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  _sessionDir = dirPath;
  console.log(`📁 Session directory created: ${dirPath}`);
  return dirPath;
}

/**
 * Get the current session directory, creating one if it doesn't exist.
 * @returns {string} Absolute path to the session directory
 */
function getSessionDir() {
  if (!_sessionDir) {
    return createSessionDir();
  }
  return _sessionDir;
}

/**
 * Clean up the session directory and all its contents.
 * Call this when the testing session is complete.
 * @param {string} dirPath - Optional explicit path. If omitted, cleans up the current session dir.
 */
function cleanupSessionDir(dirPath) {
  const target = dirPath || _sessionDir;
  if (!target) {
    console.log('No session directory to clean up.');
    return;
  }

  try {
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true, force: true });
      console.log(`🧹 Session directory cleaned up: ${target}`);
    }
  } catch (e) {
    console.warn(`Failed to clean up session directory: ${e.message}`);
  }

  if (target === _sessionDir) {
    _sessionDir = null;
  }
}

/**
 * Take screenshot with timestamp, saved to the session directory.
 * @param {Object} page - Playwright page
 * @param {string} name - Screenshot name
 * @param {Object} options - Screenshot options
 */
async function takeScreenshot(page, name, options = {}) {
  const sessionDir = getSessionDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${timestamp}.png`;
  const filePath = path.join(sessionDir, filename);

  await page.screenshot({
    path: filePath,
    fullPage: options.fullPage !== false,
    ...options
  });

  console.log(`📸 Screenshot saved: ${filePath}`);
  return filePath;
}

/**
 * Handle authentication
 * @param {Object} page - Playwright page
 * @param {Object} credentials - Username and password
 * @param {Object} selectors - Login form selectors
 */
async function authenticate(page, credentials, selectors = {}) {
  const defaultSelectors = {
    username: 'input[name="username"], input[name="email"], #username, #email',
    password: 'input[name="password"], #password',
    submit: 'button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign in")'
  };
  
  const finalSelectors = { ...defaultSelectors, ...selectors };
  
  await safeType(page, finalSelectors.username, credentials.username);
  await safeType(page, finalSelectors.password, credentials.password);
  await safeClick(page, finalSelectors.submit);
  
  // Wait for navigation or success indicator
  await Promise.race([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.waitForSelector(selectors.successIndicator || '.dashboard, .user-menu, .logout', { timeout: 10000 })
  ]).catch(() => {
    console.log('Login might have completed without navigation');
  });
}

/**
 * Scroll page
 * @param {Object} page - Playwright page
 * @param {string} direction - 'down', 'up', 'top', 'bottom'
 * @param {number} distance - Pixels to scroll (for up/down)
 */
async function scrollPage(page, direction = 'down', distance = 500) {
  switch (direction) {
    case 'down':
      await page.evaluate(d => window.scrollBy(0, d), distance);
      break;
    case 'up':
      await page.evaluate(d => window.scrollBy(0, -d), distance);
      break;
    case 'top':
      await page.evaluate(() => window.scrollTo(0, 0));
      break;
    case 'bottom':
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      break;
  }
  await page.waitForTimeout(500); // Wait for scroll animation
}

/**
 * Extract table data
 * @param {Object} page - Playwright page
 * @param {string} tableSelector - Table selector
 */
async function extractTableData(page, tableSelector) {
  await page.waitForSelector(tableSelector);
  
  return await page.evaluate((selector) => {
    const table = document.querySelector(selector);
    if (!table) return null;
    
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => 
      th.textContent?.trim()
    );
    
    const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr => {
      const cells = Array.from(tr.querySelectorAll('td'));
      if (headers.length > 0) {
        return cells.reduce((obj, cell, index) => {
          obj[headers[index] || `column_${index}`] = cell.textContent?.trim();
          return obj;
        }, {});
      } else {
        return cells.map(cell => cell.textContent?.trim());
      }
    });
    
    return { headers, rows };
  }, tableSelector);
}

/**
 * Wait for and dismiss cookie banners
 * @param {Object} page - Playwright page
 * @param {number} timeout - Max time to wait
 */
async function handleCookieBanner(page, timeout = 3000) {
  const commonSelectors = [
    'button:has-text("Accept")',
    'button:has-text("Accept all")',
    'button:has-text("OK")',
    'button:has-text("Got it")',
    'button:has-text("I agree")',
    '.cookie-accept',
    '#cookie-accept',
    '[data-testid="cookie-accept"]'
  ];
  
  for (const selector of commonSelectors) {
    try {
      const element = await page.waitForSelector(selector, { 
        timeout: timeout / commonSelectors.length,
        state: 'visible'
      });
      if (element) {
        await element.click();
        console.log('Cookie banner dismissed');
        return true;
      }
    } catch (e) {
      // Continue to next selector
    }
  }
  
  return false;
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number} initialDelay - Initial delay in ms
 */
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const delay = initialDelay * Math.pow(2, i);
      console.log(`Attempt ${i + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Create browser context with common settings
 * @param {Object} browser - Browser instance
 * @param {Object} options - Context options
 */
async function createContext(browser, options = {}) {
  const envHeaders = getExtraHeadersFromEnv();

  // Merge environment headers with any passed in options
  const mergedHeaders = {
    ...envHeaders,
    ...options.extraHTTPHeaders
  };

  const defaultOptions = {
    viewport: { width: 1280, height: 720 },
    userAgent: options.mobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
      : undefined,
    permissions: options.permissions || [],
    geolocation: options.geolocation,
    locale: options.locale || 'en-US',
    timezoneId: options.timezoneId || 'America/New_York',
    // Only include extraHTTPHeaders if we have any
    ...(Object.keys(mergedHeaders).length > 0 && { extraHTTPHeaders: mergedHeaders })
  };

  return await browser.newContext({ ...defaultOptions, ...options });
}

/**
 * Detect running dev servers on common ports
 * @param {Array<number>} customPorts - Additional ports to check
 * @returns {Promise<Array>} Array of detected server URLs
 */
async function detectDevServers(customPorts = []) {
  const http = require('http');

  // Common dev server ports
  const commonPorts = [3000, 3001, 3002, 5173, 8080, 8000, 4200, 5000, 9000, 1234];
  const allPorts = [...new Set([...commonPorts, ...customPorts])];

  const detectedServers = [];

  console.log('🔍 Checking for running dev servers...');

  for (const port of allPorts) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: 'localhost',
          port: port,
          path: '/',
          method: 'HEAD',
          timeout: 500
        }, (res) => {
          if (res.statusCode < 500) {
            detectedServers.push(`http://localhost:${port}`);
            console.log(`  ✅ Found server on port ${port}`);
          }
          resolve();
        });

        req.on('error', () => resolve());
        req.on('timeout', () => {
          req.destroy();
          resolve();
        });

        req.end();
      });
    } catch (e) {
      // Port not available, continue
    }
  }

  if (detectedServers.length === 0) {
    console.log('  ❌ No dev servers detected');
  }

  return detectedServers;
}

module.exports = {
  launchBrowser,
  createPage,
  waitForPageReady,
  safeClick,
  safeType,
  extractTexts,
  takeScreenshot,
  authenticate,
  scrollPage,
  extractTableData,
  handleCookieBanner,
  retryWithBackoff,
  createContext,
  detectDevServers,
  getExtraHeadersFromEnv,
  createSessionDir,
  getSessionDir,
  cleanupSessionDir
};
