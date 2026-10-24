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
    view: 'today', qtab: 'surahs', search: '', reader: null, sel: null, showTr: true, qsize: 32,
    ttMonth: 'ramadan', ttYear: null, dhikr: 0, tasMode: 33, tasCount: 0, nameIdx: 0,
    dirtyProfile: false, dirtyDays: {}, offline: false, sound: true, authMode: 'choose', authErr: '', authBusy: false,
    curPrayer: 'fajr', duaOpen: null, duaSearch: '', adhan: true, introStep: 0, chatNew: false, sheet: null, rmode: 'mushaf', recovering: false, rtheme: { t: 'night', bg: '#0c1736', fg: '#f4ecd8' }, rpanel: false, googleOn: false
  };
  try { S.sound = localStorage.getItem('rm_sound') !== '0'; } catch (e) {}
  try { S.adhan = localStorage.getItem('rm_adhan') !== '0'; } catch (e) {}
  try { S.rmode = localStorage.getItem('rm_rmode') === 'list' ? 'list' : 'mushaf'; } catch (e) {}
  try { var rt = JSON.parse(localStorage.getItem('rm_rtheme') || 'null'); if (rt && rt.t) S.rtheme = rt; var qs = +localStorage.getItem('rm_qsize'); if (qs >= 20 && qs <= 48) S.qsize = qs; } catch (e) {}
  var THEMES = {
    night: { bg: '#0c1736', fg: '#f4ecd8', gold: '#f3d98f', num: '#e0ac4a', muted: '#a9b2cd' },
    black: { bg: '#000000', fg: '#e9e9e9', gold: '#f3d98f', num: '#e0ac4a', muted: '#9a9a9a' },
    white: { bg: '#ffffff', fg: '#1b1b1b', gold: '#8a5a00', num: '#a8741a', muted: '#555555' },
    paper: { bg: '#f3e9d2', fg: '#2c2117', gold: '#8a5a00', num: '#a8741a', muted: '#5d4b38' }
  };
  function lum(hex) { var n = parseInt(String(hex).replace('#', ''), 16) || 0, r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
  function themeVars() {
    var th = S.rtheme, base = THEMES[th.t];
    var bg = base ? base.bg : th.bg, fg = base ? base.fg : th.fg, light = lum(bg) > 0.6;
    var gold = base ? base.gold : (light ? '#8a5a00' : '#f3d98f'), num = base ? base.num : (light ? '#a8741a' : '#e0ac4a'), muted = base ? base.muted : fg;
    return '--rbg:' + bg + ';--rfg:' + fg + ';--rgold:' + gold + ';--rnum:' + num + ';--rmuted:' + muted + ';';
  }
  function saveTheme() { try { localStorage.setItem('rm_rtheme', JSON.stringify(S.rtheme)); } catch (e) {} }
  function setQsize(v) { S.qsize = clamp(v, 20, 48); try { localStorage.setItem('rm_qsize', String(S.qsize)); } catch (e) {} var el = $('#ayahs'); if (el) el.style.setProperty('--qsize', S.qsize + 'px'); }
  try { var sl = localStorage.getItem('rm_lang'); if (sl) I18N.setLang(sl); else I18N.setLang('ku-ba'); } catch (e) { I18N.setLang('ku-ba'); }

  /* ---------- small helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(sel, el) { return (el || document).querySelector(sel); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
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
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.5-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 11.5h7M8.5 14.5h4"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8M12 17h.01"/>',
    chev: '<path d="M6 9l6 6 6-6"/>',
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
  var adhanEl = null;
  function primeAdhan() {
    try {
      if (adhanEl) return;
      adhanEl = new Audio(); adhanEl.preload = 'auto';
      adhanEl.src = 'audio/adhan.wav';
      adhanEl.muted = true; var pr = adhanEl.play(); if (pr && pr.then) pr.then(function () { adhanEl.pause(); adhanEl.currentTime = 0; adhanEl.muted = false; }).catch(function () { adhanEl.muted = false; });
    } catch (e) {}
  }
  document.addEventListener('pointerdown', primeAdhan, { once: true, passive: true });
  function playAdhan() {
    if (!S.sound || !S.adhan) return;
    try { primeAdhan(); adhanEl.muted = false; adhanEl.currentTime = 0; var pr = adhanEl.play(); if (pr && pr.catch) pr.catch(function () { chime('prayer'); }); } catch (e) { chime('prayer'); }
  }
  function stopAdhan() { try { if (adhanEl) { adhanEl.pause(); adhanEl.currentTime = 0; } } catch (e) {} }
  function toast(type, msg, silent) {
    var box = document.getElementById('toasts');
    var el = document.createElement('div'); el.className = 'toast ' + type;
    el.innerHTML = '<span>' + esc(msg) + '</span><button class="x" aria-label="' + esc(t('close')) + '">×</button>';
    box.appendChild(el);
    function kill() { if (el.parentNode) el.parentNode.removeChild(el); }
    el.querySelector('.x').onclick = kill;
    setTimeout(kill, type === 'bad' || type === 'warn' ? 14000 : 8000);
    if (!silent) chime(type);
    return el;
  }
  function notify(type, msg) {
    var el = toast(type, msg);
    try { if ('Notification' in window && Notification.permission === 'granted' && document.hidden) new Notification(t('appName'), { body: msg }); } catch (e) {}
    return el;
  }
  var lastAnn = 0;
  function announcePrayer(msg) { // toast + adhan once per prayer, whether it comes from the timer or from a push
    if (Date.now() - lastAnn < 120000) return; lastAnn = Date.now();
    var el = notify('prayer', msg);
    if (S.sound && S.adhan) { playAdhan(); if (el) el.insertAdjacentHTML('beforeend', '<button class="btn small" data-act="adhanstop">' + esc(t('adhanStop')) + '</button>'); }
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
  function dayActive(r) {
    if (!r) return false;
    if (r.points > 0 || r.ayahs_read > 0 || r.tasbih > 0) return true;
    for (var k in (r.tasks || {})) if (r.tasks[k]) return true;
    return false;
  }
  // The streak counts every day with any action, in every month. Missing a whole day sends it back to zero.
  function streakInfo() {
    var iso = todayIso(), best = 0, run = 0, prev = null;
    Object.keys(S.days).filter(function (k) { return dayActive(S.days[k]); }).sort().forEach(function (k) {
      run = (prev && isoMs(k) - isoMs(prev) === 86400000) ? run + 1 : 1; prev = k; if (run > best) best = run;
    });
    var cur = 0, ms = isoMs(iso);
    if (!dayActive(S.days[iso])) ms -= 86400000;
    while (true) {
      var p = new Date(ms), key = P.iso(p.getUTCFullYear(), p.getUTCMonth(), p.getUTCDate());
      if (dayActive(S.days[key])) { cur++; ms -= 86400000; } else break;
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
    if (!sb || !S.user || S.user.guest || flushing) return Promise.resolve();
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
  function trKey() { return lang() === 'en' ? 'en' : lang() === 'ku-so' ? 'ku' : lang() === 'ku-ba' ? 'kub' : null; }
  function loadSurah(n) {
    var keys = ['ar'].concat(trKey() ? [trKey()] : []);
    return Promise.all(keys.map(function (k) {
      if (!S.cache[k]) S.cache[k] = getJson('data/' + k + '.json').catch(function (e) { delete S.cache[k]; throw e; });
      return S.cache[k].then(function (all) { return all[n]; });
    })).then(function (res) { return { ar: res[0], tr: res[1] || null }; });
  }

  /* ---------- boot / auth ---------- */
  /* ---------- intro (first visit) and help ---------- */
  var INTRO = [['i1t', 'i1b', 'moon'], ['i2t', 'i2b', 'today'], ['i3t', 'i3b', 'quran'], ['i4t', 'i4b', 'gear']];
  var introDone = null;
  function introNeeded() {
    var h = window.location.hash || '';
    return lsGet('rm_intro') !== '1' && lsGet('rm_lang') === null && lsGet('rm_guest') !== '1' && !/access_token|type=|error/.test(h);
  }
  function renderIntro(done) {
    introDone = done || introDone;
    var st = S.introStep, it = INTRO[st], last = st === INTRO.length - 1;
    root.innerHTML = '<div class="screen"><div class="card auth-card intro"><div class="logo">' + MOON + '</div>' + langChips(lang(), 'introlang') +
      '<div class="introico">' + (it[2] === 'moon' ? '' : icon(it[2])) + '</div><h2 class="gold" style="text-align:center">' + esc(t(it[0])) + '</h2><p class="intro-b">' + esc(t(it[1])) + '</p>' +
      '<div class="dots">' + INTRO.map(function (x, i) { return '<i class="' + (i === st ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
      '<button class="btn" data-act="intronext">' + esc(last ? t('introStart') : t('introNext')) + '</button>' + (last ? '' : '<button class="link" data-act="introskip">' + esc(t('introSkip')) + '</button>') + '</div></div>';
  }
  function finishIntro() { lsSet('rm_intro', '1'); lsSet('rm_lang', lang()); var d = introDone; introDone = null; if (d) d(); }
  function openHelp() {
    closeSheet();
    document.body.insertAdjacentHTML('beforeend', '<div class="sheet" id="sheet"><div class="in"><div class="row between"><h2 class="gold">' + esc(t('helpBtn')) + '</h2><button class="iconbtn" data-act="closesheet" aria-label="' + esc(t('close')) + '">×</button></div>' +
      INTRO.map(function (it) { return '<div class="card helpitem"><h3 class="gold">' + esc(t(it[0])) + '</h3><p>' + esc(t(it[1])) + '</p></div>'; }).join('') + '</div></div>');
  }
  function maybeWelcome() {
    if (!S.user || !S.profile || !S.profile.onboarded || $('#sheet')) return;
    var key = 'rm_welcomed_' + S.user.id;
    if (lsGet(key)) return;
    lsSet(key, '1');
    var recent = false;
    if (S.user.guest) { var fs = +lsGet('rm_first_seen') || 0; recent = fs > 0 && Date.now() - fs < 2 * 86400000; }
    else recent = S.user.created_at && Date.now() - new Date(S.user.created_at).getTime() < 2 * 86400000;
    if (!recent) return;
    document.body.insertAdjacentHTML('beforeend', '<div class="sheet" id="sheet"><div class="in" style="text-align:center">' + MOON +
      '<h2 class="gold">' + esc(t('welcomeTitle')) + (S.profile.display_name ? '، ' + esc(S.profile.display_name) : '') + '</h2><p>' + esc(t('welcomeBody')) + '</p>' +
      '<button class="btn" data-act="closesheet">' + esc(t('welcomeBtn')) + '</button></div></div>');
    confetti();
  }

  function boot() {
    if (lsGet('rm_first_seen') === null) lsSet('rm_first_seen', introNeeded() ? String(Date.now()) : '0');
    try {
      if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', function (e) {
        var d = e.data || {};
        if (d.type === 'adhan') announcePrayer(d.body || d.title || '');
        if (d.type === 'tas_plus') tasPlus(d.n || 1);
      });
    } catch (e) {}
    if (introNeeded()) { renderIntro(bootMain); return; }
    bootMain();
  }
  function bootMain() {
    try { if (window.supabase && cfg.SUPABASE_URL) sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY); } catch (e) { sb = null; }
    var wantGuest = false; try { wantGuest = localStorage.getItem('rm_guest') === '1'; } catch (e) {}
    S.recovering = /type=recovery/.test(window.location.hash || '');
    checkGoogle();
    try { if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {}); } catch (e) {}
    if (!sb) { if (wantGuest) startGuest(); else renderAuth(); return; }
    root.innerHTML = '<div class="screen"><div class="muted">' + esc(t('loading')) + '</div></div>';
    sb.auth.getSession().then(function (r) {
      if (S.recovering && r.data && r.data.session) { S.authMode = 'recover'; S.authErr = ''; renderAuth(); return; }
      if (S.recovering) S.recovering = false;
      if (r.data && r.data.session) return startSession(r.data.session.user);
      if (wantGuest) return startGuest();
      renderAuth();
    }).catch(function () { if (wantGuest) startGuest(); else renderAuth(); });
    sb.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_OUT') { S.user = null; S.profile = null; S.authMode = 'choose'; renderAuth(); } if (ev === 'PASSWORD_RECOVERY') { S.recovering = true; S.authMode = 'recover'; S.authErr = ''; renderAuth(); } });
  }
  function startGuest() {
    S.user = { id: 'guest', guest: true };
    try { localStorage.setItem('rm_guest', '1'); } catch (e) {}
    loadCache();
    return loadChapters().then(function () {
      if (!S.profile) { S.profile = { display_name: '', lang: lang(), city: 'duhok', ramadan_start: '2027-02-08', khatma_count: 1, khatma_mode: 'daily', quran_pos: 0, onboarded: false }; }
      I18N.setLang(S.profile.lang || lang()); try { localStorage.setItem('rm_lang', lang()); } catch (e) {}
      saveCache();
      if (!S.profile.onboarded) renderOnboard(); else renderApp();
      checkAnnouncements();
    }).catch(function () { toast('warn', t('offline')); });
  }
  function migrateGuest() {
    var raw = null;
    try { raw = localStorage.getItem('rm_migrate') === '1' ? localStorage.getItem('rm_cache_guest') : null; } catch (e) {}
    if (!raw) return;
    try {
      var g = JSON.parse(raw);
      Object.keys(g.days || {}).forEach(function (iso) {
        var gd = g.days[iso], sd = S.days[iso];
        if (!sd) S.days[iso] = gd;
        else { sd.ayahs_read = Math.max(sd.ayahs_read, gd.ayahs_read); sd.tasbih = Math.max(sd.tasbih, gd.tasbih); sd.tasks = Object.assign({}, gd.tasks, sd.tasks); sd.points = calcPoints(sd); }
        S.dirtyDays[iso] = true;
      });
      if (g.profile && g.profile.onboarded && !S.profile.onboarded) {
        ['khatma_count', 'khatma_mode', 'city', 'ramadan_start', 'quran_pos', 'lang', 'onboarded'].forEach(function (k) { S.profile[k] = g.profile[k]; });
        S.dirtyProfile = true;
      }
      (g.bookmarks || []).forEach(function (b) {
        if (!S.bookmarks.some(function (x) { return x.surah === b.surah && x.ayah === b.ayah; })) {
          var nb = { surah: b.surah, ayah: b.ayah, id: null }; S.bookmarks.push(nb);
          sb.from('rm_bookmarks').insert({ user_id: S.user.id, surah: b.surah, ayah: b.ayah }).select().then(function (r) { if (r.data && r.data[0]) { nb.id = r.data[0].id; saveCache(); } });
        }
      });
      localStorage.removeItem('rm_cache_guest'); localStorage.removeItem('rm_migrate');
      toast('ok', t('migrated'), true);
    } catch (e) {}
  }
  function startSession(user) {
    try { localStorage.removeItem('rm_guest'); } catch (e) {}
    S.user = user; loadCache();
    return loadChapters().then(function () {
      return sb.from('rm_profiles').select('*').eq('user_id', user.id).maybeSingle();
    }).then(function (r) {
      if (r.error) throw r.error;
      if (r.data) { if (!S.dirtyProfile) S.profile = r.data; }
      else if (!S.profile) {
        S.profile = { display_name: (user.user_metadata && (user.user_metadata.name || user.user_metadata.full_name)) || '', lang: lang(), city: 'duhok', ramadan_start: '2027-02-08', khatma_count: 1, khatma_mode: 'daily', quran_pos: 0, onboarded: false };
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
      migrateGuest();
      I18N.setLang(S.profile.lang || lang()); try { localStorage.setItem('rm_lang', lang()); } catch (e) {}
      saveCache(); flush();
      if (!S.profile.onboarded) renderOnboard(); else renderApp();
      checkAnnouncements(); refreshPush();
    });
  }

  function langChips(cur, act) {
    return '<div class="langs">' + I18N.LANGS.map(function (l) { return '<button class="chip' + (l[0] === cur ? ' on' : '') + '" data-act="' + act + '" data-v="' + l[0] + '">' + esc(l[1]) + '</button>'; }).join('') + '</div>';
  }
  function renderAuth() {
    var m = S.authMode, h = '<div class="screen"><form class="card auth-card" id="authForm" novalidate>' +
      '<div class="logo">' + MOON + '<h1>' + esc(t('appName')) + '</h1><p class="muted">' + esc(t('tagline')) + '</p></div>' + langChips(lang(), 'authlang');
    var err = '<div class="err" id="aerr">' + esc(S.authErr) + '</div>';
    if (m === 'choose') {
      h += '<p class="muted" style="text-align:center">' + esc(t('chooseSub')) + '</p>' +
        '<button class="btn" type="button" data-act="guest">' + esc(t('guestBtn')) + '</button>' +
        '<p class="muted" style="font-size:.8125rem;text-align:center;margin:-6px 0 0">' + esc(t('guestNote')) + '</p>' + googleBtn() +
        '<button class="btn ghost" type="button" data-act="authgo" data-v="signup">' + esc(t('signup')) + '</button>' +
        '<button class="btn ghost" type="button" data-act="authgo" data-v="login">' + esc(t('haveAccountBtn')) + '</button>';
    } else if (m === 'forgot') {
      h += '<div class="field"><label for="aemail">' + esc(t('email')) + '</label><input id="aemail" type="email" autocomplete="email" inputmode="email"></div>' + err +
        '<button class="btn" type="submit">' + esc(t('resetSend')) + '</button><button class="link" type="button" data-act="authgo" data-v="login">' + esc(t('back')) + '</button>';
    } else if (m === 'recover') {
      h += '<h3 class="gold" style="text-align:center">' + esc(t('setNewPw')) + '</h3>' +
        '<div class="field"><label for="apass">' + esc(t('newPw')) + '</label><input id="apass" type="password" autocomplete="new-password"></div>' +
        '<div class="field"><label for="apass2">' + esc(t('confirmPw')) + '</label><input id="apass2" type="password" autocomplete="new-password"></div>' + err +
        '<button class="btn" type="submit">' + esc(t('setNewPw')) + '</button>';
    } else {
      var signup = m === 'signup';
      h += (signup ? '<div class="field"><label for="aname">' + esc(t('name')) + '</label><input id="aname" autocomplete="name"></div>' : '') +
        '<div class="field"><label for="aemail">' + esc(t('email')) + '</label><input id="aemail" type="email" autocomplete="email" inputmode="email"></div>' +
        '<div class="field"><label for="apass">' + esc(t('password')) + '</label><input id="apass" type="password" autocomplete="' + (signup ? 'new-password' : 'current-password') + '"></div>' +
        (signup ? '<div class="field"><label for="apass2">' + esc(t('confirmPw')) + '</label><input id="apass2" type="password" autocomplete="new-password"><p class="muted" style="font-size:.8125rem">' + esc(t('signupHint')) + '</p></div>' : '') + err +
        '<button class="btn" type="submit">' + esc(signup ? t('signup') : t('login')) + '</button>' + googleBtn() +
        (signup ? '' : '<button class="link" type="button" data-act="authgo" data-v="forgot">' + esc(t('forgotPw')) + '</button>') +
        '<button class="link" type="button" data-act="authgo" data-v="' + (signup ? 'login' : 'signup') + '">' + esc(signup ? t('haveAccount') : t('noAccount')) + '</button>' +
        '<button class="btn ghost" type="button" data-act="guest">' + esc(t('guestBtn')) + '</button>' +
        '<button class="link" type="button" data-act="authgo" data-v="choose">' + esc(t('back')) + '</button>';
    }
    root.innerHTML = h + '</form></div>';
    document.getElementById('authForm').addEventListener('submit', function (e) { e.preventDefault(); doAuth(); });
  }
  var GICON = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.5 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.9 2.3-8.5 2.3-6.3 0-11.6-4-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';
  function googleBtn() { return S.googleOn ? '<button class="btn google" type="button" data-act="google">' + GICON + esc(t('googleBtn')) + '</button>' : ''; }
  function signInGoogle() {
    if (!sb) { toast('warn', t('offline'), true); return; }
    sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + window.location.pathname } }).then(function (r) { if (r && r.error) toast('warn', t('offline'), true); });
  }
  function checkGoogle() {
    try {
      fetch(String(cfg.SUPABASE_URL || '').replace(/\/$/, '') + '/auth/v1/settings', { headers: { apikey: cfg.SUPABASE_KEY } }).then(function (r) { return r.json(); }).then(function (j) {
        var on = !!(j && j.external && j.external.google);
        if (on !== S.googleOn) { S.googleOn = on; if (!S.user && !S.authBusy && $('#authForm') && !$('#apass2') && !$('#aname')) renderAuth(); }
      }).catch(function () {});
    } catch (e) {}
  }
  function fnUrl() { return String(cfg.SUPABASE_URL || '').replace(/\/$/, '') + '/functions/v1/rm-api'; }
  function callApi(body, token) {
    var hd = { 'Content-Type': 'application/json' };
    if (token) hd.Authorization = 'Bearer ' + token;
    return fetch(fnUrl(), { method: 'POST', headers: hd, body: JSON.stringify(body) }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j._status = r.status; return j; }); });
  }
  function finishLogin(r, nm) {
    S.authBusy = false;
    if (r.error) { S.authErr = t('authErr'); renderAuth(); return; }
    if (r.data && r.data.session) {
      S.authErr = ''; S.profile = null; S.days = {};
      return startSession(r.data.session.user).then(function () { if (S.profile && nm && !S.profile.display_name) { S.profile.display_name = nm; touchProfile(); } });
    }
    S.authErr = t('checkMail'); S.authMode = 'login'; renderAuth();
  }
  function doAuth() {
    if (S.authBusy) return;
    var m = S.authMode, email = $('#aemail') ? $('#aemail').value.trim() : '', pass = $('#apass') ? $('#apass').value : '', pass2 = $('#apass2') ? $('#apass2').value : '', nm = $('#aname') ? $('#aname').value.trim() : '';
    if (!sb) { S.authErr = t('offline'); renderAuth(); return; }
    var errEl = $('#aerr');
    if (m === 'forgot') {
      if (!email) { errEl.textContent = t('emailBad'); return; }
      S.authBusy = true; errEl.textContent = t('loading');
      sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.href.split('#')[0].split('?')[0] }).then(function (r) {
        S.authBusy = false; S.authErr = r.error ? t('offline') : t('resetSent'); renderAuth();
      }).catch(function () { S.authBusy = false; S.authErr = t('offline'); renderAuth(); });
      return;
    }
    if (m === 'recover') {
      if (pass.length < 6) { errEl.textContent = t('pwShort'); return; }
      if (pass !== pass2) { errEl.textContent = t('pwMismatch'); return; }
      S.authBusy = true; errEl.textContent = t('loading');
      sb.auth.updateUser({ password: pass }).then(function (r) {
        S.authBusy = false;
        if (r.error) { S.authErr = t('authErr'); renderAuth(); return; }
        S.recovering = false; try { history.replaceState(null, '', window.location.pathname); } catch (x) {}
        return sb.auth.getSession().then(function (g) { if (g.data && g.data.session) return startSession(g.data.session.user); S.authMode = 'login'; renderAuth(); });
      }).catch(function () { S.authBusy = false; S.authErr = t('offline'); renderAuth(); });
      return;
    }
    if (m === 'signup') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errEl.textContent = t('emailBad'); return; }
      if (pass.length < 6) { errEl.textContent = t('pwShort'); return; }
      if (pass !== pass2) { errEl.textContent = t('pwMismatch'); return; }
      S.authBusy = true; errEl.textContent = t('loading');
      callApi({ action: 'signup', email: email, password: pass, name: nm }).then(function (j) {
        if (j.ok) return sb.auth.signInWithPassword({ email: email, password: pass }).then(function (r) { return finishLogin(r, nm); });
        if (j.error === 'exists') { S.authBusy = false; S.authErr = t('emailTaken'); S.authMode = 'login'; renderAuth(); return; }
        if (j.error === 'email') { S.authBusy = false; S.authErr = t('emailBad'); renderAuth(); return; }
        if (j.error === 'password') { S.authBusy = false; S.authErr = t('pwShort'); renderAuth(); return; }
        // fallback: normal sign-up (may ask for email confirmation if the project requires it)
        return sb.auth.signUp({ email: email, password: pass, options: { data: { name: nm }, emailRedirectTo: window.location.href.split('#')[0].split('?')[0] } }).then(function (r) { return finishLogin(r, nm); });
      }).catch(function () { S.authBusy = false; S.authErr = t('offline'); renderAuth(); });
      return;
    }
    S.authBusy = true; errEl.textContent = t('loading');
    sb.auth.signInWithPassword({ email: email, password: pass }).then(function (r) { return finishLogin(r, nm); }).catch(function () { S.authBusy = false; S.authErr = t('offline'); renderAuth(); });
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
    setCurColor(); setTimeout(checkEvents, 1500); setTimeout(maybeWelcome, 700);
    root.innerHTML = '<div id="app"><div class="topbar"><h1>' + esc(t('appName')) + '</h1>' + (S.user && S.user.guest ? '<span class="badge warn">' + esc(t('guestBadge')) + '</span>' : '') + '<button class="iconbtn" data-act="help" aria-label="' + esc(t('helpBtn')) + '">' + icon('help') + '</button><button class="iconbtn chatbtn" data-act="chat" aria-label="' + esc(t('chatTitle')) + '">' + icon('chat') + '<i class="dot" id="chatdot"' + (S.chatNew ? '' : ' hidden') + '></i></button><button class="iconbtn" data-act="account" aria-label="' + esc(t('myAccount')) + '">' + icon('user') + '</button><button class="iconbtn" data-act="settings" aria-label="' + esc(t('settings')) + '">' + icon('gear') + '</button></div>' +
      '<main id="view"></main><div id="abar"></div></div>' +
      '<nav class="bottomnav"><div class="in">' + NAV.map(function (n) { return '<button class="nb" data-act="tab" data-v="' + n[0] + '" id="nb-' + n[0] + '">' + icon(n[0]) + '<span>' + esc(t(n[1])) + '</span></button>'; }).join('') + '</div></nav>';
    renderView();
  }
  function renderView() {
    var v = $('#view'); if (!v) return;
    NAV.forEach(function (n) { var b = $('#nb-' + n[0]); if (b) b.classList.toggle('on', n[0] === S.view); });
    if (S.view !== 'chat' && CH.timer) { clearInterval(CH.timer); CH.timer = null; }
    var fn = { today: viewToday, quran: viewQuran, duas: viewDuas, table: viewTable, worship: viewWorship, stats: viewStats, chat: viewChat }[S.view];
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
  function arNum(n) { return String(n).replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.charAt(+d); }); }
  function readerHtml() {
    var r = S.reader, c = S.chapters.chapters[r.n - 1], pos = S.profile.quran_pos, tk = trKey(), mush = S.rmode === 'mushaf';
    var html = '<div class="reader-bar"><div class="row between"><button class="btn ghost small" data-act="rback">' + esc(t('qBack')) + '</button><b style="font-family:var(--f-display)" class="gold">' + esc(c.ar) + '</b></div>' +
      '<div class="tools"><button class="chip' + (S.rpanel ? ' on' : '') + '" data-act="rpanel">' + esc(t('qTheme')) + '</button><button class="chip" data-act="rmode">' + esc(t(mush ? 'qModeList' : 'qModeMushaf')) + '</button>' + (tk ? '<button class="chip' + (S.showTr ? ' on' : '') + '" data-act="toggletr">' + esc(t('qTranslation')) + '</button>' : '') + '<span class="grow"></span><button class="szbtn" data-act="qsz" data-v="-2" aria-label="-">A−</button><button class="szbtn" data-act="qsz" data-v="2" aria-label="+">A+</button></div></div>';
    var qh = false; try { qh = localStorage.getItem('rm_qhint') === '1'; } catch (e) {}
    if (!qh) html += '<div class="qhint"><span>' + esc(t('qHint')) + '</span><button class="btn small" data-act="hintok">' + esc(t('qHintOk')) + '</button></div>';
    if (S.rpanel) {
      var th = S.rtheme, base = THEMES[th.t];
      html += '<div class="rpanel"><div class="swatches">' + ['night', 'black', 'white', 'paper'].map(function (k) { return '<button class="sw' + (th.t === k ? ' on' : '') + '" data-act="rtheme" data-v="' + k + '" style="background:' + THEMES[k].bg + ';color:' + THEMES[k].fg + '">' + esc(t({ night: 'thNight', black: 'thBlack', white: 'thWhite', paper: 'thPaper' }[k])) + '</button>'; }).join('') + '</div>' +
        '<div class="colors"><label>' + esc(t('thBg')) + '<input type="color" id="rbg" value="' + (base ? base.bg : th.bg) + '"></label><label>' + esc(t('thFg')) + '<input type="color" id="rfg" value="' + (base ? base.fg : th.fg) + '"></label></div></div>';
    }
    if (!r.data) return html + '<p class="muted" style="text-align:center;padding:30px">' + esc(t('loading')) + '</p>';
    html += '<div class="rd" style="' + themeVars() + '">';
    html += '<div class="surhead"><span>سُورَةُ ' + esc(c.ar) + '</span></div>';
    if (c.n !== 1 && c.n !== 9) html += '<div class="bism">' + esc(S.chapters.bismillah) + '</div>';
    if (mush) {
      html += '<div id="ayahs" class="mushaf" style="--qsize:' + S.qsize + 'px"><div class="pg">';
      var curPg = pageOf(c.off);
      r.data.ar.forEach(function (txt, i) {
        var g = c.off + i, bk = S.bookmarks.some(function (b) { return b.surah === c.n && b.ayah === i + 1; });
        if (i > 0 && PAGE_START[g]) { html += '</div><div class="pgsep"><span>' + curPg + '</span></div><div class="pg">'; curPg = PAGE_START[g]; }
        html += '<span class="ay' + (g < pos ? ' read' : '') + (S.sel === i ? ' sel' : '') + '" id="a' + i + '" data-i="' + i + '">' + esc(txt) + '&nbsp;<span class="n">' + arNum(i + 1) + '</span>' + (bk ? '<span class="bk">★</span>' : '') + '</span> ';
      });
      html += '</div><div class="pgsep"><span>' + curPg + '</span></div></div>';
    } else {
      html += '<div id="ayahs" style="--qsize:' + S.qsize + 'px">';
      r.data.ar.forEach(function (txt, i) {
        var g = c.off + i, bk = S.bookmarks.some(function (b) { return b.surah === c.n && b.ayah === i + 1; });
        html += '<div class="ayah' + (g < pos ? ' read' : '') + (S.sel === i ? ' sel' : '') + '" id="a' + i + '" data-i="' + i + '"><div class="txt">' + esc(txt) + '<span class="n">' + (i + 1) + '</span>' + (bk ? '<span class="bk">★</span>' : '') + '</div>' +
          (tk && S.showTr && r.data.tr ? '<div class="tr" dir="' + (tk === 'en' ? 'ltr' : 'rtl') + '">' + esc(r.data.tr[i]) + '</div>' : '') + '</div>';
      });
      html += '</div>';
    }
    html += '</div>';
    if (c.n < 114) html += '<button class="btn ghost" data-act="nextsurah" style="margin-top:14px">' + esc(t('qNextSurah')) + '</button>';
    return html;
  }
  var QP = window.QPAGES || [], PAGE_START = {};
  QP.forEach(function (g, i) { PAGE_START[g] = i + 1; });
  function pageOf(g) { var lo = 0, hi = QP.length - 1; while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (QP[mid] <= g) lo = mid; else hi = mid - 1; } return lo + 1; }
  function openSurah(n, ayahIdx) {
    S.reader = { n: n, data: null, scrollTo: ayahIdx }; S.sel = null; S.view = 'quran'; renderView(); window.scrollTo(0, 0);
    loadSurah(n).then(function (d) { if (S.reader && S.reader.n === n) { S.reader.data = d; renderView(); } }).catch(function () { toast('warn', t('offline')); });
  }
  function showActionBar() {
    var b = $('#abar'); if (!b) return;
    if (S.sel == null || !S.reader) { b.innerHTML = ''; return; }
    var c = S.chapters.chapters[S.reader.n - 1], has = S.bookmarks.some(function (x) { return x.surah === c.n && x.ayah === S.sel + 1; });
    var tk = trKey(), trh = '';
    if (S.rmode === 'mushaf' && tk && S.showTr && S.reader.data && S.reader.data.tr && S.reader.data.tr[S.sel]) {
      trh = '<div class="abtr" dir="' + (tk === 'en' ? 'ltr' : 'rtl') + '"><b class="gold">' + esc(c.ar) + ' · ' + (S.sel + 1) + '</b> ' + esc(S.reader.data.tr[S.sel]) + '</div>';
    }
    b.innerHTML = '<div class="actionbar"><div class="in">' + trh + '<div class="btns"><button class="btn" data-act="markread">' + esc(t('qMarkRead')) + '</button><button class="btn ghost" data-act="bookmark">' + (has ? '★ ' : '☆ ') + esc(t('qBookmark')) + '</button></div></div></div>';
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
    document.querySelectorAll('.ayah, .ay').forEach(function (el) { var g = c.off + (+el.getAttribute('data-i')); el.classList.toggle('read', g < S.profile.quran_pos); el.classList.remove('sel'); });
    showActionBar(); updateBadges();
  }
  function toggleBookmark() {
    var c = S.chapters.chapters[S.reader.n - 1], ay = S.sel + 1, ex = S.bookmarks.filter(function (x) { return x.surah === c.n && x.ayah === ay; })[0];
    if (ex) { S.bookmarks = S.bookmarks.filter(function (x) { return x !== ex; }); if (sb && !S.user.guest && ex.id) sb.from('rm_bookmarks').delete().eq('id', ex.id).then(function () {}); saveCache(); }
    else {
      var nb = { surah: c.n, ayah: ay, id: S.user.guest ? 'g' + Date.now() : null }; S.bookmarks.push(nb); saveCache();
      if (sb && !S.user.guest) sb.from('rm_bookmarks').insert({ user_id: S.user.id, surah: c.n, ayah: ay }).select().then(function (r) { if (r.data && r.data[0]) { nb.id = r.data[0].id; saveCache(); } else if (r.error) toast('warn', t('offline'), true); });
    }
    S.sel = null; renderView();
  }

  /* ---------- Duas ---------- */
  function viewDuas() {
    var l = lang(), q = S.duaSearch.trim().toLowerCase();
    var rows = C.DUAS.map(function (d, i) { return { d: d, i: i }; }).filter(function (x) {
      return !q || (x.d.title[l] || '').toLowerCase().indexOf(q) >= 0 || x.d.title.en.toLowerCase().indexOf(q) >= 0 || x.d.ar.indexOf(q) >= 0;
    });
    return '<div class="sec-title">' + esc(t('dTitle')) + '</div><input id="dsearch" type="search" placeholder="' + esc(t('dSearch')) + '" value="' + esc(S.duaSearch) + '"><p class="muted" style="font-size:.8125rem;margin:6px 2px">' + esc(t('dTapHint')) + '</p>' +
      '<div class="duas">' + (rows.map(function (x) {
        var d = x.d, i = x.i, open = S.duaOpen === i, m = l === 'ar' ? '' : d.m[l === 'ku-so' ? 'ku-so' : l === 'en' ? 'en' : 'ku-ba'];
        return '<article class="card duarow' + (open ? ' open' : '') + '"><button class="duahead" data-act="duaopen" data-v="' + i + '" aria-expanded="' + open + '"><span class="dn">' + (i + 1) + '</span><h3>' + esc(d.title[l]) + '</h3><span class="chev">' + icon('chev') + '</span></button>' +
          (open ? '<div class="duabody"><p class="ar" id="dua' + i + '">' + esc(d.ar) + '</p>' + (m ? '<p class="muted">' + esc(m) + '</p>' : '') + '<button class="btn ghost small" style="justify-self:start" data-act="copy" data-v="' + i + '">' + esc(t('dCopy')) + '</button></div>' : '') + '</article>';
      }).join('') || '<p class="muted" style="text-align:center;padding:20px">' + esc(t('dNone')) + '</p>') + '</div>';
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
  function swSend(msg) {
    try { if ('serviceWorker' in navigator) navigator.serviceWorker.ready.then(function (reg) { if (reg.active) reg.active.postMessage(msg); }); } catch (e) {}
  }
  function tasNotify(done) { // persistent notification with a +1 button; it stays until the round is complete
    try {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      var tgt = S.tasMode, cyc = S.tasCount % tgt;
      swSend({ type: done ? 'tas_done' : 'tas', count: cyc, target: tgt, name: C.DHIKR[S.dhikr].ar, title: t('tasNotifTitle'), doneText: t('tasNotifDone', { n: tgt }), plus: t('tasPlus') });
    } catch (e) {}
  }
  function tasPlus(n) { // taps made from the notification while the app was closed or in the background
    for (var i = 0; i < n; i++) {
      S.tasCount++;
      var row = mutateDay(todayIso(), function (r) { r.tasbih++; });
      var tgt = S.tasMode, cyc = S.tasCount % tgt;
      if (cyc === 0) chime('prayer');
      var a = $('#tascount'); if (a) { a.textContent = cyc; var b = $('#tasrounds'); if (b) b.textContent = Math.floor(S.tasCount / tgt); var c2 = $('#tasday'); if (c2) c2.textContent = row.tasbih; }
    }
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
    tasNotify(cyc === 0);
  }

  /* ---------- Stats ---------- */
  function chartSvg() {
    var rmd = ramadanInfo().status === 'during', p = parseIso(S.profile.ramadan_start), start = rmd ? Date.UTC(p.y, p.m, p.d) : isoMs(todayIso()) - 29 * 86400000, W = 640, H = 230, L = 30, B = 26, T = 10, bw = (W - L - 6) / 30, today = isoMs(todayIso());
    var pts = [], s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(t('stChart')) + '">';
    [0, 25, 50, 75, 100].forEach(function (v) { var y = T + (H - T - B) * (1 - v / 100); s += '<line class="grid" x1="' + L + '" x2="' + W + '" y1="' + y + '" y2="' + y + '"/><text x="' + (L - 4) + '" y="' + (y + 3) + '" text-anchor="end">' + v + '</text>'; });
    var vals = [];
    for (var i = 0; i < 30; i++) {
      var ms = start + i * 86400000, d = new Date(ms), iso = P.iso(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), row = S.days[iso], v = row ? row.points : 0, future = ms > today;
      vals.push(future ? null : v);
      var h = (H - T - B) * v / 100, x = L + i * bw + 2, y = H - B - h, col = v >= 100 ? '#3fc79a' : v >= 70 ? '#e0ac4a' : v >= 40 ? '#f0a23c' : '#6b8cff';
      s += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (bw - 4).toFixed(1) + '" height="' + Math.max(h, future ? 0 : 2).toFixed(1) + '" rx="3" fill="' + col + '"' + (ms === today ? ' stroke="#f3d98f" stroke-width="2"' : '') + (future ? ' opacity=".25"' : '') + '/>';
      if (i === 0 || (i + 1) % 5 === 0) s += '<text x="' + (x + (bw - 4) / 2).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + (rmd ? i + 1 : d.getUTCDate()) + '</text>';
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
      '<div class="card"><div class="row between" style="margin-bottom:6px"><h3 class="gold">' + esc(t(ramadanInfo().status === 'during' ? 'stChart' : 'weekGraph')) + '</h3><span class="muted" style="font-size:.8125rem">- - ' + esc(t('stWeek')) + '</span></div>' + chartSvg() + '</div>';
  }

  /* ---------- my account ---------- */
  function dataTiles() {
    var st = streakInfo(), keys = Object.keys(S.days), sum = 0, ays = 0, tas = 0;
    keys.forEach(function (k) { sum += S.days[k].points; ays += S.days[k].ayahs_read; tas += S.days[k].tasbih; });
    var avg = keys.length ? Math.round(sum / keys.length) : 0, pos = S.profile.quran_pos || 0;
    function tile(v, l) { return '<div class="tile"><b>' + v + '</b><span>' + esc(l) + '</span></div>'; }
    return '<div class="tiles">' + tile(keys.length, t('accDays')) + tile(avg, t('stAvg')) + tile(st.cur, t('stStreak')) + tile(st.best, t('stBest')) + tile(ays, t('stTotalAyahs')) + tile(tas, t('stTasbih')) + tile(Math.round(pos / TOTAL_AYAHS * 100) + '%', t('qKhatmaProg')) + '</div>';
  }
  function openAccount() {
    closeSheet();
    var u = S.user, h = '<div class="sheet" id="sheet"><div class="in"><div class="row between"><h2 class="gold">' + esc(t('myAccount')) + '</h2><button class="iconbtn" data-act="closesheet" aria-label="' + esc(t('close')) + '">×</button></div>';
    if (u.guest) {
      h += '<span class="badge warn" style="justify-self:start">' + esc(t('guestBadge')) + '</span><p class="muted">' + esc(t('guestNote')) + '</p><button class="btn" data-act="guestlogin">' + esc(t('guestLogin')) + '</button>' +
        '<div class="field"><label>' + esc(t('myData')) + '</label>' + dataTiles() + '</div></div></div>';
    } else {
      var since = u.created_at ? new Date(u.created_at).toLocaleDateString(loc()) : '';
      h += '<div class="field"><label for="accname">' + esc(t('name')) + '</label><input id="accname" autocomplete="name" value="' + esc(S.profile.display_name || '') + '"></div>' +
        '<button class="btn ghost" data-act="savename">' + esc(t('saveName')) + '</button>' +
        '<div class="field"><label>' + esc(t('email')) + '</label><input value="' + esc(u.email || '') + '" readonly dir="ltr"></div>' +
        (since ? '<p class="muted" style="font-size:.8125rem">' + esc(t('memberSince')) + ' ' + esc(since) + '</p>' : '') +
        '<div class="field"><label>' + esc(t('myData')) + '</label>' + dataTiles() + '</div>' +
        '<div class="field"><label for="accpw">' + esc(t('changePw')) + '</label><input id="accpw" type="password" autocomplete="new-password" placeholder="' + esc(t('newPw')) + '"><input id="accpw2" type="password" autocomplete="new-password" placeholder="' + esc(t('confirmPw')) + '"><div class="err" id="accerr"></div></div>' +
        '<button class="btn ghost" data-act="changepw">' + esc(t('changePw')) + '</button>' +
        '<button class="btn ghost" data-act="logout">' + esc(t('logout')) + '</button></div></div>';
    }
    document.body.insertAdjacentHTML('beforeend', h);
  }
  function saveName() {
    var v = ($('#accname').value || '').trim().slice(0, 60);
    S.profile.display_name = v; touchProfile();
    if (sb && !S.user.guest) sb.auth.updateUser({ data: { name: v } }).then(function () {});
    toast('ok', t('nameSaved'), true);
  }
  function changePw() {
    var p1 = $('#accpw').value, p2 = $('#accpw2').value, er = $('#accerr');
    if (p1.length < 6) { er.textContent = t('pwShort'); return; }
    if (p1 !== p2) { er.textContent = t('pwMismatch'); return; }
    er.textContent = t('loading');
    sb.auth.updateUser({ password: p1 }).then(function (r) {
      if (r.error) { er.textContent = t('offline'); return; }
      $('#accpw').value = ''; $('#accpw2').value = ''; er.textContent = ''; toast('ok', t('pwChanged'), true);
    }).catch(function () { er.textContent = t('offline'); });
  }

  /* ---------- share the streak as an image ---------- */
  function buildShareImage() {
    var st = streakInfo(), pts = dayRow(todayIso()).points, W = 1080, H = 1350, cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var x = cv.getContext('2d'), rtl = lang() !== 'en';
    var loads = [];
    try { loads = [document.fonts.load('700 80px "Aref Ruqaa"', t('appName')), document.fonts.load('700 80px "Vazirmatn"', t('shDays') + '0123456789')]; } catch (e) {}
    return Promise.all(loads).catch(function () {}).then(function () {
      var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#12214f'); g.addColorStop(1, '#070e24');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      var rg = x.createRadialGradient(W * .85, 0, 0, W * .85, 0, 760); rg.addColorStop(0, 'rgba(224,172,74,.30)'); rg.addColorStop(1, 'rgba(224,172,74,0)');
      x.fillStyle = rg; x.fillRect(0, 0, W, H);
      var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
      for (var i = 0; i < 70; i++) { x.globalAlpha = .15 + rnd() * .6; x.fillStyle = '#fff'; x.beginPath(); x.arc(rnd() * W, rnd() * H, .8 + rnd() * 2.2, 0, 6.283); x.fill(); }
      x.globalAlpha = 1;
      // crescent (drawn on its own canvas so the cut-out stays transparent)
      var mc = document.createElement('canvas'); mc.width = 200; mc.height = 200; var mx = mc.getContext('2d');
      mx.fillStyle = '#e0ac4a'; mx.beginPath(); mx.arc(100, 100, 70, 0, 6.283); mx.fill();
      mx.globalCompositeOperation = 'destination-out'; mx.beginPath(); mx.arc(134, 78, 62, 0, 6.283); mx.fill();
      x.drawImage(mc, W / 2 - 100, 50);
      x.textAlign = 'center'; x.direction = rtl ? 'rtl' : 'ltr';
      x.fillStyle = '#e0ac4a'; x.font = '700 64px "Aref Ruqaa", serif'; x.fillText(t('appName'), W / 2, 300);
      x.fillStyle = '#f3d98f'; x.font = '500 44px "Vazirmatn", sans-serif'; x.fillText(t('shTitle'), W / 2, 372);
      // flame
      x.save(); x.translate(W / 2 - 150, 410); x.scale(4.7, 4.7);
      x.fillStyle = '#f0a23c'; x.fill(new Path2D('M32 4c4 10 16 16 16 32a16 16 0 0 1-32 0c0-8 4-12 8-16 0 6 3 8 6 8 0-10-2-16 2-24z'));
      x.fillStyle = '#f3d98f'; x.fill(new Path2D('M32 28c3 6 9 8 9 17a9 9 0 0 1-18 0c0-5 3-8 5-10 0 3 2 5 4 5 0-5-1-8 0-12z'));
      x.restore();
      x.fillStyle = '#fff6dc'; x.font = '700 250px "Vazirmatn", sans-serif'; x.fillText(String(st.cur), W / 2, 930);
      x.fillStyle = '#f3d98f'; x.font = '500 56px "Vazirmatn", sans-serif'; x.fillText(t('shDays'), W / 2, 1010);
      // today's score
      var bw = 640, bx = (W - bw) / 2, by = 1100;
      x.fillStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.roundRect ? x.roundRect(bx, by, bw, 26, 13) : x.rect(bx, by, bw, 26); x.fill();
      var gg = x.createLinearGradient(bx, 0, bx + bw, 0); gg.addColorStop(0, '#f1c566'); gg.addColorStop(1, '#d39a36');
      x.fillStyle = gg; x.beginPath(); x.roundRect ? x.roundRect(bx, by, Math.max(26, bw * pts / 100), 26, 13) : x.rect(bx, by, Math.max(26, bw * pts / 100), 26); x.fill();
      x.fillStyle = '#f4ecd8'; x.font = '500 48px "Vazirmatn", sans-serif'; x.fillText(t('shToday') + ': ' + pts + '/100', W / 2, 1200);
      x.fillStyle = 'rgba(244,236,216,.6)'; x.font = '400 34px "Vazirmatn", sans-serif'; x.fillText(t('tagline'), W / 2, 1290);
      return new Promise(function (res) { cv.toBlob(function (b) { res(b); }, 'image/png'); });
    });
  }
  var shareBlob = null, shareUrl = null;
  function openShare() {
    buildShareImage().then(function (blob) {
      if (!blob) { toast('warn', t('shFail'), true); return; }
      shareBlob = blob; if (shareUrl) URL.revokeObjectURL(shareUrl); shareUrl = URL.createObjectURL(blob);
      closeSheet();
      document.body.insertAdjacentHTML('beforeend', '<div class="sheet" id="sheet"><div class="in"><div class="row between"><h2 class="gold">' + esc(t('shTitle')) + '</h2><button class="iconbtn" data-act="closesheet" aria-label="' + esc(t('close')) + '">×</button></div>' +
        '<img class="shareimg" alt="" src="' + shareUrl + '"><div class="row" style="gap:10px"><button class="btn" style="flex:1" data-act="doshare">' + esc(t('shShare')) + '</button><button class="btn ghost" style="flex:1" data-act="saveimg">' + esc(t('shSave')) + '</button></div></div></div>');
    }).catch(function () { toast('warn', t('shFail'), true); });
  }
  function saveImg() {
    if (!shareUrl) return; var a = document.createElement('a'); a.href = shareUrl; a.download = 'streak.png'; document.body.appendChild(a); a.click(); a.remove();
  }
  function doShare() {
    if (!shareBlob) return;
    var st = streakInfo(), msg = t('stShareText', { s: st.cur, p: dayRow(todayIso()).points });
    var file = null; try { file = new File([shareBlob], 'streak.png', { type: 'image/png' }); } catch (e) {}
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], text: msg }).catch(function () {}); return; }
    saveImg();
    try { if (navigator.clipboard) navigator.clipboard.writeText(msg); } catch (e) {}
  }

  /* ---------- push + messages from the admin ---------- */
  function b64ToU8(b) { var p = '='.repeat((4 - b.length % 4) % 4), r = atob((b + p).replace(/-/g, '+').replace(/_/g, '/')), o = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) o[i] = r.charCodeAt(i); return o; }
  function sendSub(sub) {
    return sb.auth.getSession().then(function (g) { return callApi({ action: 'subscribe', sub: sub.toJSON(), lang: lang(), city: (S.profile && S.profile.city) || 'duhok', pray: lsGet('rm_pray') !== '0' }, g.data && g.data.session ? g.data.session.access_token : null); });
  }
  function enablePush() {
    if (!sb || !cfg.VAPID_PUBLIC || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) { toast('warn', t('pushNo'), true); return; }
    Notification.requestPermission().then(function (p) {
      if (p !== 'granted') { toast('warn', t('pushDenied'), true); return; }
      return navigator.serviceWorker.ready.then(function (reg) {
        return reg.pushManager.getSubscription().then(function (sub) { return sub || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(cfg.VAPID_PUBLIC) }); });
      }).then(sendSub).then(function (j) {
        if (j && j.ok) { try { localStorage.setItem('rm_push', '1'); } catch (e) {} toast('ok', t('pushDone')); } else toast('warn', t('offline'), true);
      });
    }).catch(function () { toast('warn', t('pushNo'), true); });
  }
  function refreshPush() { // re-attach an existing subscription to the signed-in user
    try {
      if (!sb || localStorage.getItem('rm_push') !== '1' || !('serviceWorker' in navigator) || !('Notification' in window) || Notification.permission !== 'granted') return;
      navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (sub) { if (sub) return sendSub(sub); }).catch(function () {});
    } catch (e) {}
  }
  function checkAnnouncements() {
    if (!sb) return;
    var raw = lsGet('rm_ann_seen'), first = raw === null, seen = +raw || 0;
    var since = (S.user && !S.user.guest && S.user.created_at) ? new Date(S.user.created_at).getTime() : (+lsGet('rm_first_seen') || 0);
    var q = sb.from('rm_announcements').select('id,title,body,created_at').order('id', { ascending: false }).limit(first ? 1 : 10);
    if (!first) q = q.gt('id', seen);
    q.then(function (r) {
      if (r.error || !r.data) return;
      var max = r.data.length ? Math.max.apply(null, r.data.map(function (x) { return x.id; })) : seen;
      lsSet('rm_ann_seen', String(max));
      if (first) return;
      r.data.filter(function (a) { return !since || new Date(a.created_at).getTime() > since; }).reverse().forEach(function (a) { notify('info', a.title + ' — ' + a.body); });
    }).catch(function () {});
  }
  setInterval(function () { if (S.profile && !document.hidden) checkAnnouncements(); }, 300000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && S.profile) checkAnnouncements(); });

  /* ---------- chat: questions and answers ---------- */
  var ADMIN_EMAIL = 'yuosif.ali2007@gmail.com';
  var CH = { items: [], replies: {}, limit: 30, more: false, loaded: false, reply: null, mentions: [], timer: null, active: null };
  function isAdmin() { return !!(S.user && S.user.email && String(S.user.email).toLowerCase() === ADMIN_EMAIL); }
  function chatMaxId() {
    var mx = 0; CH.items.forEach(function (m) { if (m.id > mx) mx = m.id; (CH.replies[m.id] || []).forEach(function (r) { if (r.id > mx) mx = r.id; }); }); return mx;
  }
  function updateChatDot() { var d = $('#chatdot'); if (d) d.hidden = !S.chatNew; }
  function loadChat() {
    if (!sb) return Promise.resolve();
    return sb.from('rm_chat').select('*').is('parent_id', null).order('id', { ascending: false }).limit(CH.limit + 1).then(function (r) {
      if (r.error || !r.data) return;
      CH.more = r.data.length > CH.limit; CH.items = r.data.slice(0, CH.limit);
      var ids = CH.items.map(function (x) { return x.id; });
      if (!ids.length) { CH.replies = {}; return; }
      return sb.from('rm_chat').select('*').in('parent_id', ids).order('id', { ascending: true }).then(function (r2) {
        if (r2.error) return; CH.replies = {}; (r2.data || []).forEach(function (x) { (CH.replies[x.parent_id] = CH.replies[x.parent_id] || []).push(x); });
      });
    }).then(function () {
      CH.loaded = true; lsSet('rm_chat_read', String(chatMaxId())); S.chatNew = false; updateChatDot();
      if (S.view === 'chat') { var ae = document.activeElement; if (ae && ae.closest && ae.closest('.chatbox')) return; renderViewKeepScroll(); }
    }).catch(function () {});
  }
  function openChat() { S.view = 'chat'; S.reader = null; S.sel = null; renderView(); window.scrollTo(0, 0); }
  function chatPoll() { // background check: red dot for new messages and a toast when someone tags me
    if (!sb || !S.profile || S.view === 'chat') return;
    var meId = S.user && !S.user.guest ? S.user.id : null;
    sb.from('rm_chat').select('id,user_name,mentions').order('id', { ascending: false }).limit(25).then(function (r) {
      if (r.error || !r.data) return;
      var mx = r.data.length ? r.data[0].id : 0, rd = lsGet('rm_chat_read'), mn = lsGet('rm_chat_men');
      if (rd === null) { lsSet('rm_chat_read', String(mx)); rd = String(mx); }
      if (mn === null) { lsSet('rm_chat_men', String(mx)); mn = String(mx); }
      S.chatNew = mx > (+rd || 0); updateChatDot();
      if (meId) {
        var seenM = +mn || 0;
        r.data.slice().reverse().forEach(function (m) { if (m.id > seenM && m.mentions && m.mentions.indexOf(meId) >= 0) notify('info', t('chatMentioned', { n: m.user_name })); });
        lsSet('rm_chat_men', String(Math.max(seenM, mx)));
      }
    }).catch(function () {});
  }
  setInterval(function () { if (!document.hidden) chatPoll(); }, 60000);
  setTimeout(chatPoll, 4000);
  function participants() {
    var seen = {}, out = [];
    function add(m) { if (!seen[m.user_id] && (!S.user || m.user_id !== S.user.id)) { seen[m.user_id] = 1; out.push({ id: m.user_id, name: m.user_name, tok: String(m.user_name || '').replace(/\s+/g, '_') }); } }
    CH.items.forEach(function (m) { add(m); (CH.replies[m.id] || []).forEach(add); });
    return out;
  }
  function fmtBody(b) { return esc(b).replace(/(^|\s)(@[^\s@]+)/g, '$1<span class="mention">$2</span>').replace(/\n/g, '<br>'); }
  function fmtTime(ts) { try { return new Date(ts).toLocaleString(loc(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function msgHtml(m, isReply) {
    var mine = S.user && m.user_id === S.user.id, canDel = mine || isAdmin();
    return '<div class="cmsg' + (isReply ? ' rep' : '') + (m.is_admin ? ' adm' : '') + '"><div class="ch"><button class="cname" data-act="chattag" data-v="' + esc(m.user_id) + '" data-n="' + esc(m.user_name) + '">' + esc(m.user_name) + '</button>' +
      (m.is_admin ? '<span class="badge ok">' + esc(t('chatAdmin')) + '</span>' : '') + '<span class="muted ct">' + esc(fmtTime(m.created_at)) + '</span></div><div class="cb">' + fmtBody(m.body) + '</div>' +
      '<div class="cact">' + (isReply || !S.user || S.user.guest ? '' : '<button class="link" data-act="chatreply" data-v="' + m.id + '">' + esc(t('chatReply')) + '</button>') + (canDel ? '<button class="link bad" data-act="chatdel" data-v="' + m.id + '">' + esc(t('chatDelete')) + '</button>' : '') + '</div></div>';
  }
  function composer(id, ph, parent) {
    return '<div class="chatbox"><textarea id="' + id + '" rows="' + (parent ? 2 : 3) + '" maxlength="1000" placeholder="' + esc(ph) + '"></textarea><div class="sug" id="sug-' + id + '"></div><button class="btn" data-act="chatsend" data-v="' + (parent || 0) + '">' + esc(t('chatSend')) + '</button></div>';
  }
  function viewChat() {
    var head = '<div class="row between" style="margin-bottom:6px"><button class="btn ghost small" data-act="chatback">' + esc(t('back2')) + '</button><h2 class="gold" style="font-family:var(--f-display)">' + esc(t('chatTitle')) + '</h2></div><p class="muted" style="font-size:.875rem">' + esc(t('chatSub')) + '</p>';
    if (!CH.timer) CH.timer = setInterval(function () { if (S.view === 'chat' && !document.hidden) loadChat(); }, 7000);
    if (!CH.loaded) { loadChat(); return head + '<p class="muted" style="text-align:center;padding:30px">' + esc(t('loading')) + '</p>'; }
    var guest = !S.user || S.user.guest;
    var box = guest ? '<div class="card" style="text-align:center;display:grid;gap:10px"><p>' + esc(t('chatNeedLogin')) + '</p><button class="btn" data-act="guestlogin">' + esc(t('signup')) + '</button></div>' : '<div class="card">' + composer('cmain', t('chatPh'), 0) + '</div>';
    var list = CH.items.map(function (m) {
      var reps = CH.replies[m.id] || [];
      return '<div class="card cthread">' + msgHtml(m, false) + (reps.length ? '<div class="creps">' + reps.map(function (r) { return msgHtml(r, true); }).join('') + '</div>' : '') +
        (CH.reply === m.id ? '<div class="creps">' + composer('crep', t('chatReplyPh'), m.id) + '</div>' : '') + '</div>';
    }).join('') || '<p class="muted" style="text-align:center;padding:24px">' + esc(t('chatEmpty')) + '</p>';
    return head + box + '<div class="threads">' + list + '</div>' + (CH.more ? '<button class="btn ghost" data-act="chatolder">' + esc(t('chatOlder')) + '</button>' : '');
  }
  function chatTarget() { return $(CH.reply ? '#crep' : '#cmain') || $('#cmain'); }
  function chatTag(id, name) {
    var ta = chatTarget(); if (!ta || !name || (S.user && id === S.user.id)) return;
    var tok = String(name).replace(/\s+/g, '_');
    if (!CH.mentions.some(function (m) { return m.id === id; })) CH.mentions.push({ id: id, tok: tok });
    ta.value += (ta.value && !/\s$/.test(ta.value) ? ' ' : '') + '@' + tok + ' '; ta.focus();
  }
  function chatInput(ta) {
    var box = $('#sug-' + ta.id); if (!box) return;
    var m = /@([^\s@]*)$/.exec(ta.value.slice(0, ta.selectionStart || ta.value.length));
    if (!m) { box.innerHTML = ''; return; }
    CH.active = ta.id; var q = m[1].toLowerCase();
    box.innerHTML = participants().filter(function (x) { return !q || x.tok.toLowerCase().indexOf(q) >= 0; }).slice(0, 6).map(function (x) { return '<button class="chip" type="button" data-act="chatpick" data-v="' + esc(x.id) + '">@' + esc(x.tok) + '</button>'; }).join('');
  }
  function chatPick(id) {
    var ta = $('#' + CH.active); var pp = participants().filter(function (x) { return x.id === id; })[0]; if (!ta || !pp) return;
    var pos = ta.selectionStart || ta.value.length, before = ta.value.slice(0, pos).replace(/@[^\s@]*$/, '@' + pp.tok + ' ');
    ta.value = before + ta.value.slice(pos);
    if (!CH.mentions.some(function (m) { return m.id === id; })) CH.mentions.push({ id: id, tok: pp.tok });
    var box = $('#sug-' + ta.id); if (box) box.innerHTML = ''; ta.focus();
  }
  function chatSend(parent) {
    var ta = $(parent ? '#crep' : '#cmain'); if (!ta || !sb || !S.user || S.user.guest) return;
    var body = (ta.value || '').trim(); if (!body) return;
    var ments = []; CH.mentions.forEach(function (m) { if (body.indexOf('@' + m.tok) >= 0 && ments.indexOf(m.id) < 0) ments.push(m.id); });
    var btn = ta.parentNode.querySelector('.btn'); if (btn) btn.disabled = true;
    sb.from('rm_chat').insert({ user_id: S.user.id, body: body, parent_id: parent || null, mentions: ments }).then(function (r) {
      if (btn) btn.disabled = false;
      if (r.error) { toast('warn', /rate/i.test(r.error.message || '') ? t('chatSlow') : t('chatFail'), true); return; }
      ta.value = ''; CH.mentions = []; if (parent) CH.reply = null; loadChat().then(renderViewKeepScroll);
    }).catch(function () { if (btn) btn.disabled = false; toast('warn', t('chatFail'), true); });
  }
  function chatDelete(id) {
    if (!window.confirm(t('chatDeleteQ'))) return;
    var done = function () { loadChat().then(renderViewKeepScroll); };
    if (isAdmin()) { sb.auth.getSession().then(function (g) { return callApi({ action: 'admin_chat_delete', id: id }, g.data && g.data.session ? g.data.session.access_token : null); }).then(done).catch(done); }
    else sb.from('rm_chat').delete().eq('id', id).then(done);
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
      '<div class="row"><button class="chip' + (lsGet('rm_pray') !== '0' ? ' on' : '') + '" data-act="pray">' + esc(t('prayAlert')) + '</button><button class="chip' + (S.adhan ? ' on' : '') + '" data-act="adhan">' + esc(t('adhanOn')) + '</button></div><p class="muted" style="font-size:.8125rem">' + esc(t('prayAlertNote')) + '</p>' +
      '<button class="btn" data-act="savesettings">' + esc(t('save')) + '</button>' + (S.user.guest ? '<button class="btn ghost" data-act="guestlogin">' + esc(t('guestLogin')) + '</button><p class="muted" style="font-size:.8125rem">' + esc(t('guestNote')) + '</p>' : '<button class="btn ghost" data-act="logout">' + esc(t('logout')) + '</button>') +
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
      if (now >= at) { fired[key] = 1; changed = true; if (now - at <= win) { if (type === 'prayer') announcePrayer(msg); else notify(type, msg); } }
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
    if (e.target.id === 'dsearch') { S.duaSearch = e.target.value; var dp = e.target.selectionStart; renderView(); var de = $('#dsearch'); if (de) { de.focus(); try { de.setSelectionRange(dp, dp); } catch (x) {} } }
    if (e.target.id === 'cmain' || e.target.id === 'crep') chatInput(e.target);
    if (e.target.id === 'qsearch') { S.search = e.target.value; var pos = e.target.selectionStart; renderView(); var el = $('#qsearch'); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (x) {} } }
    if (e.target.id === 'rbg' || e.target.id === 'rfg') {
      var cur = THEMES[S.rtheme.t], bgv = $('#rbg').value, fgv = $('#rfg').value;
      S.rtheme = { t: 'custom', bg: bgv, fg: fgv }; saveTheme();
      var rd = $('.rd'); if (rd) rd.setAttribute('style', themeVars());
      document.querySelectorAll('.sw.on').forEach(function (x) { x.classList.remove('on'); });
    }
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
      var ay = e.target.closest('.ayah, .ay'); if (ay && S.reader) { var i = +ay.getAttribute('data-i'); S.sel = S.sel === i ? null : i; document.querySelectorAll('.ayah.sel, .ay.sel').forEach(function (x) { x.classList.remove('sel'); }); if (S.sel != null) ay.classList.add('sel'); showActionBar(); }
      return;
    }
    var act = el.getAttribute('data-act'), v = el.getAttribute('data-v');
    switch (act) {
      case 'authlang': I18N.setLang(v); try { localStorage.setItem('rm_lang', v); } catch (x) {} renderAuth(); break;
      case 'guest': startGuest(); break;
      case 'guestlogin': closeSheet(); try { localStorage.setItem('rm_migrate', '1'); localStorage.removeItem('rm_guest'); } catch (x) {} S.user = null; S.profile = null; S.days = {}; S.bookmarks = []; S.authMode = 'signup'; renderAuth(); break;
      case 'authgo': S.authMode = v; S.authErr = ''; renderAuth(); break;
      case 'account': openAccount(); break;
      case 'savename': saveName(); break;
      case 'changepw': changePw(); break;
      case 'rmode': S.rmode = S.rmode === 'mushaf' ? 'list' : 'mushaf'; try { localStorage.setItem('rm_rmode', S.rmode); } catch (x) {} S.sel = null; renderView(); break;
      case 'doshare': doShare(); break;
      case 'qsz': setQsize(S.qsize + (+v)); break;
      case 'hintok': try { localStorage.setItem('rm_qhint', '1'); } catch (x) {} renderView(); break;
      case 'rpanel': S.rpanel = !S.rpanel; renderView(); break;
      case 'rtheme': S.rtheme = { t: v, bg: THEMES[v].bg, fg: THEMES[v].fg }; saveTheme(); renderView(); break;
      case 'google': signInGoogle(); break;
      case 'saveimg': saveImg(); break;
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
      case 'help': openHelp(); break;
      case 'intronext': if (S.introStep >= INTRO.length - 1) { S.introStep = 0; finishIntro(); } else { S.introStep++; renderIntro(); } break;
      case 'introskip': S.introStep = 0; finishIntro(); break;
      case 'introlang': I18N.setLang(v); lsSet('rm_lang', v); renderIntro(); break;
      case 'duaopen': S.duaOpen = S.duaOpen === +v ? null : +v; renderViewKeepScroll(); break;
      case 'pray': var pon = lsGet('rm_pray') === '0'; lsSet('rm_pray', pon ? '1' : '0'); el.classList.toggle('on', pon); refreshPush(); break;
      case 'adhan': S.adhan = !S.adhan; lsSet('rm_adhan', S.adhan ? '1' : '0'); el.classList.toggle('on', S.adhan); if (S.adhan) { primeAdhan(); playAdhan(); } else stopAdhan(); break;
      case 'adhanstop': stopAdhan(); el.remove(); break;
      case 'chat': openChat(); break;
      case 'chatback': S.view = 'today'; renderView(); window.scrollTo(0, 0); break;
      case 'chatsend': chatSend(+v || 0); break;
      case 'chatreply': CH.reply = CH.reply === +v ? null : +v; renderViewKeepScroll(); break;
      case 'chatdel': chatDelete(+v); break;
      case 'chatolder': CH.limit += 30; loadChat(); break;
      case 'chattag': chatTag(v, el.getAttribute('data-n')); break;
      case 'chatpick': chatPick(v); break;
      case 'notifon': unlockAudio(); chime('prayer'); enablePush(); break;
      case 'savesettings': S.profile.city = $('#setcity').value; S.profile.ramadan_start = $('#setstart').value || S.profile.ramadan_start; touchProfile(); closeSheet(); renderApp(); refreshPush(); break;
      case 'logout': flush().then(function () { return sb.auth.signOut(); }).then(function () { closeSheet(); S.user = null; S.profile = null; S.days = {}; S.authMode = 'choose'; renderAuth(); }); break;
      case 'task': mutateDay(todayIso(), function (r) { r.tasks[v] = !r.tasks[v]; }); renderViewKeepScroll(); break;
      case 'goauto': if (v === 'quran') { S.view = 'quran'; renderView(); window.scrollTo(0, 0); } else { S.view = 'worship'; renderView(); window.scrollTo(0, 0); } break;
      case 'continue': var pos = S.profile.quran_pos >= TOTAL_AYAHS ? 0 : S.profile.quran_pos, ch = chapterOf(pos); openSurah(ch.n, Math.min(pos - ch.off, ch.v - 1)); break;
      case 'qtab': S.qtab = v; renderView(); break;
      case 'surah': openSurah(+v, 0); break;
      case 'gobk': var pr = v.split(':'); openSurah(+pr[0], +pr[1] - 1); break;
      case 'delbk': var bk = S.bookmarks.filter(function (b) { return String(b.id) === v; })[0]; S.bookmarks = S.bookmarks.filter(function (b) { return b !== bk; }); if (sb && !S.user.guest && bk && bk.id) sb.from('rm_bookmarks').delete().eq('id', +v).then(function () {}); saveCache(); renderView(); break;
      case 'rback': S.reader = null; S.sel = null; renderView(); window.scrollTo(0, 0); break;
      case 'toggletr': S.showTr = !S.showTr; renderView(); break;
      case 'nextsurah': openSurah(S.reader.n + 1, 0); break;
      case 'markread': markRead(); break;
      case 'bookmark': toggleBookmark(); break;
      case 'copy': var txt = $('#dua' + v).textContent; var done = function () { toast('ok', t('dCopied'), true); }; try { navigator.clipboard.writeText(txt).then(done, function () {}); } catch (x) {} break;
      case 'tasmode': S.tasMode = +v; S.tasCount = 0; swSend({ type: 'tas_clear' }); renderView(); break;
      case 'dhikr': S.dhikr = +v; S.tasCount = 0; swSend({ type: 'tas_clear' }); renderView(); break;
      case 'tasreset': S.tasCount = 0; swSend({ type: 'tas_clear' }); renderView(); break;
      case 'namenav': var sl = $('#nameslider'); if (sl) { var dir = document.documentElement.dir === 'rtl' ? -1 : 1, step = (+v) * -1; S.nameIdx = clamp(S.nameIdx + (step), 0, 98); sl.scrollTo({ left: sl.clientWidth * S.nameIdx * dir, behavior: 'smooth' }); } break;
      case 'share': openShare();
        break;
    }
  });
  function renderViewKeepScroll() { var y = window.scrollY; renderView(); window.scrollTo(0, y); }

  boot();
  window.__RM = { S: S, renderView: renderView, calcPoints: calcPoints, quranState: quranState };
})();
