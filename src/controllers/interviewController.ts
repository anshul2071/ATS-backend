// src/controllers/interviewController.ts
import { Request, Response, NextFunction } from "express"
import cron from "node-cron"
import Interview, { IInterviewDocument } from "../models/Interview"
import {
  sendInterviewScheduledEmail,
  sendInterviewReminderEmail,
} from "../services/emailService"

type InterviewPipelineStage =
  | "Shortlisted"
  | "HR Screening"
  | "Technical Interview"
  | "Managerial Interview"

const INTERVIEW_PIPELINE_STAGES: InterviewPipelineStage[] = [
  "Shortlisted",
  "HR Screening",
  "Technical Interview",
  "Managerial Interview",
]

interface ScheduleInterviewBody {
  candidate: string
  pipelineStage: InterviewPipelineStage
  date: string
}

function makeGoogleMeetLink(): string {
  const id = Math.random().toString(36).substring(2, 11)
  return `https://meet.google.com/${id}`
}

export const scheduleInterview = async (
  req: Request<{}, IInterviewDocument | { message: string }, ScheduleInterviewBody>,
  res: Response<IInterviewDocument | { message: string }>,
  next: NextFunction
) => {
  // 1) require authenticated user
  const user = (req as any).user
  if (!user || !user.email) {
    return res.status(401).json({ message: "Not authorized" })
  }
  const interviewerEmail = user.email

  // 2) validate
  const { candidate, pipelineStage, date } = req.body
  if (!candidate || !pipelineStage || !date) {
    return res
      .status(400)
      .json({ message: "candidate, pipelineStage and date are required" })
  }
  if (!INTERVIEW_PIPELINE_STAGES.includes(pipelineStage)) {
    return res.status(400).json({
      message: `Invalid pipelineStage. Must be one of: ${INTERVIEW_PIPELINE_STAGES.join(
        ", "
      )}`,
    })
  }

  try {
    // 3) create record
    const meetLink = makeGoogleMeetLink()
    const created = await Interview.create({
      candidate,
      pipelineStage,
      interviewerEmail,
      date: new Date(date),
      meetLink,
    })

    // 4) populate candidate for email
    const full = await Interview.findById(created._id)
      .populate<{ candidate: { name: string; email: string } }>(
        "candidate",
        "name email"
      )
      .lean()
    if (!full) {
      return res.status(500).json({ message: "Failed to load interview." })
    }

    // 5) send immediate “scheduled” email
    await sendInterviewScheduledEmail({
      candidate: full.candidate,
      interviewerEmail,
      date: full.date,
      meetLink: full.meetLink,
    })

    // 6) schedule 24h‐before reminder
    const remindAt = new Date(full.date)
    remindAt.setDate(remindAt.getDate() - 1)
    const cronExpr = [
      remindAt.getUTCMinutes(),
      remindAt.getUTCHours(),
      remindAt.getUTCDate(),
      remindAt.getUTCMonth() + 1,
      "*",
    ].join(" ")
    cron.schedule(
      cronExpr,
      async () => {
        try {
          await sendInterviewReminderEmail({
            candidate: full.candidate,
            interviewerEmail,
            date: full.date,
            meetLink: full.meetLink,
          })
        } catch (err) {
          console.error("Reminder email failed:", err)
        }
      },
      { timezone: "UTC" }
    )

    return res.status(201).json(full as any)
  } catch (err: any) {
    console.error("scheduleInterview error:", err)
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message })
    }
    next(err)
  }
}

export const listInterviews = async (
  req: Request,
  res: Response<IInterviewDocument[] | { message: string }>,
  next: NextFunction
) => {
  try {
    const interviews = await Interview.find()
      .populate("candidate", "name email")
      .sort({ date: -1 })
      .lean()
    return res.status(200).json(interviews)
  } catch (err) {
    next(err)
  }
}

export const getInterviewById = async (
  req: Request<{ id: string }>,
  res: Response<IInterviewDocument | { message: string }>,
  next: NextFunction
) => {
  try {
    const interview = await Interview.findById(req.params.id)
      .populate("candidate", "name email")
      .lean()
    if (!interview) {
      return res.status(404).json({ message: "Interview not found" })
    }
    return res.status(200).json(interview)
  } catch (err) {
    next(err)
  }
}

export const updateInterview = async (
  req: Request<{ id: string }, IInterviewDocument | { message: string }, Partial<ScheduleInterviewBody>>,
  res: Response<IInterviewDocument | { message: string }>,
  next: NextFunction
) => {
  const { pipelineStage, date } = req.body
  if (pipelineStage === undefined && date === undefined) {
    return res
      .status(400)
      .json({ message: "At least one of pipelineStage or date is required" })
  }
  if (pipelineStage && !INTERVIEW_PIPELINE_STAGES.includes(pipelineStage)) {
    return res.status(400).json({
      message: `Invalid pipelineStage. Must be one of: ${INTERVIEW_PIPELINE_STAGES.join(
        ", "
      )}`,
    })
  }
  try {
    const updated = await Interview.findByIdAndUpdate(
      req.params.id,
      {
        ...(pipelineStage && { pipelineStage }),
        ...(date && { date: new Date(date) }),
      },
      { new: true }
    )
      .populate("candidate", "name email")
      .lean()
    if (!updated) {
      return res.status(404).json({ message: "Interview not found" })
    }
    return res.status(200).json(updated)
  } catch (err) {
    next(err)
  }
}

export const deleteInterview = async (
  req: Request<{ id: string }>,
  res: Response<{ message: string }>,
  next: NextFunction
) => {
  try {
    const deleted = await Interview.findByIdAndDelete(req.params.id)
    if (!deleted) {
      return res.status(404).json({ message: "Interview not found" })
    }
    return res.status(200).json({ message: "Interview deleted successfully" })
  } catch (err) {
    next(err)
  }
}
