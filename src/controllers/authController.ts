import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import User, { IUserDocument } from '../models/User';
import { sendEmail } from '../utils/email';

const jwtSecret: Secret = process.env.JWT_SECRET!;
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const RESET_EXPIRES_IN = '15m';
const EMAIL_CHANGE_EXPIRES_IN = '15m';

const signToken = (payload: object, expiresIn: string = jwtExpiresIn) =>
  jwt.sign(payload, jwtSecret, { expiresIn } as SignOptions);


function extractUserId(req: Request) {
  const u = (req as any).user
  return u?.userId ?? u?.id
}

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = req.body.name.trim();
    const email = req.body.email.toLowerCase().trim();
    const passwordPlain = req.body.password;
    if (await User.exists({ email })) {
      return res.status(409).json({ message: 'User already exists.' });
    }
    const hashedPassword = await bcrypt.hash(passwordPlain, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const token = signToken({ name, email, password: hashedPassword, otp });
    const url = `${process.env.EMAIL_VERIFICATION_URL}?token=${token}`;
    try {
      await sendEmail({
        to: email,
        subject: 'Verify Your Email',
        html: `<p>Your OTP: <strong>${otp}</strong></p><p>Or click <a href="${url}">here</a> to verify.</p>`
      });
    } catch (_) {}
    return res.status(200).json({ message: 'Verification email sent.', token });
  } catch (err) {
    next(err);
  }
};

export const verifyByLink = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = (req.query.token as string || '').trim();
    if (!token) return res.status(400).json({ message: 'Verification token missing.' });
    let payload: any;
    try {
      payload = jwt.verify(token, jwtSecret);
    } catch (e: any) {
      const msg = e.name === 'TokenExpiredError' ? 'Link expired.' : 'Invalid token.';
      return res.status(400).json({ message: msg });
    }
    const { name, email, password } = payload;
    const user = await User.findOneAndUpdate(
      { email },
      { name, email, password, isVerified: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.status(200).json({ message: 'Email verified.', user: { id: user!._id, name: user!.name, email: user!.email } });
  } catch (err) {
    next(err);
  }
};

export const verifyByOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, otp } = req.body as { token?: string; otp?: string };
    if (!token || !otp) return res.status(400).json({ message: 'Token and OTP required.' });
    let payload: any;
    try {
      payload = jwt.verify(token, jwtSecret);
    } catch (e: any) {
      const msg = e.name === 'TokenExpiredError' ? 'OTP expired.' : 'Invalid token.';
      return res.status(400).json({ message: msg });
    }
    if (payload.otp !== otp) return res.status(400).json({ message: 'Invalid OTP.' });
    const { name, email, password } = payload;
    const user = await User.findOneAndUpdate(
      { email },
      { name, email, password, isVerified: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.status(200).json({ message: 'Email verified via OTP.', userId: user!._id });
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = (req.body.email as string).toLowerCase().trim();
    const password = req.body.password as string;
    const user = await User.findOne({ email }).select('+password');
    const valid = user && user.password && user.isVerified && await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials.' });
    const token = signToken({ userId: user._id });
    return res.status(200).json({ token, userId: user._id, email: user.email, name: user.name });
  } catch (err) {
    next(err);
  }
};

async function findOrCreateGoogleUser(payload: TokenPayload) {
  const email = payload.email!.toLowerCase().trim();
  const googleId = payload.sub!;
  const name = payload.name || '';
  let user = await User.findOne({ email });
  if (user) {
    if (!user.googleId) { user.googleId = googleId; await user.save(); }
  } else {
    user = await User.create({ name, email, googleId, isVerified: true });
  }
  return user;
}

export const googleAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cred = req.body.credential as string;
    if (!cred) return res.status(400).json({ message: 'Missing credential.' });
    const ticket = await googleClient.verifyIdToken({ idToken: cred, audience: process.env.GOOGLE_CLIENT_ID });
    const p = ticket.getPayload()!;
    const user = await findOrCreateGoogleUser(p);
    const token = signToken({ userId: user._id });
    return res.status(200).json({ token, userId: user._id, email: user.email, name: user.name });
  } catch (err) {
    next(err);
  }
};

export const googleOneTap = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken:   req.body.credential,
      audience:  process.env.GOOGLE_CLIENT_ID
    });
    const p    = ticket.getPayload()!;
    const user = await findOrCreateGoogleUser(p);
    const token = signToken({ userId: user._id });
    res.status(200).json({
      token,
      userId: user._id,
      email:  user.email,
      name:   user.name
    });
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = (req.body.email as string || '').toLowerCase().trim();
    if (!email) return res.status(400).json({ message: 'Email is required.' });
    const user = await User.findOne({ email });
    if (user) {
      const resetToken = signToken({ userId: user._id }, RESET_EXPIRES_IN);
      const resetUrl = `${process.env.PASSWORD_RESET_URL}?token=${resetToken}`;
      const html = `<p>Hello ${user.name},</p><p><a href="${resetUrl}">Click here</a> to reset your password (expires in 15m).</p>`;
      const text = `Hello ${user.name},\n\nPlease open the following link to reset your password (expires in 15m):\n${resetUrl}`;
      try { await sendEmail({ to: email, subject: 'Password Reset Request', text, html }); } catch (_) {}
    }
    return res.status(200).json({ message: 'If that email exists, a reset link was sent.' });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = req.body as { token: string; newPassword: string };
    if (!token || !newPassword) return res.status(400).json({ message: 'Token and new password required.' });
    let payload: any;
    try { payload = jwt.verify(token, jwtSecret); }
    catch(e:any){
      const msg = e.name === 'TokenExpiredError' ? 'Reset token expired.' : 'Invalid reset token.';
      return res.status(400).json({ message: msg });
    }
    const user = await User.findById(payload.userId).select('+password');
    if (!user) return res.status(400).json({ message: 'Invalid reset token.' });
    user.password = newPassword;
    await user.save();
    return res.status(200).json({ message: 'Password reset successful.' });
  } catch (err) {
    next(err);
  }
};

