import { Request, Response, NextFunction } from 'express'
import { getAnalytics } from '../services/statsService'

export async function statsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await getAnalytics()
    res.json(data)
  } catch (err) {
    next(err)
  }
}
