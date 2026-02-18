/**
 * EventIQ → Google Sheets Sync
 *
 * SETUP:
 * 1. Create a new Google Sheet
 * 2. Go to Extensions → Apps Script
 * 3. Paste this entire file into Code.gs
 * 4. Click Deploy → New Deployment → Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the deployment URL
 * 6. Paste it into EventIQ Settings → Google Sheets URL
 *
 * The script auto-creates sheets: Feedback, Engagements, Pipeline, MetStatus, Sequences
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var type = data.type;
    var payload = data.payload;
    var timestamp = data.timestamp || new Date().toISOString();

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getOrCreateSheet(ss, type);

    switch (type) {
      case 'feedback':
        appendFeedback(sheet, payload, timestamp);
        break;
      case 'engagement':
        appendEngagement(sheet, payload, timestamp);
        break;
      case 'pipeline':
        appendPipeline(sheet, payload, timestamp);
        break;
      case 'met':
        appendMet(sheet, payload, timestamp);
        break;
      case 'sequence':
        appendSequence(sheet, payload, timestamp);
        break;
      case 'ping':
        // Connection test — just return OK
        break;
      default:
        appendGeneric(sheet, payload, timestamp);
    }

    return ContentService.createTextOutput(
      JSON.stringify({ status: 'ok', type: type })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'error', message: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({ status: 'ok', message: 'EventIQ Sheets Sync is running' })
  ).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(ss, type) {
  var sheetNames = {
    'feedback': 'Feedback',
    'engagement': 'Engagements',
    'pipeline': 'Pipeline',
    'met': 'Met Status',
    'sequence': 'Sequences',
    'ping': 'Log',
  };

  var name = sheetNames[type] || 'Other';
  var sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
    addHeaders(sheet, type);
  }

  return sheet;
}

function addHeaders(sheet, type) {
  var headers;
  switch (type) {
    case 'feedback':
      headers = ['Timestamp', 'Section', 'Type', 'Notes', 'Page', 'Company', 'User Agent'];
      break;
    case 'engagement':
      headers = ['Timestamp', 'Company ID', 'Company Name', 'Contact', 'Channel', 'Action', 'Notes', 'Source'];
      break;
    case 'pipeline':
      headers = ['Timestamp', 'Company ID', 'Company Name', 'Old Stage', 'New Stage'];
      break;
    case 'met':
      headers = ['Timestamp', 'Company ID', 'Company Name', 'Met Status'];
      break;
    case 'sequence':
      headers = ['Timestamp', 'Company ID', 'Company Name', 'Sequence Type', 'Step ID', 'Channel', 'Action'];
      break;
    default:
      headers = ['Timestamp', 'Type', 'Data'];
  }

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function appendFeedback(sheet, p, ts) {
  sheet.appendRow([ts, p.section || '', p.feedbackType || '', p.notes || '', p.page || '', p.companyName || '', p.userAgent || '']);
}

function appendEngagement(sheet, p, ts) {
  sheet.appendRow([ts, p.companyId || '', p.companyName || '', p.contactName || '', p.channel || '', p.action || '', p.notes || '', p.source || '']);
}

function appendPipeline(sheet, p, ts) {
  sheet.appendRow([ts, p.companyId || '', p.companyName || '', p.oldStage || '', p.newStage || '']);
}

function appendMet(sheet, p, ts) {
  sheet.appendRow([ts, p.companyId || '', p.companyName || '', p.met ? 'Met' : 'Unmet']);
}

function appendSequence(sheet, p, ts) {
  sheet.appendRow([ts, p.companyId || '', p.companyName || '', p.sequenceType || '', p.stepId || '', p.channel || '', p.action || '']);
}

function appendGeneric(sheet, p, ts) {
  sheet.appendRow([ts, '', JSON.stringify(p)]);
}
