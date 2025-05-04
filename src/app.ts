// src/app.ts

import express from 'express'
import cors from 'cors'
import path from 'path'

import authRoutes from './routes/authRoutes'
import candidateRoutes from './routes/candidateRoutes'
import interviewRoutes from './routes/interviewRoutes'
import assessmentRoutes from './routes/assessmentRoutes'
import offerRoutes from './routes/offerRoutes'
import commentRoutes from './routes/commentRoutes'
import sectionRoutes from './routes/sectionRoutes'
import statsRoutes from './routes/statsRoutes'

import errorHandler from './middleware/errorHandler'

const app = express()

// CORS configuration to allow your frontend origin to hit this API
const corsOptions: cors.CorsOptions = {
  origin: process.env.FRONTEND_URL,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
}
app.use(cors(corsOptions))

// Body parsers
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// IMPORTANT: allow OAuth popup windows to close without COOP blocking
app.use((_, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
  next()
})

// Serve uploaded resumes statically
app.use('/uploads', express.static(path.join(__dirname,'../uploads/resumes')))

// Mount all your route modules under /api
app.use('/api/auth', authRoutes)
app.use('/api/candidates', candidateRoutes)
app.use('/api/interviews', interviewRoutes)
app.use('/api/assessments', assessmentRoutes)
app.use('/api/offers', offerRoutes)
app.use('/api/comments', commentRoutes)
app.use('/api/sections', sectionRoutes)
app.use('/api/stats', statsRoutes)

// Centralized error handler
app.use(errorHandler)

export default app
