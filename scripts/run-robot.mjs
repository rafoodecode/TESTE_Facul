// Inicia o SGE e o SMTP local; executa Robot somente contra banco local.
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const raiz = process.cwd()
const valores = Object.fromEntries(readFileSync(join(raiz, '.env'), 'utf8').split(/\r?\n/)
  .filter(linha => /^[A-Z_]+=/.test(linha))
  .map(linha => { const pos = linha.indexOf('='); return [linha.slice(0, pos), linha.slice(pos + 1).trim().replace(/^"|"$/g, '')] }))
const banco = process.env.DATABASE_URL || valores.DATABASE_URL
if (!banco || !['localhost', '127.0.0.1'].includes(new URL(banco).hostname)) {
  throw new Error('Os testes Robot só podem usar PostgreSQL local.')
}
const ambiente = { ...process.env, ...valores, DATABASE_URL: banco,
  SMTP_HOST: '127.0.0.1', SMTP_PORT: '1025', SMTP_FROM: 'SGE Robot <qa@instituicao.edu.br>' }
const driver = join(raiz, '.robot-bin', 'chromedriver-win64')
if (existsSync(driver)) ambiente.PATH = driver + (process.platform === 'win32' ? ';' : ':') + (process.env.PATH || '')
const python = process.platform === 'win32' ? join(raiz, '.venv-robot', 'Scripts', 'python.exe') : join(raiz, '.venv-robot', 'bin', 'python')
if (!existsSync(python)) throw new Error('Crie .venv-robot e instale requirements-robot.txt antes de executar.')
mkdirSync(join(raiz, 'robot-results'), { recursive: true })
const filhos = []

function iniciar(comando, args) {
  const processo = spawn(comando, args, { cwd: raiz, env: ambiente, stdio: 'inherit', windowsHide: true })
  filhos.push(processo)
  return processo
}

async function aguardar(url, processo) {
  for (let tentativa = 0; tentativa < 100; tentativa++) {
    if (processo.exitCode !== null) throw new Error(`Servidor saiu antes de responder: ${url}`)
    try { if ((await fetch(url)).ok) return } catch { /* Aguarda a porta local. */ }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  throw new Error(`Servidor não respondeu: ${url}`)
}

try {
  const smtp = iniciar(process.execPath, ['--import', 'tsx', 'tests/support/smtp.ts'])
  await aguardar('http://127.0.0.1:1026/health', smtp)
  const app = iniciar(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3100'])
  await aguardar('http://127.0.0.1:3100/acesso', app)
  const robot = iniciar(python, ['-m', 'robot', '--outputdir', 'robot-results', '--output', 'output.xml', '--log', 'log.html', '--report', 'report.html', ...process.argv.slice(2), 'tests/robot/sge.robot'])
  const codigo = await new Promise((resolve, reject) => { robot.on('exit', resolve); robot.on('error', reject) })
  process.exitCode = codigo ?? 1
} finally {
  for (const filho of filhos.reverse()) if (filho.exitCode === null) filho.kill()
}
