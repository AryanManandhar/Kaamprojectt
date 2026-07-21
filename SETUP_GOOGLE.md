# Setting up Google login for Kam

The code is fully wired up on both frontend and backend — the only thing
left is registering your app with Google to get a real client ID. Until you
do, the placeholder in `.env` and `auth-social.js` won't authenticate anyone.

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

## 2. Set up (or migrate) the database

If you already have a `kam_app` database with users in it:

```bash
mysql -u root -p kam_app < kam-backend/sql/migration_oauth.sql
```

If you're setting up fresh, just use `kam-backend/sql/schema.sql` (it already
includes the OAuth columns):

```bash
mysql -u root -p < kam-backend/sql/schema.sql
```

## 3. Install backend dependencies

```bash
cd kam-backend
npm install
```

`google-auth-library` verifies Google tokens server-side.

## 4. Start the backend and open the app

```bash
cd kam-backend
cp .env.example .env   # then fill in the value from step 1
npm start
```

Open `kam-app.html` in your browser (or serve it with any static file
server). The Google button will now:

1. Prompt sign-in via Google's SDK.
2. Send the resulting token to `POST /api/auth/google` on your running API.
3. The server verifies the token directly with Google (never trusts the
   browser), creates or looks up the matching user, and returns your app's
   own JWT — same as the email/password flow.
4. If someone already has a password account under the same email, signing
   in with Google links to that same account instead of creating a
   duplicate.

## Notes

- Facebook, Apple, and Phone Number sign-in have been removed from the app.
  Only email/password and Google sign-in are supported.
