// src/controllers/interviewController.ts
import { Request, Response, NextFunction } from 'express'
import Interview, { IInterview } from '../models/Interview'

interface ScheduleInterviewBody {
  candidate: string
  round: string
  interviewer: string
  date: string   
}


export async function scheduleInterview(
  req: Request<{}, {}, ScheduleInterviewBody>,
  res: Response<IInterview | { message: string }>,
  next: NextFunction
) {
  try {
    const { candidate, round, interviewer, date } = req.body

    if (!candidate || !round || !interviewer || !date) {
      return res
        .status(400)
        .json({ message: 'candidate, round, interviewer and date are all required' })
    }

    const interview = await Interview.create({
      candidate,
      round,
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

    return res.json(interviews)
  } catch (err) {
    next(err)
  }
}
