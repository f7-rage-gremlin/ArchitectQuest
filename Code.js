/**
 * ARCHITECT CAMPAIGN — Habitica bridge · v6 · COMPLETE FILE
 *
 * Replace the ENTIRE contents of Code.gs with this. Select all, delete, paste.
 * Do not merge by hand.
 *
 * ── WHAT THIS CAN DO ──────────────────────────────────────────────────────
 *   Read your tasks, dailies, tags and stats.
 *   Create a todo, tagged "claude", up to 30 per day.
 *   Create the "claude" tag itself, once, if it doesn't exist.
 *
 * ── WHAT IT CANNOT DO ─────────────────────────────────────────────────────
 *   Delete anything. Edit anything. Complete or score anything.
 *   Create an untagged task, or any habit / daily / reward.
 *   Touch your party, guilds or account.
 *
 * ── THE DESIGN ────────────────────────────────────────────────────────────
 *   One door.  call_() is the only function containing UrlFetchApp.fetch,
 *              and its first line is gateCheck_(). Nothing routes around it.
 *   Receipts.  Every run records HTTP codes and byte counts. A report with
 *              no receipt is not a report.
 *   Read-back. After creating tasks it re-reads the list and confirms they
 *              are really there. A 200 is a claim; presence is a fact.
 *   Finally.   The audit is written even when the run explodes partway.
 *
 * ── SETUP ─────────────────────────────────────────────────────────────────
 *   Script Properties:
 *     HABITICA_USER     your User ID       (Habitica → Settings → Site Data → API)
 *     HABITICA_TOKEN    your API Token     (same page — never paste these in chat)
 *     HABITICA_DRY_RUN  false              (ONLY the literal word "false" enables writes.
 *                                          Missing, blank or anything else = dry run.)
 *
 * ── ORDER OF PLAY ─────────────────────────────────────────────────────────
 *   1. verifyGate     expect 8 of 8 refused. Makes no network calls at all.
 *   2. pullProgress   read-only. Check the receipt at the foot of the new doc.
 *   3. pushQuests     dry run — says what it would do, does nothing.
 *   4. Set HABITICA_DRY_RUN = false, then run setup to arm the triggers.
 */

var FOLDER   = 'Architect Campaign';
var API      = 'https://habitica.com/api/v3';
var TAG_NAME = 'claude';
var MAX_CREATES_PER_DAY = 30;


/* ══════════════════════════════════════════════════════════════════════════
   THE GATE
   Pure logic. No network access. Cannot reach Habitica even in principle.
   ══════════════════════════════════════════════════════════════════════════ */

var ALLOWED = [
  { method: 'get',  pattern: /^\/tasks\/user(\?.*)?$/ },
  { method: 'get',  pattern: /^\/user(\?.*)?$/ },
  { method: 'get',  pattern: /^\/tags$/ },
  { method: 'post', pattern: /^\/tags$/ },
  { method: 'post', pattern: /^\/tasks\/user$/ }
];

var FORBIDDEN_METHODS = ['delete', 'put', 'patch'];

function gateCheck_(method, path, body) {
  var m = String(method).toLowerCase();

  if (FORBIDDEN_METHODS.indexOf(m) !== -1) {
    throw new Error('GATE: ' + m.toUpperCase() + ' is never permitted.');
  }
  if (/\/score\//.test(path) || /\/tasks\/[^\/]+\/(score|move|unlink)/.test(path)) {
    throw new Error('GATE: scoring and completing tasks is yours alone.');
  }
  var ok = ALLOWED.some(function (r) { return r.method === m && r.pattern.test(path); });
  if (!ok) {
    throw new Error('GATE: ' + m.toUpperCase() + ' ' + path + ' is not on the allowlist.');
  }
  if (m === 'post' && /^\/tasks\/user$/.test(path)) {
    if (!body || !body.tags || !body.tags.length) {
      throw new Error('GATE: refusing to create an untagged task.');
    }
    if (body.type !== 'todo') {
      throw new Error('GATE: only todos may be created, not ' + body.type + '.');
    }
  }
  return true;
}

/**
 * FAIL-SAFE DEFAULT.
 * Absent, blank, misspelled, or any value other than the literal word "false"
 * means DRY RUN IS ON. Only an explicit "false" turns it off.
 *
 * v4 had this backwards: a missing property evaluated to dry-run OFF, so
 * forgetting to set the flag silently produced a live run. A safety switch
 * that defaults to unsafe is not a safety switch.
 */
