import { defineConfig } from '@playwright/test'
import { readFileSync } from 'node:fs'

// A suíte usa o banco local explicitamente; variáveis de CI têm prioridade.
try {
  const local = readFileSync('.env', 'utf8')
  for (const key of ['DATABASE_URL', 'SESSION_SECRET', 'SEED_PASSWORD']) {
    const value = local.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim().replace(/^"|"$/g, '')
    if (!process.env[key] && value) process.env[key] = value
  }
} catch { /* O CI fornece as variáveis sem arquivo local. */ }

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/resultados.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:3100',
    channel: process.env.CI ? undefined : 'chrome',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    { command: 'node --import tsx tests/support/smtp.ts', url: 'http://127.0.0.1:1026/health', reuseExistingServer: false, timeout: 30_000 },
    { command: 'npm run dev -- --hostname 127.0.0.1 --port 3100', url: 'http://127.0.0.1:3100/acesso', reuseExistingServer: false, timeout: 120_000,
      env: { SMTP_HOST: '127.0.0.1', SMTP_PORT: '1025', SMTP_FROM: 'SGE QA <qa@instituicao.edu.br>' } },
  ],
})
