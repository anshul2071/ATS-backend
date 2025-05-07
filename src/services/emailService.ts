// src/services/emailService.ts
import nodemailer from "nodemailer";

const host = process.env.EMAIL_HOST;
const portEnv = process.env.EMAIL_PORT;
const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS;

if (!host || !portEnv) {
  throw new Error("Missing EMAIL_HOST or EMAIL_PORT in environment");
}
if (!user || !pass) {
  throw new Error("Missing EMAIL_USER or EMAIL_PASS in environment");
}

const port = parseInt(portEnv, 10);

// create one transporter for all your mails
const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,     // SSL on 465, otherwise STARTTLS
  auth: { user, pass },
});

transporter.verify((err, success) => {
  if (err) {
    console.error("✉️ SMTP configuration error:", err);
  } else {
    console.log("✔️ SMTP server is ready to take messages");
  }
});
function formatDate(d: Date) {
  const date = d.toLocaleDateString();
  const time = d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} at ${time}`;
}

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

export interface OfferEmailPayload {
  to: string
  subject: string
  templateName?: string
  variables?: Record<string, string>
  text?: string
  attachments?: { filename: string; path: string }[]
}
export async function sendOfferEmail(payload: OfferEmailPayload) {
  const { to, subject, text, variables, attachments } = payload
  const body =
    text ??
    `Hello ${variables!.name},\n\n` +
      `We are pleased to offer you the position of ${variables!.position}.\n` +
      `Salary: ${variables!.salary}\n` +
      (variables!.validUntil ? `Please respond by: ${variables!.validUntil}\n` : "") +
      `\nRegards,\n${variables!.recruiter}\n`
  await transporter.sendMail({
    from: `"NEXCRUIT" <${user}>`,
    to,
    subject,
    text: body,
    attachments,
  })
}


export default transporter;
