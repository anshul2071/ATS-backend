// backend/src/services/statsService.ts
import Candidate from '../models/Candidate'
import Interview from '../models/Interview'
import Letter from '../models/Letter'

export interface PipeLineDataItem { name: string; value: number }
export interface TimeToHireDataItem { date: string; value: number }
export interface TechDistributionDataItem { technology: string; count: number }

export interface AnalyticsData {
  totalCandidates: number
  interviewsToday: number
  lettersSent: number         // renamed from offersPending
  avgTimeToHire: number
  pipeline: PipeLineDataItem[]
  timeToHire: TimeToHireDataItem[]
  byTech: TechDistributionDataItem[]
}

export async function getAnalytics(): Promise<AnalyticsData> {
  // total number of candidates in the system
  const totalCandidates = await Candidate.countDocuments()

  // how many interviews are scheduled from midnight onward
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const interviewsToday = await Interview.countDocuments({
    date: { $gte: todayStart },
  })

  // total letters sent so far
  const lettersSent = await Letter.countDocuments()

  // compute average time to hire among those marked "Hired"
  const hiredDocs = await Candidate.find({ status: 'Hired' })
    .select('createdAt updatedAt')
    .lean<{ createdAt?: Date; updatedAt?: Date }[]>()

  const durations = hiredDocs
    .filter(c => c.createdAt && c.updatedAt)
    .map(c =>
      (c.updatedAt!.getTime() - c.createdAt!.getTime()) /
      (1000 * 60 * 60 * 24)
    )

  const avgTimeToHire = durations.length
    ? parseFloat((durations.reduce((a, v) => a + v, 0) / durations.length).toFixed(1))
    : 0

  // pipeline counts by status
  const statuses = ['Shortlisted', 'First Interview', 'Second Interview', 'Hired'] as const
  const pipeline = await Promise.all<PipeLineDataItem>(
    statuses.map(async status => ({
      name: status,
      value: await Candidate.countDocuments({ status }),
    }))
  )

  // average time to hire over the past week
  const weekAgo = new Date(todayStart)
  weekAgo.setDate(weekAgo.getDate() - 6)

  const agg = await Candidate.aggregate<TimeToHireDataItem>([
    { $match: { status: 'Hired', updatedAt: { $gte: weekAgo } } },
    {
      $project: {
        day: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
        diff: {
          $divide: [
            { $subtract: ['$updatedAt', '$createdAt'] },
            1000 * 60 * 60 * 24,
          ],
        },
      },
    },
    {
      $group: {
        _id: '$day',
        avgValue: { $avg: '$diff' },
      },
    },
    {
      $project: {
        _id: 0,
        date: '$_id',
        value: { $round: ['$avgValue', 1] },
      },
    },
    { $sort: { date: 1 } },
  ])

  const timeToHire: TimeToHireDataItem[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart)
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    const found = agg.find(r => r.date === iso)
    timeToHire.push({ date: iso, value: found ? found.value : 0 })
  }

  // distribution of candidates by technology
  const byTech: TechDistributionDataItem[] = await Candidate.aggregate([
    { $group: { _id: '$technology', count: { $sum: 1 } } },
    { $project: { _id: 0, technology: '$_id', count: 1 } },
  ])

  return {
    totalCandidates,
    interviewsToday,
    lettersSent,
    avgTimeToHire,
    pipeline,
    timeToHire,
    byTech,
  }
}
