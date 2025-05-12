import { Request, Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import Candidate from '../models/Candidate'
import Assessment from '../models/Assessment'
import { assessmentUpload } from '../middleware/uploadMiddleware'
import { sendOfferEmail, OfferEmailPayload } from '../services/emailService'

export const createAssessment = [
  assessmentUpload,
  async (
    req: Request<{ id: string }, {}, { title: string; remarks?: string; score: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const candidateId = req.params.id
      const { title, remarks, score } = req.body

      if (!mongoose.isValidObjectId(candidateId)) {
        return res.status(400).json({ message: 'Invalid candidate ID' })
      }

      if (!req.file) {
        return res.status(400).json({ message: 'Assessment file is required.' })
      }

      const fileUrl = `/uploads/assessments/${req.file.filename}`

      const assessment = await Assessment.create({
        candidate: new mongoose.Types.ObjectId(candidateId),
        title,
        remarks,
        score: Number(score),
        fileUrl,
      })

      await Candidate.findByIdAndUpdate(candidateId, {
        $push: { assessments: assessment._id },
      })

      const cand = await Candidate.findById(candidateId).select('name email')
      if (cand) {
        const mail: OfferEmailPayload = {
          to: cand.email,
          subject: `📝 New Assessment Assigned: ${assessment.title}`,
          html: `
            <p>Hi ${cand.name},</p>
            <p>We've assigned you a new assessment: <strong>${assessment.title}</strong>.</p>
            <ul>
              <li><strong>Target Score:</strong> ${assessment.score}/100</li>
              ${remarks ? `<li><strong>Notes:</strong> ${remarks}</li>` : ''}
              <li><a href="${process.env.APP_URL}/candidates/${candidateId}/assessments/${assessment._id}/download">Download File</a></li>
            </ul>
            <p>Please complete it as soon as you can.</p>
            <p>Good luck!<br/>Recruitment Team</p>
          `,
        }
        await sendOfferEmail(mail)
      }

      return res.status(201).json(assessment)
    } catch (err) {
      console.error('createAssessment error:', err)
      next(err)
    }
  },
]

export const getAssessments = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const candidateId = req.params.id

    if (!mongoose.isValidObjectId(candidateId)) {
      return res.status(400).json({ message: 'Invalid candidate ID' })
    }

    const exists = await Candidate.exists({ _id: candidateId })
    if (!exists) {
      return res.status(404).json({ message: 'Candidate not found' })
    }

    const assessments = await Assessment.find({ candidate: candidateId }).sort({ createdAt: -1 })
    return res.json(assessments)
  } catch (err) {
    console.error('getAssessments error:', err)
    next(err)
  }
}

export const getAssessment = async (
  req: Request<{ id: string; aid: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: candidateId, aid: assessmentId } = req.params

    if (
      !mongoose.isValidObjectId(candidateId) ||
      !mongoose.isValidObjectId(assessmentId)
    ) {
      return res.status(400).json({ message: 'Invalid ID(s)' })
    }

    const assessment = await Assessment.findOne({
      _id: assessmentId,
      candidate: candidateId,
    })

    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' })
    }

    return res.json(assessment)
  } catch (err) {
    console.error('getAssessment error:', err)
    next(err)
  }
}
