import { Router } from 'express';
import {
  createAssessment,
  getAssessments,
  getAssessment,
} from '../controllers/assessmentController';

const router = Router();

router.post('/candidates/:candidateId/assessment', createAssessment);
router.get('/candidates/:candidateId/assessment', getAssessments);
router.get(
  '/candidates/:candidateId/assessment/:assessmentId',
  getAssessment
);

export default router;
