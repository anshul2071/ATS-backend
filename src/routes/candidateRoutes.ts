import { Router } from 'express'
import { protect } from '../middleware/authMiddleware'
import { resumeUpload } from '../middleware/uploadMiddleware'
import {
  createCandidate,
  getCandidates,
  getCandidateById,
  updateCandidate,
  getOffersByCandidate,
  deleteCandidate,
  createOfferForCandidate
} from '../controllers/candidateController'

const router = Router()

router.use(protect)

router.post(
  '/',
  resumeUpload.single('file'),
  createCandidate
)

router.get('/', getCandidates)
router.get('/:id', getCandidateById)
router.put('/:id', updateCandidate)

router.get('/:id/offers', getOffersByCandidate)
router.post('/:id/offers', createOfferForCandidate)
router.delete('/:id', deleteCandidate);

export default router
