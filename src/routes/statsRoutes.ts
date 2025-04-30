import { Router } from 'express'
import { statsHandler } from '../controllers/statsController'
import { protect } from '../middleware/authMiddleware'

const router = Router()
router.use(protect)
router.get('/', statsHandler)
export default router
