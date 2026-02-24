# Playwright UI Testing Credentials

## Login Credentials for UI Testing

When running Playwright tests that require authentication (login flows, testing authenticated pages, E2E tests), use these credentials:

- **Username/Email:** `kobiagi+nextuptest@gmail.com`
- **Password:** `Qwerty12345`

## Login Flow Pattern

```javascript
// Standard login pattern for Playwright tests
await page.goto(`${TARGET_URL}/login`);
await page.fill('input[name="email"]', 'kobiagi+nextuptest@gmail.com');
await page.fill('input[name="password"]', 'Qwerty12345');
await page.click('button[type="submit"]');
await page.waitForURL('**/portfolio');
```

## Rules

- ALWAYS use these credentials for UI testing - never use placeholder/fake credentials
- These are dedicated test account credentials
- If login selectors change, adapt the selectors but keep these credentials
- For tests that need authenticated state, log in first before testing other features
