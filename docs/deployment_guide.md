# AccountSafe: Online Deployment Guide

This guide provides a comprehensive, step-by-step walkthrough to deploy your customized **AccountSafe** password manager and credential vault online. 

We will cover the standard modern cloud hosting architecture:
1. **Frontend**: Hosted on **Vercel** (Zero-Knowledge, Static React UI)
2. **Backend**: Hosted on **Render** (Python Django API)
3. **Database**: Hosted on **Neon** or **Supabase** (Managed Serverless PostgreSQL)
4. **Email / Bot Protection**: Configured via **Gmail SMTP** and **Cloudflare Turnstile**

---

## Architecture Overview

```
                   ┌──────────────────────────────────────────┐
                   │          Vercel UI (Frontend)            │
                   │      https://accountsafe.vercel.app      │
                   └────────────────────┬─────────────────────┘
                                        │
                                        │  HTTPS /api/
                                        ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                       Render Web Service (Backend)                          │
 │                       https://accountsafe.onrender.com                      │
 │   ┌───────────────────────┐                    ┌────────────────────────┐   │
 │   │     Django Server     │                    │  Gunicorn Web Process  │   │
 │   └───────────┬───────────┘                    └───────────┬────────────┘   │
 └───────────────┼────────────────────────────────────────────┼────────────────┘
                 │                                            │
                 ▼                                            ▼
 ┌──────────────────────────────────────┐     ┌────────────────────────────────┐
 │     Neon Serverless PostgreSQL       │     │   Cloudflare Turnstile & SMTP  │
 │     (Secure Encrypted Database)      │     │    (Bot Shield & Email Auth)   │
 └──────────────────────────────────────┘     └────────────────────────────────┘
```

---

## Step 1: Set Up the Managed PostgreSQL Database

We recommend using **Neon.tech** or **Supabase.com** as they provide free, production-ready, fully-managed serverless PostgreSQL databases.

