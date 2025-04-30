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

const corsOptions: cors.CorsOptions = {
  origin: process.env.FRONTEND_URL,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
}

app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/uploads', express.static(path.join(__dirname,'../uploads/resumes')))

app.use('/api/auth', authRoutes)
app.use('/api/candidates', candidateRoutes)
app.use('/api/interviews', interviewRoutes)
app.use('/api/assessments', assessmentRoutes)
app.use('/api/offers', offerRoutes)
app.use('/api/comments', commentRoutes)
app.use('/api/sections', sectionRoutes)
app.use('/api/stats', statsRoutes)

app.use(errorHandler)

export default app