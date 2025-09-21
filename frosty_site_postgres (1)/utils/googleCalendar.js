const { google } = require('googleapis');
function getOAuth2(){
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if(!clientId || !clientSecret || !refreshToken) return null;
  const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oAuth2Client.setCredentials({ refresh_token: refreshToken });
  return oAuth2Client;
}
async function createEvent(booking){
  const auth = getOAuth2();
  if(!auth) return null;
  const calendar = google.calendar({version:'v3', auth});
  const date = booking.date;
  const time = booking.time || '12:00';
  const start = new Date(`${date}T${time}:00`);
  const end = new Date(start.getTime() + 60*60*1000);
  const event = {
    summary: `Frosty Fiesta - ${booking.packageId} (${booking.name})`,
    description: `Booking #${booking.id}\nGuests: ${booking.guests}\nAddress: ${booking.address}\nNotes: ${booking.notes || ''}`,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
  };
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
  const resp = await calendar.events.insert({ calendarId, requestBody: event });
  return resp.data.id;
}
module.exports = { createEvent };
