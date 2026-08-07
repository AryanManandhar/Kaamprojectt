# Kam App — Login Setup (Email/Password + Google)

This connects the Kam app's login screen to a real MySQL database using a
small Node.js/Express API. Email/password signup and login, plus Google
sign-in, all work end-to-end. Passwords are hashed with bcrypt and never
stored in plain text; OAuth tokens are always verified server-side, never
trusted from the browser.

## How the pieces fit together

```
frontend/kam-app.html + auth-social.js --fetch--> backend/server.js --SQL--> MySQL (kam_app.users)
                                                        |
                                                        +--verify--> Google
```

## Quick start

### 1. Set up the database

```bash
mysql -u root -p < backend/schema.sql
```

This creates a `kam_app` database with `users`, `workers`, `jobs`, `bookings`,
and `payments` tables.

```bash
cd backend
npm install
npm run seed
```

`npm run seed` runs `seed-workers.js` to generate 96 random workers.

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and fill in:
- your real MySQL password
- a random `JWT_SECRET` (signs login sessions — make it long and random)
- `GOOGLE_CLIENT_ID` — see `docs/SETUP_GOOGLE.md` for how to get this
- SMTP credentials (`SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`) if you want real
  password-reset and payment-due emails; otherwise `mailer.js` just logs
  them to the console

### 3. Start the backend

```bash
cd backend
npm start
```

You should see:
```
Kam API running on http://localhost:4000
```

### 4. Start the frontend

```bash
cd frontend
npm run serve
```

You should see:
```
Kam frontend running at http://localhost:5500
```

Open **http://localhost:5500** in your browser — not `kam-app.html`
directly, since Google login requires a real http(s) origin.

- **Sign up**: click "Sign up" under the form, fill in name/email/password.
- **Sign in**: use the same email/password afterward.
- **Continue with Google**: works once you've filled in the client ID per
  `docs/SETUP_GOOGLE.md`. If a Google sign-in uses the same email as an
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

Plus jobs, bookings, worker-availability, worker-earnings, and payments
(eSewa/Khalti) routes — see `backend/server.js` for the full list.

## Project layout

```
kam-project/
├── README.md                    this file
├── docs/
│   ├── SETUP_GOOGLE.md          Google OAuth provider registration guide
│   └── ADMIN_SETUP.md           admin panel setup guide
├── frontend/
│   ├── kam-app.html             the app itself (login screen + dashboard)
│   ├── auth-social.js           frontend Google button wiring
│   ├── serve.js                 zero-dependency static server (npm run serve)
│   ├── package.json
│   └── js/, css/                add these yourself — kam-app.html expects a
│                                 js/ folder (data-workers.js, worker-list.js,
│                                 etc.) and css/assets/ that aren't part of
│                                 this handoff
├── backend/
│   ├── server.js                 Express API — signup/login, jobs, bookings,
│   │                              payments, OAuth routes (port 4000)
│   ├── admin-server.js           separate admin dashboard (port 8080)
│   ├── public/
│   │   └── admin.html            admin dashboard frontend, served by admin-server.js
│   ├── oauthProviders.js         verifies Google tokens server-side
│   ├── mailer.js                 OTP + payment-due emails via SMTP
│   ├── payments.js               eSewa / Khalti integration
│   ├── seed-workers.js           generates 96 sample workers
│   ├── db.js                     MySQL connection pool
│   ├── schema.sql                 fresh-install schema (includes OAuth columns)
│   ├── package.json / package-lock.json
│   ├── .env.example              copy to .env and fill in real values
│   ├── .env                      your real local values (gitignored)
│   └── .gitignore
```

There's no separate `migration_oauth.sql` in this project — `schema.sql`
already includes the OAuth columns, so it works for both a fresh install and
as a reference for what an existing database needs to add.

## A couple of things worth knowing

- **`backend/.env` has real secrets in it** (DB password, JWT secret, admin
  password, Gmail app password, Khalti test key). It's gitignored, but if
  it's ever shared or committed by mistake, rotate all of those values.
- **`frontend/js/` and `frontend/css/`** referenced by `kam-app.html` aren't
  included here — add them before serving the app, or the page's script
  tags and images will 404.
