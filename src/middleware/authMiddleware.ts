import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

interface JwtPayload {
  userId: string
}

export const protect = (
  req: Request & { userId?: string },
  res: Response,
  next: NextFunction
): void => {
  const header = req.headers.authorization

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const token = header.split(' ')[1]

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
    req.userId = payload.userId
    next()
  } catch {
    res.status(401).json({ message: 'Invalid token' })
  }
}
