/**
 * Family Dental Care of Spring — booking API (Cloudflare Worker + D1).
 *
 * Endpoints:
 *   GET  /slots?kind=&doctor=&date=   -> { slots: ["09:00", "09:30", ...] }
 *   POST /book                        -> { ok, reference } | 409 { ok:false, error:"slot_taken", slots:[...] }
 *   GET  /cancel?ref=&token=          -> plain-text confirmation page
 *   scheduled()                       -> cron: sends 10-minute reminders
 *
 * All times in SLOT_RULES / stored date+time are India local time (UTC+5:30).
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const REMINDER_LEAD_MIN = 10;
const MIN_LEAD_MIN = 15; // a slot must start at least this far from "now"

// ---------- small utils ----------

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function clip(s, max) {
  return String(s ?? '').slice(0, max);
}

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || ''));
}

function isValidDate(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
}

function isValidTime(s) {
  return /^\d{2}:\d{2}$/.test(String(s || ''));
}

function nowIst() {
  // Wall-clock IST "as if UTC" — safe to read with getUTC* getters.
  return new Date(Date.now() + IST_OFFSET_MS);
}

function istToUtcTs(dateStr, timeStr) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mi] = timeStr.split(':').map(Number);
  const asIfUtc = Date.UTC(y, mo - 1, d, h, mi, 0);
  return Math.floor((asIfUtc - IST_OFFSET_MS) / 1000);
}

function weekdayOf(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
}

function randomRef() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return 'FDC-' + Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').toUpperCase().slice(0, 8);
}

async function tokenFor(reference, secret) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret || ''),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(reference));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

function parseJsonEnv(env, key, fallback) {
  try { return JSON.parse(env[key]); } catch { return fallback; }
}

function corsHeaders(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const allowOrigin = allowed.includes(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

function json(data, status, extraHeaders) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...(extraHeaders || {}) },
  });
}

// ---------- slot generation ----------

function generateSlotsForDay(rule, dateStr) {
  const wd = weekdayOf(dateStr);
  const win = (rule.windows || []).find((w) => (w.weekdays || []).includes(wd));
  if (!win) return [];
  const step = rule.step || 30;
  const [sh, sm] = win.start.split(':').map(Number);
  const [eh, em] = win.end.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const out = [];
  for (let t = startMin; t + step <= endMin; t += step) {
    const h = String(Math.floor(t / 60)).padStart(2, '0');
    const m = String(t % 60).padStart(2, '0');
    out.push(`${h}:${m}`);
  }
  return out;
}

async function freeSlots(env, kind, doctor, dateStr) {
  const rules = parseJsonEnv(env, 'SLOT_RULES', {});
  const rule = rules[kind];
  if (!rule) return [];
  const all = generateSlotsForDay(rule, dateStr);
  if (all.length === 0) return [];

  const { results } = await env.DB.prepare(
    `SELECT time FROM bookings WHERE kind = ? AND doctor = ? AND date = ? AND status != 'cancelled'`
  ).bind(kind, doctor, dateStr).all();
  const taken = new Set((results || []).map((r) => r.time));

  const nowTs = Math.floor(Date.now() / 1000);
  const minTs = nowTs + MIN_LEAD_MIN * 60;

  return all.filter((t) => !taken.has(t) && istToUtcTs(dateStr, t) >= minTs);
}

// ---------- email ----------

async function sendEmail(env, { to, subject, html, replyTo }) {
  if (!env.MAIL_RELAY_URL || !env.MAIL_RELAY_SECRET) return { ok: false, skipped: true };
  try {
    const res = await fetch(env.MAIL_RELAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }, // avoids a CORS preflight to Apps Script
      body: JSON.stringify({
        secret: env.MAIL_RELAY_SECRET,
        name: 'Family Dental Care of Spring',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        replyTo: replyTo || env.ENQUIRY_EMAIL,
      }),
    });
    return await res.json().catch(() => ({ ok: res.ok }));
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

function fmtTime12h(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function patientEmailHtml(lang, booking, doctorName, cancelUrl) {
  const en = {
    subject: 'Your appointment is confirmed',
    hi: `Hi ${escapeHtml(booking.patient_name)},`,
    body: `Your appointment with ${escapeHtml(doctorName)} is confirmed.`,
    when: 'When', ref: 'Reference', cancel: 'Need to cancel? Click here',
    addr: '16000 Stuebner Airline Rd. Suite #230, Spring, TX 77379',
    phone: '(281) 376-9068',
  };
  const hi = {
    subject: 'आपकी अपॉइंटमेंट की पुष्टि हो गई है',
    hi: `नमस्ते ${escapeHtml(booking.patient_name)},`,
    body: `${escapeHtml(doctorName)} के साथ आपकी अपॉइंटमेंट पुष्टि हो गई है।`,
    when: 'समय', ref: 'संदर्भ', cancel: 'रद्द करना है? यहां क्लिक करें',
    addr: '16000 Stuebner Airline Rd. Suite #230, Spring, TX 77379',
    phone: '(281) 376-9068',
  };
  const t = lang === 'hi' ? hi : en;
  return {
    subject: t.subject,
    html: `
      <p>${t.hi}</p>
      <p>${t.body}</p>
      <p><b>${t.when}:</b> ${escapeHtml(booking.date)} ${fmtTime12h(booking.time)} (IST)<br>
         <b>${t.ref}:</b> ${escapeHtml(booking.reference)}</p>
      <p><a href="${cancelUrl}">${t.cancel}</a></p>
      <p>${t.addr}<br>${t.phone}</p>
    `,
  };
}

function staffEmailHtml(booking, doctorName) {
  let details = {};
  try { details = JSON.parse(booking.details || '{}'); } catch { /* leave empty */ }

  const hasInsurance = details.insuranceName || details.insuranceMemberId || details.insuranceGroupNumber;

  const insuranceBlock = hasInsurance ? `
    <p><b>Insurance Information</b></p>
    <ul>
      <li><b>Name of Insurance:</b> ${escapeHtml(details.insuranceName || '—')}</li>
      <li><b>Member ID:</b> ${escapeHtml(details.insuranceMemberId || '—')}</li>
      <li><b>Group #:</b> ${escapeHtml(details.insuranceGroupNumber || '—')}</li>
      <li><b>Phone Number for Insurance:</b> ${escapeHtml(details.insurancePhone || '—')}</li>
      <li><b>Main Subscriber:</b> ${escapeHtml(details.subscriberName || '—')} ${details.subscriberDob ? `(DOB: ${escapeHtml(details.subscriberDob)})` : ''}</li>
      <li><b>Patient DOB:</b> ${escapeHtml(details.patientDob || '—')}</li>
    </ul>
  ` : `<p><i>No insurance information provided (self-pay).</i></p>`;

  return `
    <p>New ${escapeHtml(booking.kind)} booking.</p>
    <ul>
      <li><b>Doctor:</b> ${escapeHtml(doctorName)}</li>
      <li><b>When:</b> ${escapeHtml(booking.date)} ${fmtTime12h(booking.time)} (IST)</li>
      <li><b>Patient:</b> ${escapeHtml(booking.patient_name)}</li>
      <li><b>Phone:</b> ${escapeHtml(booking.patient_phone)}</li>
      <li><b>Email:</b> ${escapeHtml(booking.patient_email)}</li>
      <li><b>Reason:</b> ${escapeHtml(details.reason || '—')}</li>
      <li><b>Reference:</b> ${escapeHtml(booking.reference)}</li>
    </ul>
    ${insuranceBlock}
  `;
}

