/**
 * Entry points: menu, one-time trigger setup, and the daily job.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('PMO Automation')
    .addItem('Run daily sync now', 'dailySync')
    .addItem('Install 18:00 daily trigger', 'installTrigger')
    .addToUi();
}

function installTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'dailySync')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('dailySync').timeBased()
    .everyDays(1).atHour(CONFIG.RUN_HOUR).inTimezone(CONFIG.TIMEZONE).create();
}

/** Daily job: read input → upsert DPR → rebuild reports → summary → email. */
function dailySync() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;           // another run in progress
  try {
    const today = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
    const input = readInput_(today);
    const dprSs = SpreadsheetApp.openById(prop_('DPR_SHEET_ID', true));
    const dpr = upsertDpr_(dprSs, input);
    const kpis = buildReports_(dprSs, dpr, today);
    const brief = summarize_(kpis);
    sendDigest_(today, kpis, brief, dprSs.getUrl());
    log_(dprSs, today, 'OK', input.length + ' rows');
  } catch (e) {
    const id = prop_('DPR_SHEET_ID');
    if (id) log_(SpreadsheetApp.openById(id), new Date().toISOString(), 'ERROR', e.message);
    throw e;
  } finally {
    lock.releaseLock();
  }
}

/** Rows from the IM input sheet for today, as objects keyed by header. */
function readInput_(today) {
  const sh = SpreadsheetApp.openById(prop_('INPUT_SHEET_ID', true)).getSheetByName(CONFIG.INPUT_TAB);
  const [head, ...rows] = sh.getDataRange().getValues();
  return rows
    .map(r => Object.fromEntries(head.map((h, i) => [String(h).trim(), r[i]])))
    .filter(o => o['Site ID'] && fmtDate_(o['Date']) === today)
    .map(o => Object.assign(o, { Date: today }));
}

/** Insert or update DPR rows keyed by Date + Site ID. Returns today's DPR rows. */
function upsertDpr_(ss, input) {
  const cols = ['Date', 'Site ID', 'Region', 'Scope', 'Activity', 'SLA Visits',
                'Actual Visits', 'Status', 'Team Lead', 'Revenue', 'Cost'];
  const sh = ss.getSheetByName(CONFIG.DPR_TAB) || ss.insertSheet(CONFIG.DPR_TAB);
  if (sh.getLastRow() === 0) sh.appendRow(cols).setFrozenRows(1);
  const data = sh.getDataRange().getValues();
  const index = new Map(data.slice(1).map((r, i) => [fmtDate_(r[0]) + '|' + r[1], i + 2]));
  input.forEach(o => {
    const row = cols.map(c => o[c] !== undefined ? o[c] : '');
    const at = index.get(o.Date + '|' + o['Site ID']);
    if (at) sh.getRange(at, 1, 1, cols.length).setValues([row]);
    else sh.appendRow(row);
  });
  return input;
}

function fmtDate_(d) {
  return d instanceof Date ? Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd') : String(d);
}

function log_(ss, when, status, detail) {
  const sh = ss.getSheetByName('Run Log') || ss.insertSheet('Run Log');
  if (sh.getLastRow() === 0) sh.appendRow(['When', 'Status', 'Detail']);
  sh.appendRow([when, status, detail]);
}
