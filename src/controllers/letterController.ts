// src/controllers/letterController.ts

import { Request, Response } from 'express'
import mongoose from 'mongoose'
import dayjs from 'dayjs'
import Candidate from '../models/Candidate'
import Letter, { ILetter, TemplateType } from '../models/Letter'
import transporter from '../services/emailService'

interface CreateLetterBody {
  templateType: TemplateType
  position?: string
  technology?: string
  startingDate?: string
  salary?: number
  probationDate?: string
  acceptanceDeadline?: string
}

export const createLetter = async (
  req: Request<{ candidateId: string }, {}, CreateLetterBody>,
  res: Response
) => {
  try {
    const { candidateId } = req.params
    const {
      templateType,
      position,
      technology,
      startingDate,
      salary,
      probationDate,
      acceptanceDeadline,
    } = req.body

    if (!['offer', 'rejection'].includes(templateType)) {
      return res.status(400).json({ message: 'templateType must be "offer" or "rejection"' })
    }

    if (templateType === 'offer') {
      const missing = [
        position ? '' : 'position',
        technology ? '' : 'technology',
        startingDate ? '' : 'startingDate',
        salary != null ? '' : 'salary',
        probationDate ? '' : 'probationDate',
        acceptanceDeadline ? '' : 'acceptanceDeadline',
      ].filter(f => f)
      if (missing.length) {
        return res.status(400).json({ message: `Missing fields for offer: ${missing.join(', ')}` })
      }
    }

    const candidate = await Candidate.findById(candidateId).select('name email status letters')
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' })
    }
    if (templateType === 'offer' && candidate.status !== 'Hired') {
      return res.status(400).json({ message: 'Candidate must be Hired to create an offer' })
    }

    const letter = await Letter.create({
      candidate:          new mongoose.Types.ObjectId(candidateId),
      templateType,
      position:           position ?? '',
      technology:         technology ?? '',
      startingDate:       startingDate ? new Date(startingDate) : undefined,
      salary:             salary ?? 0,
      probationDate:      probationDate ? new Date(probationDate) : undefined,
      acceptanceDeadline: acceptanceDeadline ? new Date(acceptanceDeadline) : undefined,
      sentTo:             candidate.email,
    } as ILetter)

    candidate.letters.push(letter._id)
    await candidate.save()
    try {
      candidate.letters.push(letter._id);
      await candidate.save();
    } catch (err) {
      console.error('Error saving letter reference:', err);
      throw err;
    }
    

    return res.status(201).json(letter)
  } catch (err: any) {
    const status = err.name === 'ValidationError' ? 400 : 500
    return res.status(status).json({ message: err.message })
  }
}

export const sendLetter = async (
  req: Request<{ candidateId: string; letterId: string }>,
  res: Response
) => {
  try {
    const { candidateId, letterId } = req.params

    const letter = await Letter.findOne({ _id: letterId, candidate: candidateId })
    const candidate = await Candidate.findById(candidateId).select('name email status')
    if (!letter || !candidate) {
      return res.status(404).json({ message: 'Letter or candidate not found' })
    }
    if (letter.templateType === 'offer' && candidate.status !== 'Hired') {
      return res.status(400).json({ message: 'Candidate must be Hired to send an offer' })
    }

    let subject: string, html: string

    if (letter.templateType === 'offer') {
      subject = `🎉 Offer for ${candidate.name}`
      html = `
        <p>Dear ${candidate.name},</p>
        <p>We are pleased to offer you the <strong>${letter.position}</strong> role on our <strong>${letter.technology}</strong> team.</p>
        <ul>
          <li><strong>Start Date:</strong> ${dayjs(letter.startingDate).format('MMMM D, YYYY')}</li>
          <li><strong>Salary:</strong> $${letter.salary?.toLocaleString()}</li>
          <li><strong>Probation Ends:</strong> ${dayjs(letter.probationDate).format('MMMM D, YYYY')}</li>
          <li><strong>Accept By:</strong> ${dayjs(letter.acceptanceDeadline).format('MMMM D, YYYY')}</li>
        </ul>
        <p>Please reply by the deadline above to confirm.</p>
        <p>Best regards,<br/>Recruitment Team</p>
      `
    } else {
      subject = `🔔 Application Update for ${candidate.name}`
      html = `
        <p>Dear ${candidate.name},</p>
        <p>Thank you for applying. Unfortunately, we will not be moving forward at this time.</p>
        <p>We appreciate your interest and wish you the best.</p>
      `
    }

    await transporter.sendMail({
      from: `"NEXCRUIT" <${process.env.EMAIL_USER}>`,
      to:   candidate.email,
      subject,
      html,
    })

    return res.status(200).json({ message: 'Email sent', letter })
  } catch (err: any) {
    return res.status(500).json({ message: err.message })
  }
}

export const getLetters = async (
  req: Request<{ candidateId: string }, {}, {}, { type?: string }>,
  res: Response
) => {
  try {
    const { candidateId } = req.params
    const { type } = req.query

    const exists = await Candidate.exists({ _id: candidateId })
    if (!exists) {
      return res.status(404).json({ message: 'Candidate not found' })
    }

    const filter: any = { candidate: candidateId }
    if (type === 'offer' || type === 'rejection') {
      filter.templateType = type
    }

    const letters = await Letter.find(filter).sort({ createdAt: -1 })
    return res.status(200).json(letters)
  } catch (err: any) {
    return res.status(500).json({ message: err.message })
  }
}

export const getLetter = async (
  req: Request<{ candidateId: string; letterId: string }>,
  res: Response
) => {
  try {
    const { candidateId, letterId } = req.params

    const letter = await Letter.findOne({ _id: letterId, candidate: candidateId })
    if (!letter) {
      return res.status(404).json({ message: 'Letter not found' })
    }
    return res.status(200).json(letter)
  } catch (err: any) {
    return res.status(500).json({ message: err.message })
  }
}
