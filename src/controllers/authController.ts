import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import jwt, { SignOptions, Secret } from 'jsonwebtoken'
import { OAuth2Client, TokenPayload } from 'google-auth-library'
import User, { IUserDocument } from '../models/User'
import { sendEmail } from '../utils/email'

const jwtSecret: Secret = process.env.JWT_SECRET!
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d'
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
const resetExpiresIn = '15m'
const emailChangeExpiresIn = '15m'

const signToken = (payload: object, expiresIn: string = jwtExpiresIn): string =>
  jwt.sign(payload, jwtSecret, { expiresIn } as SignOptions)

export interface AuthRequest extends Request {
  userId?: string
}

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = req.body.name.trim();
    const email = req.body.email.toLowerCase().trim();
    const passwordPlain = req.body.password;
    if (await User.exists({ email })) {
      return res.status(409).json({ message: "User already exists." });
    }
    const hashedPassword = await bcrypt.hash(passwordPlain, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const token = signToken({ name, email, password: hashedPassword, otp });
    const url = `${process.env.EMAIL_VERIFICATION_URL}?token=${token}`;
    await sendEmail({
      to: email,
      subject: "Verify Your Email",
      html: `<p>Your OTP: <strong>${otp}</strong></p>
             <p>Or click <a href="${url}">here</a> to verify.</p>`,
    });
    res.status(200).json({ message: "Verification email sent.", token });
  } catch (err) {
    next(err);
  }
};

export const verifyByLink = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = (req.query.token as string)?.trim();
    if (!token) return res.status(400).json({ message: "Verification token missing." });
    const { name, email, password } = jwt.verify(token, jwtSecret) as any;
    const user = await User.findOneAndUpdate(
      { email },
      { name, email, password, isVerified: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ message: "Email verified.", user: { id: user!._id, name: user!.name, email: user!.email } });
  } catch (err) {
    next(err);
  }
};

export const verifyByOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, otp } = req.body;
    if (!token || !otp) return res.status(400).json({ message: "Token and OTP required." });
    const payload = jwt.verify(token, jwtSecret) as any;
    if (payload.otp !== otp) return res.status(400).json({ message: "Invalid OTP." });
    const { name, email, password } = payload;
    const user = await User.findOneAndUpdate(
      { email },
      { name, email, password, isVerified: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ message: "Email verified via OTP.", userId: user!._id });
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = (req.body.email as string).toLowerCase().trim();
    const password = req.body.password as string;
    const user = await User.findOne({ email }).select("+password");
    const valid =
      user &&
      user.password &&
      user.isVerified &&
      (await bcrypt.compare(password, user.password));
    if (!valid) return res.status(401).json({ message: "Invalid credentials." });
    const token = signToken({ userId: user._id });
    res.status(200).json({ token, userId: user._id, email: user.email, name: user.name });
  } catch (err) {
    next(err);
  }
};

async function findOrCreateGoogleUser(payload: TokenPayload) {
  const email = payload.email!.toLowerCase().trim();
  const googleId = payload.sub!;
  const name = payload.name || "";
  let user = await User.findOne({ email });
  if (user) {
    if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }
  } else {
    user = await User.create({ name, email, googleId, isVerified: true });
  }
  return user;
}

export const googleAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cred = req.body.credential as string;
    if (!cred) return res.status(400).json({ message: "Missing credential." });
    const ticket = await googleClient.verifyIdToken({ idToken: cred, audience: process.env.GOOGLE_CLIENT_ID });
    const p = ticket.getPayload()!;
    const user = await findOrCreateGoogleUser(p);
    const token = signToken({ userId: user._id });
    res.status(200).json({ token, userId: user._id, email: user.email, name: user.name });
  } catch (err) {
    next(err);
  }
};

export const googleOneTap = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: req.body.credential, audience: process.env.GOOGLE_CLIENT_ID });
    const p = ticket.getPayload()!;
    const user = await findOrCreateGoogleUser(p);
    const token = signToken({ userId: user._id });
    res.status(200).json({ token, userId: user._id, email: user.email, name: user.name });
  } catch {
    res.status(401).json({ message: "One‑Tap login failed." });
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = (req.body.email as string).toLowerCase().trim();
    if (!email) return res.status(400).json({ message: "Email is required." });
    const user = await User.findOne({ email });
    if (user) {
      const resetToken = signToken({ userId: user._id }, resetExpiresIn);
      const resetUrl = `${process.env.PASSWORD_RESET_URL}?token=${resetToken}`;
      await sendEmail({
        to: email,
        subject: "Reset Your Password",
        html: `<p><a href="${resetUrl}">Click here</a> to reset your password (expires in 15m).</p>`,
      });
    }
    res.status(200).json({ message: "If that email exists, a reset link was sent." });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = req.body as { token: string; newPassword: string };
    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password required." });
    }
    const payload = jwt.verify(token, jwtSecret) as any;
    const user = await User.findById(payload.userId).select("+password");
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }
    user.password = newPassword; // rely on pre('save') hashing
    await user.save();
    res.status(200).json({ message: "Password reset successful." });
  } catch (err) {
    next(err);
  }
};

