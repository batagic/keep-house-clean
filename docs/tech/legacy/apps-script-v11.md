// ============================================================
// Code.gs — Google Apps Script cho Kho Thóc Gia Đình
// doGet  → ?type=profiles | ?type=logs | ?type=ping | (mặc định) all
//          logs: &profileId=…&limit=25&offset=0
// doPost → { type: 'log' | 'delete_log' | 'profile', ... }
//
// Profiles: id | name | avatar | total_grain | total_exp
//
// Sau deploy:
//   1. backfillProfileBalances()  — một lần
//   2. setupKeepWarmTrigger()     — giữ API ấm (5 phút/lần)
// ============================================================

const SHEET_ID       = '1JhOR_Ry5Z9h__wH288zVS2KtYPUD-8PgCWS1KZoErmU';
const SHEET_PROFILES = 'Profiles';
const SHEET_LOGS     = 'Logs';
/** Cập nhật khi deploy Web App mới — khớp assets/js/data/config.js */
const WEB_APP_URL    = 'https://script.google.com/macros/s/AKfycbwrQ4WC4WnZ4X33RQScOnOG5RFHAVblqIYEhNVfHJENAAzRe-rGEN-5ICobJFp-oTHYeg/exec';

function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureProfileHeaders_(sheet) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim());

  const balanceIdx = headers.indexOf('balance');
  if (balanceIdx >= 0 && headers.indexOf('total_grain') < 0) {
    sheet.getRange(1, balanceIdx + 1).setValue('total_grain');
    headers[balanceIdx] = 'total_grain';
  }

  for (const col of ['total_grain', 'total_exp']) {
    if (headers.indexOf(col) < 0) {
      const newCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, newCol).setValue(col);
      headers.push(col);
    }
  }
}

function getProfilesSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_PROFILES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_PROFILES);
    sheet.appendRow(['id', 'name', 'avatar', 'total_grain', 'total_exp']);
  } else {
    ensureProfileHeaders_(sheet);
  }
  return sheet;
}

function profileColIndex_(headers, name, legacyName) {
  let idx = headers.indexOf(name);
  if (idx < 0 && legacyName) idx = headers.indexOf(legacyName);
  return idx;
}

function normalizeProfileRow_(headers, row) {
  const obj = {};
  headers.forEach((h, i) => { if (h) obj[h] = row[i]; });

  return {
    id:          String(obj.id || ''),
    name:        String(obj.name || ''),
    avatar:      String(obj.avatar || '👶'),
    total_grain: Number(obj.total_grain ?? obj.balance) || 0,
    total_exp:   Number(obj.total_exp) || 0
  };
}

function readProfiles_() {
  const sheet = getProfilesSheet_();
  const data  = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0].map(h => String(h || '').trim());
  return data.slice(1)
    .filter(row => row[0])
    .map(row => normalizeProfileRow_(headers, row));
}

function rowToLog_(lHeaders, row) {
  const obj = {};
  lHeaders.forEach((h, i) => obj[h] = row[i]);
  obj.grain = Number(obj.grain) || 0;
  obj.exp   = Number(obj.exp)   || 0;
  return obj;
}

/**
 * Đọc logs — hỗ trợ phân trang theo profile.
 * opts: { profileId?, limit?, offset? }
 * Trả về: { logs, total, hasMore }
 */
function readLogs_(opts) {
  opts = opts || {};
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const lSheet = ss.getSheetByName(SHEET_LOGS);
  if (!lSheet) return { logs: [], total: 0, hasMore: false };

  const lData    = lSheet.getDataRange().getValues();
  if (lData.length < 2) return { logs: [], total: 0, hasMore: false };

  const lHeaders = lData[0];
  const idCol    = lHeaders.indexOf('id');
  const dateCol  = lHeaders.indexOf('date');
  const profileId = opts.profileId ? String(opts.profileId) : '';

  let rows = [];
  for (let i = 1; i < lData.length; i++) {
    if (!lData[i][0]) continue;
    if (profileId && String(lData[i][idCol]) !== profileId) continue;
    rows.push(lData[i]);
  }

  rows.sort((a, b) => String(b[dateCol]).localeCompare(String(a[dateCol])));

  const total  = rows.length;
  const limit  = opts.limit  > 0 ? opts.limit  : 0;
  const offset = opts.offset > 0 ? opts.offset : 0;

  if (limit > 0) {
    rows = rows.slice(offset, offset + limit);
  }

  const logs = rows.map(row => rowToLog_(lHeaders, row));

  return {
    logs,
    total,
    hasMore: limit > 0 ? (offset + logs.length) < total : false
  };
}

function doGet(e) {
  try {
    const type = (e && e.parameter && e.parameter.type) || 'all';

    if (type === 'ping') {
      return createResponse({ result: 'ok', ts: Date.now() });
    }

    if (type === 'profiles') {
      return createResponse({ profiles: readProfiles_() });
    }

    if (type === 'logs') {
      const profileId = (e.parameter && e.parameter.profileId) || '';
      const limit     = parseInt((e.parameter && e.parameter.limit)  || '0', 10) || 0;
      const offset    = parseInt((e.parameter && e.parameter.offset) || '0', 10) || 0;
      return createResponse(readLogs_({ profileId, limit, offset }));
    }

    const allLogs = readLogs_();
    return createResponse({
      profiles: readProfiles_(),
      logs:     allLogs.logs,
      total:    allLogs.total
    });

  } catch (err) {
    Logger.log('doGet error: ' + err.toString());
    return createResponse({ result: 'error', message: err.toString() });
  }
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    Logger.log('doPost: ' + JSON.stringify(params));

    switch (params.type) {
      case 'log':        return writeLog(params);
      case 'delete_log': return deleteLog(params);
      case 'profile':    return writeProfile(params);
      default:           return writeProfile(params);
    }
  } catch (err) {
    Logger.log('doPost error: ' + err.toString());
    return createResponse({ result: 'error', message: err.toString() });
  }
}

