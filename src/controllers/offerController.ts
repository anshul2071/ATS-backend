import { Request, Response, NextFunction } from 'express'
import Offer,           { IOfferDocument }     from '../models/Offer'
import Candidate,       { ICandidateDocument } from '../models/Candidate'
import OfferTemplate,   { IOfferTemplate }     from '../models/OfferTemplate'
import { sendOfferEmail, OfferEmailPayload }                    from '../services/emailService'

interface CreateOfferBody {
  candidateId:  string
  templateId:   string
  placeholders: Record<string, any>
}

interface ExtendedOfferEmailPayload extends OfferEmailPayload {
  text: string;
}

export async function createOffer(
  req: Request<{}, IOfferDocument | { message: string }, CreateOfferBody>,
  res: Response<IOfferDocument | { message: string }>,
  next: NextFunction
) {
  const { candidateId, templateId, placeholders } = req.body

  try {
    const candidate = await Candidate.findById(candidateId) as ICandidateDocument | null
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' })
    }
    if (candidate.status !== 'Hired') {
      return res.status(400).json({ message: 'Cannot send offer: candidate not yet hired.' })
    }

    const tpl = await OfferTemplate.findById(templateId).lean() as IOfferTemplate | null
    if (!tpl) {
      return res.status(404).json({ message: 'Template not found' })
    }

    const newOffer = await Offer.create({
      candidate:    candidate._id,
      template:     tpl._id,
      placeholders,
      date:         new Date(),
    })

    const populated = await Offer.findById(newOffer._id)
      .populate<{ candidate: { name: string; email: string }; template: { subject: string; body: string } }>(
        'candidate template',
        'name email subject body'
      )
      .lean() as IOfferDocument & { candidate: { name: string; email: string }; template: { subject: string; body: string } }

    // simple {{var}} replacement
    let bodyText = tpl.body
    const vars = { name: candidate.name, ...placeholders }
    for (const [key, val] of Object.entries(vars)) {
      bodyText = bodyText.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(val))
    }

    await sendOfferEmail({
      to:       candidate.email,
      subject:  tpl.subject,
      templateName: '',   // not used since we supply `text`
      variables: {},      // not used
      attachments: [],
      text: bodyText     // pass the rendered body
    })

    return res.status(201).json(populated)
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
      .populate('template', 'name subject')
      .sort({ date: -1 })
      .lean<IOfferDocument[]>()
    res.json(offers)
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
      .populate('template', 'name subject')
      .lean<IOfferDocument>()
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' })
    }
    res.json(offer)
  } catch (err) {
    next(err)
  }
}

export async function updateOffer(
  req: Request<{ id: string }, IOfferDocument | { message: string }, Partial<CreateOfferBody>>,
  res: Response<IOfferDocument | { message: string }>,
  next: NextFunction
) {
  const { placeholders, templateId } = req.body
  if (!placeholders && !templateId) {
    return res.status(400).json({ message: 'At least one of templateId or placeholders is required' })
  }

  try {
    const update: any = {}
    if (templateId)     update.template     = templateId
    if (placeholders)   update.placeholders = placeholders

    const updated = await Offer.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    )
      .populate('candidate', 'name email')
      .populate('template',  'name subject')
      .lean<IOfferDocument>()

    if (!updated) {
      return res.status(404).json({ message: 'Offer not found' })
    }
    res.json(updated)
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
    const deleted = await Offer.findByIdAndDelete(req.params.id).exec()
    if (!deleted) {
      return res.status(404).json({ message: 'Offer not found' })
    }
    res.json({ message: 'Offer deleted successfully' })
  } catch (err) {
    next(err)
  }
}
