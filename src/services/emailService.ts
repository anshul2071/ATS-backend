// src/services/emailService.ts

import nodemailer from "nodemailer";

const host = process.env.EMAIL_HOST;
const portEnv = process.env.EMAIL_PORT;
const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS;

if (!host || !portEnv || !user || !pass) {
  throw new Error(
    "Missing one of EMAIL_HOST, EMAIL_PORT, EMAIL_USER or EMAIL_PASS in environment"
  );
}

const port = parseInt(portEnv, 10);

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
});

transporter.verify((err, success) => {
  if (err) {
    console.error("✉️ SMTP configuration error:", err);
  } else {
    console.log("✔️ SMTP server is ready to take messages");
  }
});

/** Simple “Jan 1, 2025 at 03:00 PM” formatter */
function formatDate(d: Date) {
  const date = d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} at ${time}`;
}

export interface OfferEmailPayload {
  to: string;
  subject: string;
  /** Plain‐text fallback */
  text?: string;
  /** HTML body (preferred) */
  html?: string;
  attachments?: { filename: string; path: string }[];
}

/**
 * Sends a generic “offer” or “rejection” email.
 * If `html` is provided, it will be used; otherwise `text`.
 */
export async function sendOfferEmail(payload: OfferEmailPayload) {
  const { to, subject, text, html, attachments } = payload;

  await transporter.sendMail({
    from: `"NEXCRUIT" <${user}>`,
    to,
    subject,
    text,
    html,
    attachments,
  });
}

// (unchanged) Interview scheduling / reminder helpers...

export async function sendInterviewScheduledEmail(interview: {
  candidate: { name: string; email: string };
  interviewerEmail: string;
  date: Date;
  meetLink: string;
}) {
  const when = formatDate(interview.date);
  const subject = `Interview Scheduled for ${when}`;
  const text = `
Hello ${interview.candidate.name},

Your interview has been scheduled for ${when}.
Google Meet Link: ${interview.meetLink}

Interviewer: ${interview.interviewerEmail}

Good luck!
`;

  await transporter.sendMail({
    from: `"NEXCRUIT" <${user}>`,
    to: interview.candidate.email,
    subject,
    text,
  });

  await transporter.sendMail({
    from: `"NEXCRUIT" <${user}>`,
    to: interview.interviewerEmail,
    subject,
    text,
  });
}

export async function sendInterviewReminderEmail(interview: {
  candidate: { name: string; email: string };
  interviewerEmail: string;
  date: Date;
  meetLink: string;
}) {
  const when = formatDate(interview.date);
  const subject = `Reminder: Interview Tomorrow at ${when}`;
  const text = `
Hi ${interview.candidate.name},

This is a reminder that your interview is tomorrow at ${when}.
Google Meet Link: ${interview.meetLink}

See you then!
`;

  await transporter.sendMail({
    from: `"NEXCRUIT" <${user}>`,
    to: interview.candidate.email,
    subject,
    text,
  });

  await transporter.sendMail({
    from: `"NEXCRUIT" <${user}>`,
    to: interview.interviewerEmail,
    subject,
    text,
  });
}

export default transporter;
