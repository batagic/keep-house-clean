// ============================================================
// Code.gs — Google Apps Script cho Kho Thóc Gia Đình
// doGet  → ?type=profiles | ?type=logs | (mặc định) all
// doPost → { type: 'log' | 'delete_log' | 'profile', ... }
//
// Profiles: id | name | avatar | total_grain | total_exp
// (cột balance cũ được đọc/ghi tương thích khi chưa đổi header)
//
// Chạy một lần sau khi deploy: backfillProfileBalances()
// ============================================================

const SHEET_ID       = '1JhOR_Ry5Z9h__wH288zVS2KtYPUD-8PgCWS1KZoErmU';
const SHEET_PROFILES = 'Profiles';
const SHEET_LOGS     = 'Logs';

function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Đảm bảo header Profiles có total_grain, total_exp ──
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

  const grain = Number(obj.total_grain ?? obj.balance) || 0;
  const exp   = Number(obj.total_exp) || 0;

  return {
    id:         String(obj.id || ''),
    name:       String(obj.name || ''),
    avatar:     String(obj.avatar || '👶'),
    total_grain: grain,
    total_exp:   exp
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

function readLogs_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const lSheet = ss.getSheetByName(SHEET_LOGS);
  if (!lSheet) return [];

  const lData    = lSheet.getDataRange().getValues();
  const lHeaders = lData[0];
  return lData.slice(1)
    .filter(row => row[0])
    .map(row => {
      const obj = {};
      lHeaders.forEach((h, i) => obj[h] = row[i]);
      obj.grain = Number(obj.grain) || 0;
      obj.exp   = Number(obj.exp)   || 0;
      return obj;
    });
}

// ── GET: ?type=profiles | ?type=logs | all (mặc định) ──
function doGet(e) {
  try {
    const type = (e && e.parameter && e.parameter.type) || 'all';

    if (type === 'profiles') {
      return createResponse({ profiles: readProfiles_() });
    }

    if (type === 'logs') {
      return createResponse({ logs: readLogs_() });
    }

    return createResponse({
      profiles: readProfiles_(),
      logs:     readLogs_()
    });

  } catch (err) {
    Logger.log('doGet error: ' + err.toString());
    return createResponse({ result: 'error', message: err.toString() });
  }
}

// ── POST ──
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

// ── Cập nhật cache số dư trên Profiles ──
function adjustProfileBalance_(profileId, grainDelta, expDelta) {
  if (!profileId) return;

  const sheet   = getProfilesSheet_();
  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h || '').trim());
  const idCol   = headers.indexOf('id');
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

// ── Ghi Profile (insert or update name/avatar; giữ nguyên số dư) ──
function writeProfile(params) {
  const sheet   = getProfilesSheet_();
  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h || '').trim());
  const idCol    = headers.indexOf('id');
  const nameCol  = headers.indexOf('name');
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

// ── Ghi Log + cập nhật cache ──
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

// ── Xóa Log + trừ cache ──
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

// ── Migration: tính lại total_grain / total_exp từ Logs (chạy 1 lần trong editor) ──
function backfillProfileBalances() {
  const logs = readLogs_();
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

function doOptions(e) {
  return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);
}
