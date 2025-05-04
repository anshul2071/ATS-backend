// src/controllers/authController.ts
import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import jwt, { SignOptions, Secret } from 'jsonwebtoken'
import { OAuth2Client, TokenPayload } from 'google-auth-library'
import User from '../models/User'
import { sendEmail } from '../utils/email'

const jwtSecret: Secret = process.env.JWT_SECRET!
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d'
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
const resetExpiresIn = '15m'

const signToken = (payload: object, expiresIn: string = jwtExpiresIn): string =>
  jwt.sign(payload, jwtSecret, { expiresIn } as SignOptions)

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const name = req.body.name.trim()
    const email = req.body.email.toLowerCase().trim()
    const passwordPlain = req.body.password
    if (await User.exists({ email })) {
      res.status(409).json({ message: 'User already exists.' })
      return
    }
    const hashedPassword = await bcrypt.hash(passwordPlain, 10)
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const verificationToken = signToken({ name, email, password: hashedPassword, otp })
    const verificationUrl = `${process.env.EMAIL_VERIFICATION_URL}?token=${verificationToken}`
    await sendEmail({
      to: email,
      subject: 'Verify Your Email',
      html: `<p>Your OTP: <strong>${otp}</strong></p><p>Or click <a href="${verificationUrl}">here</a> to verify.</p>`
    })
    res.status(200).json({ message: 'Verification email sent.', token: verificationToken })
  } catch (err) {
    next(err)
  }
}

export const verifyByLink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = (req.query.token as string)?.trim() || ''
    if (!token) {
      res.status(400).json({ message: 'Verification token missing.' })
      return
    }
    const payload = jwt.verify(token, jwtSecret) as any
    const { name, email, password } = payload
    const user = await User.findOneAndUpdate(
      { email },
      { name, email, password, isVerified: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    res.status(200).json({
      message: 'Email verified successfully.',
      user: { id: user._id, email: user.email, name: user.name }
    })
  } catch (err) {
    next(err)
  }
}

export const verifyByOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = (req.body.token as string)?.trim() || ''
    const otp = (req.body.otp as string)?.trim() || ''
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

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const email = (req.body.email as string).toLowerCase().trim()
    const password = req.body.password as string
    const user = await User.findOne({ email }).select('+password')
    const valid = user && user.password && user.isVerified && await bcrypt.compare(password, user.password)
    if (!valid) {
      res.status(401).json({ message: 'Invalid credentials.' })
      return
    }
    const token = signToken({ userId: user._id })
    res.status(200).json({ token, email: user.email })
  } catch (err) {
    next(err)
  }
}

export const googleAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const credential = req.body.credential as string
    if (!credential) {
      res.status(400).json({ message: 'Missing credential.' })
      return
    }
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    })
    const payload = ticket.getPayload() as TokenPayload
    const email = payload.email?.toLowerCase().trim()!
    const googleId = payload.sub!
    const name = payload.name || ''
    let user = await User.findOne({ email })
    if (user) {
      if (!user.googleId) {
        user.googleId = googleId
        await user.save()
      }
    } else {
      user = await User.create({ name, email, googleId, isVerified: true })
    }
    const token = signToken({ userId: user._id })
    res.status(200).json({ token, email: user.email })
  } catch (err) {
    next(err)
  }
}

export const googleOneTap = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: req.body.credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    })
    const payload = ticket.getPayload()!
    const email = payload.email?.toLowerCase().trim()!
    const googleId = payload.sub!
    const name = payload.name || ''
    let user = await User.findOne({ email })
    if (user) {
      if (!user.googleId) {
        user.googleId = googleId
        await user.save()
      }
    } else {
      user = await User.create({ name, email, googleId, isVerified: true })
    }
    const token = signToken({ userId: user._id })
    res.status(200).json({ token, email })
  } catch {
    res.status(401).json({ message: 'One Tap login failed' })
  }
}

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const email = (req.body.email as string).toLowerCase().trim()
    if (!email) {
      res.status(400).json({ message: 'Email is required.' })
      return
    }
    const user = await User.findOne({ email })
    if (user) {
      const resetToken = signToken({ userId: user._id }, resetExpiresIn)
      const resetUrl = `${process.env.PASSWORD_RESET_URL}?token=${resetToken}`
      await sendEmail({
        to: email,
        subject: 'Reset Your Password',
        html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Click here</a> to set a new password. Expires in 15m.</p>`
      })
    }
    res.status(200).json({ message: 'If the email exists, a reset link has been sent.' })
  } catch (err) {
    next(err)
  }
}

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password required.' });
    }

    // Verify token and get payload.userId
    const payload = jwt.verify(token, jwtSecret) as any;
    const user = await User.findById(payload.userId).select('+password');
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }

    // **DON’T** pre-hash here—just assign the raw password
    user.password = newPassword;
    await user.save();  // pre('save') will hash it exactly once

    res.status(200).json({ message: 'Password reset successful.' });
  } catch (err) {
    next(err);
  }
};

export const setPassword = async (req: Request, res: Response) => {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) {
      return res.status(400).json({ message: 'User ID and new password required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.password = newPassword;  // set the raw password
    await user.save();            // pre('save') will hash it

    res.status(200).json({ message: 'Password set successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Something went wrong', error: err });
  }
};
