require('dotenv').config();
const readline = require('readline');
const { google } = require('googleapis');
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
if(!clientId || !clientSecret){
  console.error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env first.");
  process.exit(1);
}
const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, 'urn:ietf:wg:oauth:2.0:oob');
const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];
const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
console.log('Authorize this app by visiting this url:\n', authUrl);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('\nEnter the code from that page here: ', async (code) => {
  rl.close();
  try {
    const { tokens } = await oAuth2Client.getToken(code.trim());
    console.log('\nYour refresh token (put into GOOGLE_REFRESH_TOKEN in .env):\n', tokens.refresh_token);
  } catch (e) {
    console.error('Error retrieving access token', e);
  }
});
