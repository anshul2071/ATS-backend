// src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import User, { IUserDocument } from '../models/User'

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; name?: string }
    }
  }
}

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' })
  }
  const token = header.slice(7)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id?: string
      userId?: string
    }
    const userId = decoded.id ?? decoded.userId
    if (!userId) throw new Error('No user id in token')

    const user = await User.findById(userId).select('-password')
    if (!user) throw new Error('User not found')

    req.user = {
      id:    user._id.toString(),
      email: user.email,
      name:  (user as IUserDocument).name,
    }

    next()
  } catch {
    return res.status(401).json({ message: 'Not authorized, token invalid' })
  }
}
