/**
 * HoP Nola Heart Meter: backend.
 *
 * Lives in a Google Sheet (Extensions > Apps Script). The GitHub Pages site
 * reads with GET and writes with POST. Writes need the team code, stored in
 * Project Settings > Script Properties as TEAM_CODE.
 *
 * Sheets it uses (created on first run if missing):
 *   Donations: id, createdAt, date, leader, donor, amount, event, note, received, thanked
 *   Outreach:  id, createdAt, date, leader, org, how, status, note, nextStep
 *   Settings:  key, value   (goal = 2000, leaders = comma separated names,
 *              spotfund = Leader=storyId|baseline, comma separated; see spotfundLinks_)
 *   Spotfund:  every fundraiser on HoP's public Spotfund organization page, as last read
 *   Participation: id, createdAt, date, leader, partners, task, minutes, learned, differently,
 *              link, mediaIds, status (pending/approved/rejected), points, reviewedAt, reviewNote
 *   Tasks:     task, points   (the point value of each task; the Sheet owner fills it in)
 *
 * Participation needs two codes: TEAM_CODE to log a task, MENTOR_CODE (Script Properties)
 * to see the full entries and approve them. Points count only once a mentor approves.
 * Photos and videos go to the Drive folder "HoP Participation media", shared with nobody;
 * the Sheet owner shares that folder with the mentors.
 *   Log:       every write, with the full row of anything deleted (audit trail)
 *
 * Security: writes need TEAM_CODE; after 25 wrong codes in 10 minutes all
 * writes pause for 10 minutes; text that would start a formula is stored as
 * plain text; nothing here can edit Settings or the script.
 *
 * Backups: run installBackup() once from the editor. Every hour, if anything
 * changed (or a day has passed), backup() saves a full copy of this Sheet in
 * the Drive folder "HoP Heart Meter backups" and keeps the newest 200.
 *
 * Spotfund: run installSpotfund() once from the editor. Every hour it reads
 * HoP's public organization page on Spotfund (read only, no login) and saves
 * each fundraiser's raised amount. A leader's heart counts their linked
 * fundraiser's raised amount minus its baseline (what it had before this
 * season). If the read fails or looks wrong, the last good read is kept and
 * the page says the amounts may be out of date.
 */

const HEADERS = {
  Donations: ['id', 'createdAt', 'date', 'leader', 'donor', 'amount', 'event', 'note', 'received', 'thanked'],
  Outreach: ['id', 'createdAt', 'date', 'leader', 'org', 'how', 'status', 'note', 'nextStep'],
  Settings: ['key', 'value'],
  Spotfund: ['storyId', 'title', 'owner', 'created', 'goal', 'raised', 'donors', 'readAt'],
  Participation: ['id', 'createdAt', 'date', 'leader', 'partners', 'task', 'minutes', 'learned', 'differently',
    'link', 'mediaIds', 'status', 'points', 'reviewedAt', 'reviewNote'],
  Tasks: ['task', 'points'],
  Log: ['at', 'action', 'kind', 'id', 'detail'],
};
const DEFAULT_LEADERS = 'Ava, Bishop, Catherine, Ceci, Charlotte, Ella, Emerson, Kate, Lesley, Libby, Maddie, Maeve, Mary Claire, Philip, Sophie, Teresa, Yve';
const STATUSES = ['contacted', 'waiting', 'yes', 'no'];
const BACKUP_FOLDER = 'HoP Heart Meter backups';
const BACKUPS_KEPT = 200;
const headersChecked_ = {};
const SPOTFUND_ORG_URL = 'https://www.spotfund.com/organization/98892ab3-72e5-4cc5-84bd-b7df2ed5b1e1';
const SPOTFUND_STALE_HOURS = 3;
// Savannah's "Participation Points" sheet (Drive, HoP Nola 2027 - MENTORS), Oct 2026. Points are hers to set.
const DEFAULT_TASKS = ['Run a fundraiser', 'Participate in a fundraiser', 'Submit a blog post',
  'TikTok video', 'Attend group workshop', 'Attend committee meeting', 'Random Acts of Kindness',
  'Contact/pitch potential sponsor/partner', 'Tell someone about HoP', 'Post something unique about HoP and tag HoP',
  'Complete assignment on time', 'Talk to a board member', 'Volunteer to make the social media post about the big group meeting',
  'Bonus points for responsiveness', 'Bonus points for providing encouragement', 'Submit mission/motivation Monday to the team',
  'Do something social with three or more HoP leaders (from at least two schools)'];
