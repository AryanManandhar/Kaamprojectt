# Kam App — Login Setup (Email/Password + Google)

This connects the Kam app's login screen to a real MySQL database using a small
Node.js/Express API. Email/password signup and login, plus Google sign-in, all
work end-to-end. Passwords are hashed with bcrypt and never stored in plain
text; OAuth tokens are always verified server-side, never trusted from the
browser.

## How the pieces fit together

```
kam-app.html + auth-social.js --fetch--> Express API (server.js) --SQL--> MySQL (kam_app.users)
                                                |
                                                +--verify--> Google
```

## Quick start

### 1. Set up the database

```bash
mysql -u root -p < schema.sql
```

This creates a `kam_app` database with `users`, `workers`, `jobs`, `booking` and `payment` tables.

```bash
node seed-workers.js
```

Run this to generate random workers

### 2. Configure the backend

```bash
cp .env.example .env
```

Open `.env` and fill in:
- your real MySQL password
- a random `JWT_SECRET` (signs login sessions — make it long and random)
- `GOOGLE_CLIENT_ID` — see `SETUP_GOOGLE.md` for how to get this

### 3. Install dependencies and start the API

```bash
npm install
npm start
```

You should see:
```
Kam API running on http://localhost:4000
```
For Google login:

```bash
npm install google-auth-library
npm run serve
```

You should see:
```
Kam frontend running at http://localhost:5500
```
Open that URL in your browser (not the .html file directly)
so Google login works correctly.

### 4. Open the app

Open `kam-app.html` in your browser (or serve it with any static file
server). Make sure the API is running first — the login screen talks to it.

- **Sign up**: click "Sign up" under the form, fill in name/email/password.
- **Sign in**: use the same email/password afterward.
- **Continue with Google**: works once you've filled in the client ID per
  `SETUP_GOOGLE.md`. If a Google sign-in uses the same email as an
  existing password account, it links to that account instead of creating
  a duplicate.
- The session is kept in `localStorage` (`kam_token`), so refreshing the page
  keeps you logged in. "Logout" in the drawer clears it.

## API endpoints

| Method | Endpoint             | Body                          | Notes                                   |
|--------|----------------------|--------------------------------|------------------------------------------|
| POST   | `/api/signup`         | `{ name, email, password }`   | Creates a user, returns a token           |
| POST   | `/api/login`          | `{ email, password }`         | Verifies password, returns a token        |
| POST   | `/api/auth/google`    | `{ idToken }`                  | Verifies Google ID token, returns a token |
| GET    | `/api/me`             | — (needs `Authorization: Bearer <token>`) | Returns the logged-in user |

## Files

```
kam-app.html                     the app itself (login screen + dashboard)
auth-social.js                   frontend Google button wiring
SETUP_GOOGLE.md         step-by-step provider registration guide
kam-backend/
  server.js                      Express API — signup/login + OAuth routes
  oauthProviders.js               verifies Google tokens server-side
  db.js                          MySQL connection pool
  package.json / package-lock.json
  .env.example                   copy to .env and fill in real values
  sql/
    schema.sql                   fresh-install schema (includes OAuth columns)
    migration_oauth.sql          run against an existing DB to add OAuth support
```

