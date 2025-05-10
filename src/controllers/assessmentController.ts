import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Candidate from '../models/Candidate';
import Assessment from '../models/Assessment';
import { assessmentUpload } from '../middleware/uploadMiddleware';

export const createAssessment = [
  assessmentUpload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const { title, remarks, score } = req.body;
      if (!req.file) return res.status(400).json({ message: 'File required' });

      const fileUrl = `/uploads/assessments/${req.file.filename}`;
      const candidateId = req.params.candidateId;

      // 1️⃣ Persist Assessment
      const a = await Assessment.create({
        candidate: new mongoose.Types.ObjectId(candidateId),
        title,
        remarks,
        score: Number(score),
        fileUrl,
      });

      // 2️⃣ Link on Candidate
      await Candidate.findByIdAndUpdate(candidateId, {
        $push: { assessments: a._id },
      });

      // 3️⃣ Return updated list
      const updated = await Candidate.findById(candidateId).populate('assessments');
      return res.status(201).json(updated?.assessments);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Failed to add assessment' });
    }
  },
];

export const getAssessments = async (req: Request, res: Response) => {
  const candidateId = req.params.candidateId;
  const assessments = await Assessment.find({ candidate: candidateId }).sort({ createdAt: -1 });
  return res.json(assessments);
};

export const getAssessment = async (req: Request, res: Response) => {
  const { candidateId, assessmentId } = req.params;
  const assessment = await Assessment.findOne({
    _id: assessmentId,
    candidate: candidateId,
  });
  if (!assessment) return res.status(404).json({ message: 'Not found' });
  return res.json(assessment);
};
