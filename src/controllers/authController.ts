import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import jwt, { SignOptions, Secret } from 'jsonwebtoken'
import { OAuth2Client, TokenPayload } from 'google-auth-library'
import User from '../models/User'
import { sendEmail } from '../utils/email'

const jwtSecret: Secret = process.env.JWT_SECRET!
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d'
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

const signToken = (payload: object, expiresIn: string = jwtExpiresIn): string =>
  jwt.sign(payload, jwtSecret, { expiresIn } as SignOptions)

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email: rawEmail, password } = req.body
    const email = rawEmail.toLowerCase().trim()

    if (await User.exists({ email })) {
      res.status(409).json({ message: 'User already exists.' })
      return
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const verificationToken = signToken({ name, email, password: hashedPassword, otp })
    const verificationUrl = `${process.env.EMAIL_VERIFICATION_URL}?token=${verificationToken}`

    await sendEmail({
      to: email,
      subject: 'Verify Your Email',
      html: `<p>Your OTP is <strong>${otp}</strong>.</p><p>Or click <a href="${verificationUrl}">here</a> to verify.</p>`
    })

    res.status(200).json({ message: 'Verification email sent. Please check your inbox.', token: verificationToken })
  } catch (err) {
    next(err)
  }
}

export const verifyByLink = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = (req.query.token as string) || ''
    if (!token) {
      res.status(400).json({ message: 'Verification token missing.' })
      return
    }

    const { name, email, password } = jwt.verify(token, jwtSecret) as any
    const user = await User.findOneAndUpdate(
      { email },
      { name, email, password, isVerified: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    res.status(200).json({ message: 'Email verified successfully.', user: { id: user._id, email: user.email, name: user.name } })
  } catch (err) {
    next(err)
  }
}

export const verifyByOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token, otp } = req.body
    if (!token || !otp) {
      res.status(400).json({ message: 'Token and OTP required.' })
      return
    }

    const payload = jwt.verify(token, jwtSecret) as any
    if (payload.otp !== otp) {
      res.status(400).json({ message: 'Invalid OTP.' })
      return
    }

    const { name, email, password } = payload
    const user = await User.findOneAndUpdate(
      { email },
      { name, email, password, isVerified: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    res.status(200).json({ message: 'Email verified via OTP.', userId: user._id })
  } catch (err) {
    next(err)
  }
}

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawEmail = (req.body.email as string).toLowerCase().trim()
    const password = req.body.password as string
    const user = await User.findOne({ email: rawEmail }).select('+password')
    const isValid = user && user.password && user.isVerified && (await bcrypt.compare(password, user.password))
    if (!isValid) {
      res.status(401).json({ message: 'Invalid credentials.' })
      return
    }

    const token = signToken({ userId: user._id })
    res.status(200).json({ token, email: user.email })
  } catch (err) {
    next(err)
  }
}

export const googleAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { credential } = req.body
    if (!credential) {
      res.status(400).json({ message: 'Google credential missing.' })
      return
    }

    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID })
    const payload = ticket.getPayload() as TokenPayload
    if (!payload.email) {
      res.status(401).json({ message: 'Invalid Google token.' })
      return
    }

    let user = await User.findOne({ email: payload.email })
    if (!user) {
      user = await User.create({ name: payload.name, email: payload.email, googleId: payload.sub, isVerified: true })
    }

    const token = signToken({ userId: user._id })
    res.status(200).json({ token, email: user.email })
  } catch (err) {
    next(err)
  }
}

export const googleOneTapLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => googleAuth(req, res, next)

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body
    if (!email) {
      res.status(400).json({ message: 'Email required.' })
      return
    }

    const user = await User.findOne({ email })
    if (user) {
      const resetToken = signToken({ userId: user._id })
      const resetUrl = `${process.env.PASSWORD_RESET_URL}?token=${resetToken}`
      await sendEmail({ to: email, subject: 'Reset Your Password', html: `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p>` })
    }

    res.status(200).json({ message: 'If that email exists, a reset link has been sent.' })
  } catch (err) {
    next(err)
  }
}

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token, newPassword } = req.body
    if (!token || !newPassword) {
      res.status(400).json({ message: 'Token and new password required.' })
      return
    }

    const payload = jwt.verify(token, jwtSecret) as any
    const user = await User.findById(payload.userId)
    if (!user) {
      res.status(400).json({ message: 'Invalid or expired token.' })
      return
    }

    user.password = await bcrypt.hash(newPassword, 10)
    await user.save()

    res.status(200).json({ message: 'Password reset successful.' })
  } catch (err) {
    next(err)
  }
}
