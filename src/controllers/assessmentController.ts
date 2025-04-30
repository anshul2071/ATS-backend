import { Request, Response, NextFunction } from 'express'
import Assessment from '../models/Assessment'

export const addAssessment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      title,
      score,
      remarks
    } = req.body

    const fileUrl = req.file!.path

    const assessment =
      await Assessment.create({
        candidate: req.params.id,
        title,
        score,
        remarks,
        fileUrl
      })

    res
      .status(201)
      .json(assessment)
  } catch (error) {
    next(error)
  }
}