const OUTREACH_TASK = 'Contact/pitch potential sponsor/partner';
const MEDIA_FOLDER = 'HoP Participation media';
const MEDIA_MAX_FILES = 3;
const MEDIA_MAX_BYTES = 8 * 1024 * 1024;
const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime'];

function sheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(HEADERS[name]);
    sh.setFrozenRows(1);
  } else if (!headersChecked_[name]) {
    // A Sheet made before a column existed gets the new header at the end, so old rows keep their place.
    const head = sh.getRange(1, 1, 1, HEADERS[name].length).getValues()[0];
    HEADERS[name].forEach((h, i) => { if (head[i] === '' || head[i] == null) sh.getRange(1, i + 1).setValue(h); });
  }
  headersChecked_[name] = true;
  return sh;
}

function rows_(name) {
  const values = sheet_(name).getDataRange().getValues();
  const head = values.shift();
  return values.filter(r => r[0] !== '').map(r => {
    const o = {};
    head.forEach((h, i) => { o[h] = r[i] instanceof Date ? Utilities.formatDate(r[i], 'America/Chicago', 'yyyy-MM-dd') : r[i]; });
    return o;
  });
}

function settings_() {
  const s = {};
  rows_('Settings').forEach(r => { s[r.key] = r.value; });
  return {
    goal: Number(s.goal) || 2000,
    leaders: String(s.leaders || DEFAULT_LEADERS).split(',').map(x => x.trim()).filter(Boolean),
    spotfund: String(s.spotfund || ''),
  };
}

function log_(action, kind, id, detail) {
  sheet_('Log').appendRow([new Date().toISOString(), action, kind, id, clean_(JSON.stringify(detail || {}), 2000)]);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function clean_(v, max) {
  const t = String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max || 200);
  // A cell that starts with = + - @ would run as a formula in Sheets.
  return /^[=+\-@]/.test(t) ? "'" + t : t;
}

function date_(v) {
  const t = String(v || '');
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : Utilities.formatDate(new Date(), 'America/Chicago', 'yyyy-MM-dd');
}

function tooManyWrongCodes_() {
  return Number(CacheService.getScriptCache().get('wrong') || 0) >= 25;
}

function countWrongCode_() {
  const c = CacheService.getScriptCache();
  c.put('wrong', String(Number(c.get('wrong') || 0) + 1), 600);
}

/** Task list with point values. A task with no number yet has points null: the page says "not set yet". */
function tasks_() {
  const rows = rows_('Tasks');
  if (!rows.length) return DEFAULT_TASKS.map(t => ({ task: t, points: null }));
  return rows.map(r => ({ task: String(r.task), points: r.points === '' || r.points == null ? null : Number(r.points) }));
}

/** What everyone with the link sees: no reflections, no media, only what a leader did and its status. */
function participationForPage_() {
  return rows_('Participation').map(r => ({
    id: r.id, date: r.date, leader: r.leader, partners: r.partners, task: r.task, minutes: Number(r.minutes) || 0,
    status: r.status, points: r.status === 'approved' ? Number(r.points) || 0 : 0,
    media: String(r.mediaIds || '').split(',').filter(Boolean).length + (r.link ? 1 : 0),
  }));
}

function mentorCodeOk_(body) {
  const m = PropertiesService.getScriptProperties().getProperty('MENTOR_CODE');
  return !!m && String(body.mentorCode == null ? '' : body.mentorCode).trim().toLowerCase() === String(m).trim().toLowerCase();
}

function addParticipation_(body, s, now, fromOutreach) {
  const id = Utilities.getUuid();
  sheet_('Participation').appendRow([id, now, date_(body.date), body.leader, clean_(body.partners, 200), body.task,
    Number(body.minutes) || 0, clean_(body.learned, 1000), clean_(body.differently, 1000), clean_(body.link, 300),
    (body.mediaIds || []).join(','), 'pending', '', '', fromOutreach ? 'from outreach' : '']);
  log_('add', 'participation', id, { leader: body.leader, task: body.task });
  return id;
}