function dryRun_() {
  var v = PropertiesService.getScriptProperties().getProperty('HABITICA_DRY_RUN');
  if (v === null || v === undefined || String(v).trim() === '') return true;
  return String(v).trim().toLowerCase() !== 'false';
}

/** Say out loud which mode we are in, every run, before anything happens. */
function announceMode_(fn) {
  Logger.log(dryRun_()
    ? '=== ' + fn + ' — DRY RUN. Nothing will be written to Habitica. ==='
    : '=== ' + fn + ' — LIVE. Writes are enabled. ===');
}


/* ══════════════════════════════════════════════════════════════════════════
   PROVENANCE
   ══════════════════════════════════════════════════════════════════════════ */

var RECEIPTS = [];

function receiptBlock_() {
  var L = ['', '--- RECEIPT ---'];
  L.push('run at ' + Utilities.formatDate(new Date(), 'Europe/London', 'yyyy-MM-dd HH:mm:ss') + ' Europe/London');
  if (!RECEIPTS.length) {
    L.push('NO NETWORK CALLS WERE MADE — this document contains no live data.');
    L.push('Do not trust any figure above it.');
    L.push('--- END RECEIPT ---');
    return L.join('\n');
  }
  RECEIPTS.forEach(function (r) {
    L.push('  HTTP ' + r.code + '  ' + r.method.toUpperCase() + ' ' + r.path + '  (' + r.bytes + ' bytes)');
  });
  L.push('calls: ' + RECEIPTS.length + ' · all 200: ' +
         (RECEIPTS.every(function (r) { return r.code === 200; }) ? 'YES' : 'NO'));
  L.push('--- END RECEIPT ---');
  return L.join('\n');
}


/* ══════════════════════════════════════════════════════════════════════════
   TRANSPORT — the only door
   ══════════════════════════════════════════════════════════════════════════ */

function creds_() {
  var p = PropertiesService.getScriptProperties();
  var u = p.getProperty('HABITICA_USER');
  var k = p.getProperty('HABITICA_TOKEN');
  if (!u || !k) throw new Error('Set HABITICA_USER and HABITICA_TOKEN in Script Properties.');
  return {
    'x-api-user': u,
    'x-api-key': k,
    'x-client': u + '-ArchitectCampaign',
    'Content-Type': 'application/json'
  };
}

function call_(method, path, body) {
  gateCheck_(method, path, body);

  if (dryRun_() && String(method).toLowerCase() !== 'get') {
    Logger.log('DRY RUN — would ' + method.toUpperCase() + ' ' + path);
    return { id: null, text: (body && body.text) || '', _dryRun: true };
  }

  var opts = { method: method, headers: creds_(), muteHttpExceptions: true };
  if (body) opts.payload = JSON.stringify(body);

  var res  = UrlFetchApp.fetch(API + path, opts);
  var code = res.getResponseCode();
  var txt  = res.getContentText();

  RECEIPTS.push({ method: method, path: path, code: code, bytes: txt.length });

  if (code < 200 || code >= 300) throw new Error(method + ' ' + path + ' → ' + code + ' ' + txt);
  return JSON.parse(txt).data;
}


/* ══════════════════════════════════════════════════════════════════════════
   TAG
   ══════════════════════════════════════════════════════════════════════════ */

function claudeTagId_() {
  var p = PropertiesService.getScriptProperties();
  var cached = p.getProperty('CLAUDE_TAG_ID');
  if (cached) return cached;

  var tags = call_('get', '/tags') || [];
  for (var i = 0; i < tags.length; i++) {
    if (String(tags[i].name).toLowerCase() === TAG_NAME) {
      p.setProperty('CLAUDE_TAG_ID', tags[i].id);
      return tags[i].id;
    }
  }
  var made = call_('post', '/tags', { name: TAG_NAME });
  if (made && made.id) {
    p.setProperty('CLAUDE_TAG_ID', made.id);
    return made.id;
  }
  if (dryRun_()) throw new Error('No "' + TAG_NAME + '" tag exists yet, and dry run will not create one. ' +
                                 'Either create a tag called "claude" in Habitica by hand, or turn dry run off once.');
  throw new Error('Could not find or create the "' + TAG_NAME + '" tag.');
}

function isClaudeTask_(t, tagId) {
  return (t.tags || []).indexOf(tagId) !== -1;
}


/* ══════════════════════════════════════════════════════════════════════════
   DAILY BUDGET
   ══════════════════════════════════════════════════════════════════════════ */

