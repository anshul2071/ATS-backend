// src/utils/email.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host:     process.env.SMTP_HOST,
  port:    +process.env.SMTP_PORT!,
  secure:   true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send a one-off email.
 */
export async function sendEmail(opts: {
  to:      string;
  subject: string;
  text?:   string;
  html?:   string;
}) {
  await transporter.sendMail({
    from:    `"${process.env.COMPANY_NAME || "ATS Pro"}" <no-reply@${process.env.SMTP_DOMAIN}>`,
    to:       opts.to,
    subject: opts.subject,
    text:    opts.text,
    html:    opts.html,
  });
}