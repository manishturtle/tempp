# Playwright Testing for Qrosity

This directory contains end-to-end tests for the Qrosity application using Playwright.

## Test Structure

- `example.spec.ts` - Basic UI tests for the application
- `api.spec.ts` - API integration tests
- `selling-channels.spec.ts` - Tests specific to the Selling Channels feature
- `pages/` - Page Object Models for better test organization
  - `base-page.ts` - Base page class with common functionality
  - `selling-channels-page.ts` - Page object for the Selling Channels page

## Running Tests

You can run the tests using the following npm scripts:

```bash
# Run all tests headlessly
npm run test

# Run tests with Playwright UI
npm run test:ui

# Run tests in headed mode (visible browser)
npm run test:headed

# Run tests in debug mode
npm run test:debug

# Run only API tests
npm run test:api
```

## Test Configuration

The test configuration is defined in `playwright.config.ts` in the root directory. Key settings include:

- Tests run in parallel by default
- Screenshots are captured on test failures
- Videos are recorded on first retry
- The Next.js dev server is automatically started before tests run
- Tests run in three browsers: Chromium, Firefox, and WebKit

## Writing New Tests

When writing new tests, follow these guidelines:

1. Use the Page Object Model pattern for UI tests
2. Create new page objects in the `pages/` directory
3. Follow the naming convention: `feature-name.spec.ts` for test files
4. Group related tests using `test.describe()`
5. Keep tests independent and isolated

## Debugging Tests

To debug tests:

1. Run with the `--debug` flag: `npm run test:debug`
2. Use `page.pause()` in your test code to pause execution
3. Check screenshots and videos in the `test-results/` directory after failures
4. Use the HTML report: `npx playwright show-report`

## CI Integration

The tests are configured to run in CI environments with appropriate settings for retries and parallelism. The `forbidOnly` option is enabled in CI to fail if any tests are marked with `.only`.
