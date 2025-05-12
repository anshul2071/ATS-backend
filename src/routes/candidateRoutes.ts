import { Router } from 'express'
import { protect } from '../middleware/authMiddleware'
import { resumeUpload, assessmentUpload } from '../middleware/uploadMiddleware'
import {
  createCandidate,
  getCandidates,
  getCandidateById,
  updateCandidate,
  deleteCandidate,
  sendBackgroundCheck,
  getLettersByCandidate,
  createLetterForCandidate,
  createAssessmentForCandidate,
  getAssessmentsForCandidate,
} from '../controllers/candidateController'

const router = Router()

router.use(protect)

router
  .route('/')
  .post(resumeUpload, createCandidate)
  .get(getCandidates)

router
  .route('/:id')
  .get(getCandidateById)
  .put(updateCandidate)
  .delete(deleteCandidate)

router
  .route('/:id/assessments')
  .post(assessmentUpload, createAssessmentForCandidate)
  .get(getAssessmentsForCandidate)

router.post('/:id/background', sendBackgroundCheck)

router
  .route('/:id/letters')
  .get(getLettersByCandidate)
  .post(createLetterForCandidate)

export default router