function doGet() {
  const donations = rows_('Donations').map(d => Object.assign(d, {
    amount: Number(d.amount) || 0,
    received: d.received === true || d.received === 'TRUE',
    thanked: d.thanked === true || d.thanked === 'TRUE',
  }));
  const lastBackup = PropertiesService.getScriptProperties().getProperty('lastBackupAt') || '';
  const st = settings_();
  return json_({ ok: true, settings: { goal: st.goal, leaders: st.leaders }, donations: donations, outreach: rows_('Outreach'),
    lastBackup: lastBackup, spotfund: spotfundForPage_(st), tasks: tasks_(), participation: participationForPage_() });
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad_request' }); }

  if (tooManyWrongCodes_()) return json_({ ok: false, error: 'paused' });
  if (body.action === 'mentor_queue' || body.action === 'review') {
    if (!mentorCodeOk_(body)) { countWrongCode_(); return json_({ ok: false, error: 'wrong_mentor_code' }); }
    return mentor_(body);
  }
  const code = PropertiesService.getScriptProperties().getProperty('TEAM_CODE');
  if (!code || String(body.code == null ? '' : body.code).trim().toLowerCase() !== String(code).trim().toLowerCase()) {
    countWrongCode_();
    return json_({ ok: false, error: 'wrong_code' });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const s = settings_();
    const now = new Date().toISOString();
    const a = body.action;

    if (a === 'check') return json_({ ok: true });

    if (a === 'add_donation') {
      const amount = Math.round(Number(body.amount) * 100) / 100;
      if (s.leaders.indexOf(body.leader) < 0) return json_({ ok: false, error: 'unknown_leader' });
      if (!(amount > 0) || amount > 1000000) return json_({ ok: false, error: 'bad_amount' });
      const id = Utilities.getUuid();
      sheet_('Donations').appendRow([id, now, date_(body.date), body.leader, clean_(body.donor, 120), amount,
        clean_(body.event, 60), clean_(body.note), !!body.received, !!body.thanked]);
      log_('add', 'donation', id, { leader: body.leader, amount: amount });
      return json_({ ok: true, id: id });
    }

    if (a === 'add_outreach') {
      if (s.leaders.indexOf(body.leader) < 0) return json_({ ok: false, error: 'unknown_leader' });
      if (STATUSES.indexOf(body.status) < 0) return json_({ ok: false, error: 'bad_status' });
      const nextStep = clean_(body.nextStep);
      if (!nextStep) return json_({ ok: false, error: 'need_next_step' });
      const id = Utilities.getUuid();
      sheet_('Outreach').appendRow([id, now, date_(body.date), body.leader, clean_(body.org, 120),
        clean_(body.how, 40), body.status, clean_(body.note), nextStep]);
      log_('add', 'outreach', id, { leader: body.leader });
      // Every contact is also a participation task, pending until a mentor approves it.
      addParticipation_({ leader: body.leader, task: OUTREACH_TASK, partners: '', minutes: 0,
        learned: '', differently: '', link: '', date: body.date, mediaIds: [] }, s, now, true);
      return json_({ ok: true, id: id });
    }

    if (a === 'add_participation') {
      if (s.leaders.indexOf(body.leader) < 0) return json_({ ok: false, error: 'unknown_leader' });
      if (tasks_().map(t => t.task).indexOf(body.task) < 0) return json_({ ok: false, error: 'unknown_task' });
      const minutes = Math.round(Number(body.minutes));
      if (!(minutes >= 1 && minutes <= 1440)) return json_({ ok: false, error: 'bad_minutes' });
      if (!clean_(body.learned) || !clean_(body.differently)) return json_({ ok: false, error: 'need_reflection' });
      const link = clean_(body.link, 300);
      if (link && !/^https:\/\/\S+$/.test(link)) return json_({ ok: false, error: 'bad_link' });
      const files = Array.isArray(body.media) ? body.media : [];
      if (files.length > MEDIA_MAX_FILES) return json_({ ok: false, error: 'too_many_files' });
      // Check every file before saving any, so a bad file never leaves half an entry behind.
      const blobs = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i] || {};
        if (MEDIA_TYPES.indexOf(f.type) < 0) return json_({ ok: false, error: 'bad_file_type' });
        let bytes;
        try { bytes = Utilities.base64Decode(String(f.data || '')); } catch (err) { return json_({ ok: false, error: 'bad_file' }); }
        if (!bytes.length || bytes.length > MEDIA_MAX_BYTES) return json_({ ok: false, error: 'file_too_big' });
        blobs.push(Utilities.newBlob(bytes, f.type, clean_(body.leader + ' ' + date_(body.date) + ' ' + (i + 1), 80)));
      }
      const folders = DriveApp.getFoldersByName(MEDIA_FOLDER);
      const folder = blobs.length ? (folders.hasNext() ? folders.next() : DriveApp.createFolder(MEDIA_FOLDER)) : null;
      const mediaIds = blobs.map(b => folder.createFile(b).getId());
      const id = addParticipation_({ leader: body.leader, partners: body.partners, task: body.task, minutes: minutes,
        learned: body.learned, differently: body.differently, link: link, date: body.date, mediaIds: mediaIds }, s, now, false);
      return json_({ ok: true, id: id });
    }

    if (a === 'toggle' || a === 'move' || a === 'delete' || a === 'next') {
      const name = body.kind === 'outreach' ? 'Outreach' : 'Donations';
      const sh = sheet_(name);
      const ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues().map(r => r[0]);
      const row = ids.indexOf(body.id) + 1;
      if (row < 2) return json_({ ok: false, error: 'not_found' });
      if (a === 'delete') {
        log_('delete', body.kind, body.id, sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0]);
        sh.deleteRow(row);
        return json_({ ok: true });
      }
      if (a === 'toggle' && name === 'Donations' && (body.field === 'received' || body.field === 'thanked')) {
        const col = HEADERS.Donations.indexOf(body.field) + 1;
        sh.getRange(row, col).setValue(!!body.value);
        log_('toggle', 'donation', body.id, { field: body.field, value: !!body.value });
        return json_({ ok: true });
      }
      if (a === 'move' && name === 'Outreach' && STATUSES.indexOf(body.status) >= 0) {
        sh.getRange(row, HEADERS.Outreach.indexOf('status') + 1).setValue(body.status);
        log_('move', 'outreach', body.id, { status: body.status });
        return json_({ ok: true });
      }
      if (a === 'next' && name === 'Outreach') {
        const nextStep = clean_(body.nextStep);
        if (!nextStep) return json_({ ok: false, error: 'need_next_step' });
        const cell = sh.getRange(row, HEADERS.Outreach.indexOf('nextStep') + 1);
        log_('next', 'outreach', body.id, { from: cell.getValues()[0][0], to: nextStep });
        cell.setValue(nextStep);
        return json_({ ok: true });
      }
      return json_({ ok: false, error: 'bad_request' });
    }

    return json_({ ok: false, error: 'unknown_action' });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Reads the Spotfund rows out of the organization page's HTML. The page embeds
 * each fundraiser as JSON with escaped quotes: {"id":..,"created":..,"owner":
 * {"first_name":..,"last_name":..},"total_upvotes":<raised>,"donors_count":..,
 * "title":..,"goal":..}. Returns [] when nothing matches; never guesses.
 */
