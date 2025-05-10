// src/controllers/candidateController.ts

import { Request, Response, NextFunction } from "express";
import fs from "fs";
import dayjs from "dayjs";
import mongoose from "mongoose";
import Candidate, { ICandidateDocument } from "../models/Candidate";
import Assessment from "../models/Assessment";
import Letter, { TemplateType } from "../models/Letter";
import { parseResume } from "../utils/resumeParser";
import { assessmentUpload } from "../middleware/uploadMiddleware";
import { sendOfferEmail, OfferEmailPayload } from "../services/emailService";

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
    const { name, email, phone, references, technology, level, salaryExpectation, experience } = req.body;
    if (!req.file) return res.status(400).json({ message: "CV file is required." });
    const filePath = req.file.path;
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "Uploaded file not found." });
    const parserSummary = await parseResume(filePath);
    const cvUrl = `/uploads/resumes/${req.file.filename}`;
    const candidate = await Candidate.create({ name, email, phone, references, technology, level, salaryExpectation, experience, cvUrl });
    return res.status(201).json({ candidate, parserSummary });
  } catch (err) {
    console.error("createCandidate error:", err);
    return next(err);
  }
};

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

export const getCandidateById = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const candidate = await Candidate.findById(req.params.id)
      .populate("letters")
      .populate("assessments");
    if (!candidate) return res.status(404).json({ message: "Candidate not found" });
    return res.json(candidate);
  } catch (err) {
    console.error("getCandidateById error:", err);
    return next(err);
  }
};

export const updateCandidate = async (
  req: Request<{ id: string }, {}, Partial<{
    name: string;
    email: string;
    phone: string;
    references: string;
    technology: string;
    level: string;
    salaryExpectation: number;
    experience: number;
    status: ICandidateDocument["status"];
    cvUrl: string;
  }>>,
  res: Response,
  next: NextFunction
) => {
  try {
    const updated = await Candidate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: "Candidate not found" });
    return res.json(updated);
  } catch (err) {
    console.error("updateCandidate error:", err);
    return next(err);
  }
};

export const addAssessment = [
  assessmentUpload.single("file"),
  async (
    req: Request<{ id: string }, {}, { title: string; score: string; remarks?: string }>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const cand = await Candidate.findById(id);
      if (!cand) return res.status(404).json({ message: "Candidate not found" });
      if (!req.file) return res.status(400).json({ message: "Assessment file is required" });
      const assessment = await Assessment.create({
        candidate: new mongoose.Types.ObjectId(id),
        title: req.body.title,
        score: Number(req.body.score),
        remarks: req.body.remarks,
        fileUrl: `/uploads/assessments/${req.file.filename}`,
      });
      cand.assessments.push(assessment._id);
      await cand.save();
      const updated = await Assessment.find({ candidate: id }).sort({ createdAt: -1 });
      return res.status(201).json(updated);
    } catch (err) {
      console.error("addAssessment error:", err);
      return next(err);
    }
  },
];

export const sendBackgroundCheck = async (
  req: Request<{ id: string }, {}, { refEmail: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const cand = await Candidate.findById(req.params.id).select("name email");
    if (!cand) return res.status(404).json({ message: "Candidate not found" });
    if (!req.body.refEmail) return res.status(400).json({ message: "Reference email is required" });
    const mail: OfferEmailPayload = {
      to: req.body.refEmail,
      subject: `Background Check Request for ${cand.name}`,
      text: `Hello,\n\nPlease provide a reference check for ${cand.name} (${cand.email}).\n\nThank you!`,
    };
    await sendOfferEmail(mail);
    return res.json({ message: "Background check request sent." });
  } catch (err) {
    console.error("sendBackgroundCheck error:", err);
    return next(err);
  }
};

export const getLettersByCandidate = async (
  req: Request<{ id: string }, {}, {}, { type?: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const cand = await Candidate.findById(id).select("_id");
    if (!cand) return res.status(404).json({ message: "Candidate not found" });
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

export const createLetterForCandidate = async (
  req: Request<{ id: string }, {}, {
    templateType: TemplateType;
    position: string;
    technology: string;
    startingDate: string;
    salary: number;
    probationDate: string;
    acceptanceDeadline: string;
  }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const cand = await Candidate.findById(req.params.id).select("name email status");
    if (!cand) return res.status(404).json({ message: "Candidate not found" });
    if (req.body.templateType === "offer" && cand.status !== "Hired") {
      return res.status(400).json({ message: "Cannot send offer: candidate not yet hired." });
    }
    let subject: string, html: string;
    const { templateType, position, technology, startingDate, salary, probationDate, acceptanceDeadline } = req.body;
    if (templateType === "offer") {
      subject = `🎉 Offer for ${cand.name}`;
      html = `
        <p>Dear ${cand.name},</p>
        <p>We are pleased to offer you the <strong>${position}</strong> role on our <strong>${technology}</strong> team.</p>
        <ul>
          <li><strong>Start Date:</strong> ${dayjs(startingDate).format("MMM D, YYYY")}</li>
          <li><strong>Salary:</strong> $${salary.toLocaleString()}</li>
          <li><strong>Probation Ends:</strong> ${dayjs(probationDate).format("MMM D, YYYY")}</li>
          <li><strong>Accept By:</strong> ${dayjs(acceptanceDeadline).format("MMM D, YYYY")}</li>
        </ul>
        <p>Please reply by the deadline above to confirm.</p>
      `;
    } else {
      subject = `🔔 Application Update for ${cand.name}`;
      html = `
        <p>Dear ${cand.name},</p>
        <p>Thank you for applying for the <strong>${position}</strong> role. After careful review, we will not be moving forward at this time.</p>
      `;
    }
    await sendOfferEmail({ to: cand.email, subject, html });
    const letter = await Letter.create({
      candidate: new mongoose.Types.ObjectId(req.params.id),
      templateType,
      position,
      technology,
      startingDate: new Date(startingDate),
      salary,
      probationDate: new Date(probationDate),
      acceptanceDeadline: new Date(acceptanceDeadline),
      sentTo: cand.email,
    });
    cand.letters.push(letter._id);
    await cand.save();
    return res.status(201).json(letter);
  } catch (err) {
    console.error("createLetterForCandidate error:", err);
    return next(err);
  }
};

export const deleteCandidate = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const deleted = await Candidate.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Candidate not found" });
    return res.json({ message: "Candidate deleted successfully" });
  } catch (err) {
    console.error("deleteCandidate error:", err);
    return next(err);
  }
};
