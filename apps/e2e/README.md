# E2E Tests

End-to-end browser tests for Tracearr using [Playwright](https://playwright.dev/). These tests exercise real user flows against the full stack (API server + web app) in a Chromium browser.

## Prerequisites

### Services

The E2E tests require a running TimescaleDB (PostgreSQL) and Redis instance. The easiest way is to use the dev Docker Compose environment:

```bash
docker compose -f docker/docker-compose.dev.yml up -d
```

This starts TimescaleDB on port 5432 and Redis on port 6379, which match the default config. If your services run on different ports, override them with `E2E_DATABASE_URL` and `E2E_REDIS_URL` (see [Configuration](#configuration)).

### Browser

Install Playwright's browser binaries (one-time setup):

```bash
pnpm --filter @tracearr/e2e exec playwright install chromium
```

### Servers

The test runner automatically starts the API server (port 3000) and web dev server (port 5173) via the `webServer` config in `playwright.config.ts`. You can also start them manually and they'll be reused.

## Running Tests

```bash
# Run all tests headless
pnpm --filter @tracearr/e2e test:e2e

# Open the interactive UI mode (pick & run tests visually)
pnpm --filter @tracearr/e2e test:e2e:ui

# Run tests in a visible browser window
pnpm --filter @tracearr/e2e test:e2e:headed

# Run tests in debug mode (step through with inspector)
pnpm --filter @tracearr/e2e test:e2e:debug

# Open the HTML report from the last run
pnpm --filter @tracearr/e2e test:e2e:report
```

## Configuration

Environment variables are loaded from the root `.env` file. The following can be overridden:

| Variable           | Default                                                  | Description                          |
| ------------------ | -------------------------------------------------------- | ------------------------------------ |
| `E2E_DATABASE_URL` | `postgresql://tracearr:tracearr@localhost:5432/tracearr` | Database connection                  |
| `E2E_REDIS_URL`    | `redis://localhost:6379`                                 | Redis connection                     |
| `CLAIM_CODE`       | `tracearr-e2e-test-claim-code`                           | Claim code for first-time setup gate |

## Test Structure

| File                 | What it tests                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| `auth.setup.ts`      | Authentication setup project — handles first-time signup or login, saves auth state for other tests |
| `auth.spec.ts`       | Login page, unauthenticated redirects, credential login                                             |
| `dashboard.spec.ts`  | Dashboard stat cards, sidebar navigation links                                                      |
| `navigation.spec.ts` | Page navigation for all routes including collapsible sub-categories                                 |
| `rules.spec.ts`      | Create and delete classic (template) and custom rules                                               |
| `settings.spec.ts`   | Settings page tabs and section content                                                              |

## Auth State

The setup project (`auth.setup.ts`) runs first and saves browser storage state to `.auth/user.json`. All other test files reuse this state so they start already logged in. The `.auth/` directory is gitignored.