export const setPassword = async (req: Request, res: Response) => {
  try {
    const { userId, newPassword } = req.body as { userId: string; newPassword: string };
    if (!userId || !newPassword) {
      return res.status(400).json({ message: "User ID and new password required." });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    user.password = newPassword;
    await user.save();
    res.status(200).json({ message: "Password set successfully." });
  } catch (err) {
    res.status(500).json({ message: "Something went wrong.", error: err });
  }
};


export const getProfile = async (
  req: Request,
  res: Response<IUserDocument | { message: string }>,
  next: NextFunction
) => {
  try {
    // req.user was set by protect()
    const u = req.user
    if (!u) {
      return res.status(401).json({ message: 'Not authorized' })
    }

    const user = await User.findById(u.id).select('-password')
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    return res.status(200).json(user)
  } catch (err) {
    next(err)
  }
}

export const updateProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, newPassword } = req.body as {
      name?: string
      email?: string
      newPassword?: string
    }
    const user = await User.findById(req.userId).select('+password')
    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }
    if (name) {
      user.name = name.trim()
    }
    if (email && email.trim().toLowerCase() !== user.email) {
      user.email = email.trim().toLowerCase()
    }
    if (newPassword) {
      user.password = newPassword
    }
    await user.save()
    const token = signToken({ userId: user._id })
    return res.status(200).json({ token, name: user.name, email: user.email })
  } catch (err) {
    next(err)
  }
}
export const requestEmailChange = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Authentication required.' })
    }

    const rawEmail = (req.body.newEmail ?? req.body.email) as string | undefined
    if (!rawEmail) {
      return res.status(400).json({ message: 'New email is required.' })
    }

    const newEmail = rawEmail.toLowerCase().trim()
    const user = await User.findById(req.userId).select('email')
    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }
    if (newEmail === user.email) {
      return res.status(400).json({ message: 'That is already your email.' })
    }
    if (await User.exists({ email: newEmail })) {
      return res.status(409).json({ message: 'That email is already in use.' })
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const token = signToken(
      { userId: req.userId, newEmail, otp },
      emailChangeExpiresIn
    )

    const url = `${process.env.EMAIL_VERIFICATION_URL}?token=${token}`
    await sendEmail({
      to: newEmail,
      subject: 'Confirm Your New Email',
      html: `
        <p>Your verification code is <strong>${otp}</strong>.</p>
        <p>Or click <a href="${url}">this link</a> to confirm.</p>
      `
    })

    return res.status(200).json({ message: 'Verification OTP/link sent.', token })
  } catch (err) {
    next(err)
  }
}

export const verifyEmailChangeByLink = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = (req.query.token as string)?.trim()
    if (!token) {
      return res.status(400).json({ message: 'Verification token missing.' })
    }

    const payload = jwt.verify(token, jwtSecret) as any
    const { userId, newEmail } = payload
    if (!userId || !newEmail) {
      return res.status(400).json({ message: 'Invalid token payload.' })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }

    user.email = newEmail
    await user.save()

    return res.status(200).json({ message: 'Email updated successfully.' })
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Token expired.' })
    }
    next(err)
  }
}

// ─── Step 2b: Verify by OTP ───────────────────────────────────────────

export const verifyEmailChangeByOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, otp } = req.body as { token?: string; otp?: string }
    if (!token || !otp) {
      return res.status(400).json({ message: 'Token and OTP required.' })
    }

    const payload = jwt.verify(token, jwtSecret) as any
    console.log('JWT payload:', payload)

    if (payload.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP.' })
    }

    const { userId, newEmail } = payload
    if (!userId || !newEmail) {
      return res.status(400).json({ message: 'Bad token payload.' })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }

    user.email = newEmail
    await user.save()

    return res.status(200).json({ message: 'Email updated successfully.' })
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Token expired.' })
    }
    next(err)
  }
}