function creationBudget_() {
  var p = PropertiesService.getScriptProperties();
  var today = stamp_();
  var raw = JSON.parse(p.getProperty('CREATE_COUNT') || '{}');
  if (raw.date !== today) raw = { date: today, n: 0 };
  return {
    left:  function () { return MAX_CREATES_PER_DAY - raw.n; },
    spend: function () { raw.n++; p.setProperty('CREATE_COUNT', JSON.stringify(raw)); }
  };
}


/* ══════════════════════════════════════════════════════════════════════════
   DRIVE
   ══════════════════════════════════════════════════════════════════════════ */

function folder_() {
  var it = DriveApp.getFoldersByName(FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER);
}

function writeDoc_(name, text) {
  var f = folder_();
  var doc = DocumentApp.create(name);
  doc.getBody().setText(text);
  doc.saveAndClose();
  var file = DriveApp.getFileById(doc.getId());
  f.addFile(file);
  DriveApp.getRootFolder().removeFile(file);
  return file.getUrl();
}

function readLatest_(prefix) {
  var files = folder_().getFiles(), best = null, bestTime = 0;
  while (files.hasNext()) {
    var f = files.next();
    if (f.getName().indexOf(prefix) !== 0) continue;
    var t = f.getDateCreated().getTime();
    if (t > bestTime) { bestTime = t; best = f; }
  }
  return best ? DocumentApp.openById(best.getId()).getBody().getText() : null;
}

function stamp_() {
  return Utilities.formatDate(new Date(), 'Europe/London', 'yyyy-MM-dd');
}

function clock_() {
  return Utilities.formatDate(new Date(), 'Europe/London', 'HH:mm:ss');
}

function fileStamp_() {
  return Utilities.formatDate(new Date(), 'Europe/London', 'HHmm');
}


/* ══════════════════════════════════════════════════════════════════════════
   READ — pullProgress
   A failed fetch never produces a progress document. It produces a loud one.
   ══════════════════════════════════════════════════════════════════════════ */

function pullProgress() {
  announceMode_("pullProgress");
  RECEIPTS = [];
  try {
    var tagId   = claudeTagId_();
    var todos   = call_('get', '/tasks/user?type=todos') || [];
    var dailies = call_('get', '/tasks/user?type=dailys') || [];
    var done    = call_('get', '/tasks/user?type=completedTodos') || [];
    var user    = call_('get', '/user?userFields=stats');

    var L = ['HABITICA PROGRESS — ' + stamp_() + ' ' + clock_(), ''];
    L.push('Level ' + user.stats.lvl + ' · ' + Math.round(user.stats.exp) + ' exp · ' +
           Math.round(user.stats.hp) + ' hp');

    L.push('', 'CAMPAIGN — COMPLETED:');
    var anyDone = false;
    done.forEach(function (t) {
      if (!isClaudeTask_(t, tagId)) return;
      anyDone = true;
      L.push('  ✓ ' + t.text + '  [' + (t.dateCompleted || '').slice(0, 10) + ']');
    });
    if (!anyDone) L.push('  (none)');

    L.push('', 'CAMPAIGN — OPEN:');
    var anyOpen = false;
    todos.forEach(function (t) {
      if (!isClaudeTask_(t, tagId)) return;
      anyOpen = true;
      L.push('  ○ ' + t.text + (t.date ? '  due ' + t.date.slice(0, 10) : ''));
    });
    if (!anyOpen) L.push('  (none)');

    L.push('', 'YOUR OTHER TODOS:');
    var anyOther = false;
    todos.forEach(function (t) {
      if (isClaudeTask_(t, tagId)) return;
      anyOther = true;
      L.push('  ○ ' + t.text + (t.date ? '  due ' + t.date.slice(0, 10) : ''));
    });
    if (!anyOther) L.push('  (none)');

    L.push('', 'DAILIES:');
    dailies.forEach(function (t) {
      L.push('  ' + (t.completed ? '✓' : '○') + ' ' + t.text + '  streak ' + (t.streak || 0));
    });

    L.push(receiptBlock_());
    var url = writeDoc_('progress ' + stamp_() + ' ' + fileStamp_(), L.join('\n'));
    Logger.log('wrote ' + url);
    return url;

  } catch (e) {
    var F = ['HABITICA FETCH FAILED — ' + stamp_() + ' ' + clock_(), '',
             'NO DATA WAS RETRIEVED.',
             'Any Habitica figures quoted from this run are invented. Do not trust them.',
             '', 'error: ' + e.message,
             receiptBlock_()];
    var furl = writeDoc_('FAILED progress ' + stamp_() + ' ' + fileStamp_(), F.join('\n'));
    Logger.log('FAILED — wrote ' + furl);
    throw e;
  }
}


