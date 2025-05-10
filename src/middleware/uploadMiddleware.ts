// src/middleware/uploadMiddleware.ts
import multer from 'multer'
import path from 'path'
import fs from 'fs'

// Base upload directory
const UPLOAD_DIR = path.join(__dirname, '../../uploads')

// Ensure base upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

// Resume uploads directory
const resumeDir = path.join(UPLOAD_DIR, 'resumes')
if (!fs.existsSync(resumeDir)) {
  fs.mkdirSync(resumeDir, { recursive: true })
}

// Assessment uploads directory
const assessmentDir = path.join(UPLOAD_DIR, 'assessments')
if (!fs.existsSync(assessmentDir)) {
  fs.mkdirSync(assessmentDir, { recursive: true })
}

// File filter for allowed file types
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif'
  ]
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPEG, PNG, and GIF files are allowed.'))
  }
}

// Generate a unique filename
const generateFilename = (file: Express.Multer.File) => {
  const ext = path.extname(file.originalname)
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`
  return uniqueSuffix + ext
}

// Resume upload middleware
export const resumeUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, resumeDir)
    },
    filename: (_req, file, cb) => {
      cb(null, generateFilename(file))
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter
})

// Assessment upload middleware
export const assessmentUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, assessmentDir)
    },
    filename: (_req, file, cb) => {
      cb(null, generateFilename(file))
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter
})