function adjustProfileBalance_(profileId, grainDelta, expDelta) {
  if (!profileId) return;

  const sheet   = getProfilesSheet_();
  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h || '').trim());
  const idCol    = headers.indexOf('id');
  const grainCol = profileColIndex_(headers, 'total_grain', 'balance');
  const expCol   = headers.indexOf('total_exp');

  if (idCol < 0 || grainCol < 0 || expCol < 0) {
    throw new Error('Sheet Profiles thiếu cột id / total_grain / total_exp');
  }

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(profileId)) {
      const row = i + 1;
      const newGrain = (Number(data[i][grainCol]) || 0) + (Number(grainDelta) || 0);
      const newExp   = (Number(data[i][expCol])   || 0) + (Number(expDelta)   || 0);
      sheet.getRange(row, grainCol + 1).setValue(newGrain);
      sheet.getRange(row, expCol + 1).setValue(newExp);
      return;
    }
  }
}

function writeProfile(params) {
  const sheet   = getProfilesSheet_();
  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h || '').trim());
  const idCol     = headers.indexOf('id');
  const nameCol   = headers.indexOf('name');
  const avatarCol = headers.indexOf('avatar');
  const grainCol  = profileColIndex_(headers, 'total_grain', 'balance');
  const expCol    = headers.indexOf('total_exp');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(params.id)) {
      const row = i + 1;
      if (nameCol >= 0)   sheet.getRange(row, nameCol + 1).setValue(params.name || data[i][nameCol]);
      if (avatarCol >= 0) sheet.getRange(row, avatarCol + 1).setValue(params.avatar || data[i][avatarCol] || '👶');
      return createResponse({ result: 'success', action: 'updated' });
    }
  }

  const newRow = new Array(headers.length).fill('');
  newRow[idCol]     = params.id;
  newRow[nameCol]   = params.name;
  newRow[avatarCol] = params.avatar || '👶';
  newRow[grainCol]  = Number(params.total_grain ?? params.balance) || 0;
  newRow[expCol]    = Number(params.total_exp) || 0;
  sheet.appendRow(newRow);

  return createResponse({ result: 'success', action: 'inserted' });
}

function writeLog(params) {
  const ss  = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_LOGS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_LOGS);
    sheet.appendRow(['id', 'name', 'date', 'grain', 'exp', 'tasks', 'bonus', 'note']);
  }

  const grain = Number(params.grain) || 0;
  const exp   = Number(params.exp)   || 0;

  sheet.appendRow([
    params.profileId   || '',
    params.profileName || '',
    params.date        || new Date().toISOString(),
    grain,
    exp,
    params.tasks       || '',
    params.bonus       ? 'TRUE' : 'FALSE',
    params.note        || ''
  ]);

  adjustProfileBalance_(params.profileId, grain, exp);
  return createResponse({ result: 'success', action: 'log_inserted' });
}

function deleteLog(params) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_LOGS);
  if (!sheet) return createResponse({ result: 'error', message: 'Sheet Logs không tồn tại' });

  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol    = headers.indexOf('id');
  const dateCol  = headers.indexOf('date');
  const grainCol = headers.indexOf('grain');
  const expCol   = headers.indexOf('exp');

  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][idCol]) === String(params.profileId) &&
        String(data[i][dateCol]) === String(params.date)) {
      const grain = Number(data[i][grainCol]) || 0;
      const exp   = Number(data[i][expCol])   || 0;
      sheet.deleteRow(i + 1);
      adjustProfileBalance_(params.profileId, -grain, -exp);
      return createResponse({ result: 'success', action: 'log_deleted' });
    }
  }
  return createResponse({ result: 'error', message: 'Không tìm thấy log để xóa' });
}

function backfillProfileBalances() {
  const logs = readLogs_().logs;
  const totals = {};

  logs.forEach(log => {
    const pid = String(log.id || log.profileId || '');
    if (!pid) return;
    if (!totals[pid]) totals[pid] = { grain: 0, exp: 0 };
    totals[pid].grain += log.grain;
    totals[pid].exp   += log.exp;
  });

  const sheet   = getProfilesSheet_();
  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h || '').trim());
  const idCol    = headers.indexOf('id');
  const grainCol = profileColIndex_(headers, 'total_grain', 'balance');
  const expCol   = headers.indexOf('total_exp');

  let updated = 0;
  for (let i = 1; i < data.length; i++) {
    const pid = String(data[i][idCol] || '');
    if (!pid) continue;
    const t = totals[pid] || { grain: 0, exp: 0 };
    sheet.getRange(i + 1, grainCol + 1).setValue(t.grain);
    sheet.getRange(i + 1, expCol + 1).setValue(t.exp);
    updated++;
  }

  Logger.log('backfillProfileBalances: updated ' + updated + ' profiles');
  return { updated, totals };
}

/** Time-driven trigger: ping Web App mỗi 5 phút — giảm cold start */
function keepWarm_() {
  try {
    UrlFetchApp.fetch(WEB_APP_URL + '?type=ping', { muteHttpExceptions: true, followRedirects: true });
  } catch (err) {
    Logger.log('keepWarm_ error: ' + err.toString());
  }
}

/** Chạy một lần trong editor sau deploy để tạo trigger */
function setupKeepWarmTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'keepWarm_') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('keepWarm_')
    .timeBased()
    .everyMinutes(5)
    .create();
  Logger.log('keepWarm trigger created (every 5 minutes)');
}

function doOptions(e) {
  return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);
}
