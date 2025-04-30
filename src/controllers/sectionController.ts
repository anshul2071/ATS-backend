import { Request, Response, NextFunction } from 'express'
import Section from '../models/Section'

export const getSections = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let cfg = await Section.findOne()

    if (!cfg) {
      cfg = await Section.create({
        sections: []
      })
    }

    res.json(cfg.sections)
  } catch (error) {
    next(error)
  }
}

export const saveSections = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sections } = req.body

    let cfg = await Section.findOne()

    if (cfg) {
      cfg.sections = sections
      await cfg.save()
    } else {
      cfg = await Section.create({
        sections
      })
    }

    res.json(cfg.sections)
  } catch (error) {
    next(error)
  }
}
