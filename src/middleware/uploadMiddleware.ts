// src/middleware/uploadMiddleware.ts
import multer from 'multer'
import path from 'path'
import fs from 'fs'

// Base upload directory
const UPLOAD_DIR = path.join(__dirname, '../../uploads')
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const resumeDir     = path.join(UPLOAD_DIR, 'resumes')
const assessmentDir = path.join(UPLOAD_DIR, 'assessments')
if (!fs.existsSync(resumeDir))     fs.mkdirSync(resumeDir,     { recursive: true })
if (!fs.existsSync(assessmentDir)) fs.mkdirSync(assessmentDir, { recursive: true })

// file‐type whitelist
const ALLOWED_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif',
]

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(
      'Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, TXT, JPEG, PNG & GIF allowed.'
    ))
  }
}

function generateFilename(file: Express.Multer.File) {
  const ext = path.extname(file.originalname)
  const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
  return suffix + ext
}

const commonOptions = {
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      // choose dir based on fieldname
      const dir = _file.fieldname === 'file'
        ? assessmentDir
        : resumeDir
      cb(null, dir)
    },
    filename: (_req, file, cb) => cb(null, generateFilename(file)),
  }),
  limits: {
    fileSize: 10 * 1024 * 1024,  // 10MB
    // increase busboy’s overall multipart limits a bit:
    fieldSize: 10 * 1024 * 1024,
    fields:    20,
    parts:     20,
  },
  fileFilter,
}

export const resumeUpload = multer(commonOptions)
export const assessmentUpload = multer(commonOptions)
