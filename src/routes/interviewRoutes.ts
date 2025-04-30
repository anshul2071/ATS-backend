import { Router } from 'express'
import { protect } from '../middleware/authMiddleware'
import { scheduleInterview, listInterviews } from '../controllers/interviewController'

const router = Router()

router.use(protect)

router.post('/', scheduleInterview)
router.get('/', listInterviews)

export default router