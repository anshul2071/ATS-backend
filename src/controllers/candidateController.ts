import { Request, Response, NextFunction } from 'express'
import fs from 'fs'
import Candidate, { ICandidate } from '../models/Candidate'
import { parseResume } from '../utils/resumeParser'
import Offer, { IOffer } from '../models/Offer'

export const createCandidate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      name,
      email,
      phone,
      references,
      technology,
      level,
      salaryExpectation,
      experience
    } = req.body

    if (!req.file) {
      return res.status(400).json({ message: 'File is required.' })
    }

    const filePath = req.file.path
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Uploaded file not found.' })
    }

    const parserSummary = await parseResume(filePath)

    const candidate = await Candidate.create({
      name,
      email,
      phone,
      references,
      technology,
      level,
      salaryExpectation,
      experience
    })

    res.status(201).json({ ...candidate.toObject(), parserSummary })
  } catch (err) {
    next(err)
  }
}

export const getCandidates = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { search = '', tech = '', status = '' } = req.query as any
    const filter: any = {}

    if (search) {
      filter.name = { $regex: search, $options: 'i' }
    }
    if (tech) {
      filter.technology = tech
    }
    if (status) {
      filter.status = status
    }

    const list = await Candidate.find(filter)
    res.json(list)
  } catch (err) {
    next(err)
  }
}

export const getCandidateById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const candidate = await Candidate.findById(req.params.id)
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' })
    }
    // if you want to re-parse on each fetch, uncomment next lines:
    // const parserSummary = await parseResume(candidate.resumePath)
    // return res.json({ ...candidate.toObject(), parserSummary })
    res.json(candidate)
  } catch (err) {
    next(err)
  }
}

export const updateCandidate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const updated = await Candidate.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
    if (!updated) {
      return res.status(404).json({ message: 'Candidate not found' })
    }
    res.json(updated)
  } catch (err) {
    next(err)
  }
}

export const getOffersByCandidate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const candidateId = req.params.id
    const offers = await Offer.find({ candidate: candidateId }).sort({ date: -1 })
    res.json(offers)
  } catch (err) {
    next(err)
  }
}

export const createOfferForCandidate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const candidateId = req.params.id
    const { template, placeholders } = req.body

    const candidate = await Candidate.findById(candidateId)
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' })
    }

    const sentTo = candidate.email
    await Offer.create({ candidate: candidateId, template, sentTo })

    const offers = await Offer.find({ candidate: candidateId }).sort({ date: -1 })
    res.json(offers)
  } catch (err) {
    next(err)
  }
}


// Ats-backend/src/controllers/candidateController.ts

export const deleteCandidate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const candidateId = req.params.id;

    const deletedCandidate = await Candidate.findByIdAndDelete(candidateId);

    if (!deletedCandidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    res.status(200).json({ message: 'Candidate deleted successfully' });
  } catch (error) {
    next(error);
  }
};