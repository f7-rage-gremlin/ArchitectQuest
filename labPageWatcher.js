/**
 * ARCHITECT CAMPAIGN — Lab page watcher
 *
 * Fetches a page you have access to, turns it into text, and drops it in Drive
 * whenever it changes. I read it from Drive. No browser, no manual step.
 *
 * ADD THIS AS A SECOND FILE in the same Apps Script project as the Habitica
 * bridge (+ button next to Files → Script → name it "Lab"), so it shares the
 * same folder helpers. Then:
 *
 *  1. Project Settings → Script Properties → add:
 *       LAB_URL     = https://lab.syntheticsignal.io/home
 *       LAB_COOKIE  = (leave out for now — only needed if step 2 says 401/403)
 *  2. Run `labProbe` once and read the log.
 *       200            → you're done, run `labSetup`
 *       401 / 403 / 302 → it needs a session cookie, see GETTING THE COOKIE below
 *  3. Run `labSetup`. It then checks daily at 07:15 and only writes when the
 *     page actually changed.
 *
 * GETTING THE COOKIE (only if you need it):
 *   In Chrome on the logged-in Lab page: F12 → Application → Cookies →
 *   the site → copy the session cookie as `name=value`. Paste that whole
 *   string as LAB_COOKIE. It will expire eventually; when the log starts
 *   saying 401 again, refresh it. That's the one manual step and it's rare.
 */

var LAB_PREFIX = 'lab page ';

function labProps_() {
  var p = PropertiesService.getScriptProperties();
  var url = p.getProperty('LAB_URL');
  if (!url) throw new Error('Set LAB_URL in Script Properties.');
  return { url: url, cookie: p.getProperty('LAB_COOKIE') || '' };
}

function labFetch_() {
  var cfg = labProps_();
  var headers = {
    // Identify honestly rather than pretending to be a browser.
    'User-Agent': 'ArchitectCampaign-PersonalWatcher (Emily Donovan, own account)'
  };
  if (cfg.cookie) headers['Cookie'] = cfg.cookie;

  var res = UrlFetchApp.fetch(cfg.url, {
    headers: headers,
    muteHttpExceptions: true,
    followRedirects: false
  });
  return { code: res.getResponseCode(), body: res.getContentText() };
}

/** Run this first. Tells you whether a cookie is needed. */
function labProbe() {
  var r = labFetch_();
  Logger.log('HTTP ' + r.code);
  Logger.log('first 400 chars:\n' + r.body.slice(0, 400));
  if (r.code === 200) Logger.log('OK — no cookie needed. Run labSetup.');
  else Logger.log('Needs LAB_COOKIE. See the notes at the top of this file.');
  return r.code;
}

/** Crude but effective HTML → text. Good enough to diff and to read. */
function toText_(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

/**
 * Fetch, compare against the last snapshot, write only if changed.
 * Uses folder_(), writeDoc_(), readLatest_() and stamp_() from the Habitica file.
 */
function labCheck() {
  var r = labFetch_();
  if (r.code !== 200) {
    Logger.log('HTTP ' + r.code + ' — snapshot skipped. Cookie may have expired.');
    return null;
  }

  var text = toText_(r.body);
  var prev = readLatest_(LAB_PREFIX);

  // Strip the leading header line before comparing, so the date stamp alone
  // never counts as a change.
  var prevBody = prev ? prev.split('\n').slice(2).join('\n').trim() : '';
  if (prevBody === text) {
    Logger.log('no change');
    return null;
  }

  var header = 'LAB PAGE SNAPSHOT — ' + stamp_() + '\n' + labProps_().url + '\n\n';
  var url = writeDoc_(LAB_PREFIX + stamp_(), header + text);
  Logger.log(prev ? 'CHANGED — wrote ' + url : 'first snapshot — wrote ' + url);
  return url;
}

function labSetup() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'labCheck') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('labCheck').timeBased().atHour(7).nearMinute(15)
           .everyDays(1).inTimezone('Europe/London').create();
  Logger.log('lab watcher set — daily 07:15 Europe/London');
  labCheck();
}