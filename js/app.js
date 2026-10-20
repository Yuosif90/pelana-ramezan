/* پلانا هەیڤا رەمەزانێ - main app */
(function () {
  'use strict';
  var t = I18N.t, P = Prayer, C = CONTENT;
  var cfg = window.RM_CONFIG || {};
  var sb = null;
  var root = document.getElementById('root');
  var PR5 = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  var PR6 = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  var PKEY = { fajr: 'tFajr', sunrise: 'ttSunrise', dhuhr: 'tDhuhr', asr: 'tAsr', maghrib: 'tMaghrib', isha: 'tIsha' };
  var TOTAL_AYAHS = 6236;

  var S = {
    user: null, profile: null, days: {}, bookmarks: [], chapters: null, cache: {},
    view: 'today', qtab: 'surahs', search: '', reader: null, sel: null, showTr: true, qsize: 28,
    ttMonth: 'ramadan', ttYear: null, dhikr: 0, tasMode: 33, tasCount: 0, nameIdx: 0,
    dirtyProfile: false, dirtyDays: {}, offline: false, sound: true, authMode: 'login', authErr: '', authBusy: false,
    curPrayer: 'fajr', sheet: null
  };
  try { S.sound = localStorage.getItem('rm_sound') !== '0'; } catch (e) {}
  try { var sl = localStorage.getItem('rm_lang'); if (sl) I18N.setLang(sl); else I18N.setLang('ku-ba'); } catch (e) { I18N.setLang('ku-ba'); }

  /* ---------- small helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(sel, el) { return (el || document).querySelector(sel); }
  function lang() { return I18N.getLang(); }
  function isKu() { return lang().indexOf('ku') === 0; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function loc() { return lang() === 'en' ? 'en' : lang() === 'ar' ? 'ar' : 'ckb'; }

  var ICON = {
    today: '<path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/><circle cx="12" cy="12" r="4"/>',
    quran: '<path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M9 7h6M9 11h6"/>',
    duas: '<path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z"/>',
    table: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    worship: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
    stats: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    check: '<path d="M4 12l5 5L20 6" fill="none" stroke-width="3.5"/>'
  };
  function icon(n) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[n] + '</svg>'; }
  var MOON = '<svg class="moon" viewBox="0 0 120 120" aria-hidden="true"><defs><mask id="mk"><rect width="120" height="120" fill="#fff"/><circle cx="76" cy="48" r="36" fill="#000"/></mask></defs><circle cx="54" cy="62" r="42" fill="#e0ac4a" mask="url(#mk)"/><path d="M98 22l3.5 11.5L113 37l-11.5 3.5L98 52l-3.5-11.5L83 37l11.5-3.5z" fill="#f3d98f"/></svg>';
  var LANTERN = '<svg class="lantern" width="34" height="74" viewBox="0 0 34 74" aria-hidden="true"><path d="M17 0v14" stroke="#e0ac4a" stroke-width="2"/><path d="M9 14h16l3 6H6z" fill="#e0ac4a"/><path d="M6 20h22l-3 34H9z" fill="#15234b" stroke="#e0ac4a" stroke-width="2"/><ellipse cx="17" cy="37" rx="4.5" ry="9" fill="#f3d98f"><animate attributeName="opacity" values="1;.5;1" dur="2.2s" repeatCount="indefinite"/></ellipse><path d="M9 54h16l-2 8H11z" fill="#e0ac4a"/><circle cx="17" cy="66" r="3" fill="#f3d98f"/></svg>';

  /* ---------- stars ---------- */
  (function () {
    var box = document.getElementById('stars'); var h = '';
    for (var i = 0; i < 46; i++) h += '<i class="star" style="left:' + (Math.random() * 100).toFixed(1) + '%;top:' + (Math.random() * 100).toFixed(1) + '%;animation-delay:-' + (Math.random() * 4).toFixed(1) + 's;animation-duration:' + (3 + Math.random() * 4).toFixed(1) + 's"></i>';
    box.innerHTML = h;
  })();

  /* ---------- audio, toasts, notifications ---------- */
  var actx = null;
  function unlockAudio() {
    try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) {}
  }
  document.addEventListener('pointerdown', unlockAudio, { passive: true });
  function chime(kind) {
    if (!S.sound || !actx) return;
    try {
      var notes = kind === 'bad' ? [440, 330] : kind === 'ok' ? [523, 659, 784] : [660, 880];
      notes.forEach(function (f, i) {
        var o = actx.createOscillator(), g = actx.createGain(), st = actx.currentTime + i * 0.18;
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.18, st + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, st + 0.9);
        o.connect(g); g.connect(actx.destination); o.start(st); o.stop(st + 1);
      });
    } catch (e) {}
  }
  function toast(type, msg, silent) {
    var box = document.getElementById('toasts');
    var el = document.createElement('div'); el.className = 'toast ' + type;
    el.innerHTML = '<span>' + esc(msg) + '</span><button class="x" aria-label="' + esc(t('close')) + '">×</button>';
    box.appendChild(el);
    function kill() { if (el.parentNode) el.parentNode.removeChild(el); }
    el.querySelector('.x').onclick = kill;
    setTimeout(kill, type === 'bad' || type === 'warn' ? 14000 : 8000);
    if (!silent) chime(type);
  }
  function notify(type, msg) {
    toast(type, msg);
    try { if ('Notification' in window && Notification.permission === 'granted' && document.hidden) new Notification(t('appName'), { body: msg }); } catch (e) {}
  }
  function confetti() {
    var cols = ['#e0ac4a', '#f3d98f', '#3fc79a', '#6b8cff', '#ef5a5a', '#8a6be0'];
    for (var i = 0; i < 44; i++) {
      var c = document.createElement('i'); c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw'; c.style.background = cols[i % cols.length];
      c.style.animationDuration = (2 + Math.random() * 2.2) + 's'; c.style.animationDelay = (Math.random() * 0.6) + 's';
      document.body.appendChild(c); (function (n) { setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 5200); })(c);
    }
  }

  /* ---------- date and plan helpers ---------- */
  function city() { return P.CITIES[(S.profile && S.profile.city)] || P.CITIES.duhok; }
  function nowLocal() { return P.localToday(city().tz); }
  function todayIso() { var n = nowLocal(); return P.iso(n.y, n.m, n.d); }
  function parseIso(s) { var a = String(s).split('-'); return { y: +a[0], m: +a[1] - 1, d: +a[2] }; }
  function isoMs(s) { var p = parseIso(s); return Date.UTC(p.y, p.m, p.d); }
  function ramadanInfo() {
    var n = nowLocal(), diff = Math.round((isoMs(S.profile.ramadan_start) - Date.UTC(n.y, n.m, n.d)) / 86400000);
    var status = diff > 0 ? 'before' : diff > -30 ? 'during' : 'after';
    return { diff: diff, status: status, dayNo: clamp(1 - diff, 1, 30) };
  }
  function plan() {
    var k = S.profile.khatma_count;
    var perDay = Math.ceil(TOTAL_AYAHS * k / 30);
    return { perDay: perDay, perPrayer: Math.ceil(perDay / 5) };
  }
  function dayRow(iso) { return S.days[iso] || { day: iso, tasks: {}, points: 0, ayahs_read: 0, tasbih: 0 }; }
  function readBefore(iso) { var s = 0; for (var k in S.days) if (k < iso) s += S.days[k].ayahs_read; return s; }
  function quranState() {
    var iso = todayIso(), ri = ramadanInfo(), pl = plan(), row = dayRow(iso);
    var carry = Math.max(0, pl.perDay * (ri.dayNo - 1) - readBefore(iso));
    var target = pl.perDay + carry, remaining = Math.max(0, target - row.ayahs_read);
    return { perDay: pl.perDay, perPrayer: pl.perPrayer, carry: carry, target: target, read: row.ayahs_read, remaining: remaining, done: remaining === 0 };
  }
  function calcPoints(row) {
    var pl = plan(), sum = 0;
    C.TASKS.forEach(function (k) {
      if (k.id === 'quran') sum += Math.round(k.p * Math.min(1, row.ayahs_read / pl.perDay));
      else if (k.id === 'tasbih') sum += Math.round(k.p * Math.min(1, row.tasbih / 100));
      else if (row.tasks && row.tasks[k.id]) sum += k.p;
    });
    return clamp(sum, 0, 100);
  }
  function curPrayerName() {
    var n = nowLocal(), tm = P.dayTimes(n.y, n.m, n.d, city()), m = n.min, cur = 'isha';
    PR6.forEach(function (p) { if (tm[p] <= m) cur = p; });
    return cur;
  }
  function setCurColor() { S.curPrayer = curPrayerName(); document.body.style.setProperty('--cur', 'var(--c-' + S.curPrayer + ')'); }
  function streakInfo() {
    var iso = todayIso(), best = 0, run = 0, keys = Object.keys(S.days).sort();
    var prev = null;
    keys.forEach(function (k) {
      if (S.days[k].points >= 100) { run = (prev && isoMs(k) - isoMs(prev) === 86400000) ? run + 1 : 1; prev = k; if (run > best) best = run; } else { run = 0; prev = null; }
    });
    var cur = 0, ms = isoMs(iso);
    if (!(S.days[iso] && S.days[iso].points >= 100)) ms -= 86400000;
    while (true) {
      var p = new Date(ms), key = P.iso(p.getUTCFullYear(), p.getUTCMonth(), p.getUTCDate());
      if (S.days[key] && S.days[key].points >= 100) { cur++; ms -= 86400000; } else break;
    }
    return { cur: cur, best: Math.max(best, cur) };
  }

  /* ---------- persistence ---------- */
  function cacheKey() { return 'rm_cache_' + (S.user ? S.user.id : 'x'); }
  function saveCache() {
    try { localStorage.setItem(cacheKey(), JSON.stringify({ profile: S.profile, days: S.days, bookmarks: S.bookmarks, dp: S.dirtyProfile, dd: S.dirtyDays })); } catch (e) {}
  }
  function loadCache() {
    try { var c = JSON.parse(localStorage.getItem(cacheKey()) || 'null'); if (c) { S.profile = c.profile; S.days = c.days || {}; S.bookmarks = c.bookmarks || []; S.dirtyProfile = !!c.dp; S.dirtyDays = c.dd || {}; return true; } } catch (e) {}
    return false;
  }
  var flushTimer = null;
  function scheduleFlush() { clearTimeout(flushTimer); flushTimer = setTimeout(flush, 900); }
  var flushing = false;
  function flush() {
    if (!sb || !S.user || flushing) return Promise.resolve();
    flushing = true;
    var job = Promise.resolve();
    if (S.dirtyProfile) {
      var p = S.profile;
      job = job.then(function () {
        return sb.from('rm_profiles').upsert({ user_id: S.user.id, display_name: p.display_name, lang: p.lang, city: p.city, ramadan_start: p.ramadan_start, khatma_count: p.khatma_count, khatma_mode: p.khatma_mode, quran_pos: p.quran_pos, onboarded: p.onboarded, updated_at: new Date().toISOString() });
      }).then(function (r) { if (r.error) throw r.error; S.dirtyProfile = false; });
    }
    Object.keys(S.dirtyDays).forEach(function (iso) {
      job = job.then(function () {
        var r = S.days[iso];
        return sb.from('rm_days').upsert({ user_id: S.user.id, day: iso, tasks: r.tasks, points: r.points, ayahs_read: r.ayahs_read, tasbih: r.tasbih, updated_at: new Date().toISOString() }, { onConflict: 'user_id,day' });
      }).then(function (r) { if (r.error) throw r.error; delete S.dirtyDays[iso]; });
    });
    return job.then(function () { if (S.offline) { S.offline = false; } saveCache(); }).catch(function () {
      if (!S.offline) { S.offline = true; toast('warn', t('offline'), true); }
    }).then(function () { flushing = false; });
  }
  setInterval(function () { if (S.dirtyProfile || Object.keys(S.dirtyDays).length) flush(); }, 20000);
  window.addEventListener('visibilitychange', function () { if (document.hidden) flush(); });

  function touchProfile() { S.dirtyProfile = true; saveCache(); scheduleFlush(); }
  function mutateDay(iso, fn) {
    var row = S.days[iso] || (S.days[iso] = { day: iso, tasks: {}, points: 0, ayahs_read: 0, tasbih: 0 });
    var before = row.points; fn(row); row.points = calcPoints(row);
    S.dirtyDays[iso] = true; saveCache(); scheduleFlush();
    if (before < 100 && row.points >= 100) { confetti(); toast('ok', t('m4')); }
    return row;
  }

  /* ---------- data loading ---------- */
  function getJson(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); }); }
  function loadChapters() { return S.chapters ? Promise.resolve(S.chapters) : getJson('data/chapters.json').then(function (d) { S.chapters = d; return d; }); }
  function trKey() { return lang() === 'en' ? 'en' : isKu() ? 'ku' : null; }
  function loadSurah(n) {
    var keys = ['ar'].concat(trKey() ? [trKey()] : []);
    return Promise.all(keys.map(function (k) {
      var ck = k + n; if (S.cache[ck]) return S.cache[ck];
      return (S.cache[ck] = getJson('data/' + k + '/' + n + '.json'));
    })).then(function (res) { return { ar: res[0], tr: res[1] || null }; });
  }

  /* ---------- boot / auth ---------- */
  function boot() {
    try { if (window.supabase && cfg.SUPABASE_URL) sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY); } catch (e) { sb = null; }
    if (!sb) { renderAuth(); return; }
    root.innerHTML = '<div class="screen"><div class="muted">' + esc(t('loading')) + '</div></div>';
    sb.auth.getSession().then(function (r) {
      if (r.data && r.data.session) return startSession(r.data.session.user);
      renderAuth();
    }).catch(function () { renderAuth(); });
    sb.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_OUT') { S.user = null; S.profile = null; renderAuth(); } });
  }
  function startSession(user) {
    S.user = user; loadCache();
    return loadChapters().then(function () {
      return sb.from('rm_profiles').select('*').eq('user_id', user.id).maybeSingle();
    }).then(function (r) {
      if (r.error) throw r.error;
      if (r.data) { if (!S.dirtyProfile) S.profile = r.data; }
      else if (!S.profile) {
        S.profile = { display_name: (user.user_metadata && user.user_metadata.name) || '', lang: lang(), city: 'duhok', ramadan_start: '2027-02-08', khatma_count: 1, khatma_mode: 'daily', quran_pos: 0, onboarded: false };
        S.dirtyProfile = true;
      }
      return sb.from('rm_days').select('*').eq('user_id', user.id);
    }).then(function (r) {
      if (r.error) throw r.error;
      var map = {}; (r.data || []).forEach(function (d) { map[d.day] = { day: d.day, tasks: d.tasks || {}, points: d.points, ayahs_read: d.ayahs_read, tasbih: d.tasbih }; });
      Object.keys(S.dirtyDays).forEach(function (k) { if (S.days[k]) map[k] = S.days[k]; });
      S.days = map;
      return sb.from('rm_bookmarks').select('*').eq('user_id', user.id).order('created_at');
    }).then(function (r) { if (!r.error) S.bookmarks = r.data || []; }).catch(function () {
      if (!S.profile) { S.offline = true; return; }
      S.offline = true; toast('warn', t('offline'), true);
    }).then(function () {
      if (!S.profile) { renderAuth(); return; }
      I18N.setLang(S.profile.lang || lang()); try { localStorage.setItem('rm_lang', lang()); } catch (e) {}
      saveCache(); flush();
      if (!S.profile.onboarded) renderOnboard(); else renderApp();
    });
  }

  function langChips(cur, act) {
    return '<div class="langs">' + I18N.LANGS.map(function (l) { return '<button class="chip' + (l[0] === cur ? ' on' : '') + '" data-act="' + act + '" data-v="' + l[0] + '">' + esc(l[1]) + '</button>'; }).join('') + '</div>';
  }
  function renderAuth() {
    var signup = S.authMode === 'signup';
    root.innerHTML = '<div class="screen"><form class="card auth-card" id="authForm" novalidate>' +
      '<div class="logo">' + MOON + '<h1>' + esc(t('appName')) + '</h1><p class="muted">' + esc(t('tagline')) + '</p></div>' +
      langChips(lang(), 'authlang') +
      (signup ? '<div class="field"><label for="aname">' + esc(t('name')) + '</label><input id="aname" autocomplete="name"></div>' : '') +
      '<div class="field"><label for="aemail">' + esc(t('email')) + '</label><input id="aemail" type="email" autocomplete="email" inputmode="email"></div>' +
      '<div class="field"><label for="apass">' + esc(t('password')) + '</label><input id="apass" type="password" autocomplete="' + (signup ? 'new-password' : 'current-password') + '"></div>' +
      '<div class="err" id="aerr">' + esc(S.authErr) + '</div>' +
      '<button class="btn" type="submit">' + esc(signup ? t('signup') : t('login')) + '</button>' +
      '<button class="link" type="button" data-act="authmode">' + esc(signup ? t('haveAccount') : t('noAccount')) + '</button></form></div>';
    document.getElementById('authForm').addEventListener('submit', function (e) { e.preventDefault(); doAuth(); });
  }
  function doAuth() {
    if (S.authBusy) return;
    var email = $('#aemail').value.trim(), pass = $('#apass').value, nm = $('#aname') ? $('#aname').value.trim() : '';
    if (!sb) { S.authErr = t('offline'); renderAuth(); return; }
    if (S.authMode === 'signup' && pass.length < 6) { $('#aerr').textContent = t('pwShort'); return; }
    S.authBusy = true; $('#aerr').textContent = t('loading');
    var job = S.authMode === 'signup'
      ? sb.auth.signUp({ email: email, password: pass, options: { data: { name: nm } } })
      : sb.auth.signInWithPassword({ email: email, password: pass });
    job.then(function (r) {
      S.authBusy = false;
      if (r.error) { S.authErr = r.error.message && /confirm/i.test(r.error.message) ? t('checkMail') : t('authErr'); renderAuth(); return; }
      if (r.data && r.data.session) { S.authErr = ''; S.profile = null; S.days = {}; return startSession(r.data.session.user).then(function () { if (S.profile && nm && !S.profile.display_name) { S.profile.display_name = nm; touchProfile(); } }); }
      S.authErr = t('checkMail'); S.authMode = 'login'; renderAuth();
    }).catch(function () { S.authBusy = false; S.authErr = t('offline'); renderAuth(); });
  }

  /* ---------- onboarding ---------- */
  var ob = { k: 1, mode: 'daily', city: 'duhok', start: '2027-02-08' };
  function renderOnboard() {
    var p = S.profile; ob.k = p.khatma_count; ob.mode = p.khatma_mode; ob.city = p.city; ob.start = p.ramadan_start;
    drawOnboard();
  }
  function obPlanText() { var perDay = Math.ceil(TOTAL_AYAHS * ob.k / 30); return t('planLine', { n: perDay, p: Math.ceil(perDay / 5) }); }
  function drawOnboard() {
    root.innerHTML = '<div class="screen"><div class="card auth-card">' +
      '<div class="logo">' + MOON + '<h1>' + esc(t('welcome')) + (S.profile.display_name ? '، ' + esc(S.profile.display_name) : '') + '</h1><p class="muted">' + esc(t('setup')) + '</p></div>' +
      langChips(lang(), 'oblang') +
      '<div class="field"><label>' + esc(t('khatmaQ')) + '</label><div class="stepper"><button data-act="obk" data-v="-1" aria-label="-">−</button><b>' + ob.k + '</b><button data-act="obk" data-v="1" aria-label="+">+</button></div><p class="muted" id="obplan" style="text-align:center">' + esc(obPlanText()) + '</p></div>' +
      '<div class="field"><label>' + esc(t('modeQ')) + '</label><div class="opts"><button class="opt' + (ob.mode === 'daily' ? ' on' : '') + '" data-act="obmode" data-v="daily">' + esc(t('modeDaily')) + '</button><button class="opt' + (ob.mode === 'prayer' ? ' on' : '') + '" data-act="obmode" data-v="prayer">' + esc(t('modePrayer')) + '</button></div></div>' +
      '<div class="field"><label for="obcity">' + esc(t('city')) + '</label><select id="obcity">' + cityOptions(ob.city) + '</select></div>' +
      '<div class="field"><label for="obstart">' + esc(t('startDate')) + '</label><input id="obstart" type="date" value="' + esc(ob.start) + '"><p class="muted" style="font-size:.8125rem">' + esc(t('startNote')) + '</p></div>' +
      '<button class="btn" data-act="obdone">' + esc(t('start')) + '</button></div></div>';
  }
  function cityOptions(sel) {
    return Object.keys(P.CITIES).map(function (k) { return '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + esc(P.CITIES[k].n[lang()]) + '</option>'; }).join('');
  }

  /* ---------- app shell ---------- */
  var NAV = [['today', 'nToday'], ['quran', 'nQuran'], ['duas', 'nDuas'], ['table', 'nTable'], ['worship', 'nWorship'], ['stats', 'nStats']];
  function renderApp() {
    setCurColor(); setTimeout(checkEvents, 1500);
    root.innerHTML = '<div id="app"><div class="topbar"><h1>' + esc(t('appName')) + '</h1><button class="iconbtn" data-act="settings" aria-label="' + esc(t('settings')) + '">' + icon('gear') + '</button></div>' +
      '<main id="view"></main><div id="abar"></div></div>' +
      '<nav class="bottomnav"><div class="in">' + NAV.map(function (n) { return '<button class="nb" data-act="tab" data-v="' + n[0] + '" id="nb-' + n[0] + '">' + icon(n[0]) + '<span>' + esc(t(n[1])) + '</span></button>'; }).join('') + '</div></nav>';
    renderView();
  }
  function renderView() {
    var v = $('#view'); if (!v) return;
    NAV.forEach(function (n) { var b = $('#nb-' + n[0]); if (b) b.classList.toggle('on', n[0] === S.view); });
    var fn = { today: viewToday, quran: viewQuran, duas: viewDuas, table: viewTable, worship: viewWorship, stats: viewStats }[S.view];
    v.innerHTML = '<div class="view">' + fn() + '</div>';
    updateBadges(); afterRender();
  }
  function updateBadges() {
    var q = $('#nb-quran'); if (!q || !S.profile) return;
    var old = q.querySelector('.dot'); if (old) old.remove();
    var qs = quranState(), ri = ramadanInfo();
    if (ri.status === 'during' && qs.carry > 0 && !qs.done) q.insertAdjacentHTML('beforeend', '<i class="dot"></i>');
  }

  /* ---------- Today ---------- */
  function taskRow(k) {
    var row = dayRow(todayIso()), done = !!(row.tasks && row.tasks[k.id]), auto = k.auto, pl = plan(), extra = '', pc = '';
    if (auto) {
      var frac = k.id === 'quran' ? Math.min(1, row.ayahs_read / pl.perDay) : Math.min(1, row.tasbih / 100);
      done = frac >= 1;
      extra = '<div class="bar mini"><i style="width:' + Math.round(frac * 100) + '%"></i></div>';
    }
    if (k.prayer) pc = '<span class="pc" style="--pc:var(--c-' + k.prayer + ')"></span>';
    return '<button class="task' + (done ? ' done' : '') + (auto ? ' auto' : '') + '" ' + (auto ? 'data-act="goauto" data-v="' + k.id + '"' : 'data-act="task" data-v="' + k.id + '"') + '>' +
      '<span class="box"><svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">' + ICON.check + '</svg></span>' +
      '<span class="tt">' + pc + esc(t(k.k)) + extra + '</span><span class="pp">' + k.p + ' ' + esc(t('pts')) + '</span></button>';
  }
  function groupHtml(g) {
    return '<div class="card"><h3 class="gold" style="margin-bottom:8px">' + esc(t(C.GROUPS[g])) + '</h3><div class="tasks">' + C.TASKS.filter(function (k) { return k.g === g; }).map(taskRow).join('') + '</div></div>';
  }
  function ring(points) {
    var r = 48, c = 2 * Math.PI * r, off = c * (1 - points / 100);
    return '<svg class="ring" viewBox="0 0 112 112" role="img" aria-label="' + points + '/100"><circle class="bg" cx="56" cy="56" r="' + r + '" fill="none" stroke-width="9"/><circle class="fg" cx="56" cy="56" r="' + r + '" fill="none" stroke-width="9" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 56 56)" id="ringfg"/><text x="56" y="62" text-anchor="middle" id="ringtxt">' + points + '</text><text class="small" x="56" y="80" text-anchor="middle" style="font-size:11px;fill:var(--muted);font-weight:400">/ 100</text></svg>';
  }
  function motivation(p) { return t(p >= 100 ? 'm4' : p >= 70 ? 'm3' : p >= 40 ? 'm2' : p >= 1 ? 'm1' : 'm0'); }
  function strip() {
    var n = nowLocal(), tm = P.dayTimes(n.y, n.m, n.d, city());
    return '<div class="strip">' + PR6.map(function (p) { return '<div class="pt' + (p === S.curPrayer ? ' cur' : '') + '" style="--pc:var(--c-' + p + ')">' + esc(t(PKEY[p])) + '<b>' + P.hm(tm[p]) + '</b></div>'; }).join('') + '</div>';
  }
  function quranGoalCard(withBtn) {
    var q = quranState(), ri = ramadanInfo(), pct = q.target ? Math.min(100, Math.round(q.read / q.target * 100)) : 0;
    var status = q.done ? '<span class="badge ok">' + esc(t('qGoalDone')) + '</span>' : (q.carry > 0 && ri.status === 'during') ? '<span class="badge bad">' + esc(t('qBehind', { n: q.remaining })) + '</span>' : '<span class="badge ok">' + esc(t('qOnTrack')) + '</span>';
    var prayerLine = S.profile.khatma_mode === 'prayer' ? '<p class="muted">' + esc(t('qPerPrayer', { n: q.perPrayer })) + '</p>' : '';
    var catchUp = (q.carry > 0 && !q.done && ri.status === 'during') ? '<p class="muted">' + esc(t('qCatchUp')) + '</p>' : '';
    return '<div class="card" style="display:grid;gap:10px"><div class="row between"><h3 class="gold">' + esc(t('qTarget')) + '</h3>' + status + '</div>' +
      '<div class="row between"><span><b class="num" style="font-size:1.5rem">' + q.read + '</b> / <span class="num">' + q.target + '</span> ' + esc(t('qAyahs')) + '</span></div><div class="bar"><i style="width:' + pct + '%"></i></div>' + prayerLine + catchUp +
      (withBtn ? '<button class="btn" data-act="continue">' + esc(t('qContinue')) + '</button>' : '') + '</div>';
  }
  function viewToday() {
    var ri = ramadanInfo(), row = dayRow(todayIso()), name = S.profile.display_name;
    var dayLine = ri.status === 'before' ? t('daysUntil', { d: ri.diff }) : ri.status === 'during' ? t('dayOf', { d: ri.dayNo }) : t('ramadanOver');
    return '<div class="card hero"><div class="lanterns">' + LANTERN + LANTERN + '</div>' +
      '<div class="hero-top">' + MOON + '<div><h2>' + esc(t('hello')) + (name ? '، ' + esc(name) : '') + '</h2><p class="muted">' + esc(dayLine) + ' · ' + esc(city().n[lang()]) + '</p></div></div>' +
      '<div class="next-box"><div><div class="muted" style="font-size:.8125rem">' + esc(t('nextPrayer')) + '</div><div class="big" id="nextName"></div></div><div class="big cd" id="nextCd">--:--:--</div></div>' +
      '<div class="muted" id="fastLine" style="text-align:center"></div>' + strip() + '</div>' +
      '<div class="card ring-wrap">' + ring(row.points) + '<div style="display:grid;gap:4px"><h3 class="gold">' + esc(t('score')) + '</h3><p class="msg">' + esc(motivation(row.points)) + '</p></div></div>' +
      quranGoalCard(false) + groupHtml('prayers') + groupHtml('quran') + groupHtml('sunnah');
  }

  /* ---------- Quran ---------- */
  function viewQuran() {
    if (!S.chapters) { loadChapters().then(renderView); return '<p class="muted" style="text-align:center;padding:30px">' + esc(t('loading')) + '</p>'; }
    if (S.reader) return readerHtml();
    var ch = S.chapters.chapters, q = S.search.trim().toLowerCase(), pos = S.profile.quran_pos >= TOTAL_AYAHS ? 0 : S.profile.quran_pos, curCh = chapterOf(pos);
    var list = '';
    if (S.qtab === 'surahs') {
      list = '<input id="qsearch" type="search" placeholder="' + esc(t('qSearch')) + '" value="' + esc(S.search) + '">' + '<div class="surahs">' + ch.filter(function (c) {
        return !q || String(c.n) === q || c.tr.toLowerCase().indexOf(q) >= 0 || c.en.toLowerCase().indexOf(q) >= 0 || c.ar.indexOf(q) >= 0;
      }).map(function (c) {
        return '<button class="surah' + (c.n === curCh.n ? ' cur' : '') + '" data-act="surah" data-v="' + c.n + '"><span class="no"><span>' + c.n + '</span></span><span class="nm"><b>' + esc(c.tr) + '</b><br><span class="muted" style="font-size:.8125rem">' + esc(c.en) + ' · ' + c.v + '</span></span><span class="ar">' + esc(c.ar) + '</span></button>';
      }).join('') + '</div>';
    } else {
      list = S.bookmarks.length ? '<div class="surahs">' + S.bookmarks.map(function (b) {
        var c = ch[b.surah - 1];
        return '<div class="surah"><button class="bkin" data-act="gobk" data-v="' + b.surah + ':' + b.ayah + '"><span class="no"><span>' + b.surah + '</span></span><span class="nm"><b>' + esc(c.tr) + '</b> <span class="muted">' + esc(t('ayah')) + ' ' + b.ayah + '</span></span><span class="ar">' + esc(c.ar) + '</span></button><button class="iconbtn" data-act="delbk" data-v="' + b.id + '" aria-label="x">×</button></div>';
      }).join('') + '</div>' : '<p class="muted" style="text-align:center;padding:20px">' + esc(t('stNoData')) + '</p>';
    }
    var done = Math.floor(S.profile.khatma_count ? Object.keys(S.days).reduce(function (a, k) { return a + S.days[k].ayahs_read; }, 0) / TOTAL_AYAHS : 0);
    return quranGoalCard(true) +
      '<div class="card"><div class="row between"><span class="muted">' + esc(t('qKhatmaProg')) + '</span><b class="num">' + Math.round(pos / TOTAL_AYAHS * 100) + '%</b></div><div class="bar" style="margin-top:6px"><i style="width:' + (pos / TOTAL_AYAHS * 100) + '%"></i></div>' + (done > 0 ? '<p class="gold" style="margin-top:6px">' + esc(t('qKhatmaDone')) + ' × ' + done + '</p>' : '') + '</div>' +
      '<div class="seg"><button class="' + (S.qtab === 'surahs' ? 'on' : '') + '" data-act="qtab" data-v="surahs">' + esc(t('qSurahs')) + '</button><button class="' + (S.qtab === 'bk' ? 'on' : '') + '" data-act="qtab" data-v="bk">' + esc(t('qBookmarks')) + ' (' + S.bookmarks.length + ')</button></div>' + list;
  }
  function chapterOf(g) {
    var ch = S.chapters.chapters; for (var i = ch.length - 1; i >= 0; i--) if (g >= ch[i].off) return ch[i]; return ch[0];
  }
  function readerHtml() {
    var r = S.reader, c = S.chapters.chapters[r.n - 1], pos = S.profile.quran_pos, tk = trKey();
    var html = '<div class="reader-bar"><button class="btn ghost small" data-act="rback">' + esc(t('qBack')) + '</button><b style="font-family:var(--f-display)" class="gold">' + esc(c.ar) + '</b>' +
      '<div class="row">' + (tk ? '<button class="chip' + (S.showTr ? ' on' : '') + '" data-act="toggletr">' + esc(t('qTranslation')) + '</button>' : '') + '<input id="qsz" type="range" min="22" max="44" value="' + S.qsize + '" style="width:80px" aria-label="' + esc(t('qFontSize')) + '"></div></div>';
    if (!r.data) return html + '<p class="muted" style="text-align:center;padding:30px">' + esc(t('loading')) + '</p>';
    if (c.n !== 1 && c.n !== 9) html += '<div class="bism">' + esc(S.chapters.bismillah) + '</div>';
    html += '<div id="ayahs" style="--qsize:' + S.qsize + 'px">';
    r.data.ar.forEach(function (txt, i) {
      var g = c.off + i, bk = S.bookmarks.some(function (b) { return b.surah === c.n && b.ayah === i + 1; });
      html += '<div class="ayah' + (g < pos ? ' read' : '') + '" id="a' + i + '" data-i="' + i + '"><div class="txt">' + esc(txt) + '<span class="n">' + (i + 1) + '</span>' + (bk ? '<span class="bk">★</span>' : '') + '</div>' +
        (tk && S.showTr && r.data.tr ? '<div class="tr" dir="' + (tk === 'ku' ? 'rtl' : 'ltr') + '">' + esc(r.data.tr[i]) + '</div>' : '') + '</div>';
    });
    html += '</div>';
    if (c.n < 114) html += '<button class="btn ghost" data-act="nextsurah">' + esc(t('qNextSurah')) + '</button>';
    return html;
  }
  function openSurah(n, ayahIdx) {
    S.reader = { n: n, data: null, scrollTo: ayahIdx }; S.sel = null; S.view = 'quran'; renderView(); window.scrollTo(0, 0);
    loadSurah(n).then(function (d) { if (S.reader && S.reader.n === n) { S.reader.data = d; renderView(); } }).catch(function () { toast('warn', t('offline')); });
  }
  function showActionBar() {
    var b = $('#abar'); if (!b) return;
    if (S.sel == null || !S.reader) { b.innerHTML = ''; return; }
    var c = S.chapters.chapters[S.reader.n - 1], has = S.bookmarks.some(function (x) { return x.surah === c.n && x.ayah === S.sel + 1; });
    b.innerHTML = '<div class="actionbar"><div class="in"><button class="btn" data-act="markread">' + esc(t('qMarkRead')) + '</button><button class="btn ghost" data-act="bookmark">' + (has ? '★ ' : '☆ ') + esc(t('qBookmark')) + '</button></div></div>';
  }
  function markRead() {
    var c = S.chapters.chapters[S.reader.n - 1], newPos = c.off + S.sel + 1, pos = S.profile.quran_pos;
    if (newPos > pos) {
      var delta = newPos - pos;
      mutateDay(todayIso(), function (r) { r.ayahs_read += delta; });
      S.profile.quran_pos = newPos;
      if (newPos >= TOTAL_AYAHS) { S.profile.quran_pos = 0; confetti(); toast('ok', t('qKhatmaDone')); }
    } else S.profile.quran_pos = newPos;
    touchProfile(); S.sel = null;
    var q = quranState(); if (q.done) toast('ok', t('qGoalDone'), true);
    document.querySelectorAll('.ayah').forEach(function (el) { var g = c.off + (+el.getAttribute('data-i')); el.classList.toggle('read', g < S.profile.quran_pos); el.classList.remove('sel'); });
    showActionBar(); updateBadges();
  }
  function toggleBookmark() {
    var c = S.chapters.chapters[S.reader.n - 1], ay = S.sel + 1, ex = S.bookmarks.filter(function (x) { return x.surah === c.n && x.ayah === ay; })[0];
    if (ex) { S.bookmarks = S.bookmarks.filter(function (x) { return x !== ex; }); if (sb && ex.id) sb.from('rm_bookmarks').delete().eq('id', ex.id).then(function () {}); saveCache(); }
    else {
      var nb = { surah: c.n, ayah: ay, id: null }; S.bookmarks.push(nb); saveCache();
      if (sb) sb.from('rm_bookmarks').insert({ user_id: S.user.id, surah: c.n, ayah: ay }).select().then(function (r) { if (r.data && r.data[0]) { nb.id = r.data[0].id; saveCache(); } else if (r.error) toast('warn', t('offline'), true); });
    }
    S.sel = null; renderView();
  }

  /* ---------- Duas ---------- */
  function viewDuas() {
    var l = lang();
    return '<div class="sec-title">' + esc(t('dTitle')) + '</div><div class="grid2">' + C.DUAS.map(function (d, i) {
      var m = l === 'ar' ? '' : d.m[l === 'ku-so' ? 'ku-so' : l === 'en' ? 'en' : 'ku-ba'];
      return '<article class="card dua" style="display:grid;gap:8px"><h3>' + esc(d.title[l]) + '</h3><p class="ar" id="dua' + i + '">' + esc(d.ar) + '</p>' + (m ? '<p class="muted">' + esc(m) + '</p>' : '') + '<button class="btn ghost small" style="justify-self:start" data-act="copy" data-v="' + i + '">' + esc(t('dCopy')) + '</button></article>';
    }).join('') + '</div>';
  }

  /* ---------- Timetable ---------- */
  function viewTable() {
    var n = nowLocal(), c = city(), pr = S.profile, year = S.ttYear || n.y, rows = '', start, count, isR = S.ttMonth === 'ramadan';
    if (isR) { var p = parseIso(pr.ramadan_start); start = Date.UTC(p.y, p.m, p.d); count = 30; }
    else { var mi = +S.ttMonth; start = Date.UTC(year, mi, 1); count = new Date(Date.UTC(year, mi + 1, 0)).getUTCDate(); }
    var todayMs = Date.UTC(n.y, n.m, n.d), fmt = new Intl.DateTimeFormat(loc(), { weekday: 'short', timeZone: 'UTC' });
    for (var i = 0; i < count; i++) {
      var d = new Date(start + i * 86400000), tm = P.dayTimes(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), c), isT = d.getTime() === todayMs;
      rows += '<tr' + (isT ? ' class="today" id="todayrow"' : '') + '><td>' + (isR ? (i + 1) + ' · ' : '') + d.getUTCDate() + '/' + (d.getUTCMonth() + 1) + '<span class="wd">' + esc(fmt.format(d)) + '</span></td>' +
        PR6.map(function (p) { return '<td class="t' + (isT && p === S.curPrayer ? ' curcol' : '') + '">' + P.hm(tm[p]) + '</td>'; }).join('') + '</tr>';
    }
    var mnames = []; var mf = new Intl.DateTimeFormat(loc(), { month: 'long', timeZone: 'UTC' });
    for (var m = 0; m < 12; m++) mnames.push(mf.format(new Date(Date.UTC(2027, m, 1))));
    var opts = '<option value="ramadan"' + (isR ? ' selected' : '') + '>' + esc(t('ttRamadan')) + '</option>' + mnames.map(function (nm, m) { return '<option value="' + m + '"' + (!isR && +S.ttMonth === m ? ' selected' : '') + '>' + esc(nm) + '</option>'; }).join('');
    return '<div class="sec-title">' + esc(t('ttTitle')) + '<span class="muted" style="font-size:1rem">' + esc(c.n[lang()]) + '</span></div>' + '<div class="card hero" style="padding:14px">' + strip() + '</div>' +
      '<div class="row"><label class="muted" for="ttm">' + esc(t('ttMonth')) + '</label><select id="ttm" style="flex:1;min-width:140px">' + opts + '</select>' + (isR ? '' : '<select id="tty" style="width:100px">' + [year - 1, year, year + 1].map(function (y) { return '<option' + (y === year ? ' selected' : '') + '>' + y + '</option>'; }).join('') + '</select>') + '</div>' +
      '<div class="table-scroll"><table><thead><tr><th>' + esc(t('ttDate')) + '</th>' + PR6.map(function (p) { return '<th class="p" style="--pc:var(--c-' + p + ')">' + esc(t(PKEY[p])) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div><p class="muted" style="font-size:.8125rem">' + esc(t('ttNote')) + '</p>';
  }

  /* ---------- Worship ---------- */
  function viewWorship() {
    var tgt = S.tasMode, cyc = S.tasCount % tgt, rounds = Math.floor(S.tasCount / tgt), row = dayRow(todayIso()), dh = C.DHIKR[S.dhikr];
    var chips = '<div class="slider" id="dhslider">' + C.DHIKR.map(function (d, i) { return '<button class="chip dh' + (i === S.dhikr ? ' on' : '') + '" data-act="dhikr" data-v="' + i + '">' + esc(d.ar) + '</button>'; }).join('') + '</div>';
    var nm = C.NAMES;
    var names = '<div class="slider" id="nameslider">' + nm.map(function (x, i) {
      return '<div class="slide"><div class="name-card"><span class="muted num">' + (i + 1) + ' / 99</span><div class="ar">' + esc(x[0]) + '</div><div class="en">' + esc(x[1]) + '</div>' + (isKu() ? '<div class="ku">' + esc(x[2]) + '</div>' : '') + '</div></div>';
    }).join('') + '</div>';
    return '<div class="sec-title">' + esc(t('wTasbih')) + '</div><div class="card" style="display:grid;gap:10px">' +
      '<div class="seg">' + [33, 100, 1000].map(function (m) { return '<button class="' + (S.tasMode === m ? 'on' : '') + '" data-act="tasmode" data-v="' + m + '">' + m + '</button>'; }).join('') + '</div>' + chips +
      '<div class="tas-zone" id="taszone"><div class="tas-ar" id="tasar">' + esc(dh.ar) + '</div><div class="tas-count" id="tascount">' + cyc + '</div><div class="muted"><span class="num" id="tastgt">/ ' + tgt + '</span> · ' + esc(t('wRounds')) + ': <b class="num" id="tasrounds">' + rounds + '</b></div><div class="muted" style="font-size:.8125rem">' + esc(t('wTap')) + '</div></div>' +
      '<div class="row between"><span class="muted">' + esc(t('wToday')) + ': <b class="num gold" id="tasday">' + row.tasbih + '</b></span><button class="btn ghost small" data-act="tasreset">' + esc(t('wReset')) + '</button></div></div>' +
      '<div class="sec-title">' + esc(t('wNames')) + '</div>' + names +
      '<div class="navrow"><button class="btn ghost small" data-act="namenav" data-v="1">' + esc(t('wPrev')) + '</button><span class="muted num" id="nameidx">' + (S.nameIdx + 1) + ' / 99</span><button class="btn ghost small" data-act="namenav" data-v="-1">' + esc(t('wNext')) + '</button></div>' +
      groupHtml('taat') + groupHtml('qiyam');
  }
  function tasbihTap(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    S.tasCount++;
    var z = $('#taszone');
    if (z && ev && ev.clientX != null) {
      var r = z.getBoundingClientRect(), rp = document.createElement('i'); rp.className = 'ripple';
      rp.style.left = (ev.clientX - r.left - 7) + 'px'; rp.style.top = (ev.clientY - r.top - 7) + 'px'; z.appendChild(rp); setTimeout(function () { rp.remove(); }, 700);
    }
    var tgt = S.tasMode, cyc = S.tasCount % tgt;
    $('#tascount').textContent = cyc; $('#tasrounds').textContent = Math.floor(S.tasCount / tgt);
    if (cyc === 0) { chime('prayer'); try { navigator.vibrate && navigator.vibrate([40, 30, 40]); } catch (e) {} } else { try { navigator.vibrate && navigator.vibrate(8); } catch (e) {} }
    var row = mutateDay(todayIso(), function (r) { r.tasbih++; });
    var td = $('#tasday'); if (td) td.textContent = row.tasbih;
  }

  /* ---------- Stats ---------- */
  function chartSvg() {
    var p = parseIso(S.profile.ramadan_start), start = Date.UTC(p.y, p.m, p.d), W = 640, H = 230, L = 30, B = 26, T = 10, bw = (W - L - 6) / 30, today = isoMs(todayIso());
    var pts = [], s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(t('stChart')) + '">';
    [0, 25, 50, 75, 100].forEach(function (v) { var y = T + (H - T - B) * (1 - v / 100); s += '<line class="grid" x1="' + L + '" x2="' + W + '" y1="' + y + '" y2="' + y + '"/><text x="' + (L - 4) + '" y="' + (y + 3) + '" text-anchor="end">' + v + '</text>'; });
    var vals = [];
    for (var i = 0; i < 30; i++) {
      var ms = start + i * 86400000, d = new Date(ms), iso = P.iso(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), row = S.days[iso], v = row ? row.points : 0, future = ms > today;
      vals.push(future ? null : v);
      var h = (H - T - B) * v / 100, x = L + i * bw + 2, y = H - B - h, col = v >= 100 ? '#3fc79a' : v >= 70 ? '#e0ac4a' : v >= 40 ? '#f0a23c' : '#6b8cff';
      s += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (bw - 4).toFixed(1) + '" height="' + Math.max(h, future ? 0 : 2).toFixed(1) + '" rx="3" fill="' + col + '"' + (ms === today ? ' stroke="#f3d98f" stroke-width="2"' : '') + (future ? ' opacity=".25"' : '') + '/>';
      if (i === 0 || (i + 1) % 5 === 0) s += '<text x="' + (x + (bw - 4) / 2).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + (i + 1) + '</text>';
    }
    for (var j = 0; j < 30; j++) {
      if (vals[j] == null) continue; var a = 0, c = 0;
      for (var k = Math.max(0, j - 6); k <= j; k++) if (vals[k] != null) { a += vals[k]; c++; }
      pts.push((L + j * bw + 2 + (bw - 4) / 2).toFixed(1) + ',' + (T + (H - T - B) * (1 - a / c / 100)).toFixed(1));
    }
    if (pts.length > 1) s += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#f3d98f" stroke-width="2.2" stroke-dasharray="5 4" stroke-linejoin="round"/>';
    return s + '</svg>';
  }
  function viewStats() {
    var st = streakInfo(), keys = Object.keys(S.days), row = dayRow(todayIso()), sum = 0, ays = 0, tas = 0;
    keys.forEach(function (k) { sum += S.days[k].points; ays += S.days[k].ayahs_read; tas += S.days[k].tasbih; });
    var avg = keys.length ? Math.round(sum / keys.length) : 0;
    var FLAME = '<svg class="flame" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 4c4 10 16 16 16 32a16 16 0 0 1-32 0c0-8 4-12 8-16 0 6 3 8 6 8 0-10-2-16 2-24z" fill="#f0a23c"/><path d="M32 28c3 6 9 8 9 17a9 9 0 0 1-18 0c0-5 3-8 5-10 0 3 2 5 4 5 0-5-1-8 0-12z" fill="#f3d98f"/></svg>';
    return '<div class="sec-title">' + esc(t('stTitle')) + '</div>' +
      '<div class="card streak">' + FLAME + '<div style="flex:1;min-width:0"><div class="muted">' + esc(t('stStreak')) + '</div><div class="row" style="gap:8px;align-items:baseline"><span class="n">' + st.cur + '</span><span class="muted">' + esc(t('stDays')) + '</span></div><p class="muted" style="font-size:.8125rem">' + esc(t('stStreakRule')) + '</p></div></div>' +
      '<button class="btn" data-act="share">' + esc(t('stShare')) + '</button>' +
      '<div class="card"><p class="msg">' + esc(motivation(row.points)) + '</p></div>' +
      '<div class="tiles"><div class="tile"><b>' + row.points + '</b><span>' + esc(t('score')) + '</span></div><div class="tile"><b>' + avg + '</b><span>' + esc(t('stAvg')) + '</span></div><div class="tile"><b>' + st.best + '</b><span>' + esc(t('stBest')) + '</span></div><div class="tile"><b>' + ays + '</b><span>' + esc(t('stTotalAyahs')) + '</span></div><div class="tile"><b>' + tas + '</b><span>' + esc(t('stTasbih')) + '</span></div></div>' +
      '<div class="card"><div class="row between" style="margin-bottom:6px"><h3 class="gold">' + esc(t('stChart')) + '</h3><span class="muted" style="font-size:.8125rem">- - ' + esc(t('stWeek')) + '</span></div>' + chartSvg() + '</div>';
  }

  /* ---------- settings sheet ---------- */
  function openSettings() {
    var p = S.profile, h = '<div class="sheet" id="sheet"><div class="in"><div class="row between"><h2 class="gold">' + esc(t('settings')) + '</h2><button class="iconbtn" data-act="closesheet" aria-label="' + esc(t('close')) + '">×</button></div>' +
      '<div class="field"><label>' + esc(t('language')) + '</label>' + langChips(lang(), 'setlang') + '</div>' +
      '<div class="field"><label for="setcity">' + esc(t('city')) + '</label><select id="setcity">' + cityOptions(p.city) + '</select></div>' +
      '<div class="field"><label for="setstart">' + esc(t('startDate')) + '</label><input id="setstart" type="date" value="' + esc(p.ramadan_start) + '"></div>' +
      '<div class="field"><label>' + esc(t('khatmaQ')) + '</label><div class="stepper"><button data-act="setk" data-v="-1">−</button><b id="setkv">' + p.khatma_count + '</b><button data-act="setk" data-v="1">+</button></div></div>' +
      '<div class="field"><label>' + esc(t('modeQ')) + '</label><div class="seg"><button class="' + (p.khatma_mode === 'daily' ? 'on' : '') + '" data-act="setmode" data-v="daily">' + esc(t('modeDaily')) + '</button><button class="' + (p.khatma_mode === 'prayer' ? 'on' : '') + '" data-act="setmode" data-v="prayer">' + esc(t('modePrayer')) + '</button></div></div>' +
      '<div class="row"><button class="btn ghost small" data-act="notifon">' + esc(t('notifOn')) + '</button><button class="chip' + (S.sound ? ' on' : '') + '" data-act="sound">' + esc(t('notifSound')) + '</button></div>' +
      '<button class="btn" data-act="savesettings">' + esc(t('save')) + '</button><button class="btn ghost" data-act="logout">' + esc(t('logout')) + '</button>' +
      '<p class="credits">' + esc(t('credits')) + '</p></div></div>';
    document.body.insertAdjacentHTML('beforeend', h);
  }
  function closeSheet() { var s = $('#sheet'); if (s) s.remove(); }

  /* ---------- live updates ---------- */
  function afterRender() {
    if (S.view === 'quran' && S.reader && S.reader.data && S.reader.scrollTo != null) { var el = $('#a' + S.reader.scrollTo); if (el) { el.scrollIntoView({ block: 'center' }); } S.reader.scrollTo = null; }
    if (S.view === 'worship') { var sl = $('#nameslider'); if (sl) { sl.scrollLeft = sl.clientWidth * S.nameIdx * (document.dir === 'rtl' || document.documentElement.dir === 'rtl' ? -1 : 1); } }
    if (S.view === 'table') { var tr = $('#todayrow'); if (tr) tr.scrollIntoView({ block: 'center' }); }
    showActionBar(); tick();
  }
  function fmtCd(s) { s = Math.max(0, Math.floor(s)); return pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s % 3600 / 60)) + ':' + pad(s % 60); }
  function tick() {
    if (!S.profile) return;
    var c = city(), n = nowLocal(), tm = P.dayTimes(n.y, n.m, n.d, c), nowMs = Date.now(), nxt = null, nm = '';
    for (var i = 0; i < PR5.length; i++) { var at = P.instant(n.y, n.m, n.d, tm[PR5[i]], c.tz); if (at > nowMs) { nxt = at; nm = PR5[i]; break; } }
    if (!nxt) { var tmr = new Date(Date.UTC(n.y, n.m, n.d + 1)), t2 = P.dayTimes(tmr.getUTCFullYear(), tmr.getUTCMonth(), tmr.getUTCDate(), c); nxt = P.instant(tmr.getUTCFullYear(), tmr.getUTCMonth(), tmr.getUTCDate(), t2.fajr, c.tz); nm = 'fajr'; }
    var a = $('#nextName'), b = $('#nextCd'); if (a) a.textContent = t(PKEY[nm]); if (b) b.textContent = fmtCd((nxt - nowMs) / 1000);
    var fl = $('#fastLine');
    if (fl) {
      var fajrAt = P.instant(n.y, n.m, n.d, tm.fajr, c.tz), iftarAt = P.instant(n.y, n.m, n.d, tm.maghrib, c.tz);
      fl.textContent = nowMs < fajrAt ? t('suhoorIn') + ': ' + fmtCd((fajrAt - nowMs) / 1000) : nowMs < iftarAt ? t('iftarIn') + ': ' + fmtCd((iftarAt - nowMs) / 1000) : '';
    }
    var cp = curPrayerName(); if (cp !== S.curPrayer) { setCurColor(); if (S.view === 'today' || S.view === 'table') renderView(); }
  }
  setInterval(tick, 1000);

  function firedSet() { try { return JSON.parse(localStorage.getItem('rm_fired') || '{}'); } catch (e) { return {}; } }
  function saveFired(f) { var today = todayIso(), out = {}; Object.keys(f).forEach(function (k) { if (k.indexOf(today) === 0) out[k] = 1; }); try { localStorage.setItem('rm_fired', JSON.stringify(out)); } catch (e) {} }
  function checkEvents() {
    if (!S.profile || !S.profile.onboarded) return;
    var c = city(), n = nowLocal(), iso = P.iso(n.y, n.m, n.d), tm = P.dayTimes(n.y, n.m, n.d, c), now = n.min + n.sec / 60, fired = firedSet(), ri = ramadanInfo(), q = quranState(), changed = false;
    function fire(key, at, win, type, msg) {
      key = iso + key; if (fired[key]) return;
      if (now >= at) { fired[key] = 1; changed = true; if (now - at <= win) notify(type, msg); }
    }
    if (ri.status !== 'after') fire('suhoor', tm.fajr - 30, 10, 'info', t('notifSuhoor'));
    PR5.forEach(function (p, idx) {
      var name = t(PKEY[p]);
      fire('p' + p, tm[p], 12, 'prayer', p === 'maghrib' && ri.status === 'during' ? t('notifIftar') : t('notifPrayer', { p: name }));
      if (ri.status !== 'during' || q.done) return;
      if (S.profile.khatma_mode === 'prayer') {
        var cum = Math.min(q.perDay, q.perPrayer * (idx + 1)) + q.carry, rem = Math.max(0, cum - q.read);
        if (rem > 0 && now >= tm[p] + 20 && !fired[iso + 'r' + p]) {
          var behind = rem > q.perPrayer;
          fire('r' + p, tm[p] + 20, 60, behind ? 'bad' : 'warn', behind ? t('notifBehind', { n: q.remaining }) : t('notifRead', { p: name, n: rem }));
        }
      }
    });
    if (ri.status === 'during' && !q.done && S.profile.khatma_mode === 'daily') {
      fire('dAsr', tm.asr + 20, 60, 'warn', t('notifRead', { p: t('tAsr'), n: q.remaining }));
      fire('dMg', tm.maghrib - 30, 40, 'bad', t('notifBehind', { n: q.remaining }));
    }
    if (changed) saveFired(fired);
    updateBadges();
  }
  setInterval(checkEvents, 15000);

  /* ---------- events ---------- */
  var SHARE_COUNT = 0;
  root.addEventListener('input', function (e) {
    if (e.target.id === 'qsearch') { S.search = e.target.value; var pos = e.target.selectionStart; renderView(); var el = $('#qsearch'); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (x) {} } }
    if (e.target.id === 'qsz') { S.qsize = +e.target.value; var a = $('#ayahs'); if (a) a.style.setProperty('--qsize', S.qsize + 'px'); }
  });
  root.addEventListener('change', function (e) {
    var id = e.target.id;
    if (id === 'obcity') ob.city = e.target.value;
    if (id === 'obstart') ob.start = e.target.value;
    if (id === 'ttm') { S.ttMonth = e.target.value; renderView(); }
    if (id === 'tty') { S.ttYear = +e.target.value; renderView(); }
  });
  root.addEventListener('pointerdown', function (e) { if (e.target.closest('#taszone')) tasbihTap(e); });
  root.addEventListener('scroll', function (e) {
    if (e.target.id === 'nameslider') {
      var w = e.target.clientWidth, idx = Math.round(Math.abs(e.target.scrollLeft) / w); S.nameIdx = clamp(idx, 0, 98); var l = $('#nameidx'); if (l) l.textContent = (S.nameIdx + 1) + ' / 99';
    }
  }, true);
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el) {
      var ay = e.target.closest('.ayah'); if (ay && S.reader) { var i = +ay.getAttribute('data-i'); S.sel = S.sel === i ? null : i; document.querySelectorAll('.ayah.sel').forEach(function (x) { x.classList.remove('sel'); }); if (S.sel != null) ay.classList.add('sel'); showActionBar(); }
      return;
    }
    var act = el.getAttribute('data-act'), v = el.getAttribute('data-v');
    switch (act) {
      case 'authlang': I18N.setLang(v); try { localStorage.setItem('rm_lang', v); } catch (x) {} renderAuth(); break;
      case 'authmode': S.authMode = S.authMode === 'login' ? 'signup' : 'login'; S.authErr = ''; renderAuth(); break;
      case 'oblang': I18N.setLang(v); S.profile.lang = v; try { localStorage.setItem('rm_lang', v); } catch (x) {} drawOnboard(); break;
      case 'obk': ob.k = clamp(ob.k + (+v), 1, 10); drawOnboard(); break;
      case 'obmode': ob.mode = v; drawOnboard(); break;
      case 'obdone':
        Object.assign(S.profile, { khatma_count: ob.k, khatma_mode: ob.mode, city: ob.city, ramadan_start: ob.start || S.profile.ramadan_start, onboarded: true, lang: lang() });
        touchProfile(); renderApp(); break;
      case 'tab': S.view = v; if (v !== 'quran') { S.reader = null; S.sel = null; } renderView(); window.scrollTo(0, 0); break;
      case 'settings': openSettings(); break;
      case 'closesheet': closeSheet(); break;
      case 'setlang': I18N.setLang(v); S.profile.lang = v; try { localStorage.setItem('rm_lang', v); } catch (x) {} touchProfile(); closeSheet(); S.reader = null; renderApp(); break;
      case 'setk': var kv = clamp(S.profile.khatma_count + (+v), 1, 10); S.profile.khatma_count = kv; $('#setkv').textContent = kv; break;
      case 'setmode': S.profile.khatma_mode = v; el.parentNode.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b === el); }); break;
      case 'sound': S.sound = !S.sound; try { localStorage.setItem('rm_sound', S.sound ? '1' : '0'); } catch (x) {} el.classList.toggle('on', S.sound); unlockAudio(); chime('prayer'); break;
      case 'notifon': unlockAudio(); try { if ('Notification' in window) Notification.requestPermission(); } catch (x) {} chime('prayer'); toast('ok', t('saved')); break;
      case 'savesettings': S.profile.city = $('#setcity').value; S.profile.ramadan_start = $('#setstart').value || S.profile.ramadan_start; touchProfile(); closeSheet(); renderApp(); break;
      case 'logout': flush().then(function () { return sb.auth.signOut(); }).then(function () { closeSheet(); S.user = null; S.profile = null; S.days = {}; renderAuth(); }); break;
      case 'task': mutateDay(todayIso(), function (r) { r.tasks[v] = !r.tasks[v]; }); renderViewKeepScroll(); break;
      case 'goauto': if (v === 'quran') { S.view = 'quran'; renderView(); window.scrollTo(0, 0); } else { S.view = 'worship'; renderView(); window.scrollTo(0, 0); } break;
      case 'continue': var pos = S.profile.quran_pos >= TOTAL_AYAHS ? 0 : S.profile.quran_pos, ch = chapterOf(pos); openSurah(ch.n, Math.min(pos - ch.off, ch.v - 1)); break;
      case 'qtab': S.qtab = v; renderView(); break;
      case 'surah': openSurah(+v, 0); break;
      case 'gobk': var pr = v.split(':'); openSurah(+pr[0], +pr[1] - 1); break;
      case 'delbk': var bk = S.bookmarks.filter(function (b) { return String(b.id) === v; })[0]; S.bookmarks = S.bookmarks.filter(function (b) { return b !== bk; }); if (sb) sb.from('rm_bookmarks').delete().eq('id', +v).then(function () {}); saveCache(); renderView(); break;
      case 'rback': S.reader = null; S.sel = null; renderView(); window.scrollTo(0, 0); break;
      case 'toggletr': S.showTr = !S.showTr; renderView(); break;
      case 'nextsurah': openSurah(S.reader.n + 1, 0); break;
      case 'markread': markRead(); break;
      case 'bookmark': toggleBookmark(); break;
      case 'copy': var txt = $('#dua' + v).textContent; var done = function () { toast('ok', t('dCopied'), true); }; try { navigator.clipboard.writeText(txt).then(done, function () {}); } catch (x) {} break;
      case 'tasmode': S.tasMode = +v; S.tasCount = 0; renderView(); break;
      case 'dhikr': S.dhikr = +v; S.tasCount = 0; renderView(); break;
      case 'tasreset': S.tasCount = 0; renderView(); break;
      case 'namenav': var sl = $('#nameslider'); if (sl) { var dir = document.documentElement.dir === 'rtl' ? -1 : 1, step = (+v) * -1; S.nameIdx = clamp(S.nameIdx + (step), 0, 98); sl.scrollTo({ left: sl.clientWidth * S.nameIdx * dir, behavior: 'smooth' }); } break;
      case 'share':
        var st = streakInfo(), msg = t('stShareText', { s: st.cur, p: dayRow(todayIso()).points });
        if (navigator.share) navigator.share({ text: msg }).catch(function () {}); else { try { navigator.clipboard.writeText(msg).then(function () { toast('ok', t('dCopied'), true); }); } catch (x) {} }
        break;
    }
  });
  function renderViewKeepScroll() { var y = window.scrollY; renderView(); window.scrollTo(0, y); }

  boot();
  window.__RM = { S: S, renderView: renderView, calcPoints: calcPoints, quranState: quranState };
})();
