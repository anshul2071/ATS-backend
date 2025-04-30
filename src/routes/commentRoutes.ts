import { Router } from 'express'
import { protect } from '../middleware/authMiddleware'
import {
  postComment,
  getComments
} from '../controllers/commentController'

const router = Router()

router.use(protect)

router.post('/:id/comment', postComment)
router.get('/:id/comments', getComments)

export default router
