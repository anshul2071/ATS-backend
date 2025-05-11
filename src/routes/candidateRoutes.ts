// src/routes/candidateRoutes.ts

import { Router } from "express"
import { protect } from "../middleware/authMiddleware"
import { resumeUpload, assessmentUpload } from "../middleware/uploadMiddleware"
import {
  createCandidate,
  getCandidates,
  getCandidateById,
  updateCandidate,
  deleteCandidate,
  sendBackgroundCheck,
  getLettersByCandidate,
  createLetterForCandidate,
  createAssessmentForCandidate,
  getAssessmentsForCandidate,
} from "../controllers/candidateController"

const router = Router()

router.use(protect)

router.post("/", resumeUpload.single("file"), createCandidate)
router.get("/", getCandidates)
router.get("/:id", getCandidateById)
router.put("/:id", updateCandidate)
router.delete("/:id", deleteCandidate)

router.post("/:id/assessments", assessmentUpload.single("file"), createAssessmentForCandidate)
router.get("/:id/assessments", getAssessmentsForCandidate)

router.post("/:id/background", sendBackgroundCheck)

router.get("/:id/letters", getLettersByCandidate)
router.post("/:id/letters", createLetterForCandidate)

export default router
