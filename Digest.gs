/**
 * AI summary (Claude API via UrlFetchApp) and the HTML email digest.
 */
function summarize_(k) {
  const key = prop_('ANTHROPIC_API_KEY');
  const fallback = `${k.sites} sites reported, ${k.completed} completed (${k.completionPct}%). ` +
    `P-L ${k.pl.toLocaleString()} on revenue ${k.revenue.toLocaleString()}. ` +
    `SLA breaches: ${k.breaches.length ? k.breaches.join(', ') : 'none'}.`;
  if (!key) return fallback;
  try {
    const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post',
      contentType: 'application/json',
      muteHttpExceptions: true,
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      payload: JSON.stringify({
        model: CONFIG.MODEL,
        max_tokens: 350,
        messages: [{ role: 'user', content:
          'You are a PMO analyst. Write a 4-sentence daily brief for senior management ' +
          'from these KPIs. Lead with completion %, mention P-L, name SLA-breach sites, ' +
          'end with one action.\n' + JSON.stringify(k) }],
      }),
    });
    if (res.getResponseCode() !== 200) return fallback;
    return JSON.parse(res.getContentText()).content[0].text.trim();
  } catch (e) {
    return fallback;
  }
}

function sendDigest_(today, k, brief, url) {
  const to = prop_('REPORT_RECIPIENTS');
  if (!to) return;
  const tile = (l, v, c) =>
    `<td style="padding:12px 16px;background:#f4f6f9;border-radius:8px">
       <div style="font-size:11px;color:#6b7785;text-transform:uppercase">${l}</div>
       <div style="font-size:22px;font-weight:700;color:${c || '#1f3a5f'}">${v}</div></td>`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px">
      <h2 style="color:#1f3a5f;margin-bottom:4px">Daily Progress — ${today}</h2>
      <table cellspacing="8"><tr>
        ${tile('Sites', k.sites)}${tile('Completion', k.completionPct + '%')}
        ${tile('P-L', k.pl.toLocaleString(), k.pl >= 0 ? '#2b8a3e' : '#c92a2a')}
        ${tile('SLA breaches', k.breaches.length, k.breaches.length ? '#c92a2a' : '#2b8a3e')}
      </tr></table>
      <p style="line-height:1.5">${brief}</p>
      <p><a href="${url}">Open the full DPR and reports</a></p>
    </div>`;
  MailApp.sendEmail({ to, subject: `Daily Progress Report — ${today}`, htmlBody: html });
}
