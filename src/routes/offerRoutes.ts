import { Router } from 'express'
import { protect } from '../middleware/authMiddleware'
import {
  createOffer,
  listOffers,
  getOfferById,
  updateOffer,
  deleteOffer,
} from '../controllers/offerController'

const router = Router()

router.use(protect)

router.get('/',      listOffers)     // GET   /offers
router.post('/',     createOffer)    // POST  /offers
router.get('/:id',   getOfferById)   // GET   /offers/:id
router.put('/:id',   updateOffer)    // PUT   /offers/:id
router.delete('/:id', deleteOffer)   // DELETE/offers/:id

export default router
