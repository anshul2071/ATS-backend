import { Router } from 'express'
import {
  createLetter,
  sendLetter,
  getLetters,
  getLetter,
} from '../controllers/letterController'

const router = Router({ mergeParams: true })

router.post('/',                createLetter)         // persist new letter
router.post('/:letterId/send',  sendLetter)           // email an existing letter
router.get('/',                 getLetters)           // list all
router.get('/:letterId',        getLetter)            // fetch one

export default router
