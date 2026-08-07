// oauthProviders.js
// Server-side verification for Google sign-in.
// NEVER trust a name/email/id sent from the browser directly — always
// verify the token with the provider first. This function returns:
//   { providerId, email, name }
// or throws an Error if the token is invalid.

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

module.exports = { verifyGoogleToken };
