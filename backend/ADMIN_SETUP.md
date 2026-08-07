# Kam Admin Panel

A small, separate admin dashboard for viewing and deleting users. It runs on
its own server (`admin-server.js`, port **8080**) and connects straight to
your MySQL database — it does not touch or depend on `server.js` (port 4000),
so it can't break your main app.

## What it does

- Password-gated login screen (one shared admin password, kept in `.env`)
- Dashboard with total users, password-account count, OAuth-account count
- Searchable table of all users: name, email, sign-in method, join date
- Delete a user (with a confirmation prompt)

It never displays `password_hash` or OAuth tokens — only the columns needed
to identify and manage an account.

## Setup

### 1. Add these two files to your `kam-backend` folder

```
kam-backend/
  admin-server.js      <- new
  public/
    admin.html          <- new
```

(Drop them in alongside your existing `server.js`, `db.js`, etc.)

### 2. Add an admin password to `.env`

Open `kam-backend/.env` and add:

```
ADMIN_PASSWORD=choose_something_only_you_know
```

This is separate from your database password and JWT secret — it's just the
password you'll type into the admin login screen.

### 3. Make sure `mysql2` is installed

Your `db.js` almost certainly already uses `mysql2`, but if `npm start`
fails with "Cannot find module 'mysql2'", run:

```bash
cd kam-backend
npm install mysql2
```

### 4. Start it

```bash
cd kam-backend
node admin-server.js
```

You should see:

```
Kam Admin Panel running on http://localhost:8080
```

Leave this running in its own terminal, alongside `node server.js` (your
main API on port 4000) — they're independent processes.

### 5. Open it

Go to **http://localhost:8080**, enter the `ADMIN_PASSWORD` you set in step
2, and you'll see the users table.

## Notes

- This is a local admin tool, not hardened for the public internet. Don't
  deploy it somewhere reachable from outside your machine without adding
  real authentication (this single shared password is fine for local dev,
  not for production).
- If you'd like an "add user manually" or "reset password" feature added
  later, that's a quick follow-up — just ask.
