// src/controllers/candidateController.ts
import { Request, Response, NextFunction } from 'express'
import fs from 'fs'
import Candidate, { ICandidateDocument } from '../models/Candidate'
import { parseResume } from '../utils/resumeParser'
import Offer, { IOfferDocument } from '../models/Offer'
import OfferTemplate from '../models/OfferTemplate'

import {
  sendOfferEmail,
  OfferEmailPayload
} from '../services/emailService'


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

    // parseResume can return whatever shape your parserSummary needs
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

    res
      .status(201)
      .json({ ...candidate.toObject(), parserSummary })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/candidates
 * List candidates (with optional ?search=, ?tech=, ?status= filters)
 */
export const getCandidates = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { search = '', tech = '', status = '' } = req.query as any
    const filter: any = {}

    if (search) filter.name = { $regex: search, $options: 'i' }
    if (tech)    filter.technology = tech
    if (status)  filter.status     = status

    const list = await Candidate.find(filter)
    res.json(list)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/candidates/:id
 * Fetch one candidate by ID
 */
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
    res.json(candidate)
  } catch (err) {
    next(err)
  }
}

/**
 * PUT /api/candidates/:id
 * Update arbitrary candidate fields
 */
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

/**
 * GET /api/candidates/:id/offers
 * List all offers for a given candidate, populated with their name & email
 */
export const getOffersByCandidate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const candidateId = req.params.id

    // ensure the candidate exists
    const cand = await Candidate.findById(candidateId).select('_id')
    if (!cand) {
      return res.status(404).json({ message: 'Candidate not found' })
    }

    const offers = await Offer.find({ candidate: candidateId })
      .populate<{ candidate: { name: string; email: string } }>(
        'candidate',
        'name email'
      )
      .sort({ date: -1 })
      .lean()

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
    const { templateId, placeholders } = req.body as {
      templateId:  string
      placeholders: Record<string,string>
    }

    // 1️⃣ fetch candidate
    const candidate = await Candidate
      .findById(candidateId)
      .select('name email status') as ICandidateDocument | null

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' })
    }
    if (candidate.status !== 'Hired') {
      return res.status(400).json({ message: 'Cannot send offer: candidate not yet hired.' })
    }

    // 2️⃣ fetch template
    const tpl = await OfferTemplate.findById(templateId)
    if (!tpl) {
      return res.status(404).json({ message: 'Offer template not found' })
    }

    // 3️⃣ create the offer
    const newOffer = await Offer.create({
      candidate:      candidate._id,
      template:       tpl._id,
      placeholders,
      recruiterEmail: (req as any).user?.email ?? 'recruiter@company.com',
      date:           new Date(),
    })

    // 4️⃣ populate candidate & template for email + response
    const populated = await Offer.findById(newOffer._id)
      .populate<{ candidate: { name:string; email:string } }>('candidate','name email')
      .populate<{ template:  { name:string; subject:string } }>('template','name subject')
      .lean<IOfferDocument & {
        candidate: { name:string; email:string }
        template:  { name:string; subject:string }
      }>()

    // 5️⃣ send the email
    const payload: OfferEmailPayload = {
      to:           populated!.candidate.email,
      subject:      populated!.template.subject,
      templateName: populated!.template.name,
      variables:    populated!.placeholders as Record<string,string>,
    }
    await sendOfferEmail(payload)

    // 6️⃣ return full list of offers for this candidate
    const offers = await Offer.find({ candidate: candidateId })
      .populate('candidate','name email')
      .populate('template','name subject')
      .sort({ date: -1 })
      .lean()

    return res.status(201).json(offers)
  } catch (err) {
    next(err)
  }
}

export const deleteCandidate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const candidateId = req.params.id
    const deleted = await Candidate.findByIdAndDelete(candidateId)
    if (!deleted) {
      return res.status(404).json({ message: 'Candidate not found' })
    }
    res.json({ message: 'Candidate deleted successfully' })
  } catch (err) {
    next(err)
  }
}
