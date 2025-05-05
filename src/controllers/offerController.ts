// src/controllers/offerController.ts
import { Request, Response, NextFunction } from 'express'
import Offer, { IOfferDocument } from '../models/Offer'
import Candidate from '../models/Candidate'
import { sendOfferEmail, OfferEmailPayload } from '../services/emailService'

export async function createOffer(
  req: Request,
  res: Response<IOfferDocument | { message: string }>,
  next: NextFunction
) {
  const {
    candidateId,
    position,
    salary,
    validUntil,
    recruiterEmail,
  } = req.body as {
    candidateId: string
    position: string
    salary: number
    validUntil?: string
    recruiterEmail: string
  }

  try {
    const candidate = await Candidate.findById(candidateId)
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' })
    }
    if (candidate.status !== 'Hired') {
      return res
        .status(400)
        .json({ message: 'Cannot send offer: candidate not yet hired.' })
    }

    const newOffer = await Offer.create({
      candidate:     candidate._id,
      position,
      salary,
      validUntil:    validUntil ? new Date(validUntil) : undefined,
      recruiterEmail,
      date:          new Date(),
    })

    const populated = await Offer.findById(newOffer._id)
      .populate<{ candidate: { name: string; email: string } }>(
        'candidate',
        'name email'
      )
      .lean()

    if (!populated) {
      return res
        .status(500)
        .json({ message: 'Failed to load newly created offer.' })
    }

    const payload: OfferEmailPayload = {
      to:           populated.candidate.email,
      subject:      `Your Offer from ${process.env.COMPANY_NAME}`,
      templateName: 'offerLetter',
      variables: {
        name:       populated.candidate.name,
        position:   populated.position,
        salary:     populated.salary.toString(),
        validUntil: populated.validUntil?.toDateString() ?? '',
        recruiter:  populated.recruiterEmail,
      },
      attachments: [],
    }

    await sendOfferEmail(payload)
    return res.status(201).json(populated as IOfferDocument)
  } catch (err) {
    next(err)
  }
}

export async function listOffers(
  req: Request,
  res: Response<IOfferDocument[] | { message: string }>,
  next: NextFunction
) {
  try {
    const offers = await Offer.find()
      .populate('candidate', 'name email')
      .sort({ date: -1 })
      .lean()
    return res.status(200).json(offers)
  } catch (err) {
    next(err)
  }
}

export async function getOfferById(
  req: Request<{ id: string }>,
  res: Response<IOfferDocument | { message: string }>,
  next: NextFunction
) {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate('candidate', 'name email')
      .lean()
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' })
    }
    return res.status(200).json(offer)
  } catch (err) {
    next(err)
  }
}

export async function updateOffer(
  req: Request<{ id: string }>,
  res: Response<IOfferDocument | { message: string }>,
  next: NextFunction
) {
  const { position, salary, validUntil } = req.body as Partial<{
    position: string
    salary: number
    validUntil: string
  }>

  if (
    position === undefined &&
    salary === undefined &&
    validUntil === undefined
  ) {
    return res
      .status(400)
      .json({ message: 'At least one of position, salary, or validUntil is required' })
  }

  try {
    const updated = await Offer.findByIdAndUpdate(
      req.params.id,
      {
        ...(position    !== undefined && { position }),
        ...(salary      !== undefined && { salary }),
        ...(validUntil  !== undefined && { validUntil: new Date(validUntil) }),
      },
      { new: true }
    )
      .populate('candidate', 'name email')
      .lean()

    if (!updated) {
      return res.status(404).json({ message: 'Offer not found' })
    }
    return res.status(200).json(updated)
  } catch (err) {
    next(err)
  }
}

export async function deleteOffer(
  req: Request<{ id: string }>,
  res: Response<{ message: string }>,
  next: NextFunction
) {
  try {
    const deleted = await Offer.findByIdAndDelete(req.params.id)
    if (!deleted) {
      return res.status(404).json({ message: 'Offer not found' })
    }
    return res.status(200).json({ message: 'Offer deleted successfully' })
  } catch (err) {
    next(err)
  }
}
