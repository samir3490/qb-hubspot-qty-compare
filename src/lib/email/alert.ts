import type { CompareResult, CompareRow } from '../types';

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://qb-hubspot-qty-compare.vercel.app';

export function getAlertEmail(): string {
  return process.env.ALERT_EMAIL ?? 'samir3490@gmail.com';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildMismatchEmailHtml(
  result: CompareResult,
  mismatches: CompareRow[]
): string {
  const rows = mismatches
    .slice(0, 50)
    .map(
      (r) =>
        `<tr>
          <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(r.sku)}</td>
          <td style="padding:8px;border:1px solid #ddd;">${r.qbQty ?? '—'}</td>
          <td style="padding:8px;border:1px solid #ddd;">${r.hsQty ?? '—'}</td>
          <td style="padding:8px;border:1px solid #ddd;">${r.difference ?? '—'}</td>
          <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(r.itemName || r.hsName)}</td>
        </tr>`
    )
    .join('');

  const more =
    mismatches.length > 50
      ? `<p><em>…and ${mismatches.length - 50} more. Open the app for the full report.</em></p>`
      : '';

  return `
    <div style="font-family:Segoe UI,sans-serif;max-width:720px;color:#111;">
      <h2 style="color:#b91c1c;">QuickBase ↔ HubSpot quantity mismatches</h2>
      <p>Daily compare ran at <strong>${escapeHtml(new Date(result.summary.runAt).toLocaleString())}</strong>.</p>
      <ul>
        <li><strong>${result.summary.mismatches}</strong> quantity mismatches</li>
        <li>${result.summary.matches} matches</li>
        <li>${result.summary.qbCompared} QuickBase items compared</li>
      </ul>
      <table style="border-collapse:collapse;width:100%;font-size:14px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">SKU</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">QB Qty</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">HubSpot Qty</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Diff (HS−QB)</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Name</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${more}
      <p style="margin-top:24px;">
        <a href="${APP_URL}" style="background:#2563eb;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px;">Open compare app</a>
      </p>
      <p style="color:#6b7280;font-size:12px;">QuickBase is the source of truth. Automated daily job — no email when all quantities match.</p>
    </div>
  `;
}

async function sendViaResend(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY not set');

  const from =
    process.env.EMAIL_FROM ?? 'QB HubSpot Compare <onboarding@resend.dev>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error (${res.status}): ${text}`);
  }
}

async function sendViaSmtp(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const nodemailer = await import('nodemailer');
  const host = process.env.SMTP_HOST ?? 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error('SMTP_USER and SMTP_PASS must be set for SMTP email.');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? user,
    to,
    subject,
    html,
  });
}

export async function sendMismatchAlert(
  result: CompareResult
): Promise<{ sent: boolean; mismatchCount: number }> {
  const mismatches = result.rows.filter((r) => r.status === 'mismatch');
  if (mismatches.length === 0) {
    return { sent: false, mismatchCount: 0 };
  }

  const to = getAlertEmail();
  const subject = `[QB↔HubSpot] ${mismatches.length} quantity mismatch${mismatches.length === 1 ? '' : 'es'} — ${new Date(result.summary.runAt).toLocaleDateString()}`;
  const html = buildMismatchEmailHtml(result, mismatches);

  if (process.env.RESEND_API_KEY) {
    await sendViaResend(to, subject, html);
  } else if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    await sendViaSmtp(to, subject, html);
  } else {
    throw new Error(
      'Email not configured. Set RESEND_API_KEY or SMTP_USER + SMTP_PASS on Vercel.'
    );
  }

  return { sent: true, mismatchCount: mismatches.length };
}
