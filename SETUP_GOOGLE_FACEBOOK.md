# Setting up Google & Facebook login for Kam

The code is fully wired up on both frontend and backend — the only thing
left is registering your app with each provider to get real credentials.
Until you do, the placeholders in `.env` and `auth-social.js` won't
authenticate anyone.

## 1. Google

1. Go to https://console.cloud.google.com/apis/credentials
2. Create a project (or pick an existing one).
3. **Create Credentials → OAuth client ID → Web application.**
4. Under **Authorized JavaScript origins**, add the URL(s) you'll serve
   `kam-app.html` from (e.g. `http://localhost:5500`, and your real domain later).
5. Copy the **Client ID** into:
   - `GOOGLE_CLIENT_ID` in `kam-backend/.env` (backend)
   - `SOCIAL_CONFIG.googleClientId` in `auth-social.js` (frontend)
   - No client secret needed for this flow.

## 2. Facebook

1. Go to https://developers.facebook.com/apps and create an app (type: "Consumer").
2. Add the **Facebook Login** product.
3. In **Facebook Login → Settings**, add your site URL to
   **Valid OAuth Redirect URIs** and **Allowed Domains for the JavaScript SDK**.
4. In **Settings → Basic**, copy the **App ID** and **App Secret** into:
   - `FACEBOOK_APP_ID` + `FACEBOOK_APP_SECRET` in `kam-backend/.env` (backend)
   - `SOCIAL_CONFIG.facebookAppId` in `auth-social.js` (frontend, App ID only —
     never put the App Secret in frontend code)
5. While in development mode, only users listed as Testers/Admins on the
   app can log in. Submit for App Review before opening it to everyone.

## 3. Set up (or migrate) the database

If you already have a `kam_app` database with users in it:

```bash
mysql -u root -p kam_app < kam-backend/sql/migration_oauth.sql
```

If you're setting up fresh, just use `kam-backend/sql/schema.sql` (it already
includes the OAuth columns):

```bash
mysql -u root -p < kam-backend/sql/schema.sql
```

## 4. Install backend dependencies

```bash
cd kam-backend
npm install
```

`google-auth-library` verifies Google tokens server-side. Facebook tokens are
verified with a plain HTTP call to the Graph API, no extra library needed.

## 5. Start the backend and open the app

```bash
cd kam-backend
cp .env.example .env   # then fill in the values from steps 1-2
npm start
```

Open `kam-app.html` in your browser (or serve it with any static file
server). The Google and Facebook buttons will now:

1. Prompt sign-in via the provider's SDK.
2. Send the resulting token to `POST /api/auth/google` or
   `POST /api/auth/facebook` on your running API.
3. The server verifies the token directly with Google/Facebook (never trusts
   the browser), creates or looks up the matching user, and returns your
   app's own JWT — same as the email/password flow.
4. If someone already has a password account under the same email, signing
   in with Google/Facebook links to that same account instead of creating a
   duplicate.

## What was fixed

Previously `auth-social.js` posted to `/api/auth/google` and
`/api/auth/facebook`, and `oauthProviders.js` had the verification logic
ready — but `server.js` never actually defined those two routes, so both
buttons 404'd. That's now fixed: `server.js` imports `oauthProviders.js` and
exposes both endpoints, and `google-auth-library` has been added to
`package.json`.

## Adding Apple later

The Apple ID button in the UI is a disabled placeholder for now. Wiring it up
requires a paid Apple Developer account ($99/yr) and a bit more setup than
Google/Facebook — happy to add it whenever you're ready.
