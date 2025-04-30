import { Request, Response, NextFunction } from 'express'
import Comment from '../models/Comment'

interface AuthenticatedRequest extends Request {
  userId?: string
}

export const postComment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { comment } = req.body
    const user = req.userId || 'unknown'

    const created =
      await Comment.create({
        candidate: req.params.id,
        user,
        content: comment
      })

    res
      .status(201)
      .json(created)
  } catch (error) {
    next(error)
  }
}

export const getComments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const list = await Comment.find({
      candidate: req.params.id
    })

    res.json(list)
  } catch (error) {
    next(error)
  }
}
