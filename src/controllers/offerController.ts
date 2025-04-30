// src/controllers/offerController.ts
import { Request, Response, NextFunction } from 'express'
import Offer from '../models/Offer'
import Candidate from '../models/Candidate'
import { sendOfferEmail } from '../utils/email'

export async function createOffer(req: Request, res: Response, next: NextFunction) {
  const { candidateId } = req.params
  const { template, placeholders } = req.body

  try {
    // 1) Save offer in DB
    const offer = await Offer.create({
      candidate: candidateId,
      template,
      placeholders,
      sentTo: '' // will fill in below
    })

    // 2) Lookup candidate email
    const candidate = await Candidate.findById(candidateId).select('email').lean()
    if (!candidate || !candidate.email) {
      return res.status(404).json({ message: 'Candidate not found or has no email' })
    }

    // 3) Send the email
    // placeholders might be a JSON string or an object; serialize it sensibly
    const emailDetails = {
      candidateName: candidate.name, // assuming you have access to the candidate's name
      position: template, // or some other value that makes sense for your application
      salary: '', // or some other value that makes sense for your application
      startDate: '', // or some other value that makes sense for your application
    };
    
    await sendOfferEmail(candidate.email, emailDetails);
    // 4) Update the offer record with the actual “sentTo” address
    offer.sentTo = candidate.email
    await offer.save()

    // 5) Return the updated list of offers for this candidate
    const offers = await Offer.find({ candidate: candidateId }).sort({ date: -1 }).lean()
    res.status(201).json(offers)
  } catch (err) {
    next(err)
  }
}

export async function listOffers(req: Request, res: Response, next: NextFunction) {
  const { candidateId } = req.params

  try {
    const offers = await Offer.find({ candidate: candidateId }).sort({ date: -1 }).lean()
    res.json(offers)
  } catch (err) {
    next(err)
  }
}
