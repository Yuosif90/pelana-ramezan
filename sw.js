/* Service worker: push messages (admin + prayer-time alerts) and the persistent tasbih notification. No offline caching on purpose. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

/* tiny key-value store (IndexedDB) so the tasbih counter survives when the worker is stopped */
function idb() {
  return new Promise(function (res, rej) {
    var r = indexedDB.open('rm-sw', 1);
    r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
    r.onsuccess = function () { res(r.result); };
    r.onerror = function () { rej(r.error); };
  });
}
function kvGet(k) {
  return idb().then(function (db) { return new Promise(function (res) { var q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = function () { res(q.result); }; q.onerror = function () { res(undefined); }; }); }).catch(function () { return undefined; });
}
function kvSet(k, v) {
  return idb().then(function (db) { return new Promise(function (res) { var tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = function () { res(); }; tx.onerror = function () { res(); }; }); }).catch(function () {});
}
function windows() { return self.clients.matchAll({ type: 'window', includeUncontrolled: true }); }

function showTas(st) {
  return self.registration.showNotification(st.title || 'Tasbih', {
    tag: 'tasbih', renotify: false, requireInteraction: true, silent: true,
    icon: 'icon-192.png', badge: 'icon-192.png', dir: 'rtl',
    body: (st.name || '') + '\n' + st.count + ' / ' + st.target,
    actions: [{ action: 'plus', title: st.plus || '+1' }],
    data: { url: './', tas: true }
  });
}
function showTasDone(st) {
  return self.registration.showNotification(st.title || 'Tasbih', {
    tag: 'tasbih', renotify: true, requireInteraction: false, silent: false, vibrate: [200, 100, 200, 100, 300],
    icon: 'icon-192.png', badge: 'icon-192.png', dir: 'rtl', body: st.doneText || '', data: { url: './' }
  });
}

self.addEventListener('message', function (e) {
  var d = e.data || {};
  if (d.type === 'tas') {
    e.waitUntil(kvGet('tas').then(function (old) {
      var st = { count: d.count, target: d.target, name: d.name, title: d.title, doneText: d.doneText, plus: d.plus, pending: (old && old.pending) || 0 };
      return kvSet('tas', st).then(function () { return showTas(st); });
    }));
  } else if (d.type === 'tas_done') {
    e.waitUntil(kvSet('tas', null).then(function () { return showTasDone(d); }));
  } else if (d.type === 'tas_clear') {
    e.waitUntil(kvSet('tas', null).then(function () { return self.registration.getNotifications({ tag: 'tasbih' }); }).then(function (l) { l.forEach(function (n) { n.close(); }); }));
  } else if (d.type === 'tas_sync') {
    e.waitUntil(kvGet('tas').then(function (st) {
      if (!st || !st.pending) return;
      var n = st.pending; st.pending = 0;
      return kvSet('tas', st).then(function () { return windows(); }).then(function (list) { list.forEach(function (c) { c.postMessage({ type: 'tas_plus', n: n }); }); });
    }));
  }
});

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'پلانا هەیڤا رەمەزانێ', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(windows().then(function (list) {
    var visible = list.filter(function (c) { return c.visibilityState === 'visible'; });
    if (d.kind === 'prayer' && visible.length) { // the open app plays the adhan and shows its own toast
      visible.forEach(function (c) { c.postMessage({ type: 'adhan', body: d.body || '', title: d.title || '' }); });
      return;
    }
    var opt = { body: d.body || '', icon: 'icon-192.png', badge: 'icon-192.png', dir: 'rtl', lang: 'ckb', data: { url: d.url || './' } };
    if (d.kind === 'prayer') { opt.tag = d.tag || 'prayer'; opt.renotify = true; opt.requireInteraction = true; opt.vibrate = [300, 150, 300, 150, 500]; }
    return self.registration.showNotification(d.title || 'پلانا هەیڤا رەمەزانێ', opt);
  }));
});

self.addEventListener('notificationclick', function (e) {
  var n = e.notification, data = n.data || {};
  if (e.action === 'plus' && data.tas) { // +1 straight from the notification, without opening the app
    e.waitUntil(kvGet('tas').then(function (st) {
      if (!st || st.target == null) { n.close(); return; }
      st.count = st.count + 1;
      var done = st.count >= st.target; if (done) st.count = 0;
      return windows().then(function (list) {
        if (list.length) list.forEach(function (c) { c.postMessage({ type: 'tas_plus', n: 1 }); }); else st.pending = (st.pending || 0) + 1;
        return kvSet('tas', done ? { pending: st.pending || 0 } : st).then(function () { return done ? showTasDone(st) : showTas(st); });
      });
    }));
    return;
  }
  n.close();
  var url = data.url || './';
  e.waitUntil(windows().then(function (list) {
    for (var i = 0; i < list.length; i++) { if ('focus' in list[i]) return list[i].focus(); }
    return self.clients.openWindow(url);
  }));
});
