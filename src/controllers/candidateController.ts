// src/controllers/candidateController.ts

import { Request, Response, NextFunction } from "express";
import fs from "fs";
import dayjs from "dayjs";
import mongoose from "mongoose";
import Candidate, { ICandidateDocument } from "../models/Candidate";
import Assessment from "../models/Assessment";
import Letter, { TemplateType, ILetter } from "../models/Letter";
import { parseResume } from "../utils/resumeParser";
import { assessmentUpload } from "../middleware/uploadMiddleware";
import { sendOfferEmail, OfferEmailPayload } from "../services/emailService";

/**
 * POST /api/candidates
 */
export const createCandidate = async (
  req: Request<{}, {}, {
    name: string;
    email: string;
    phone?: string;
    references?: string;
    technology: string;
    level: string;
    salaryExpectation?: number;
    experience?: number;
  }>,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "CV file is required." });
    }
    const filePath = req.file.path;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Uploaded file not found." });
    }

    const { name, email, phone, references, technology, level, salaryExpectation, experience } = req.body;
    const parserSummary = await parseResume(filePath);
    const cvUrl = `/uploads/resumes/${req.file.filename}`;

    const candidate = await Candidate.create({
      name,
      email,
      phone,
      references,
      technology,
      level,
      salaryExpectation,
      experience,
      cvUrl,
    });

    return res.status(201).json({ candidate, parserSummary });
  } catch (err) {
    console.error("createCandidate error:", err);
    return next(err);
  }
};

/**
 * GET /api/candidates
 */
export const getCandidates = async (
  req: Request<{}, {}, {}, { search?: string; tech?: string; status?: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { search = "", tech = "", status = "" } = req.query;
    const filter: any = {};
    if (search) filter.name = { $regex: search, $options: "i" };
    if (tech) filter.technology = tech;
    if (status) filter.status = status;
    const list = await Candidate.find(filter).sort({ createdAt: -1 });
    return res.json(list);
  } catch (err) {
    console.error("getCandidates error:", err);
    return next(err);
  }
};

/**
 * GET /api/candidates/:id
 */
export const getCandidateById = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const candidate = await Candidate.findById(req.params.id)
      .populate("letters")
      .populate("assessments");
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }
    return res.json(candidate);
  } catch (err) {
    console.error("getCandidateById error:", err);
    return next(err);
  }
};

/**
 * PUT /api/candidates/:id
 */
export const updateCandidate = async (
  req: Request<{ id: string }, {}, Partial<ICandidateDocument>>,
  res: Response,
  next: NextFunction
) => {
  try {
    const updated = await Candidate.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return res.status(404).json({ message: "Candidate not found" });
    }
    return res.json(updated);
  } catch (err) {
    console.error("updateCandidate error:", err);
    return next(err);
  }
};

/**
 * POST /api/candidates/:id/assessments
 * (file field must be named “file” to match multer.single("file"))
 */
export const createAssessmentForCandidate = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const candidateId = req.params.id
    if (!mongoose.isValidObjectId(candidateId)) {
      return res.status(400).json({ message: 'Invalid candidate ID' })
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Assessment file is required.' })
    }

    const cand = await Candidate.findById(candidateId).select('name email')
    if (!cand) {
      return res.status(404).json({ message: 'Candidate not found' })
    }

    const { title, score, remarks } = req.body
    const fileUrl = `/uploads/assessments/${req.file.filename}`

    const assessment = await Assessment.create({
      candidate: new mongoose.Types.ObjectId(candidateId),
      title,
      score: Number(score),
      remarks,
      fileUrl,
    })

    cand.assessments.push(assessment._id)
    await cand.save()

    await sendOfferEmail({
      to: cand.email,
      subject: `📝 New Assessment Assigned: ${assessment.title}`,
      html: `
        <p>Hi ${cand.name},</p>
        <p>We've just assigned you a new assessment:</p>
        <ul>
          <li><strong>${assessment.title}</strong></li>
          <li>Target Score: ${assessment.score}/100</li>
          <li><a href="${process.env.APP_URL}/candidates/${candidateId}/assessments/${assessment._id}/download">Download here</a></li>
        </ul>
        <p>Good luck!</p>
      `,
    } as OfferEmailPayload)

    return res.status(201).json(assessment)
  } catch (err) {
    console.error('createAssessmentForCandidate error:', err)
    return next(err)
  }
}

export const getAssessmentsForCandidate = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const candidateId = req.params.id
    if (!mongoose.isValidObjectId(candidateId)) {
      return res.status(400).json({ message: 'Invalid candidate ID' })
    }

    const list = await Assessment.find({ candidate: candidateId }).sort({ createdAt: -1 })
    return res.json(list)
  } catch (err) {
    console.error('getAssessmentsForCandidate error:', err)
    return next(err)
  }
}

