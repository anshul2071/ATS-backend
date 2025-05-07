import { Router } from 'express'
import { protect } from '../middleware/authMiddleware'
import {
  listTemplates,
  createTemplate,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
} from '../controllers/templateController'

const router = Router()
router.use(protect)

router.get('/',    listTemplates)
router.post('/',   createTemplate)
router.get('/:id', getTemplateById)
router.put('/:id', updateTemplate)
router.delete('/:id', deleteTemplate)

export default router
