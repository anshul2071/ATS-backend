// src/controllers/interviewController.ts

import { Request, Response, NextFunction } from 'express'
import cron from 'node-cron'
import Interview, { IInterviewDocument } from '../models/Interview'
import Candidate from '../models/Candidate'
import {
  sendInterviewScheduledEmail,
  sendInterviewReminderEmail,
} from '../services/emailService'
import { createGoogleMeetEvent } from '../utils/googleCalendar'
import { INTERVIEW_STAGES, InterviewStage } from '../constants/pipelineStages'

// Log critical env vars at startup for debugging
console.log('▶ GOOGLE_CALENDAR_ID =', process.env.GOOGLE_CALENDAR_ID)
console.log('▶ OAUTH_CLIENT_ID      =', process.env.OAUTH_CLIENT_ID?.slice(0, 10) + '…')
console.log('▶ GOOGLE_CLIENT_EMAIL  =', process.env.GOOGLE_CLIENT_EMAIL)

interface ScheduleInterviewBody {
  candidate: string                 // Mongo _id of the candidate
  pipelineStage: InterviewStage     // one of INTERVIEW_STAGES
  date: string                      // ISO date string
}

// POST /api/interviews
export const scheduleInterview = async (
  req: Request<{}, IInterviewDocument | { message: string }, ScheduleInterviewBody>,
  res: Response<IInterviewDocument | { message: string }>,
  next: NextFunction
) => {
  try {
    // 1) Auth check
    const user = (req as any).user
    if (!user?.email) {
      return res.status(401).json({ message: 'Not authorized' })
    }
    const interviewerEmail = user.email

    // 2) Validate payload
    const { candidate: candId, pipelineStage, date } = req.body
    if (!candId || !pipelineStage || !date) {
      return res
        .status(400)
        .json({ message: 'candidate, pipelineStage and date are required' })
    }
    if (!INTERVIEW_STAGES.includes(pipelineStage)) {
      return res.status(400).json({
        message: `Invalid pipelineStage. Must be one of: ${INTERVIEW_STAGES.join(
          ', '
        )}`,
      })
    }

    // 3) Load candidate details
    const candidate = await Candidate.findById(candId).lean()
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' })
    }

    // 4) Compute start/end times (30-minute slot)
    const start = new Date(date).toISOString()
    const end = new Date(Date.parse(date) + 30 * 60 * 1000).toISOString()

    // 5) Create a real Google Meet event
    let meetLink: string
    try {
      meetLink = await createGoogleMeetEvent({
        summary: `Interview with ${candidate.name}`,
        start,
        end,
        attendees: [
          { email: candidate.email },
          { email: interviewerEmail },
        ],
      })
    } catch (googleErr: any) {
      console.error('Google Meet creation failed:', googleErr)
      return res
        .status(502)
        .json({ message: `Could not generate Meet link: ${googleErr.message}` })
    }

    // 6) Persist interview in MongoDB
    const created = await Interview.create({
      candidate:        candId,
      pipelineStage,
      interviewerEmail,
      date:             new Date(date),
      meetLink,
    })

    // 7) Populate the saved record for emails & response
    const full = await Interview.findById(created._id)
      .populate<{ candidate: { name: string; email: string } }>(
        'candidate',
        'name email'
      )
      .lean()
    if (!full) {
      return res.status(500).json({ message: 'Failed to load interview.' })
    }

    // 8) Send the “Interview Scheduled” email immediately
    await sendInterviewScheduledEmail({
      candidate:        full.candidate,
      interviewerEmail,
      date:             full.date,
      meetLink:         full.meetLink,
    })

    // 9) Set up a 24-hour reminder via cron (UTC timezone)
    const remindAt = new Date(full.date)
    remindAt.setDate(remindAt.getDate() - 1)
    // cron format: minute hour day month day-of-week
    const cronExpr = [
      remindAt.getUTCMinutes(),
      remindAt.getUTCHours(),
      remindAt.getUTCDate(),
      remindAt.getUTCMonth() + 1,
      '*',
    ].join(' ')
    cron.schedule(
      cronExpr,
      async () => {
        try {
          await sendInterviewReminderEmail({
            candidate:        full.candidate,
            interviewerEmail,
            date:             full.date,
            meetLink:         full.meetLink,
          })
        } catch (err) {
          console.error('Reminder email failed:', err)
        }
      },
      { timezone: 'UTC' }
    )

    // 10) Return the populated interview record
    return res.status(201).json(full as any)
  } catch (err: any) {
    console.error('scheduleInterview error:', err)
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message })
    }
    // Return JSON 500 instead of falling through to default handler
    return res.status(500).json({ message: err.message })
  }
}

// GET /api/interviews// GET /api/interviews
export const listInterviews = async (
  req: Request,
  res: Response<IInterviewDocument[] | { message: string }>,
  next: NextFunction
) => {
  try {
    const interviews = await Interview.find()
      .populate('candidate', 'name email')
      .sort({ date: -1 })
      .lean()
    return res.status(200).json(interviews)
  } catch (err: any) {
    console.error('listInterviews error:', err)
    return res.status(500).json({ message: err.message })
  }
}
// GET /api/interviews/:id
export const getInterviewById = async (
  req: Request<{ id: string }>,
  res: Response<IInterviewDocument | { message: string }>,
  next: NextFunction
) => {
  try {
    const interview = await Interview.findById(req.params.id)
      .populate('candidate', 'name email')
      .lean()
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' })
    }
    return res.status(200).json(interview)
  } catch (err: any) {
    console.error('getInterviewById error:', err)
    return res.status(500).json({ message: err.message })
  }
}

// PUT /api/interviews/:id
export const updateInterview = async (
  req: Request<{ id: string }, IInterviewDocument | { message: string }, Partial<ScheduleInterviewBody>>,
  res: Response<IInterviewDocument | { message: string }>,
  next: NextFunction
) => {
  try {
    const { pipelineStage, date } = req.body
    if (pipelineStage === undefined && date === undefined) {
      return res
        .status(400)
        .json({ message: 'At least one of pipelineStage or date is required' })
    }
    if (
      pipelineStage &&
      !INTERVIEW_STAGES.includes(pipelineStage as InterviewStage)
    ) {
      return res.status(400).json({
        message: `Invalid pipelineStage. Must be one of: ${INTERVIEW_STAGES.join(
          ', '
        )}`,
      })
    }

    const updated = await Interview.findByIdAndUpdate(
      req.params.id,
      {
        ...(pipelineStage && { pipelineStage }),
        ...(date && { date: new Date(date) }),
      },
      { new: true }
    )
      .populate('candidate', 'name email')
      .lean()

    if (!updated) {
      return res.status(404).json({ message: 'Interview not found' })
    }
    return res.status(200).json(updated)
  } catch (err: any) {
    console.error('updateInterview error:', err)
    return res.status(500).json({ message: err.message })
  }
}

// DELETE /api/interviews/:id
export const deleteInterview = async (
  req: Request<{ id: string }>,
  res: Response<{ message: string }>,
  next: NextFunction
) => {
  try {
    const deleted = await Interview.findByIdAndDelete(req.params.id)
    if (!deleted) {
      return res.status(404).json({ message: 'Interview not found' })
    }
    return res.status(200).json({ message: 'Interview deleted successfully' })
  } catch (err: any) {
    console.error('deleteInterview error:', err)
    return res.status(500).json({ message: err.message })
  }
}