function parseSpotfund_(html) {
  const s = String(html || '').replace(/\\"/g, '"');
  const starts = [];
  const re = /\{"id":"([0-9a-f-]{36})","created":"([^"]*)"/g;
  let m;
  while ((m = re.exec(s))) starts.push({ at: m.index, id: m[1], created: m[2] });
  const out = [];
  const seen = {};
  starts.forEach((st, i) => {
    const seg = s.slice(st.at, i + 1 < starts.length ? starts[i + 1].at : st.at + 20000);
    const raised = seg.match(/"total_upvotes":(\d+(?:\.\d+)?)/);
    const owner = seg.match(/"owner":\{"id":"[^"]*","first_name":"([^"]*)","last_name":"([^"]*)"/);
    if (!raised || !owner || seen[st.id]) return;
    const title = seg.match(/"title":"([^"]*)"/);
    const goal = seg.match(/"goal":(\d+(?:\.\d+)?)/);
    const donors = seg.match(/"donors_count":(\d+)/);
    seen[st.id] = true;
    out.push({
      storyId: st.id, created: st.created.slice(0, 10), title: title ? title[1] : '',
      owner: (owner[1] + ' ' + owner[2].slice(0, 1)).trim(),
      raised: Number(raised[1]), goal: goal ? Number(goal[1]) : 0, donors: donors ? Number(donors[1]) : 0,
    });
  });
  return out;
}

