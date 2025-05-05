// src/routes/interviewRoutes.ts
import { Router } from 'express'
import { protect } from '../middleware/authMiddleware'
import {
  scheduleInterview,
  listInterviews,
  getInterviewById,
  updateInterview,
  deleteInterview,
} from '../controllers/interviewController'

const router = Router()

router.use(protect)

router.post('/', scheduleInterview)
router.get('/', listInterviews)
router.get('/:id', getInterviewById)
router.put('/:id', updateInterview)
router.delete('/:id', deleteInterview)

export default router
