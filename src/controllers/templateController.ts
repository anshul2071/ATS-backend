import { Request, Response, NextFunction } from 'express'
import OfferTemplate, { IOfferTemplate } from '../models/OfferTemplate'

export async function listTemplates(
  req: Request,
  res: Response<IOfferTemplate[] | { message: string }>,
  next: NextFunction
) {
  try {
    const templates = await OfferTemplate.find().sort({ name: 1 }).lean()
    res.json(templates)
  } catch (err) {
    next(err)
  }
}

export async function createTemplate(
  req: Request<{}, IOfferTemplate | { message: string }, { name: string; subject: string; body: string }>,
  res: Response<IOfferTemplate | { message: string }>,
  next: NextFunction
) {
  const { name, subject, body } = req.body
  try {
    const tpl = await OfferTemplate.create({ name, subject, body })
    res.status(201).json(tpl)
  } catch (err) {
    next(err)
  }
}

export async function getTemplateById(
  req: Request<{ id: string }>,
  res: Response<IOfferTemplate | { message: string }>,
  next: NextFunction
) {
  try {
    const tpl = await OfferTemplate.findById(req.params.id).lean()
    if (!tpl) return res.status(404).json({ message: 'Template not found' })
    res.json(tpl)
  } catch (err) {
    next(err)
  }
}

export async function updateTemplate(
  req: Request<{ id: string }, IOfferTemplate | { message: string }, Partial<{ name: string; subject: string; body: string }>>,
  res: Response<IOfferTemplate | { message: string }>,
  next: NextFunction
) {
  try {
    const updated = await OfferTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean()
    if (!updated) return res.status(404).json({ message: 'Template not found' })
    res.json(updated)
  } catch (err) {
    next(err)
  }
}

export async function deleteTemplate(
  req: Request<{ id: string }>,
  res: Response<{ message: string }>,
  next: NextFunction
) {
  try {
    const deleted = await OfferTemplate.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ message: 'Template not found' })
    res.json({ message: 'Template deleted' })
  } catch (err) {
    next(err)
  }
}