### 1.1 Create the Database (Neon.tech)
1. Sign up/log in at [Neon.tech](https://neon.tech/).
2. Create a new project called `accountsafe-db`.
3. Choose the region closest to your planned backend VM (e.g., *US East* or *Europe Central*).
4. Once created, Neon will show your connection string. It will look like:
   ```env
   postgres://username:password@ep-cool-snowflake-a5xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
5. Note down this string. For AccountSafe, you will break this connection string into discrete parameters:
   - **DB_HOST**: `ep-cool-snowflake-a5xxxxx.us-east-2.aws.neon.tech`
   - **DB_NAME**: `neondb`
   - **DB_USER**: `username`
   - **DB_PASSWORD**: `password`
   - **DB_PORT**: `5432`

---

## Step 2: Set Up Third-Party Integrations

### 2.1 Bot Protection (Cloudflare Turnstile)
AccountSafe uses Turnstile (Cloudflare's modern, privacy-respecting CAPTCHA alternative) to block automated brute-force attacks.
1. Sign up/log in at the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Go to **Turnstile** in the sidebar → click **Add Site**.
3. Set your site name to `AccountSafe` and enter your planned domain names (e.g., `localhost` for testing, your Vercel domain `*.vercel.app`, and custom domain names).
4. Select **Managed** challenge and click **Create**.
5. You will receive two keys:
   - **Site Key**: Safe to be public. Used in the frontend `.env` as `REACT_APP_TURNSTILE_SITE_KEY`.
   - **Secret Key**: Keep secret! Used in the backend `.env` as `TURNSTILE_SECRET_KEY`.

### 2.2 Transactional Email (Gmail SMTP)
Required for critical events, such as password resets and duress SOS alerts.
1. Log in to your Google Account and go to [Google App Passwords](https://myaccount.google.com/apppasswords).
2. Enter a name for the app (e.g., `AccountSafe Mailer`) and click **Create**.
3. Note the generated **16-character app password** (e.g., `abcd efgh ijkl mnop`).
4. Set these in your backend environment variables:
   - `EMAIL_HOST_USER` = `your-gmail-address@gmail.com`
   - `EMAIL_HOST_PASSWORD` = `abcdefghijklmnop` (without spaces)
   - `DEFAULT_FROM_EMAIL` = `AccountSafe <your-gmail-address@gmail.com>`

---

## Step 3: Deploy the Backend API (Render)

Render makes Python Django deployments simple and free.

### 3.1 Prep the Repository
Ensure you have pushed your customized AccountSafe codebase to your private or public GitHub repository.

### 3.2 Create the Render Web Service
1. Sign up/log in at [Render.com](https://render.com/).
2. Click **New +** → **Web Service**.
3. Connect your GitHub account and select your `AccountSafe` repository.
4. Set the following details:
   - **Name**: `accountsafe-api`
   - **Environment**: `Python 3`
   - **Root Directory**: `backend` (Important: points Render to your backend folder)
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn core.wsgi:application --bind 0.0.0.0:$PORT`
5. Under **Environment Variables**, add the following settings:

| Key | Value | Notes |
|-----|-------|-------|
| `SECRET_KEY` | *[Generate a 50+ character random secure key]* | Use standard Django secure string generators |
| `DEBUG` | `False` | Must be False in production |
| `DB_HOST` | `ep-cool-snowflake-a5xxxxx.us-east-2.aws.neon.tech` | Your Neon database host |
| `DB_NAME` | `neondb` | Your Neon database name |
| `DB_USER` | `username` | Your Neon database user |
| `DB_PASSWORD` | `password` | Your Neon database password |
| `DB_PORT` | `5432` | Postgres default port |
| `ALLOWED_HOSTS` | `accountsafe-api.onrender.com` | Your Render domain name |
| `CORS_ALLOWED_ORIGINS` | `https://accountsafe.vercel.app` | Your Vercel frontend URL |
| `CSRF_TRUSTED_ORIGINS` | `https://accountsafe.vercel.app,https://accountsafe-api.onrender.com` | Origins allowed for CSRF |
| `VERCEL_TEAM_SLUG` | *[Your Vercel team/username slug]* | Authorizes your Vercel previews dynamically |
| `EMAIL_HOST_USER` | `your-email@gmail.com` | Gmail SMTP username |
| `EMAIL_HOST_PASSWORD` | `abcdefghijklmnop` | Gmail App Password |
| `DEFAULT_FROM_EMAIL` | `AccountSafe <your-email@gmail.com>` | Sender header |
| `TURNSTILE_SECRET_KEY` | `your-cloudflare-turnstile-secret` | Cloudflare secret key |

6. Click **Deploy Web Service**. Render will build and run migrations, starting the backend service. Once deployed, note down the service URL (e.g., `https://accountsafe-api.onrender.com/`).

---

## Step 4: Deploy the Frontend UI (Vercel)

Vercel provides the fastest and most secure hosting for static React applications.

### 4.1 Create the Vercel Project
1. Log in at [Vercel.com](https://vercel.com/).
2. Click **Add New** → **Project**.
3. Import your `AccountSafe` repository.
4. Configure the Project:
   - **Project Name**: `accountsafe`
   - **Framework Preset**: `Create React App`
   - **Root Directory**: `frontend` (Important: points Vercel to your frontend folder)
5. Under **Environment Variables**, add:

| Key | Value | Notes |
|-----|-------|-------|
| `REACT_APP_PROJECT_NAME` | `AccountSafe` | Customize the brand name of the app here! |
| `REACT_APP_API_URL` | `https://accountsafe-api.onrender.com/api/` | Your Render backend URL (must end in `/api/`) |
| `REACT_APP_TURNSTILE_SITE_KEY` | `your-cloudflare-turnstile-site-key` | Cloudflare site key |
| `REACT_APP_SESSION_TIMEOUT` | `15` | Session auto-logout in minutes |
| `REACT_APP_CLIPBOARD_TIMEOUT` | `30` | Auto-clear timeout in seconds |

6. Click **Deploy**. Vercel will compile the React code and host the static app securely!

---

## Step 5: Post-Deployment Smoke Test

Once both components are live, perform this test sequence to verify:
1. Open your Vercel frontend URL.
2. Confirm the page title and navbar render your customized `REACT_APP_PROJECT_NAME`.
3. Try creating a free account. Complete the Turnstile challenge.
4. Verify that you are shown your generated **Recovery Key**. Download and save the recovery file. Check that the filename uses your custom project name slug.
5. Create a test category and login credential inside the vault. Edit, copy, and delete it to verify the zero-knowledge client-side encryption functions seamlessly.
6. Verify the clipboard auto-clears after copying a password.
7. Log out and log back in to ensure authentication states and session verifications are functioning beautifully.

---

## 🔒 Security Hardening Recommendations
- **HTTPS Only**: Vercel and Render automatically manage Let's Encrypt SSL certificates. Do not bypass or disable SSL/TLS redirection.
- **Environment Variables**: Never commit `.env` files to git. Use Vercel and Render dashboards to manage keys.
- **Regular Secrets Rotation**: Rotate your Gmail App Password and database password every 6 months to maintain peak security.
- **Decoupled Database**: For true security isolation, do not host your PostgreSQL database on the same local VM unless it's properly firewall-restricted and monitored.
