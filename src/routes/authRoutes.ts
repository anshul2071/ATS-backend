import { Router } from 'express'
import {
  register,
  verifyByLink,
  verifyByOtp,
  login,
  googleAuth,
  googleOneTap,
  forgotPassword,
  resetPassword,
  setPassword
} from '../controllers/authController'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.get('/verify-link', verifyByLink)
router.post('/verify-otp', verifyByOtp)
router.post('/google', googleAuth)
router.post('/google-onetap', googleOneTap)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)
router.post('/set-password', setPassword)

export default router