/* ══════════════════════════════════════════════════════════════════════════
   WRITE — pushQuests
   The audit is written in `finally`, so it survives any failure.
   Created tasks are verified by re-reading the list, not by trusting the 200.
   ══════════════════════════════════════════════════════════════════════════ */

function pushQuests() {
  announceMode_("pushQuests");
  RECEIPTS = [];
  var dry  = dryRun_();
  var text = readLatest_('quests');
  if (!text) { Logger.log('no quests doc — nothing attempted'); return 0; }

  var tagId, budget, existing = {};
  var sent = [], skipped = [], notAttempted = [], failures = [];
  var fatal = null, verifyError = null;
  var confirmed = [], missing = [];
  var consecutiveFailures = 0;

  try {
    tagId  = claudeTagId_();
    budget = creationBudget_();
    (call_('get', '/tasks/user?type=todos') || []).forEach(function (t) { existing[t.text] = true; });

    // Habitica accepts ONLY these four values. 0.5 is rejected with a 400.
    //   0.1 trivial · 1 easy · 1.5 medium · 2 hard
    var PRIORITY = { MAIN: 2, BOSS: 2, SIDE: 1, SECRET: 0.1 };
    var lines = text.split('\n');

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line || line.charAt(0) === '#') continue;

      var parts = line.split('|').map(function (s) { return s.trim(); });
      if (parts.length < 2) continue;

      var kind = parts[0].toUpperCase();
      if (!PRIORITY.hasOwnProperty(kind)) continue;

      var title = '[' + kind + '] ' + parts[1];

      if (existing[title])      { skipped.push(title + '  (already present)');    continue; }
      if (budget.left() <= 0)   { skipped.push(title + '  (daily budget reached)'); continue; }
      if (fatal)                { notAttempted.push(title);                        continue; }

      try {
        var res = call_('post', '/tasks/user', {
          text: title,
          type: 'todo',
          tags: [tagId],
          notes: parts[2] ? '+' + parts[2] + ' XP' : '',
          priority: PRIORITY[kind]
        });
        budget.spend();
        sent.push({ title: title, id: (res && res.id) || null });
        consecutiveFailures = 0;
      } catch (e) {
        // One bad item should not cost you the rest of the list. Record it and
        // carry on. Three failures in a row means something systemic (auth,
        // rate limit, outage) — then, and only then, stop.
        failures.push({ title: title, error: e.message });
        consecutiveFailures++;
        if (consecutiveFailures >= 3) {
          fatal = 'stopped after 3 consecutive failures — last: ' + e.message;
        }
      }
    }

    // Read-back: ask Habitica a second time whether these actually exist.
    if (!dry && sent.length) {
      try {
        var now = {};
        (call_('get', '/tasks/user?type=todos') || []).forEach(function (t) { now[t.text] = t.id; });
        sent.forEach(function (s) {
          if (now[s.title]) confirmed.push(s.title); else missing.push(s.title);
        });
      } catch (e) {
        verifyError = e.message;
      }
    }

  } catch (e) {
    fatal = fatal || e.message;

  } finally {
    var L = [];
    L.push('HABITICA PUSH — ' + stamp_() + ' ' + clock_());
    L.push('');

    if (dry) {
      L.push('*** DRY RUN — NOTHING WAS SENT TO HABITICA. ***');
      L.push('Every line below describes what WOULD have happened.');
      L.push('');
    }

    var status =
      fatal           ? 'STOPPED — SYSTEMIC FAILURE' :
      dry             ? 'DRY RUN' :
      missing.length  ? 'UNVERIFIED' :
      failures.length ? 'PARTIAL — ' + confirmed.length + ' ok, ' + failures.length + ' rejected' :
      sent.length     ? 'VERIFIED' :
                        'NOTHING TO DO';
    L.push('STATUS: ' + status);
    L.push('');

    if (dry) {
      L.push('WOULD SEND (' + sent.length + '):');
      if (!sent.length) L.push('  (none)');
      sent.forEach(function (s) { L.push('  · ' + s.title); });

    } else {
      L.push('CONFIRMED PRESENT IN HABITICA (' + confirmed.length + '):');
      if (!confirmed.length) L.push('  (none)');
      confirmed.forEach(function (t) { L.push('  ✓ ' + t); });

      if (missing.length) {
        L.push('');
        L.push('!! SENT BUT NOT FOUND ON READ-BACK (' + missing.length + '):');
        L.push('   Habitica accepted these but they are not in the todo list.');
        L.push('   DO NOT report these as created.');
        missing.forEach(function (t) { L.push('  ? ' + t); });
      }

      if (verifyError) {
        L.push('');
        L.push('!! READ-BACK FAILED: ' + verifyError);
        L.push('   The ' + sent.length + ' item(s) sent this run are UNVERIFIED.');
        L.push('   Treat their state as unknown until the next pullProgress.');
      }
    }

    if (failures.length) {
      L.push('');
      L.push('!! REJECTED BY HABITICA (' + failures.length + '):');
      L.push('   These were sent and refused. They do NOT exist.');
      failures.forEach(function (f) {
        L.push('  × ' + f.title);
        L.push('      ' + f.error);
      });
    }

    if (skipped.length) {
      L.push('');
      L.push('SKIPPED (' + skipped.length + '):');
      skipped.forEach(function (t) { L.push('  – ' + t); });
    }

    if (fatal) {
      L.push('');
      L.push('!! STOPPED EARLY — looks systemic, not item-specific');
      L.push('   ' + fatal);
      L.push('   NEVER ATTEMPTED (' + notAttempted.length + '):');
      if (!notAttempted.length) L.push('     (none)');
      notAttempted.forEach(function (t) { L.push('  · ' + t); });
    }

    L.push('');
    L.push('Re-running is safe — anything already present is skipped.');

    L.push(receiptBlock_());

    writeDoc_((fatal ? 'FAILED push ' : 'push ') + stamp_() + ' ' + fileStamp_(), L.join('\n'));

    Logger.log(status +
      ' — sent ' + sent.length +
      ', confirmed ' + confirmed.length + ', rejected ' + failures.length +
      ', skipped ' + skipped.length +
      (fatal ? ', FAILED: ' + fatal : ''));
  }

  return confirmed.length;
}