export const setPassword = async (req: Request, res: Response) => {
  try {
    const { userId, newPassword } = req.body as { userId: string; newPassword: string };
    if (!userId || !newPassword) return res.status(400).json({ message: 'User ID and new password required.' });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    user.password = newPassword;
    await user.save();
    return res.status(200).json({ message: 'Password set successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Something went wrong.', error: err });
  }
};

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = extractUserId(req)
    if (!userId) return res.status(401).json({ message: 'Not authorized.' })

    const user = await User.findById(userId).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found.' })

    // Include the ID so frontend can keep it in sync if needed
    return res.status(200).json({ userId: user._id, name: user.name, email: user.email })
  } catch (err) {
    next(err)
  }
}

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = extractUserId(req)
    if (!userId) return res.status(401).json({ message: 'Not authorized.' })

    const { name, email, newPassword } = req.body as {
      name?: string
      email?: string
      newPassword?: string
    }

    const user = await User.findById(userId).select('+password')
    if (!user) return res.status(404).json({ message: 'User not found.' })

    if (name) user.name = name.trim()
    if (email && email.trim().toLowerCase() !== user.email) {
      user.email = email.trim().toLowerCase()
    }
    if (newPassword) {
      user.password = newPassword
    }

    await user.save()

    // re-issue a token with the same payload structure
    const token = signToken({ userId: user._id })

    return res.status(200).json({
      token,
      userId: user._id,
      name: user.name,
      email: user.email,
    })
  } catch (err) {
    next(err)
  }
}

export const requestEmailChange = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = extractUserId(req)
    if (!userId) return res.status(401).json({ message: 'Not authorized.' })

    // either `newEmail` or `email`
    const rawEmail = (req.body.newEmail ?? req.body.email) as string | undefined
    const newEmail = rawEmail?.toLowerCase().trim() || ''

    const user = await User.findById(userId).select('email')
    if (!user) return res.status(404).json({ message: 'User not found.' })
    if (newEmail === user.email) return res.status(400).json({ message: 'That is already your email.' })
    if (await User.exists({ email: newEmail })) return res.status(409).json({ message: 'That email is already in use.' })

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const token = signToken({ userId, newEmail, otp }, EMAIL_CHANGE_EXPIRES_IN)
    const url = `${process.env.EMAIL_VERIFICATION_URL}?token=${token}`

    try {
      await sendEmail({
        to: newEmail,
        subject: 'Confirm Your New Email',
        html: `
          <p>Your verification code is <strong>${otp}</strong>.</p>
          <p>Or click <a href="${url}">this link</a> to confirm.</p>
        `,
      })
    } catch (_) {
      // log but don’t break
    }

    return res.status(200).json({ message: 'Verification OTP/link sent.', token })
  } catch (err) {
    next(err)
  }
}


export const verifyEmailChangeByLink = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = (req.query.token as string || '').trim();
    let payload: any;
    try { payload = jwt.verify(token, jwtSecret); }
    catch(e:any){
      const msg = e.name === 'TokenExpiredError' ? 'Token expired.' : 'Invalid token.';
      return res.status(400).json({ message: msg });
    }
    const { userId, newEmail } = payload;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    user.email = newEmail;
    await user.save();
    return res.status(200).json({ message: 'Email updated successfully.' });
  } catch (err) {
    next(err);
  }
};

export const verifyEmailChangeByOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token, otp } = req.body as { token?: string; otp?: string }
    let payload: any

    // 1. Verify and decode the email-change token
    try {
      payload = jwt.verify(token!, jwtSecret)
    } catch (e: any) {
      const msg =
        e.name === 'TokenExpiredError' ? 'Token expired.' : 'Invalid token.'
      return res.status(400).json({ message: msg })
    }

    // 2. Check OTP match
    if (payload.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP.' })
    }

    // 3. Fetch user, update email, and save
    const user = await User.findById(payload.userId)
    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }
    user.email = payload.newEmail
    await user.save()

    // 4. Issue a fresh JWT with the standard payload
    const newToken = signToken({ userId: user._id })

    // 5. Return everything the client needs to update state
    return res.status(200).json({
      message: 'Email updated successfully.',
      token: newToken,
      userId: user._id,
      name: user.name,
      email: user.email,
    })
  } catch (err) {
    next(err)
  }
}