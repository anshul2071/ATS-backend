import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import path from 'path'

import authRoutes from './routes/authRoutes'
import candidateRoutes from './routes/candidateRoutes'
import interviewRoutes from './routes/interviewRoutes'
import assessmentRoutes from './routes/assessmentRoutes'
import commentRoutes from './routes/commentRoutes'
import sectionRoutes from './routes/sectionRoutes'
import statsRoutes from './routes/statsRoutes'
import letterRoutes from './routes/letterRoutes'

import errorHandler from './middleware/errorHandler'

dotenv.config()

const app = express()

// CORS configuration
const corsOrigin: string[] = [
  process.env.DEV_CLIENT_URL! ,      
  process.env.FRONTEND_URL!           
]

app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads/resumes')))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/candidates', candidateRoutes)
app.use('/api/interviews', interviewRoutes)
app.use('/api/assessments', assessmentRoutes)
app.use('/api/comments', commentRoutes)
app.use('/api/sections', sectionRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/letters', letterRoutes)

// Error handler
app.use(errorHandler)

export default app
