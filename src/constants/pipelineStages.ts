export const INTERVIEW_STAGES = [
    'Shortlisted',
    'HR Screening',
    'Technical Interview',
    'Managerial Interview',
    'Offer',
  ] as const
  
  export type InterviewStage = typeof INTERVIEW_STAGES[number]