export const sendBackgroundCheck = async (
  req: Request<{ id: string }, {}, { refEmail?: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const cand = await Candidate.findById(req.params.id).select("name email");
    if (!cand) {
      return res.status(404).json({ message: "Candidate not found" });
    }
    if (!req.body.refEmail) {
      return res.status(400).json({ message: "Reference email is required" });
    }

    await sendOfferEmail({
      to: req.body.refEmail,
      subject: `Background Check Request for ${cand.name}`,
      text: `Hello,\n\nPlease provide a reference check for ${cand.name} (${cand.email}).\n\nThank you!`,
    });

    return res.json({ message: "Background check request sent." });
  } catch (err) {
    console.error("sendBackgroundCheck error:", err);
    return next(err);
  }
};

/**
 * GET /api/candidates/:id/letters
 */
export const getLettersByCandidate = async (
  req: Request<{ id: string }, {}, {}, { type?: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    if (!(await Candidate.exists({ _id: id }))) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const filter: any = { candidate: id };
    if (req.query.type === "offer" || req.query.type === "rejection") {
      filter.templateType = req.query.type;
    }

    const letters = await Letter.find(filter).sort({ createdAt: -1 });
    return res.json(letters);
  } catch (err) {
    console.error("getLettersByCandidate error:", err);
    return next(err);
  }
};

/**
 * POST /api/candidates/:id/letters
 */
export const createLetterForCandidate = async (
  req: Request<
    { id: string },
    {},
    {
      templateType: TemplateType;
      position?: string;
      technology?: string;
      startingDate?: string;
      salary?: number;
      probationDate?: string;
      acceptanceDeadline?: string;
    }
  >,
  res: Response,
  next: NextFunction
) => {
  try {
    const cand = await Candidate.findById(req.params.id).select("name email status letters");
    if (!cand) {
      return res.status(404).json({ message: "Candidate not found" });
    }
    const { templateType, position, technology, startingDate, salary, probationDate, acceptanceDeadline } = req.body;

    if (templateType === "offer") {
      const missing: string[] = [];
      if (!position) missing.push("position");
      if (!technology) missing.push("technology");
      if (!startingDate) missing.push("startingDate");
      if (salary == null) missing.push("salary");
      if (!probationDate) missing.push("probationDate");
      if (!acceptanceDeadline) missing.push("acceptanceDeadline");
      if (missing.length) {
        return res.status(400).json({ message: `Missing fields: ${missing.join(", ")}` });
      }
      if (cand.status !== "Hired") {
        return res.status(400).json({ message: "Cannot send offer: candidate not yet hired." });
      }
    }

    let subject: string, html: string;
    if (templateType === "offer") {
      subject = `🎉 Offer for ${cand.name}`;
      html = `
        <p>Dear ${cand.name},</p>
        <p>We are pleased to offer you the <strong>${position}</strong> role on our <strong>${technology}</strong> team.</p>
        <ul>
          <li><strong>Start Date:</strong> ${dayjs(startingDate).format("MMM D, YYYY")}</li>
          <li><strong>Salary:</strong> $${salary!.toLocaleString()}</li>
          <li><strong>Probation Ends:</strong> ${dayjs(probationDate).format("MMM D, YYYY")}</li>
          <li><strong>Accept By:</strong> ${dayjs(acceptanceDeadline).format("MMM D, YYYY")}</li>
        </ul>
        <p>Please reply by the deadline above to confirm.</p>
        <p>Best regards,<br/>Recruitment Team</p>
      `;
    } else {
      subject = `🔔 Application Update for ${cand.name}`;
      html = `
        <p>Dear ${cand.name},</p>
        <p>Thank you for applying. Unfortunately, we will not be moving forward at this time.</p>
        <p>We appreciate your interest and wish you all the best.</p>
        <p>Sincerely,<br/>Recruitment Team</p>
      `;
    }

    await sendOfferEmail({ to: cand.email, subject, html });

    const letter = await Letter.create({
      candidate: new mongoose.Types.ObjectId(req.params.id),
      templateType,
      position: position || "",
      technology: technology || "",
      startingDate: startingDate ? new Date(startingDate) : undefined,
      salary: salary || 0,
      probationDate: probationDate ? new Date(probationDate) : undefined,
      acceptanceDeadline: acceptanceDeadline ? new Date(acceptanceDeadline) : undefined,
      sentTo: cand.email,
    } as ILetter);

    cand.letters.push(letter._id);
    await cand.save().catch(e => console.error("Error saving letter ref:", e));

    return res.status(201).json(letter);
  } catch (err) {
    console.error("createLetterForCandidate error:", err);
    return next(err);
  }
};

/**
 * DELETE /api/candidates/:id
 */
export const deleteCandidate = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const deleted = await Candidate.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Candidate not found" });
    }
    return res.json({ message: "Candidate deleted successfully" });
  } catch (err) {
    console.error("deleteCandidate error:", err);
    return next(err);
  }
};
