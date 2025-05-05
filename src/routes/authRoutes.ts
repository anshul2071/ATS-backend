// src/routes/authRoutes.ts
import { Router } from 'express'
import {
  register,
  login,
  verifyByLink,
  verifyByOtp,
  googleAuth,
  googleOneTap,
  forgotPassword,
  resetPassword,
  setPassword,
  requestEmailChange,
  verifyEmailChangeByLink,
  verifyEmailChangeByOtp,
  getProfile,
  updateProfile,
} from '../controllers/authController'
import { protect } from '../middleware/authMiddleware'

const router = Router()

router.post('/register',               register)
router.post('/login',                  login)
router.get ('/verify-link',            verifyByLink)
router.post('/verify-otp',             verifyByOtp)
router.post('/google',                 googleAuth)
router.post('/google-onetap',          googleOneTap)
router.post('/forgot-password',        forgotPassword)
router.post('/reset-password',         resetPassword)
router.post('/set-password',           setPassword)

router.post('/request-email-change',         protect, requestEmailChange)
router.get ('/verify-email-change-link',     verifyEmailChangeByLink)
router.post('/verify-email-change-otp',      verifyEmailChangeByOtp)

router.get ('/profile',             protect, getProfile)
router.put ('/update-profile',      protect, updateProfile)

export default router