// ---------- route handlers ----------

async function handleSlots(req, env) {
  const url = new URL(req.url);
  const kind = clip(url.searchParams.get('kind') || 'appointment', 20);
  const doctor = clip(url.searchParams.get('doctor') || '', 40);
  const date = clip(url.searchParams.get('date') || '', 10);

  const doctors = parseJsonEnv(env, 'DOCTORS_JSON', {});
  if (!doctors[doctor]) return json({ error: 'unknown_doctor' }, 400);
  if (!isValidDate(date)) return json({ error: 'invalid_date' }, 400);

  const slots = await freeSlots(env, kind, doctor, date);
  return json({ slots });
}

async function handleBook(req, env) {
  let body;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'bad_json' }, 400); }

  const kind = clip(body.kind || 'appointment', 20);
  const doctor = clip(body.doctor || '', 40);
  const date = clip(body.date || '', 10);
  const time = clip(body.time || '', 5);
  const name = clip(body.name || '', 100);
  const email = clip(body.email || '', 150);
  const phone = clip(body.phone || '', 30);
  const language = body.language === 'hi' ? 'hi' : 'en';
  const details = clip(JSON.stringify(body.details || {}), 1000);

  const doctors = parseJsonEnv(env, 'DOCTORS_JSON', {});
  const rules = parseJsonEnv(env, 'SLOT_RULES', {});

  if (!doctors[doctor]) return json({ ok: false, error: 'unknown_doctor' }, 400);
  if (!rules[kind]) return json({ ok: false, error: 'unknown_kind' }, 400);
  if (!isValidDate(date) || !isValidTime(time)) return json({ ok: false, error: 'invalid_datetime' }, 400);
  if (!name || !isValidEmail(email) || phone.length < 7) return json({ ok: false, error: 'invalid_contact' }, 400);

  const validDaySlots = generateSlotsForDay(rules[kind], date);
  if (!validDaySlots.includes(time)) return json({ ok: false, error: 'invalid_slot' }, 400);

  const startTs = istToUtcTs(date, time);
  const nowTs = Math.floor(Date.now() / 1000);
  if (startTs < nowTs + MIN_LEAD_MIN * 60) {
    const slots = await freeSlots(env, kind, doctor, date);
    return json({ ok: false, error: 'too_soon', slots }, 409);
  }

  const reference = randomRef();

  try {
    await env.DB.prepare(
      `INSERT INTO bookings
       (reference, kind, doctor, date, time, start_ts, patient_name, patient_email, patient_phone, language, details, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'booked', ?)`
    ).bind(reference, kind, doctor, date, time, startTs, name, email, phone, language, details, nowTs).run();
  } catch (err) {
    // UNIQUE constraint violation -> slot was just taken by someone else.
    const slots = await freeSlots(env, kind, doctor, date);
    return json({ ok: false, error: 'slot_taken', slots }, 409);
  }

  // Emails are best-effort; booking has already succeeded.
  try {
    const doctorInfo = doctors[doctor];
    const token = await tokenFor(reference, env.MAIL_RELAY_SECRET);
    const cancelUrl = `${env.PUBLIC_URL}/cancel?ref=${encodeURIComponent(reference)}&token=${token}`;
    const booking = { reference, kind, doctor, date, time, patient_name: name, patient_email: email, patient_phone: phone, details: body.details ? JSON.stringify(body.details) : '' };

    const patientMail = patientEmailHtml(language, booking, doctorInfo.name, cancelUrl);
    await sendEmail(env, { to: email, subject: patientMail.subject, html: patientMail.html, replyTo: env.ENQUIRY_EMAIL });

    const staffTo = [doctorInfo.email, env.HOSPITAL_EMAIL].filter(Boolean);
    await sendEmail(env, { to: staffTo, subject: `New booking: ${name} — ${date} ${fmtTime12h(time)}`, html: staffEmailHtml(booking, doctorInfo.name), replyTo: email });
  } catch (err) {
    // swallow — booking stands regardless of email outcome
  }

  return json({ ok: true, reference });
}

