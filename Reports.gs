/**
 * Builds the management report tabs from today's DPR rows and returns KPIs.
 */
function buildReports_(ss, rows, today) {
  const num = v => Number(v) || 0;

  // ---- P&L
  const revenue = rows.reduce((s, r) => s + num(r.Revenue), 0);
  const cost = rows.reduce((s, r) => s + num(r.Cost), 0);
  const pl = revenue - cost;
  writeTab_(ss, CONFIG.REPORT_TABS.pnl,
    ['Date', 'Revenue', 'Cost', 'P-L', 'P-L %'],
    [[today, revenue, cost, pl, revenue ? pl / revenue : 0]]);

  // ---- Site SLA
  const sla = rows.map(r => {
    const breach = num(r['Actual Visits']) - num(r['SLA Visits']) > CONFIG.SLA_THRESHOLD;
    return [today, r['Site ID'], r.Activity, num(r['SLA Visits']),
            num(r['Actual Visits']), breach ? 'BREACH' : 'Within SLA', r['Team Lead']];
  });
  const slaSheet = writeTab_(ss, CONFIG.REPORT_TABS.sla,
    ['Date', 'Site ID', 'Activity', 'SLA', 'Actual Visit', 'Visit Status', 'Team Lead'], sla);
  highlightBreaches_(slaSheet, sla.length);

  // ---- Team productivity (per team lead)
  const byTl = {};
  rows.forEach(r => {
    const t = byTl[r['Team Lead']] = byTl[r['Team Lead']] || { rev: 0, cost: 0, sites: 0 };
    t.rev += num(r.Revenue); t.cost += num(r.Cost); t.sites++;
  });
  writeTab_(ss, CONFIG.REPORT_TABS.utilization,
    ['TL Name', 'Sites', 'Revenue', 'Cost', 'P-L', 'P-L %'],
    Object.entries(byTl).map(([tl, t]) =>
      [tl, t.sites, t.rev, t.cost, t.rev - t.cost, t.rev ? (t.rev - t.cost) / t.rev : 0]));

  const breaches = sla.filter(r => r[5] === 'BREACH').map(r => r[1]);
  const done = rows.filter(r => String(r.Status).toLowerCase() === 'done').length;
  return {
    date: today, sites: rows.length, completed: done,
    completionPct: rows.length ? Math.round(1000 * done / rows.length) / 10 : 0,
    revenue, cost, pl, breaches,
  };
}

function writeTab_(ss, name, header, rows) {
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clearContents();
  sh.getRange(1, 1, 1, header.length).setValues([header])
    .setFontWeight('bold').setBackground('#1f3a5f').setFontColor('#ffffff');
  if (rows.length) sh.getRange(2, 1, rows.length, header.length).setValues(rows);
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, header.length);
  return sh;
}

function highlightBreaches_(sh, n) {
  if (!n) return;
  const rule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('BREACH').setBackground('#f8d7da').setFontColor('#a4161a')
    .setRanges([sh.getRange(2, 6, n, 1)]).build();
  sh.setConditionalFormatRules([rule]);
}