/* ══════════════════════════════════════════════════════════════════════════
   PROOF — verifyGate
   Calls gateCheck_ only. There is no UrlFetchApp anywhere in this path.
   ══════════════════════════════════════════════════════════════════════════ */

function verifyGate() {
  var attempts = [
    ['delete', '/tasks/abc123',          null,                                      'delete a task'],
    ['put',    '/tasks/abc123',          { text: 'x' },                             'replace a task'],
    ['patch',  '/tasks/abc123',          { text: 'x' },                             'partially edit a task'],
    ['post',   '/tasks/abc123/score/up', null,                                      'complete a task'],
    ['post',   '/tasks/user',            { text: 'x', type: 'todo' },               'create without the claude tag'],
    ['post',   '/tasks/user',            { text: 'x', type: 'habit', tags: ['t'] }, 'create a non-todo'],
    ['post',   '/user/reset',            null,                                      'reset the account'],
    ['get',    '/groups/party/chat',     null,                                      'read party chat']
  ];

  var pass = 0;
  attempts.forEach(function (a) {
    try {
      gateCheck_(a[0], a[1], a[2]);
      Logger.log('✗ FAILED — gate allowed: ' + a[3]);
    } catch (e) {
      pass++;
      Logger.log('✓ blocked (' + a[3] + '): ' + e.message);
    }
  });

  Logger.log(pass === attempts.length
    ? '✓✓ GATE HOLDS — ' + pass + '/' + attempts.length + ' refused. No network calls were made.'
    : '✗✗ GATE LEAKS — only ' + pass + '/' + attempts.length + ' refused. Leave DRY RUN on and investigate.');
  return pass;
}


/* ══════════════════════════════════════════════════════════════════════════
   SCHEDULE
   ══════════════════════════════════════════════════════════════════════════ */

function nightly() { pullProgress(); }
function morning() { pushQuests(); pullProgress(); }

function setup() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var h = t.getHandlerFunction();
    if (h === 'nightly' || h === 'morning') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('nightly').timeBased().atHour(21).everyDays(1)
           .inTimezone('Europe/London').create();
  ScriptApp.newTrigger('morning').timeBased().atHour(6).everyDays(1)
           .inTimezone('Europe/London').create();
  Logger.log('triggers set — 21:00 nightly, 06:30 morning, Europe/London');
  verifyGate();
}