/**
 * Settings "spotfund" links leaders to fundraisers: "Charlotte=<storyId>|1150, Kate=<storyId>".
 * The number after | is the baseline: what that fundraiser had raised before this season.
 * Only the amount above it counts. No number means 0. Unknown leaders are skipped.
 */
function spotfundLinks_(raw, leaders) {
  const out = [];
  String(raw || '').split(',').forEach(part => {
    const m = part.trim().match(/^(.+?)=([0-9a-f-]{36})(?:\|(\d+(?:\.\d+)?))?$/);
    if (m && leaders.indexOf(m[1].trim()) >= 0) out.push({ leader: m[1].trim(), storyId: m[2], baseline: Number(m[3] || 0) });
  });
  return out;
}

/** What the page gets: only linked fundraisers, with what counts this season, and the read status. */
function spotfundForPage_(st) {
  const props = PropertiesService.getScriptProperties();
  const readAt = props.getProperty('spotfundReadAt') || '';
  const error = props.getProperty('spotfundError') || '';
  const links = spotfundLinks_(st.spotfund, st.leaders);
  const rows = links.length ? rows_('Spotfund') : [];
  const stories = links.map(l => {
    const r = rows.filter(x => x.storyId === l.storyId)[0];
    const raised = r ? Number(r.raised) || 0 : 0;
    return { leader: l.leader, storyId: l.storyId, title: r ? r.title : '', raised: raised, baseline: l.baseline,
      counts: Math.max(0, Math.round((raised - l.baseline) * 100) / 100), found: !!r };
  });
  const stale = !readAt || Date.now() - new Date(readAt).getTime() > SPOTFUND_STALE_HOURS * 3600 * 1000;
  return { readAt: readAt, error: error, stale: stale, stories: stories };
}

/**
 * Reads HoP's Spotfund organization page and saves every fundraiser. Runs every hour once
 * installSpotfund() has been run. Keeps the last good read when anything looks wrong, and
 * throws so Apps Script emails the owner about the failure.
 */
function spotfundSync() {
  const props = PropertiesService.getScriptProperties();
  const fail = msg => {
    props.setProperty('spotfundError', msg);
    log_('spotfund_error', 'spotfund', '', { error: msg });
    throw new Error('Spotfund: ' + msg);
  };
  let res;
  try { res = UrlFetchApp.fetch(SPOTFUND_ORG_URL, { muteHttpExceptions: true, followRedirects: true }); }
  catch (err) { return fail('could not reach Spotfund (' + err.message + ')'); }
  if (res.getResponseCode() !== 200) return fail('Spotfund answered ' + res.getResponseCode());
  const list = parseSpotfund_(res.getContentText());
  if (!list.length) return fail('no fundraisers found on the page; Spotfund may have changed its format');
  const before = Number(props.getProperty('spotfundCount') || 0);
  if (list.length < before) return fail('found ' + list.length + ' fundraisers, fewer than the ' + before + ' of the last read; kept the last read');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_('Spotfund');
    for (let r = sh.getLastRow(); r >= 2; r--) sh.deleteRow(r);
    const now = new Date().toISOString();
    list.forEach(x => sh.appendRow([x.storyId, clean_(x.title, 120), clean_(x.owner, 60), x.created, x.goal, x.raised, x.donors, now]));
    props.setProperty('spotfundReadAt', now);
    props.setProperty('spotfundCount', String(list.length));
    props.setProperty('spotfundError', '');
    log_('spotfund_read', 'spotfund', '', { fundraisers: list.length, raised: list.reduce((a, x) => a + x.raised, 0) });
  } finally {
    lock.releaseLock();
  }
  return list.length;
}