async function handleCancel(req, env) {
  const url = new URL(req.url);
  const ref = clip(url.searchParams.get('ref') || '', 20);
  const token = clip(url.searchParams.get('token') || '', 100);
  if (!ref || !token) return new Response('Missing reference or token.', { status: 400 });

  const expected = await tokenFor(ref, env.MAIL_RELAY_SECRET);
  if (expected !== token) return new Response('Invalid cancellation link.', { status: 403 });

  const row = await env.DB.prepare(`SELECT * FROM bookings WHERE reference = ?`).bind(ref).first();
  if (!row) return new Response('Booking not found.', { status: 404 });
  if (row.status === 'cancelled') return new Response('This booking is already cancelled.', { status: 200 });

  await env.DB.prepare(`UPDATE bookings SET status = 'cancelled' WHERE reference = ?`).bind(ref).run();
  return new Response(`Your appointment (${ref}) has been cancelled. If this was a mistake, please call us at (281) 376-9068.`, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

async function handleReminders(env) {
  const nowTs = Math.floor(Date.now() / 1000);
  const windowStart = nowTs + (REMINDER_LEAD_MIN - 1) * 60;
  const windowEnd = nowTs + (REMINDER_LEAD_MIN + 1) * 60;

  const { results } = await env.DB.prepare(
    `SELECT * FROM bookings WHERE status = 'booked' AND start_ts >= ? AND start_ts <= ?`
  ).bind(windowStart, windowEnd).all();

  const doctors = parseJsonEnv(env, 'DOCTORS_JSON', {});

  for (const row of results || []) {
    const doctorInfo = doctors[row.doctor] || { name: row.doctor, email: env.HOSPITAL_EMAIL };
    try {
      const patientMail = patientEmailHtml(row.language, row, doctorInfo.name, `${env.PUBLIC_URL}/cancel`);
      await sendEmail(env, {
        to: row.patient_email,
        subject: row.language === 'hi' ? 'आपकी अपॉइंटमेंट 10 मिनट में है' : 'Your appointment is in 10 minutes',
        html: patientMail.html,
      });
      await sendEmail(env, {
        to: doctorInfo.email,
        subject: `Reminder: ${row.patient_name} in 10 minutes`,
        html: staffEmailHtml(row, doctorInfo.name),
      });
      await env.DB.prepare(`UPDATE bookings SET status = 'reminded' WHERE id = ?`).bind(row.id).run();
    } catch (err) {
      // move on — next cron tick will retry if still in window
    }
  }
}

// ---------- entrypoint ----------

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env);

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    let res;
    try {
      if (url.pathname === '/slots' && req.method === 'GET') res = await handleSlots(req, env);
      else if (url.pathname === '/book' && req.method === 'POST') res = await handleBook(req, env);
      else if (url.pathname === '/cancel' && req.method === 'GET') res = await handleCancel(req, env);
      else res = json({ error: 'not_found' }, 404);
    } catch (err) {
      res = json({ error: 'server_error' }, 500);
    }

    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(cors)) if (v) headers.set(k, v);
    return new Response(res.body, { status: res.status, headers });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleReminders(env));
  },
};
