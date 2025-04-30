// backend/src/services/statsService.ts
import Candidate, { ICandidate } from '../models/Candidate'
import Interview from '../models/Interview'
import Offer from '../models/Offer'

export interface PipeLineDataItem {
  name: string
  value: number
}

export interface TimeToHireDataItem {
  date: string
  value: number
}

export interface TechDistributionDataItem {
  technology: string
  count: number
}

export interface AnalyticsData {
  totalCandidates: number
  interviewsToday: number
  offersPending: number
  avgTimeToHire: number
  pipeline: PipeLineDataItem[]
  timeToHire: TimeToHireDataItem[]
  byTech: TechDistributionDataItem[]
}

export async function getAnalytics(): Promise<AnalyticsData> {
  // 1) Total candidates
  const totalCandidates = await Candidate.countDocuments()

  // 2) Interviews today
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const interviewsToday = await Interview.countDocuments({
    date: { $gte: todayStart }
  })

  // 3) Offers pending
  const offersPending = await Offer.countDocuments({ status: 'Pending' })

  // 4) Overall avg time to hire
  const hiredDocs = await Candidate.find({ status: 'Hired' })
    .select('createdAt updatedAt')
    .lean()

  const durations = hiredDocs
    .map((c: Partial<ICandidate>) => {
      if (!c.createdAt || !c.updatedAt) return null
      return (c.updatedAt.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    })
    .filter((d): d is number => d != null)

  const avgTimeToHire = durations.length
    ? parseFloat((durations.reduce((a, v) => a + v, 0) / durations.length).toFixed(1))
    : 0

  // 5) Pipeline breakdown
  const statuses = ['Shortlisted', 'First Interview', 'Second Interview', 'Hired'] as const
  const pipeline = await Promise.all<PipeLineDataItem>(
    statuses.map(async (status) => ({
      name: status,
      value: await Candidate.countDocuments({ status })
    }))
  )

  // 6) 7-day time-to-hire trend
  const weekAgo = new Date()
  weekAgo.setHours(0, 0, 0, 0)
  weekAgo.setDate(weekAgo.getDate() - 6)

  // Aggregate actual per-day averages
  const agg = await Candidate.aggregate<TimeToHireDataItem>([
    { $match: { status: 'Hired', updatedAt: { $gte: weekAgo } } },
    {
      $project: {
        day: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
        diff: {
          $divide: [
            { $subtract: ['$updatedAt', '$createdAt'] },
            1000 * 60 * 60 * 24
          ]
        }
      }
    },
    {
      $group: {
        _id: '$day',
        avgValue: { $avg: '$diff' }
      }
    },
    {
      $project: {
        _id: 0,
        date: '$_id',
        value: { $round: ['$avgValue', 1] }
      }
    },
    { $sort: { date: 1 } }
  ])

  // Fill missing days with zero
  const timeToHire: TimeToHireDataItem[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    const found = agg.find((r) => r.date === iso)
    timeToHire.push({ date: iso, value: found ? found.value : 0 })
  }

  // 7) By technology
  const byTech: TechDistributionDataItem[] = await Candidate.aggregate([
    { $group: { _id: '$technology', count: { $sum: 1 } } },
    { $project: { _id: 0, technology: '$_id', count: 1 } }
  ])

  return {
    totalCandidates,
    interviewsToday,
    offersPending,
    avgTimeToHire,
    pipeline,
    timeToHire,
    byTech
  }
}
