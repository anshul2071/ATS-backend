import nodemailer from 'nodemailer'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: Number(process.env.EMAIL_PORT) === 465,
  auth: {
    user: process.env.EMAIL_USER!,
    pass: process.env.EMAIL_PASS!
  }
})

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<void> {
  const text = html.replace(/<\/?[^>]+(>|$)/g, '')
  await transporter.sendMail({
    from: `"ATS System" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html
  })
}

export async function sendOfferEmail(to: string, details: {
  candidateName: string
  position: string
  salary: string
  startDate: string
}): Promise<void> {
  const subject = `Offer Letter for ${details.position}`
  const html = `
    <p>Dear ${details.candidateName},</p>
    <p>We are pleased to offer you the position of <strong>${details.position}</strong> at our company.</p>
    <p>Your compensation will be <strong>${details.salary}</strong> and your expected start date is <strong>${details.startDate}</strong>.</p>
    <p>Please reply to this email to confirm acceptance.</p>
    <p>Regards,<br/>Recruitment Team</p>
  `
  await sendEmail({ to, subject, html })
}
