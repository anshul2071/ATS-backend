import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  createCandidate,
  getCandidates,
  getCandidateById,
  updateCandidate,
  deleteCandidate,
  addAssessment,
  sendBackgroundCheck,
  getLettersByCandidate,
  createLetterForCandidate,
} from '../controllers/candidateController';
import { resumeUpload } from '../middleware/uploadMiddleware';

const router = Router();

// all routes below require auth
router.use(protect);

// — Candidate CRUD —
router.post('/', resumeUpload.single('file'), createCandidate);
router.get('/', getCandidates);
router.get('/:id', getCandidateById);
router.put('/:id', updateCandidate);
router.delete('/:id', deleteCandidate);

// — Assessment assignment —
router.post('/:id/assessment', addAssessment);

// — Reference background check email —
router.post('/:id/background', sendBackgroundCheck);

// — Offer / Rejection letters —
router.get('/:id/letters', getLettersByCandidate);
router.post('/:id/letters', createLetterForCandidate);

export default router;
