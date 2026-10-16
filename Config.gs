/**
 * Configuration. Real IDs and the API key live in Script Properties,
 * never in source:  Project Settings → Script properties.
 *   INPUT_SHEET_ID   – Google Sheet where implementation managers log progress
 *   DPR_SHEET_ID     – Google Sheet that holds the DPR + management reports
 *   REPORT_RECIPIENTS – comma-separated emails for the daily digest
 *   ANTHROPIC_API_KEY – optional; enables the AI-written summary
 */
const CONFIG = {
  INPUT_TAB: 'Daily Input',
  DPR_TAB: 'DPR',
  REPORT_TABS: {
    pnl: 'P&L',
    sla: 'Site SLA',
    attendance: 'Attendance',
    utilization: 'Resource Utilization',
  },
  RUN_HOUR: 18,              // daily sync, script time zone
  TIMEZONE: 'Asia/Riyadh',
  MODEL: 'claude-sonnet-5-5',
  SLA_THRESHOLD: 0,          // breach when actual visits exceed SLA by more than this
};

function prop_(key, required) {
  const v = PropertiesService.getScriptProperties().getProperty(key);
  if (required && !v) throw new Error('Missing script property: ' + key);
  return v;
}
