# Booking backend — deployment guide

This folder is a Cloudflare Worker that gives the static site (GitHub Pages
has no server of its own) a real booking API: free-slot lookup, double-booking
prevention, confirmation/staff/reminder emails, and cancellation links.

Everything here needs to be deployed from **your own** Cloudflare and Google
accounts — these are the exact clicks/commands to do that.

## 1. Deploy the Gmail relay (Google Apps Script)

1. Go to https://script.google.com, signed into the practice's Gmail account
   (or whichever Gmail should send these emails).
2. **New project**. Delete the default `Code.gs` contents and paste in the
   contents of `gmail-relay.gs` from this folder.
3. Left sidebar → **Project Settings** (gear icon) → **Script Properties** →
   **Add script property**. Name: `SECRET`. Value: make up a long random
   string (e.g. `openssl rand -hex 24` in a terminal, or any password
   generator) and save it somewhere — you'll need it again in step 3 below.
4. Top right → **Deploy** → **New deployment**.
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**, authorize the permissions it asks for.
5. Copy the **Web app URL** it gives you (ends in `/exec`). That's your
   `MAIL_RELAY_URL`.

   **Important:** if you ever edit the script later, you must create a
   **new deployment version** (Deploy → Manage deployments → pencil icon →
   New version) — editing the code alone does *not* update the live URL.

## 2. Create the Cloudflare D1 database

From this `worker/` folder:

```sh
npm install -g wrangler        # if you don't already have it
wrangler login                 # opens a browser to sign into Cloudflare
npx wrangler d1 create family-dental-bookings
```

Copy the `database_id` it prints into `wrangler.toml` under
`[[d1_databases]]`, replacing `REPLACE_WITH_D1_DATABASE_ID`.

Then apply the schema:

```sh
npx wrangler d1 execute family-dental-bookings --remote --file=schema.sql
```

## 3. Set the secret and variables

```sh
npx wrangler secret put MAIL_RELAY_SECRET
# paste the exact same SECRET value you set in Apps Script step 3
```

Open `wrangler.toml` and fill in:
- `MAIL_RELAY_URL` — the Apps Script URL from step 1.5
- `DOCTORS_JSON` — replace each doctor's email with their real one once
  you have it (everything currently points at the shared practice inbox
  as a placeholder, which still works, it just won't be doctor-specific)
- `ALLOWED_ORIGINS` — add your live domain once you know it (see step 5)

## 4. Deploy the worker

```sh
npx wrangler deploy
```

It prints a URL like `https://family-dental-booking.<your-subdomain>.workers.dev`.
Paste that into `wrangler.toml` as `PUBLIC_URL`, then deploy again so the
cancel links in emails use the right address:

```sh
npx wrangler deploy
```

## 5. Wire up the frontend

In `assets/js/booking.js` (in the site root, not this folder), set:

```js
const BOOKING_API = "https://family-dental-booking.<your-subdomain>.workers.dev";
```

Leave it as `""` and the appointment page automatically falls back to the
existing plain Formspree form — so nothing breaks if this backend isn't
deployed yet.

Add the exact page origin(s) that will load this script to `ALLOWED_ORIGINS`
in `wrangler.toml` (e.g. `https://family-dental-care-spring.github.io`), then
`npx wrangler deploy` once more.

## 6. Test locally

```sh
npx wrangler dev
```

- Book a slot, then try to book the **same** slot again — you should get
  "that slot was just taken" and a fresh list.
- Check both the patient's inbox and the doctor/business inbox (and spam
  folders) for the confirmation and staff-alert emails.
- Click the cancel link from the confirmation email and confirm the slot
  reopens in `/slots`.
- Book something ~11 minutes out and wait for the reminder email (cron runs
  every minute; `wrangler dev` does not run the cron trigger locally — test
  reminders against the deployed worker, or call `handleReminders` manually).

## 7. Go live

1. Add your real GitHub Pages domain to `ALLOWED_ORIGINS`, deploy again.
2. Load the live site and the local file both, confirm bookings work from
   each (CORS origin must match exactly — scheme, host, and no trailing
   slash all matter).
3. Test on a phone.

## Notes / limits

- **Gmail daily limit**: a regular Gmail account can send ~100
  recipients/day for free. Each booking uses ~3 (patient confirm + doctor +
  business) and each reminder ~2. Watch volume as bookings grow.
- **Capacity**: the schema enforces exactly one booking per
  (doctor, date, time) slot — `capacity` in `SLOT_RULES` is reserved for a
  future multi-booking-per-slot feature and isn't enforced yet.
- **Rate limiting**: add a rate limit on `/book` in the Cloudflare dash
  (Security → WAF → Rate limiting rules) before taking this live, to stop
  abuse/spam bookings.
- Do **not** commit `.dev.vars` or the `.wrangler/` folder — both are in
  `.gitignore` already for this reason.
- WhatsApp is not implemented in this version. The `DOCTORS_JSON.wa` field
  is read nowhere yet — add it later as its own step if needed.
