import { Router } from 'express'
import { protect } from '../middleware/authMiddleware'
import { resumeUpload } from '../middleware/uploadMiddleware'
import { addAssessment } from '../controllers/assessmentController'

const router = Router()



router.use(protect)
router.post(
  '/:id/assessment',

  resumeUpload.single('file'),
  addAssessment
)

export default router
