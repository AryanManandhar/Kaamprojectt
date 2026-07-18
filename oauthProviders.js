// oauthProviders.js
// Server-side verification for Google, Facebook, and Apple sign-in.
// NEVER trust a name/email/id sent from the browser directly — always
// verify the token with the provider first. These functions each return:
//   { providerId, email, name }
// or throw an Error if the token is invalid.

const { OAuth2Client } = require('google-auth-library');

// ---------- Google ----------
// Frontend uses Google Identity Services (GIS) and sends us the ID token
// (the JWT credential string GIS hands back), not an access token.
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyGoogleToken(idToken) {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload) throw new Error('Invalid Google token.');

  return {
    providerId: payload.sub,
    email: payload.email || null,
    name: payload.name || (payload.email ? payload.email.split('@')[0] : 'Google User'),
  };
}

// ---------- Facebook ----------
// Frontend uses the Facebook JS SDK and sends us the accessToken from
// FB.login(). We verify it by asking Facebook's Graph API for the profile
// tied to that token — a forged token simply won't resolve to anything.
async function verifyFacebookToken(accessToken) {
  const debugRes = await fetch(
    `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`
  );
  const debugData = await debugRes.json();
  const debugInfo = debugData.data;
  if (!debugInfo || !debugInfo.is_valid || debugInfo.app_id !== process.env.FACEBOOK_APP_ID) {
    throw new Error('Invalid Facebook token.');
  }

  const profileRes = await fetch(
    `https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(accessToken)}`
  );
  const profile = await profileRes.json();
  if (!profile || !profile.id) throw new Error('Could not fetch Facebook profile.');

  return {
    providerId: profile.id,
    email: profile.email || null, // Facebook omits this if the user has no verified email
    name: profile.name || 'Facebook User',
  };
}

module.exports = { verifyGoogleToken, verifyFacebookToken };
