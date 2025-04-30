// src/routes/offerRoutes.ts
import { Router } from 'express'
import { protect } from '../middleware/authMiddleware'
import { createOffer, listOffers } from '../controllers/offerController'

const router = Router({ mergeParams: true })

router.use(protect)
router.post('/', createOffer)
router.get('/', listOffers)

export default router