/** Run once from the editor: reads Spotfund now and every hour from then on. */
function installSpotfund() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'spotfundSync').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('spotfundSync').timeBased().everyHours(1).create();
  return spotfundSync();
}

/** Mentor actions: the full queue (with reflections and media links) and approving or rejecting. */
function mentor_(body) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (body.action === 'mentor_queue') {
      const rows = rows_('Participation').map(r => Object.assign(r, {
        minutes: Number(r.minutes) || 0,
        media: String(r.mediaIds || '').split(',').filter(Boolean).map(m => 'https://drive.google.com/file/d/' + m + '/view'),
      }));
      return json_({ ok: true, entries: rows });
    }
    const decision = body.decision;
    if (decision !== 'approved' && decision !== 'rejected') return json_({ ok: false, error: 'bad_request' });
    const sh = sheet_('Participation');
    const ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues().map(r => r[0]);
    const row = ids.indexOf(body.id) + 1;
    if (row < 2) return json_({ ok: false, error: 'not_found' });
    const col = n => HEADERS.Participation.indexOf(n) + 1;
    const task = sh.getRange(row, col('task')).getValues()[0][0];
    const def = tasks_().filter(t => t.task === task)[0];
    let points = 0;
    if (decision === 'approved') {
      points = body.points === '' || body.points == null ? (def && def.points != null ? def.points : null) : Number(body.points);
      if (points == null) return json_({ ok: false, error: 'points_not_set' });
      if (!(points >= 0 && points <= 1000)) return json_({ ok: false, error: 'bad_points' });
    }
    const before = sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0];
    sh.getRange(row, col('status')).setValue(decision);
    sh.getRange(row, col('points')).setValue(decision === 'approved' ? points : '');
    sh.getRange(row, col('reviewedAt')).setValue(new Date().toISOString());
    sh.getRange(row, col('reviewNote')).setValue(clean_(body.note, 300));
    log_('review', 'participation', body.id, { decision: decision, points: points, before: before });
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

/** Run once from the editor: creates the sheets, the 2027 roster and the task list (points blank). */
function setup() {
  ['Donations', 'Outreach', 'Settings', 'Spotfund', 'Participation', 'Tasks', 'Log'].forEach(sheet_);
  const tk = sheet_('Tasks');
  if (tk.getLastRow() < 2) DEFAULT_TASKS.forEach(t => tk.appendRow([t, '']));
  const sh = sheet_('Settings');
  if (sh.getLastRow() < 2) {
    sh.appendRow(['goal', 2000]);
    sh.appendRow(['leaders', DEFAULT_LEADERS]);
  }
  SpreadsheetApp.flush();
}

/**
 * Saves a full copy of this Sheet in the backups folder, if anything changed
 * since the last copy or the last copy is more than a day old. Pass true to
 * force a copy. Keeps the newest BACKUPS_KEPT copies; older ones go to the
 * Drive trash, where they stay 30 more days.
 */
function backup(force) {
  const props = PropertiesService.getScriptProperties();
  const writes = sheet_('Log').getLastRow();
  const last = props.getProperty('lastBackupAt');
  const stale = !last || Date.now() - new Date(last).getTime() > 24 * 3600 * 1000;
  if (force !== true && !stale && String(writes) === props.getProperty('lastBackupWrites')) return null;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const folders = DriveApp.getFoldersByName(BACKUP_FOLDER);
  const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(BACKUP_FOLDER);
  const stamp = Utilities.formatDate(new Date(), 'America/Chicago', 'yyyy-MM-dd HH:mm');
  const copy = DriveApp.getFileById(ss.getId()).makeCopy(ss.getName() + ' backup ' + stamp, folder);

  const files = [];
  const it = folder.getFiles();
  while (it.hasNext()) files.push(it.next());
  files.sort((x, y) => y.getDateCreated().getTime() - x.getDateCreated().getTime());
  files.slice(BACKUPS_KEPT).forEach(f => f.setTrashed(true));

  props.setProperty('lastBackupAt', new Date().toISOString());
  props.setProperty('lastBackupWrites', String(writes));
  return copy.getId();
}

/** Run once from the editor: checks backups every hour and makes the first copy now. */
function installBackup() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'backup').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('backup').timeBased().everyHours(1).create();
  return backup(true);
}
