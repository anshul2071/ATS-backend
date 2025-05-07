// src/utils/email.ts
import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
dotenv.config()

const user = process.env.EMAIL_USER!
const pass = process.env.EMAIL_PASS!
if (!user || !pass) {
  throw new Error('Missing EMAIL_USER or EMAIL_PASS in environment')
}

export interface MailOptions {
  to: string
  subject: string
  text?: string
  html?: string
  attachments?: { filename: string; path: string }[]
}

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user, pass },
})

transporter.verify().then(
  () => console.log('✔️ Gmail SMTP ready'),
  err => console.error('❌ Gmail SMTP error:', err)
)

export async function sendEmail(opts: MailOptions) {
  await transporter.sendMail({
    from: `"ATS Pro" <${user}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    attachments: opts.attachments,
  })
}
