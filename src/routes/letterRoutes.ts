import { Router } from 'express';
import {
  sendLetter,
  getLetters,
  getLetter,
} from '../controllers/letterController';

const router = Router();

router.post('/candidates/:candidateId/letters', sendLetter);
router.get('/candidates/:candidateId/letters', getLetters);
router.get('/candidates/:candidateId/letters/:letterId', getLetter);

export default router;
