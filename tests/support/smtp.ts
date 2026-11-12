import { createServer as createTcpServer } from 'node:net'
import { createServer as createHttpServer } from 'node:http'

// Captura SMTP restrita à máquina local para validar a notificação de ponta a ponta.
const mensagens: string[] = []
createTcpServer(socket => {
  socket.write('220 SGE QA SMTP\r\n')
  let buffer = ''
  let dados = false
  let mensagem = ''
  socket.on('data', chunk => {
    buffer += chunk.toString()
    while (buffer.includes('\n')) {
      const pos = buffer.indexOf('\n')
      const linha = buffer.slice(0, pos).replace(/\r$/, '')
      buffer = buffer.slice(pos + 1)
      if (dados) {
        if (linha === '.') { mensagens.push(mensagem); mensagem = ''; dados = false; socket.write('250 OK\r\n') }
        else mensagem += `${linha}\n`
      } else if (/^(EHLO|HELO)/i.test(linha)) socket.write('250-localhost\r\n250 OK\r\n')
      else if (/^DATA/i.test(linha)) { dados = true; socket.write('354 Continue\r\n') }
      else if (/^QUIT/i.test(linha)) { socket.write('221 Bye\r\n'); socket.end() }
      else socket.write('250 OK\r\n')
    }
  })
}).listen(1025, '127.0.0.1')

createHttpServer((req, res) => {
  res.setHeader('content-type', 'application/json')
  if (req.url === '/health') res.end(JSON.stringify({ ok: true }))
  else if (req.url === '/messages' && req.method === 'GET') res.end(JSON.stringify(mensagens))
  else if (req.url === '/messages' && req.method === 'DELETE') { mensagens.length = 0; res.end(JSON.stringify({ ok: true })) }
  else { res.statusCode = 404; res.end('{}') }
}).listen(1026, '127.0.0.1')
