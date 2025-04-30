import { Router } from 'express'
import { protect } from '../middleware/authMiddleware'
import { getSections, saveSections } from '../controllers/sectionController'

const router = Router()


router.use(protect)
router.get('/',  getSections)
router.post('/',  saveSections)

export default router
