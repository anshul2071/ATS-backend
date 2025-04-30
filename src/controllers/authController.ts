// src/controllers/authController.ts
import { Request, Response, NextFunction } from 'express'
import bcrypt                        from 'bcrypt'
import jwt, { SignOptions, Secret } from 'jsonwebtoken'
import { OAuth2Client }             from 'google-auth-library'
import User                          from '../models/User'
import { sendEmail }                 from '../utils/email'

const jwtSecret: Secret    = process.env.JWT_SECRET!
const jwtExpiresIn: string = process.env.JWT_EXPIRES_IN!

const signToken = (payload: any, expiresIn: string): string =>
  jwt.sign(payload, jwtSecret, { expiresIn } as SignOptions)

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID!)

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email: rawEmail, password } = req.body
    const email = rawEmail.toLowerCase().trim()
    if (await User.exists({ email })) {
      return res.status(409).json({ message: 'User already exists.' })
    }

    const hashed   = await bcrypt.hash(password, 10)
    const otp      = Math.floor(100000 + Math.random() * 900000).toString()
    const payload  = { name, email, password: hashed, otp }
    const tokenStr = signToken(payload, jwtExpiresIn)
    const link     = `${process.env.EMAIL_VERIFICATION_URL}?token=${encodeURIComponent(tokenStr)}`

    await sendEmail({
      to:      email,
      subject: 'Verify Your Email',
      html:    `<p>Your OTP is <strong>${otp}</strong></p>
                <p>Or click <a href="${link}">this link</a> to verify.</p>`
    })

    return res.status(200).json({
      message: 'Verification email sent. Please check your inbox.',
      token:   tokenStr
    })
  } catch (err) {
    next(err)
  }
}

export const verifyByLink = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = (req.query.token as string) || ''
    if (!token) {
      return res.status(400).json({ message: 'Verification token missing.' })
    }

    const data = jwt.verify(token, jwtSecret) as any
    const { name, email, password } = data

    await User.findOneAndUpdate(
      { email },
      { name, email, password, isVerified: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    return res.status(200).json({ message: 'Email verified via link.' })
  } catch (err) {
    next(err)
  }
}

export const verifyByOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, otp } = req.body
    if (!token || !otp) {
      return res
        .status(400)
        .json({ message: 'Token and OTP required.' })
    }

    const data = jwt.verify(token, jwtSecret) as any
    if (data.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP.' })
    }

    const { name, email, password } = data

    await User.findOneAndUpdate(
      { email },
      { name, email, password, isVerified: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    return res.status(200).json({ message: 'Email verified via OTP.' })
  } catch (err) {
    next(err)
  }
}

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawEmail = (req.body.email as string).toLowerCase().trim()
    const pw       = req.body.password as string

    // ← include the password field
    const user = await User
      .findOne({ email: rawEmail })
      .select('+password')

    if (
      !user ||
      !user.password ||
      !user.isVerified ||
      !(await user.comparePassword(pw))
    ) {
      return res.status(401).json({ message: 'Invalid credentials.' })
    }

    const token = signToken({ userId: user._id.toString() }, jwtExpiresIn)
    return res.status(200).json({ token, email: user.email })
  } catch (err) {
    next(err)
  }
}


export const googleAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { credential } = req.body
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID })
    const payload = ticket.getPayload()!
    let user = await User.findOne({ email: payload.email! })
    if (!user) {
      user = await User.create({ name: payload.name, email: payload.email!, googleId: payload.sub, isVerified: true })
    }
    const token = signToken({ userId: user._id.toString() }, jwtExpiresIn)
    return res.status(200).json({ token, email: user.email })
  } catch (error) {
    next(error)
  }
}

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ message: 'Email required.' })
    }
    const user = await User.findOne({ email })
    if (user) {
      const resetToken = signToken({ userId: user._id.toString() }, jwtExpiresIn)
      const resetUrl = `${process.env.PASSWORD_RESET_URL}?token=${encodeURIComponent(resetToken)}`
      await sendEmail({ to: email, subject: 'Reset Your Password', html: `<p>Click <a href="${resetUrl}">here</a> to reset.</p>` })
    }
    return res.status(200).json({ message: 'If that email exists, a reset link has been sent.' })
  } catch (error) {
    next(error)
  }
}

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = req.body
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password required.' })
    }
    const { userId } = jwt.verify(token, jwtSecret) as any
    const user = await User.findById(userId)
    if (!user) {
      return res.status(400).json({ message: 'Invalid token.' })
    }
    user.password = await bcrypt.hash(newPassword, 10)
    await user.save()
    return res.status(200).json({ message: 'Password reset successful.' })
  } catch (error) {
    next(error)
  }
}
