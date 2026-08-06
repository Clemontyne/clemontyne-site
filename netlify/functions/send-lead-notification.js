// netlify/functions/send-lead-notification.js
//
// A Netlify Function — deploys automatically when this file is pushed to
// GitHub, same as everything else on this site. No CLI, no separate login.
//
// Triggered by a Supabase Database Webhook whenever a new row lands in
// public.leads. Sends a notification email to Courtney and Brandon via
// Resend. RESEND_API_KEY and LEAD_WEBHOOK_SECRET live in Netlify's
// environment variables — never in this file, never in GitHub.

exports.handler = async (event) => {
  // Confirm this request actually came from our own Database Webhook,
  // not some random caller who found the function's URL.
  const incomingSecret = event.headers['x-webhook-secret'];
  if (incomingSecret !== process.env.LEAD_WEBHOOK_SECRET) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  const payload = JSON.parse(event.body);
  const lead = payload.record || {};

  const emailHtml = `
    <h2>New lead from clemontyne.com</h2>
    <p><strong>Business:</strong> ${lead.business_name || '—'}</p>
    <p><strong>Contact:</strong> ${lead.contact_name || '—'}</p>
    <p><strong>Email:</strong> ${lead.email || '—'}</p>
    <p><strong>Phone:</strong> ${lead.phone || '—'}</p>
    <p><strong>Preferred contact:</strong> ${lead.preferred_contact || '—'}</p>
    <p><strong>Message:</strong><br>${(lead.message || '—').replace(/\n/g, '<br>')}</p>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      // Must be an address on a domain verified in Resend.
      from: 'Clemontyne Leads <leads@clemontyne.com>',
      to: ['courtney@clemontyne.com', 'hello@clemontyne.com'], 'brandon@clemontyne.com'],
      subject: `New lead: ${lead.business_name || lead.contact_name || 'Website submission'}`,
      html: emailHtml,
    }),
  });

  const data = await res.json();
  return { statusCode: res.status, body: JSON.stringify(data) };
};
