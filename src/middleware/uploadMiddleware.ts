import multer from 'multer'
import path from 'path'
import fs from 'fs'

const UPLOADS_ROOT = path.resolve(__dirname, '../../uploads')
if (!fs.existsSync(UPLOADS_ROOT)) fs.mkdirSync(UPLOADS_ROOT, { recursive: true })

const RESUME_DIR = path.join(UPLOADS_ROOT, 'resumes')
const ASSESSMENT_DIR = path.join(UPLOADS_ROOT, 'assessments')
if (!fs.existsSync(RESUME_DIR)) fs.mkdirSync(RESUME_DIR, { recursive: true })
if (!fs.existsSync(ASSESSMENT_DIR)) fs.mkdirSync(ASSESSMENT_DIR, { recursive: true })

const ALLOWED_MIMETYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
]

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPEG, PNG, and GIF allowed.'))
  }
}

const generateFilename = (file: Express.Multer.File): string => {
  const extension = path.extname(file.originalname).toLowerCase()
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`
}

const resumeStorage = multer.diskStorage({
  destination: () => RESUME_DIR,
  filename: (_req, file, cb) => cb(null, generateFilename(file)),
})

const assessmentStorage = multer.diskStorage({
  destination: () => ASSESSMENT_DIR,
  filename: (_req, file, cb) => cb(null, generateFilename(file)),
})

const limits = { fileSize: 10 * 1024 * 1024 }

export const resumeUpload = multer({ storage: resumeStorage, fileFilter, limits }).single('file')
export const assessmentUpload = multer({ storage: assessmentStorage, fileFilter, limits }).single('file')
