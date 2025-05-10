// src/controllers/letterController.ts

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Candidate from '../models/Candidate';
import Letter, { TemplateType } from '../models/Letter';
import transporter from '../services/emailService';

interface SendLetterBody {
  templateType: TemplateType;
  position?: string;
  technology?: string;
  startingDate?: string;
  salary?: number;
  probationDate?: string;
  acceptanceDeadline?: string;
}

export const sendLetter = async (
  req: Request<{ candidateId: string }, any, SendLetterBody>,
  res: Response
) => {
  try {
    const { candidateId } = req.params;
    const {
      templateType,
      position,
      technology,
      startingDate,
      salary,
      probationDate,
      acceptanceDeadline,
    } = req.body;

    // ─── Basic validation ───────────────────────────────────────────────────────
    if (!templateType || !['offer', 'rejection'].includes(templateType)) {
      return res.status(400).json({ message: 'Invalid or missing templateType' });
    }
    if (templateType === 'offer') {
      if (
        !position ||
        !technology ||
        !startingDate ||
        salary == null ||
        !probationDate ||
        !acceptanceDeadline
      ) {
        return res
          .status(400)
          .json({ message: 'Missing one or more required offer fields' });
      }
    }

    // ─── Fetch & status check ───────────────────────────────────────────────────
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }
    if (templateType === 'offer' && candidate.status !== 'Hired') {
      return res
        .status(400)
        .json({ message: 'Cannot send offer: candidate is not yet hired' });
    }

    // ─── Build email ────────────────────────────────────────────────────────────
    let subject: string;
    let html: string;
    if (templateType === 'offer') {
      subject = '🎉 Your Offer Letter from Our Company';
      html = `
        <p>Dear ${candidate.name},</p>
        <p>We are pleased to offer you the <strong>${position}</strong> role on our <strong>${technology}</strong> team.</p>
        <ul>
<li><strong>Start Date:</strong> ${new Date(startingDate ?? '').toLocaleDateString()}</li>          <li><strong>Salary:</strong> $${salary!.toLocaleString()}</li>
          <li><strong>Probation Ends:</strong> ${new Date(probationDate!).toLocaleDateString()}</li>
          <li><strong>Accept by:</strong> ${new Date(acceptanceDeadline!).toLocaleDateString()}</li>
        </ul>
        <p>Please reply to this email by the deadline above to confirm.</p>
        <p>Best regards,<br/>Recruitment Team</p>
      `;
    } else {
      subject = '🔔 Your Application Status';
      html = `
        <p>Dear ${candidate.name},</p>
        <p>Thank you for applying for the <strong>${position ?? 'role'}</strong> role. After careful review, we will not be moving forward with your application at this time.</p>
        <p>We appreciate your interest and wish you the very best.</p>
        <p>Sincerely,<br/>Recruitment Team</p>
      `;
    }

    // ─── Send email ─────────────────────────────────────────────────────────────
    await transporter.sendMail({
      from: `"NEXCRUIT" <${process.env.EMAIL_USER}>`,
      to: candidate.email,
      subject,
      html,
    });

    // ─── Persist to DB ──────────────────────────────────────────────────────────
    const letter = await Letter.create({
      candidate:           new mongoose.Types.ObjectId(candidateId),
      templateType,
      position:            position ?? '',
      technology:          technology ?? '',
      startingDate:        startingDate ? new Date(startingDate) : undefined,
      salary:              salary ?? 0,
      probationDate:       probationDate ? new Date(probationDate) : undefined,
      acceptanceDeadline:  acceptanceDeadline ? new Date(acceptanceDeadline) : undefined,
      sentTo:              candidate.email,
    });

    candidate.letters.push(letter._id);
    await candidate.save();

    return res.status(201).json(letter);
  } catch (err: any) {
    console.error('🔥 sendLetter error:', err);
    return res
      .status(500)
      .json({ message: err.message || 'Internal server error sending letter' });
  }
};

export const getLetters = async (
  req: Request<{ candidateId: string }, any, any, { type?: string }>,
  res: Response
) => {
  try {
    const { candidateId } = req.params;
    const { type }        = req.query;

    const filter: any = { candidate: candidateId };
    if (type === 'offer' || type === 'rejection') {
      filter.templateType = type;
    }

    const letters = await Letter.find(filter).sort({ createdAt: -1 });
    return res.json(letters);
  } catch (err: any) {
    console.error('🔥 getLetters error:', err);
    return res
      .status(500)
      .json({ message: err.message || 'Internal server error fetching letters' });
  }
};

export const getLetter = async (
  req: Request<{ candidateId: string; letterId: string }>,
  res: Response
) => {
  try {
    const { candidateId, letterId } = req.params;
    const letter = await Letter.findOne({
      _id: candidateId,
      candidate: letterId,
    });
    if (!letter) {
      return res.status(404).json({ message: 'Letter not found' });
    }
    return res.json(letter);
  } catch (err: any) {
    console.error('🔥 getLetter error:', err);
    return res
      .status(500)
      .json({ message: err.message || 'Internal server error fetching letter' });
  }
};
