/* Prayer times from solar position (no network). Local time zone is fixed per city (Iraq = UTC+3). */
(function () {
  var RAD = Math.PI / 180;
  function sin(x) { return Math.sin(x * RAD); }
  function cos(x) { return Math.cos(x * RAD); }
  function tan(x) { return Math.tan(x * RAD); }
  function mod(x, n) { return ((x % n) + n) % n; }

  var CITIES = {
    duhok:     { lat: 36.867, lon: 42.950, tz: 3, n: { 'ku-ba': 'دهۆک', 'ku-so': 'دهۆک', ar: 'دهوك', en: 'Duhok' } },
    zakho:     { lat: 37.144, lon: 42.682, tz: 3, n: { 'ku-ba': 'زاخۆ', 'ku-so': 'زاخۆ', ar: 'زاخو', en: 'Zakho' } },
    erbil:     { lat: 36.191, lon: 44.009, tz: 3, n: { 'ku-ba': 'هەولێر', 'ku-so': 'هەولێر', ar: 'أربيل', en: 'Erbil' } },
    sulaimani: { lat: 35.557, lon: 45.435, tz: 3, n: { 'ku-ba': 'سلێمانی', 'ku-so': 'سلێمانی', ar: 'السليمانية', en: 'Sulaymaniyah' } },
    kirkuk:    { lat: 35.468, lon: 44.392, tz: 3, n: { 'ku-ba': 'کەرکووک', 'ku-so': 'کەرکووک', ar: 'كركوك', en: 'Kirkuk' } },
    mosul:     { lat: 36.340, lon: 43.130, tz: 3, n: { 'ku-ba': 'مووسڵ', 'ku-so': 'مووسڵ', ar: 'الموصل', en: 'Mosul' } },
    baghdad:   { lat: 33.315, lon: 44.366, tz: 3, n: { 'ku-ba': 'بەغدا', 'ku-so': 'بەغدا', ar: 'بغداد', en: 'Baghdad' } },
    basra:     { lat: 30.508, lon: 47.783, tz: 3, n: { 'ku-ba': 'بەسرە', 'ku-so': 'بەسرە', ar: 'البصرة', en: 'Basra' } },
    istanbul:  { lat: 41.008, lon: 28.978, tz: 3, n: { 'ku-ba': 'ئیستانبول', 'ku-so': 'ئیستانبوڵ', ar: 'إسطنبول', en: 'Istanbul' } },
    makkah:    { lat: 21.423, lon: 39.826, tz: 3, n: { 'ku-ba': 'مەککە', 'ku-so': 'مەککە', ar: 'مكة المكرمة', en: 'Makkah' } }
  };

  // minutes after local midnight, for a calendar date (y, m0 = 0-11, d)
  function dayTimes(y, m0, d, city) {
    var D = Date.UTC(y, m0, d, 12) / 86400000 + 2440587.5 - 2451545.0;
    var g = mod(357.529 + 0.98560028 * D, 360);
    var q = mod(280.459 + 0.98564736 * D, 360);
    var L = mod(q + 1.915 * sin(g) + 0.020 * sin(2 * g), 360);
    var e = 23.439 - 0.00000036 * D;
    var RA = mod(Math.atan2(cos(e) * sin(L), cos(L)) / RAD, 360) / 15;
    var decl = Math.asin(sin(e) * sin(L)) / RAD;
    var eqt = q / 15 - RA;
    while (eqt > 12) eqt -= 24;
    while (eqt < -12) eqt += 24;
    var noon = 12 + city.tz - city.lon / 15 - eqt;
    function ha(alt) { // hour angle (hours) for sun altitude `alt` (negative = below horizon)
      var c = (sin(alt) - sin(city.lat) * sin(decl)) / (cos(city.lat) * cos(decl));
      c = Math.max(-1, Math.min(1, c));
      return Math.acos(c) / RAD / 15;
    }
    var asrAlt = Math.atan(1 / (1 + tan(Math.abs(city.lat - decl)))) / RAD;
    return {
      fajr: Math.floor((noon - ha(-18)) * 60),
      sunrise: Math.floor((noon - ha(-0.833)) * 60),
      dhuhr: Math.ceil(noon * 60 + 2),
      asr: Math.ceil((noon + ha(asrAlt)) * 60),
      maghrib: Math.ceil((noon + ha(-0.833)) * 60 + 1),
      isha: Math.ceil((noon + ha(-17)) * 60)
    };
  }

  function hm(min) { min = Math.round(min); return ('0' + Math.floor(min / 60)).slice(-2) + ':' + ('0' + (min % 60)).slice(-2); }
  function instant(y, m0, d, min, tz) { return Date.UTC(y, m0, d) + (min - tz * 60) * 60000; }
  function localToday(tz) {
    var n = new Date(Date.now() + tz * 3600000);
    return { y: n.getUTCFullYear(), m: n.getUTCMonth(), d: n.getUTCDate(), min: n.getUTCHours() * 60 + n.getUTCMinutes(), sec: n.getUTCSeconds() };
  }
  function iso(y, m0, d) { return y + '-' + ('0' + (m0 + 1)).slice(-2) + '-' + ('0' + d).slice(-2); }

  window.Prayer = { CITIES: CITIES, dayTimes: dayTimes, hm: hm, instant: instant, localToday: localToday, iso: iso };
})();
