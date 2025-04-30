// src/routes/authRoutes.ts
import { Router } from 'express'
import {
  register,
  verifyByLink,
  verifyByOtp,
  login,
  googleAuth,
  forgotPassword,
  resetPassword,
} from '../controllers/authController'

const router = Router()

router.post( '/register',        register      )
router.get(  '/verify-link',     verifyByLink  )
router.post('/verify-otp',       verifyByOtp   )
router.post('/login',            login         )
router.post('/google',           googleAuth    )
router.post('/forgot-password',  forgotPassword)
router.post('/reset-password',   resetPassword )

export default router
