// netlify/functions/send-lead-notification.js
//
// A Netlify Function — deploys automatically when this file is pushed to
// GitHub. Triggered by a Supabase Database Webhook on INSERT into
// public.leads. Sends TWO emails via Resend:
//   1. An internal notification to Courtney, Brandon, and hello@
//   2. A confirmation back to the lead themselves, if they gave an email
//
// RESEND_API_KEY and LEAD_WEBHOOK_SECRET live in Netlify's environment
// variables — never in this file, never in GitHub.

exports.handler = async (event) => {
  const incomingSecret = event.headers['x-webhook-secret'];
  if (incomingSecret !== process.env.LEAD_WEBHOOK_SECRET) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  const payload = JSON.parse(event.body);
  const lead = payload.record || {};

  const internalHtml = `
    <h2>New lead from clemontyne.com</h2>
    <p><strong>Business:</strong> ${lead.business_name || '—'}</p>
    <p><strong>Contact:</strong> ${lead.contact_name || '—'}</p>
    <p><strong>Email:</strong> ${lead.email || '—'}</p>
    <p><strong>Phone:</strong> ${lead.phone || '—'}</p>
    <p><strong>Preferred contact:</strong> ${lead.preferred_contact || '—'}</p>
    <p><strong>Message:</strong><br>${(lead.message || '—').replace(/\n/g, '<br>')}</p>
  `;

  const confirmationHtml = `
    <p>Hi ${lead.contact_name || 'there'},</p>
    <p>Thanks for reaching out to Clemontyne &amp; Co. We've got your message and will be in touch within a couple of business days.</p>
    <p>If anything urgent comes up in the meantime, you can reach us directly at hello@clemontyne.com.</p>
    <p>— Courtney &amp; Brandon</p>
  `;

  async function sendEmail(emailPayload) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    });
    return res.json();
  }

  const internalResult = await sendEmail({
    from: 'Clemontyne Leads <leads@clemontyne.com>',
    to: ['courtney@clemontyne.com', 'brandon@clemontyne.com', 'hello@clemontyne.com'],
    subject: `New lead: ${lead.business_name || lead.contact_name || 'Website submission'}`,
    html: internalHtml,
  });

  let confirmationResult = null;
  if (lead.email) {
    confirmationResult = await sendEmail({
      from: 'Clemontyne <hello@clemontyne.com>',
      to: [lead.email],
      subject: 'Thanks for reaching out to Clemontyne',
      html: confirmationHtml,
    });
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ internal: internalResult, confirmation: confirmationResult }),
  };
};
