import fs from 'fs/promises'
import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'

export interface ResumeSummary {
  skills: string[]
  score: number
  education: string[]
  experience: { company: string; role: string; duration: string }[]
}

export const parseResume = async (
  filePath: string
): Promise<ResumeSummary> => {
  const buffer = await fs.readFile(filePath)
  let text = ''

  try {
    text = (await pdfParse(buffer)).text
  } catch {
    text = (await mammoth.extractRawText({ buffer })).value
  }

  const rawSkills = text.match(
    /JavaScript|TypeScript|React|Node\.js|Java|Python|MongoDB/gi
  ) || []

  const skills = Array.from(
    new Set(rawSkills.map((s) => s.trim()))
  )

  const score = Math.min(100, skills.length * 15)

  const education = text
    .split('\n')
    .filter((line) =>
      /University|College|Bachelor|Master/i.test(line)
    )
    .slice(0, 5)

  return {
    skills,
    score,
    education,
    experience: []
  }
}
