import multer from 'multer'
import path from 'path'
import fs from 'fs'

const dest = path.join(__dirname, '../../uploads/resumes')

// Ensure that the destination folder exists
if (!fs.existsSync(dest)) {
  fs.mkdirSync(dest, { recursive: true })
}

// Optional: Define a file filter to allow only certain file types (PDF, DOC, DOCX, JPEG, PNG, GIF)
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

export const resumeUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, dest)
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname)
      // Use a unique name to avoid collisions: timestamp combined with a random number
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`
      cb(null, uniqueSuffix + ext)
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // limit file size to 10 MB
  fileFilter
})