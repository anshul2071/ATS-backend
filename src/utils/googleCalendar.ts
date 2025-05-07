import {google} from 'googleapis'
import {v4 as uuidv4} from 'uuid'




const OAuth2Client = new google.auth.OAuth2 (
    process.env.OAUTH_CLIENT_ID,
    process.env.OAUTH_CLIENT_SECRET,
    process.env.OAUTH_REDIRECT_URI

    )

OAuth2Client.setCredentials({
    refresh_token: process.env.OAUTH_REFRESH_TOKEN
})


export const calendar = google.calendar({
    version: 'v3',
    auth: OAuth2Client

})


export async function createGoogleMeetEvent(params : {
    summary: string,
    start: string,
    end: string,
    attendees: {email: string}[]
}): Promise<string> {
    const res = await calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID!,
        conferenceDataVersion:1,
        requestBody: {
            summary: params.summary,
            start: { dateTime: params.start},
            end: { dateTime: params.end},
            attendees: params.attendees,
            conferenceData: {
                createRequest: {requestId: uuidv4() }
            }
        }
    })
    if(!res.data.hangoutLink) {
        throw new Error('Failed to generate Google Meet Link')
    
    }

    return res.data.hangoutLink
}