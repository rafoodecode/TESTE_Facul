import nodemailer from 'nodemailer'
export async function notify(email: string, details: { local: string; evento: string; data: string; turno: string; status: string }) {
  const subject = `Solicitação ${details.status.toLowerCase()} — ${details.evento}`
  const text = `Sua solicitação foi ${details.status.toLowerCase()}.\nLocal: ${details.local}\nEvento: ${details.evento}\nData: ${details.data.split('-').reverse().join('/')}\nTurno: ${details.turno}`
  if (!process.env.SMTP_HOST) { console.info('E-mail de desenvolvimento:', { to: email, subject, text }); return }
  const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: Number(process.env.SMTP_PORT) === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } })
  await transport.sendMail({ from: process.env.SMTP_FROM, to: email, subject, text })
}
