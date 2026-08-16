/**
 * ARCHITECT CAMPAIGN — Skilljar lesson puller
 *
 * Same trick as the Lab watcher: your logged-in cookie, Google's servers, Drive.
 * Pulls the full text of every lesson in a course and writes it to one Doc,
 * so I can read it and hand you short bullets instead of hours of scrolling.
 *
 * ADD THIS as a third file in the same Apps Script project (Files → + → Script →
 * name it "Skilljar"). It reuses folder_(), writeDoc_() and stamp_().
 *
 * SETUP
 *  1. Log in to anthropic.skilljar.com in Chrome.
 *  2. F12 → Network → refresh → click the top request → Request Headers →
 *     copy the WHOLE `Cookie` value. (All of it. However many there are.)
 *  3. Project Settings → Script Properties → add:
 *       SKILLJAR_COOKIE = <that whole string>
 *       SKILLJAR_COURSES = one course URL per line, e.g.
 *           https://anthropic.skilljar.com/introduction-to-agent-skills
 *           https://anthropic.skilljar.com/claude-code-in-action
 *  4. Run `skilljarProbe`. Want HTTP 200 and your own name somewhere in the dump.
 *  5. Run `skilljarPull`. Re-run it until the log says ALL DONE — Apps Script
 *     stops each run at ~6 minutes, so it works through a queue and picks up
 *     where it left off.
 *
 * The cookie expires. When the log says 401/302, refresh it the same way.
 */

var SJ_HOST = 'https://anthropic.skilljar.com';
var SJ_PER_RUN = 20;          // fetches per run, keeps us inside the 6-min limit
var SJ_PAUSE_MS = 700;        // be a polite client

function sjProps_() {
  var p = PropertiesService.getScriptProperties();
  var c = p.getProperty('SKILLJAR_COOKIE');
  if (!c) throw new Error('Set SKILLJAR_COOKIE in Script Properties.');
  var courses = (p.getProperty('SKILLJAR_COURSES') || '')
    .split(/[\n,]+/).map(function (s) { return s.trim(); }).filter(String);
  if (!courses.length) throw new Error('Set SKILLJAR_COURSES (one URL per line).');
  return { cookie: c, courses: courses };
}

function sjGet_(url) {
  var res = UrlFetchApp.fetch(url, {
    headers: {
      'Cookie': sjProps_().cookie,
      'User-Agent': 'ArchitectCampaign-PersonalStudyTool (Emily Donovan, own account)'
    },
    muteHttpExceptions: true,
    followRedirects: false
  });
  return { code: res.getResponseCode(), body: res.getContentText() };
}

/** Run this first. Confirms the cookie works. */
function skilljarProbe() {
  var cfg = sjProps_();
  var r = sjGet_(cfg.courses[0]);
  Logger.log('HTTP ' + r.code + '  ' + cfg.courses[0]);
  Logger.log('logged in? ' + (/sign out|log out|my account|dashboard/i.test(r.body) ? 'YES' : 'probably NOT'));
  Logger.log('length: ' + r.body.length + ' chars');
  Logger.log(sjText_(r.body).slice(0, 600));
  return r.code;
}

/** HTML → readable text. Keeps transcript/caption blocks, drops chrome. */
function sjText_(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

/** Pull every lesson-ish link that lives under the same course path. */
function sjLessonLinks_(html, courseUrl) {
  var slug = courseUrl.replace(SJ_HOST, '').replace(/^\/|\/$/g, '');
  var out = {}, m, re = /href\s*=\s*["']([^"'#]+)["']/gi;
  while ((m = re.exec(html)) !== null) {
    var href = m[1];
    if (href.indexOf('//') === 0) continue;
    if (href.indexOf('http') === 0 && href.indexOf(SJ_HOST) !== 0) continue;
    var path = href.replace(SJ_HOST, '');
    if (path.indexOf('/') !== 0) path = '/' + path;
    // lesson pages live under the course slug, or under /path/.../lessons/
    if (path.indexOf('/' + slug) === 0 || /\/lessons?\//i.test(path)) {
      if (/\.(png|jpg|jpeg|svg|css|js|ico|woff2?)$/i.test(path)) continue;
      out[SJ_HOST + path] = true;
    }
  }
  return Object.keys(out);
}

/**
 * Works through a queue of URLs, SJ_PER_RUN at a time, accumulating text in
 * Script Properties so it survives the execution limit. Writes one Doc per
 * course when that course finishes.
 */
function skilljarPull() {
  var p = PropertiesService.getScriptProperties();
  var cfg = sjProps_();
  var state = JSON.parse(p.getProperty('SJ_STATE') || 'null');

  if (!state) {
    state = { courses: cfg.courses.slice(), current: null, queue: [], done: [], text: '' };
  }

  var fetches = 0;
  while (fetches < SJ_PER_RUN) {

    // start the next course
    if (!state.current) {
      if (!state.courses.length) {
        p.deleteProperty('SJ_STATE');
        Logger.log('ALL DONE — ' + state.done.length + ' pages across all courses.');
        return;
      }
      state.current = state.courses.shift();
      var r0 = sjGet_(state.current); fetches++;
      if (r0.code !== 200) {
        Logger.log('HTTP ' + r0.code + ' on ' + state.current + ' — cookie may have expired. Stopping.');
        p.setProperty('SJ_STATE', JSON.stringify(state));
        return;
      }
      state.queue = sjLessonLinks_(r0.body, state.current);
      state.text = '=== ' + state.current + ' ===\n\n' + sjText_(r0.body) + '\n\n';
      Logger.log('course ' + state.current + ' → ' + state.queue.length + ' lesson links');
      Utilities.sleep(SJ_PAUSE_MS);
      continue;
    }

    // finished this course?
    if (!state.queue.length) {
      var name = state.current.split('/').pop() || 'course';
      var url = writeDoc_('skilljar ' + name + ' ' + stamp_(), state.text.slice(0, 900000));
      Logger.log('wrote ' + url);
      state.current = null; state.text = '';
      continue;
    }

    // next lesson
    var next = state.queue.shift();
    if (state.done.indexOf(next) !== -1) continue;
    var r = sjGet_(next); fetches++;
    state.done.push(next);
    if (r.code === 200) {
      state.text += '\n\n--- ' + next + ' ---\n' + sjText_(r.body) + '\n';
    } else {
      state.text += '\n\n--- ' + next + ' (HTTP ' + r.code + ') ---\n';
    }
    Utilities.sleep(SJ_PAUSE_MS);
  }

  p.setProperty('SJ_STATE', JSON.stringify(state));
  Logger.log('paused after ' + fetches + ' fetches. ' + state.queue.length +
             ' left in this course, ' + state.courses.length +
             ' courses queued. RUN skilljarPull AGAIN.');
}

/** If a run goes wrong and you want to start over. */
function skilljarReset() {
  PropertiesService.getScriptProperties().deleteProperty('SJ_STATE');
  Logger.log('state cleared');
}