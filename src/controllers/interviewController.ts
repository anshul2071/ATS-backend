// src/controllers/interviewController.ts
import { Request, Response, NextFunction } from 'express'
import Interview, { IInterview } from '../models/Interview'

interface ScheduleInterviewBody {
  candidate: string
  pipelineStage: string
  interviewer: string
  date: string
}

export async function scheduleInterview(
  req: Request<{}, IInterview | { message: string }, ScheduleInterviewBody>,
  res: Response<IInterview | { message: string }>,
  next: NextFunction
) {
  const { candidate, pipelineStage, interviewer, date } = req.body
  if (!candidate || !pipelineStage || !interviewer || !date) {
    return res
      .status(400)
      .json({ message: 'candidate, pipelineStage, interviewer and date are all required' })
  }
  try {
    const interview = await Interview.create({
      candidate,
      pipelineStage,
      interviewer,
      date: new Date(date),
    })
    return res.status(201).json(interview)
  } catch (err) {
    next(err)
  }
}

export async function listInterviews(
  req: Request,
  res: Response<IInterview[] | { message: string }>,
  next: NextFunction
) {
  try {
    const interviews = await Interview.find()
      .populate('candidate', 'name email')
      .sort({ date: -1 })
      .exec()
    return res.status(200).json(interviews)
  } catch (err) {
    next(err)
  }
}

export async function getInterviewById(
  req: Request<{ id: string }>,
  res: Response<IInterview | { message: string }>,
  next: NextFunction
) {
  try {
    const interview = await Interview.findById(req.params.id).populate('candidate', 'name email')
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' })
    }
    return res.status(200).json(interview)
  } catch (err) {
    next(err)
  }
}

export async function updateInterview(
  req: Request<{ id: string }, IInterview | { message: string }, Partial<ScheduleInterviewBody>>,
  res: Response<IInterview | { message: string }>,
  next: NextFunction
) {
  const { pipelineStage, interviewer, date } = req.body
  if (pipelineStage === undefined && interviewer === undefined && date === undefined) {
    return res.status(400).json({ message: 'At least one of pipelineStage, interviewer, or date is required' })
  }
  try {
    const updated = await Interview.findByIdAndUpdate(
      req.params.id,
      {
        ...(pipelineStage !== undefined && { pipelineStage }),
        ...(interviewer !== undefined && { interviewer }),
        ...(date !== undefined && { date: new Date(date) }),
      },
      { new: true }
    )
    if (!updated) {
      return res.status(404).json({ message: 'Interview not found' })
    }
    return res.status(200).json(updated)
  } catch (err) {
    next(err)
  }
}

export async function deleteInterview(
  req: Request<{ id: string }>,
  res: Response<{ message: string }>,
  next: NextFunction
) {
  try {
    const deleted = await Interview.findByIdAndDelete(req.params.id)
    if (!deleted) {
      return res.status(404).json({ message: 'Interview not found' })
    }
    return res.status(200).json({ message: 'Interview deleted successfully' })
  } catch (err) {
    next(err)
  }
}
