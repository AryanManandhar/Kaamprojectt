# Setting up Google & Facebook login for Kam

You need to register your app with each provider to get credentials.
None of this code will work until you've done this — the placeholders
in `.env` and `auth-social.js` need real values.

## 1. Google

1. Go to https://console.cloud.google.com/apis/credentials
2. Create a project (or pick an existing one).
3. **Create Credentials → OAuth client ID → Web application.**
4. Under **Authorized JavaScript origins**, add the URL(s) you'll serve
   `kam-app.html` from (e.g. `http://localhost:5500`, and your real domain later).
5. Copy the **Client ID** into:
   - `GOOGLE_CLIENT_ID` in `.env` (backend)
   - `SOCIAL_CONFIG.googleClientId` in `auth-social.js` (frontend)
   - No client secret needed for this flow.

## 2. Facebook

1. Go to https://developers.facebook.com/apps and create an app (type: "Consumer").
2. Add the **Facebook Login** product.
3. In **Facebook Login → Settings**, add your site URL to
   **Valid OAuth Redirect URIs** and **Allowed Domains for the JavaScript SDK**.
4. In **Settings → Basic**, copy the **App ID** and **App Secret** into:
   - `FACEBOOK_APP_ID` + `FACEBOOK_APP_SECRET` in `.env` (backend)
   - `SOCIAL_CONFIG.facebookAppId` in `auth-social.js` (frontend, App ID only —
     never put the App Secret in frontend code)
5. While in development mode, only users listed as Testers/Admins on the
   app can log in. Submit for App Review before opening it to everyone.

## 3. Apply the database migration

If you already have a `kam_app` database with users in it:

```bash
mysql -u root -p kam_app < migration_oauth.sql
```

If you're setting up fresh, just use the updated `schema.sql`.

## 4. Install new backend dependencies

```bash
cd kam-backend
npm install
```

(`google-auth-library` was added to `package.json` — it verifies Google
tokens server-side. Facebook tokens are verified with a plain HTTP call
to the Graph API, no extra library needed.)

## 5. Wire up kam-app.html

See the comment block at the top and bottom of `auth-social.js` — it lists
the exact `<script>` tags to add and the button ids it expects
(`#btn-google`, `#btn-facebook`). Update those selectors if your existing
buttons use different ids/classes.

## Adding Apple later

The Apple ID button in your UI can stay as a visual placeholder for now.
If you want to wire it up later, note it requires a paid Apple Developer
account ($99/yr) and a bit more setup than Google/Facebook — happy to add
it whenever you're ready.
