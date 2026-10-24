/**
 * Fuente Cuevana — Extracción directa HLS (.m3u8) / MP4
 * getStreams + extract con resolvers (VOE, StreamWish, VidHide)
 */
var TMDB_KEY_SRC = 'a2d9bbed370d9f678e34006f8750a5a5';
var TMDB = 'https://api.themoviedb.org/3';
var BASE_SRC = 'https://wv3.cuevana3.eu';
var UA_SRC =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
var ALLOWED = [
  'streamwish', 'vidhide', 'filelions', 'vidhidepro',
  'streamwish.to', 'vidhidepro.com', 'filelions.com', 'filelions.to',
  'voe', 'dood', 'ok.ru', 'filemoon', 'hlswish', 'hglink', 'awish',
  'strwish', 'wishfast', 'hanerix', 'embedwish', 'callistanise',
  'playnixes', 'hgplaycdn', 'minochinos', 'vadisov', 'vaiditv',
  'vibuxer', 'premilkyway', 'dintezuvio', 'dramiyos', 'wishembed'
];

function srcBase() {
  var c = (globalThis.__nuvioConfig && globalThis.__nuvioConfig.current) || {};
  return (c.base_url || BASE_SRC).toString().replace(/\/$/, '') || BASE_SRC;
}
function srcTmdbKey() {
  var c = (globalThis.__nuvioConfig && globalThis.__nuvioConfig.current) || {};
  var k = (c.tmdb_key || '').toString().trim();
  return k || TMDB_KEY_SRC;
}

async function httpGet(url, headers) {
  try {
    var h = Object.assign(
      {
        'User-Agent': UA_SRC,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-MX,es;q=0.9',
      },
      headers || {}
    );
    var res = await fetchT(url, { headers: h, redirect: 'follow' });
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    return null;
  }
}
async function httpGetJson(url) {
  try {
    var res = await fetchT(url, {
      headers: { Accept: 'application/json', 'User-Agent': UA_SRC },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}
function slugify(title) {
  var s = String(title || '').trim().toLowerCase();
  var map = {
    á: 'a', à: 'a', ä: 'a', â: 'a', ã: 'a',
    é: 'e', è: 'e', ë: 'e', ê: 'e',
    í: 'i', ì: 'i', ï: 'i', î: 'i',
    ó: 'o', ò: 'o', ö: 'o', ô: 'o', õ: 'o',
    ú: 'u', ù: 'u', ü: 'u', û: 'u',
    ñ: 'n', ç: 'c',
  };
  Object.keys(map).forEach(function (k) {
    s = s.split(k).join(map[k]);
  });
  s = s.replace(/[^a-z0-9\s-]/g, '').replace(/[\s-]+/g, '-');
  return s.replace(/^-+|-+$/g, '');
}
function normalizeLanguage(language) {
  var lang = String(language || '').toLowerCase().trim();
  if (!lang) return 'Latino';
  if (
    lang.indexOf('castellano') >= 0 ||
    lang.indexOf('españa') >= 0 ||
    lang.indexOf('es_es') >= 0 ||
    lang === 'spanish' ||
    lang === 'esp'
  ) {
    return 'Castellano';
  }
  if (
    lang.indexOf('sub') >= 0 ||
    lang.indexOf('vose') >= 0 ||
    lang.indexOf('subtit') >= 0
  ) {
    return 'Subtitulado';
  }
  if (
    lang.indexOf('ingl') >= 0 ||
    lang.indexOf('english') >= 0 ||
    lang.indexOf('en_us') >= 0 ||
    lang === 'en'
  ) {
    return 'Inglés';
  }
  if (lang.indexOf('japon') >= 0 || lang.indexOf('ja_') >= 0) {
    return 'Japonés';
  }
  return 'Latino';
}
function langCode(language) {
  var n = normalizeLanguage(language);
  if (n === 'Castellano') return 'es_ES';
  if (n === 'Inglés') return 'en_US';
  if (n === 'Japonés') return 'ja_JA';
  if (n === 'Subtitulado') return 'sub';
  return 'es_MX';
}
function isAllowed(name) {
  var n = String(name || '').toLowerCase();
  for (var i = 0; i < ALLOWED.length; i++) {
    if (n.indexOf(ALLOWED[i]) >= 0) return true;
  }
  return false;
}
var DEBUG = false;
function dbg() {
  if (!DEBUG || typeof console === 'undefined') return;
  try {
    console.log.apply(console, ['[Cuevana]'].concat([].slice.call(arguments)));
  } catch (e) {}
}
function fetchT(url, opts, ms) {
  opts = opts || {};
  ms = ms || 8000;
  if (typeof AbortController === 'undefined') return fetch(url, opts);
  var ctrl = new AbortController();
  var timer = setTimeout(function () {
    try {
      ctrl.abort();
    } catch (e) {}
  }, ms);
  return fetch(url, Object.assign({}, opts, { signal: ctrl.signal })).then(
    function (r) {
      clearTimeout(timer);
      return r;
    },
    function (e) {
      clearTimeout(timer);
      throw e;
    }
  );
}
function originOf(url) {
  var m = /^(https?:\/\/[^\/?#]+)/i.exec(String(url || ''));
  return m ? m[1] : '';
}
function absUrl(u, base) {
  u = String(u || '').trim();
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.indexOf('//') === 0) return 'https:' + u;
  var origin = originOf(base);
  if (u.charAt(0) === '/') return origin + u;
  var rest = String(base || '').slice(origin.length).replace(/[?#][\s\S]*$/, '');
  if (!rest) return origin + '/' + u;
  return origin + rest.replace(/\/[^\/]*$/, '/') + u;
}
function withHost(url, host) {
  return String(url).replace(/^(https?:\/\/)[^\/?#]+/i, '$1' + host);
}
var HOST_MAP = {
  streamwish: 'vibuxer.com',
  hglink: 'vibuxer.com',
  awish: 'vibuxer.com',
  strwish: 'vibuxer.com',
  wishfast: 'vibuxer.com',
  embedwish: 'vibuxer.com',
  wishembed: 'vibuxer.com',
  filelions: 'callistanise.com',
  vidhidepro: 'callistanise.com',
  vidhide: 'callistanise.com',
};
function mapDomain(url) {
  var s = String(url || '').trim();
  if (!s) return s;
  if (s.indexOf('//') === 0) s = 'https:' + s;
  var m = /^https?:\/\/([^\/?#:]+)/i.exec(s);
  if (!m) return s;
  var labels = m[1].toLowerCase().replace(/^www\./, '').split('.');
  for (var i = 0; i < labels.length - 1; i++) {
    if (HOST_MAP[labels[i]]) return withHost(s, HOST_MAP[labels[i]]);
  }
  return s;
}
function embedCandidates(url) {
  var s = String(url || '').trim();
  if (s.indexOf('//') === 0) s = 'https:' + s;
  var mapped = mapDomain(s);
  var list = [mapped, s];
  if (detectServer(mapped) === 'streamwish') list.push(withHost(s, 'hlswish.com'));
  return list.filter(function (v, i, a) {
    return v && a.indexOf(v) === i;
  });
}
function hostOf(url) {
  var m = /^(?:https?:)?\/\/([^\/?#]+)/i.exec(String(url || ''));
  return m ? m[1].toLowerCase() : String(url || '').toLowerCase();
}
function detectServer(url) {
  var s = hostOf(url);
  if (
    s.indexOf('voe') >= 0 ||
    s.indexOf('voesx') >= 0 ||
    s.indexOf('cloudwindow') >= 0 ||
    s.indexOf('marissashare') >= 0
  )
    return 'voe';
  if (
    s.indexOf('streamwish') >= 0 ||
    s.indexOf('hlswish') >= 0 ||
    s.indexOf('hglink') >= 0 ||
    s.indexOf('vibuxer') >= 0 ||
    s.indexOf('premilkyway') >= 0 ||
    s.indexOf('wishembed') >= 0 ||
    s.indexOf('awish') >= 0 ||
    s.indexOf('strwish') >= 0 ||
    s.indexOf('wishfast') >= 0 ||
    s.indexOf('hanerix') >= 0 ||
    s.indexOf('embedwish') >= 0 ||
    s.indexOf('playnixes') >= 0 ||
    s.indexOf('hgplaycdn') >= 0
  )
    return 'streamwish';
  if (
    s.indexOf('vidhide') >= 0 ||
    s.indexOf('filelions') >= 0 ||
    s.indexOf('minochinos') >= 0 ||
    s.indexOf('dintezuvio') >= 0 ||
    s.indexOf('dramiyos') >= 0 ||
    s.indexOf('callistanise') >= 0 ||
    s.indexOf('vadisov') >= 0 ||
    s.indexOf('vaiditv') >= 0
  )
    return 'vidhide';
  if (s.indexOf('dood') >= 0 || s.indexOf('ds2play') >= 0 || s.indexOf('ds2video') >= 0)
    return 'doodstream';
  if (s.indexOf('player.cuevana') >= 0 || s.indexOf('player.php') >= 0)
    return 'cuevana-player';
  return 'unknown';
}
var QUALITY_MAPS = {
  vimeos: { h: '720p', n: '480p' },
  goodstream: { x: '1080p', h: '720p', n: '480p', l: '360p' },
  vidhide: { n: '720p', l: '480p' },
  streamwish: { x: '1080p', h: '1080p', n: '720p', l: '480p' },
  voe: { n: '720p', l: '360p' },
};
var QUALITY_ORDER = ['x', 'o', 'h', 'n', 'l'];
function qualityMapForUrl(url) {
  if (url.indexOf('vimeos') >= 0) return QUALITY_MAPS.vimeos;
  if (url.indexOf('goodstream') >= 0) return QUALITY_MAPS.goodstream;
  if (url.indexOf('cloudwindow') >= 0) return QUALITY_MAPS.voe;
  if (
    url.indexOf('minochinos') >= 0 ||
    url.indexOf('vidhide') >= 0 ||
    url.indexOf('dintezuvio') >= 0 ||
    url.indexOf('dramiyos') >= 0
  )
    return QUALITY_MAPS.vidhide;
  if (
    url.indexOf('premilkyway') >= 0 ||
    url.indexOf('hlswish') >= 0 ||
    url.indexOf('vibuxer') >= 0 ||
    url.indexOf('streamwish') >= 0
  )
    return QUALITY_MAPS.streamwish;
  return null;
}
function detectQualityFromUrl(url) {
  if (!url) return 'Unknown';
  var map = qualityMapForUrl(url);
  if (map) {
    var m = url.match(/_,([a-z,]+),\.urlset/);
    if (m) {
      var parts = m[1].split(',').filter(Boolean);
      for (var i = 0; i < QUALITY_ORDER.length; i++) {
        var key = QUALITY_ORDER[i];
        if (parts.indexOf(key) >= 0 && map[key]) return map[key];
      }
    }
  }
  var p = url.match(/[_\-\/](\d{3,4})p/);
  return p ? p[1] + 'p' : 'Unknown';
}
function resToQuality(w, h) {
  if (w >= 3840 || h >= 2160) return '4K';
  if (w >= 1920 || h >= 1080) return '1080p';
  if (w >= 1280 || h >= 720) return '720p';
  if (w >= 854 || h >= 480) return '480p';
  return '360p';
}
async function detectQuality(url, headers) {
  var q = detectQualityFromUrl(url);
  if (q !== 'Unknown') return q;
  try {
    var res = await fetchT(url, {
      headers: Object.assign({ 'User-Agent': UA_SRC }, headers || {}),
      redirect: 'follow',
    });
    var text = await res.text();
    if (!text.includes('#EXT-X-STREAM-INF')) {
      var m = url.match(/[_-](\d{3,4})p/);
      return m ? m[1] + 'p' : 'Unknown';
    }
    var maxH = 0,
      maxW = 0;
    text.split('\n').forEach(function (line) {
      var r = line.match(/RESOLUTION=(\d+)x(\d+)/);
      if (r) {
        var h = parseInt(r[2], 10);
        if (h > maxH) {
          maxH = h;
          maxW = parseInt(r[1], 10);
        }
      }
    });
    return maxH > 0 ? resToQuality(maxW, maxH) : 'Unknown';
  } catch (e) {
    return 'Unknown';
  }
}
function b64decode(s) {
  try {
    if (typeof atob !== 'undefined') return atob(s);
    if (typeof Buffer !== 'undefined') return Buffer.from(s, 'base64').toString('utf8');
  } catch (e) {}
  return null;
}
var PACKER_ARGS =
  /\}\s*\(\s*(['"])((?:\\[\s\S]|(?!\1)[^\\])*)\1\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(['"])((?:\\[\s\S]|(?!\5)[^\\])*)\5\s*\.split\(\s*(['"])\|\7\s*\)/g;
function unpackOne(p, a, k) {
  p = p.replace(/\\(['"\\])/g, '$1');
  var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function unbase(s) {
    var r = 0;
    for (var i = 0; i < s.length; i++) {
      var pos = chars.indexOf(s.charAt(i));
      if (pos < 0 || pos >= a) return NaN;
      r = r * a + pos;
    }
    return r;
  }
  return p.replace(/\b\w+\b/g, function (tok) {
    var idx = unbase(tok);
    if (isNaN(idx) || idx >= k.length) return tok;
    return k[idx] ? k[idx] : tok;
  });
}
function unpackAll(text) {
  var out = [];
  var queue = [String(text || '')];
  var guard = 0;
  while (queue.length && guard++ < 8) {
    var src = queue.shift();
    var re = new RegExp(PACKER_ARGS.source, 'g');
    var m;
    while ((m = re.exec(src)) !== null) {
      try {
        var un = unpackOne(m[2], parseInt(m[3], 10), m[6].split('|'));
        out.push(un);
        if (/eval\(function\(p,a,c,k,e,/.test(un)) queue.push(un);
      } catch (e) {}
    }
  }
  return out;
}
function findM3u8(text) {
  if (!text) return null;
  var m =
    /["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i.exec(text) ||
    /(https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*)/i.exec(text) ||
    /file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i.exec(text);
  if (!m) return null;
  return (m[1] || m[0]).replace(/\\/g, '');
}
function extractHlsFromUnpacked(text, origin) {
  if (!text) return null;
  var found = {};
  var re = /["']?\b(hls[234]?)["']?\s*:\s*["']([^"']+)["']/g;
  var m;
  while ((m = re.exec(text)) !== null) {
    var v = m[2].replace(/\\/g, '');
    if (/^(https?:)?\/\//i.test(v) || v.charAt(0) === '/') {
      if (!found[m[1]]) found[m[1]] = v;
    }
  }
  var pick = found.hls4 || found.hls3 || found.hls2 || found.hls;
  if (pick) return absUrl(pick, origin + '/');
  var abs = findM3u8(text);
  if (abs) return abs;
  var rel = /["'](\/[^"'\s]+\.m3u8[^"']*)["']/i.exec(text);
  if (rel) return absUrl(rel[1].replace(/\\/g, ''), origin + '/');
  var f = /file\s*:\s*["']([^"']+\.mp4[^"']*)["']/i.exec(text);
  if (f) return absUrl(f[1].replace(/\\/g, ''), origin + '/');
  return null;
}
function findStream(html, origin) {
  if (!html) return null;
  var layers = unpackAll(html).concat([html]);
  for (var i = 0; i < layers.length; i++) {
    var s = extractHlsFromUnpacked(layers[i], origin);
    if (s) return s;
  }
  return null;
}
async function followStream(u, origin) {
  if (u.indexOf('.m3u8') >= 0 || u.indexOf('.mp4') >= 0) return u;
  if (u.indexOf('/stream/') < 0) return u;
  try {
    var f = await fetchT(u, {
      headers: { 'User-Agent': UA_SRC, Referer: origin + '/' },
      redirect: 'follow',
    });
    if (f && f.url && f.url.indexOf('.m3u8') >= 0) return f.url;
  } catch (e) {}
  return u;
}
function voeDecode(encoded, keysRaw) {
  try {
    var keys = keysRaw
      .replace(/^\[|\]$/g, '')
      .split("','")
      .map(function (o) {
        return o.replace(/^'+|'+$/g, '');
      })
      .map(function (o) {
        return o.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      });
    var s = '';
    for (var i = 0; i < encoded.length; i++) {
      var u = encoded.charCodeAt(i);
      if (u > 64 && u < 91) u = ((u - 52) % 26) + 65;
      else if (u > 96 && u < 123) u = ((u - 84) % 26) + 97;
      s += String.fromCharCode(u);
    }
    for (var j = 0; j < keys.length; j++) {
      s = s.split(keys[j]).join('_');
    }
    s = s.split('_').join('');
    var r1 = b64decode(s);
    if (!r1) return null;
    var a = '';
    for (var k = 0; k < r1.length; k++) {
      a += String.fromCharCode((r1.charCodeAt(k) - 3 + 256) % 256);
    }
    var reversed = a.split('').reverse().join('');
    var r2 = b64decode(reversed);
    return r2 ? JSON.parse(r2) : null;
  } catch (e) {
    return null;
  }
}
async function resolveVoe(url) {
  try {
    var res = await fetchT(url, {
      headers: {
        'User-Agent': UA_SRC,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        Referer: url,
      },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    var html = await res.text();
    if (/permanentToken/i.test(html)) {
      var redir = html.match(/window\.location\.href\s*=\s*'([^']+)'/i);
      if (redir) {
        var res2 = await fetchT(redir[1], {
          headers: { 'User-Agent': UA_SRC, Referer: url },
          redirect: 'follow',
        });
        if (res2.ok) html = await res2.text();
      }
    }
    var jsonMatch = html.match(
      /json">\s*\[\s*['"]([^'"]+)['"]\s*\]\s*<\/script>\s*<script[^>]*src=['"]([^'"]+)['"]/i
    );
    if (jsonMatch) {
      var enc = jsonMatch[1];
      var loaderUrl = jsonMatch[2].startsWith('http')
        ? jsonMatch[2]
        : absUrl(jsonMatch[2], url);
      var loaderRes = await fetchT(loaderUrl, {
        headers: { 'User-Agent': UA_SRC, Referer: url },
        redirect: 'follow',
      });
      var loaderText = loaderRes.ok ? await loaderRes.text() : '';
      var keysMatch =
        loaderText.match(/(\[(?:'[^']{1,10}'[\s,]*){4,12}\])/i) ||
        loaderText.match(/(\[(?:"[^"]{1,10}"[,\s]*){4,12}\])/i);
      if (keysMatch) {
        var decoded = voeDecode(enc, keysMatch[1]);
        if (decoded && (decoded.source || decoded.direct_access_url)) {
          var streamUrl = decoded.source || decoded.direct_access_url;
          return {
            url: streamUrl,
            quality: detectQualityFromUrl(streamUrl),
            headers: { Referer: url, 'User-Agent': UA_SRC },
          };
        }
      }
    }
    var patterns = [
      /(?:mp4|hls)'\s*:\s*'([^']+)'/gi,
      /(?:mp4|hls)"\s*:\s*"([^"]+)"/gi,
    ];
    for (var pi = 0; pi < patterns.length; pi++) {
      var re = patterns[pi];
      var m;
      while ((m = re.exec(html)) !== null) {
        var u = m[1];
        if (!u) continue;
        if (u.indexOf('aHR0') === 0) {
          try {
            u = b64decode(u) || u;
          } catch (e) {}
        }
        return {
          url: u,
          quality: detectQualityFromUrl(u),
          headers: { Referer: url, 'User-Agent': UA_SRC },
        };
      }
    }
    var m3u8 = findM3u8(html);
    if (m3u8) {
      return {
        url: m3u8,
        quality: detectQualityFromUrl(m3u8),
        headers: { Referer: url, 'User-Agent': UA_SRC },
      };
    }
  } catch (e) {}
  return null;
}
async function resolvePacked(url) {
  var origin = originOf(url);
  var html = null;
  var referers = ['https://embed69.org/', srcBase() + '/'];
  for (var i = 0; i < referers.length && !html; i++) {
    html = await httpGet(url, { Referer: referers[i], Origin: originOf(referers[i]) });
  }
  if (!html) {
    dbg('sin HTML', url);
    return null;
  }
  var s = findStream(html, origin);
  if (!s) {
    dbg('HTML sin stream', url, html.length);
    return null;
  }
  s = await followStream(s, origin);
  return {
    url: s,
    quality: await detectQuality(s, { Referer: origin + '/' }),
    headers: { 'User-Agent': UA_SRC, Referer: origin + '/', Origin: origin },
  };
}
function resolveStreamWish(url) {
  return resolvePacked(url);
}
function resolveVidHide(url) {
  return resolvePacked(url);
}
/** Desenvuelve player.cuevana3.eu/player.php?h=... → embed real (voe/streamwish/dood/...) */
async function unwrapCuevanaPlayer(url) {
  var u = String(url || '');
  if (u.indexOf('player.php') < 0 && u.indexOf('player.cuevana') < 0) return null;
  try {
    var html = await httpGet(u, {
      Referer: srcBase() + '/',
      Accept: 'text/html,application/xhtml+xml',
    });
    if (!html) return null;
    // var url = 'https://voe.sx/e/...'  (formato actual del player)
    var m =
      /var\s+url\s*=\s*['"](https?:\/\/[^'"]+)['"]/i.exec(html) ||
      /window\.location\.href\s*=\s*['"](https?:\/\/[^'"]+)['"]/i.exec(html) ||
      /location\.replace\(\s*['"](https?:\/\/[^'"]+)['"]/i.exec(html) ||
      /src\s*=\s*['"](https?:\/\/(?:voe|streamwish|dood|filemoon|vidhide|filelions)[^'"]+)['"]/i.exec(html);
    if (m && m[1] && m[1].indexOf('player.php') < 0) {
      dbg('unwrap player →', m[1]);
      return m[1];
    }
  } catch (e) {
    dbg('unwrap player error', e && e.message);
  }
  return null;
}

async function resolveGeneric(url, depth) {
  depth = depth || 0;
  try {
    // Si es el player intermedio de Cuevana, primero sacar el embed real
    var unwrapped = await unwrapCuevanaPlayer(url);
    if (unwrapped && unwrapped !== url) {
      return await extract(unwrapped, depth + 1);
    }

    var html = await httpGet(url, { Referer: srcBase() + '/' });
    if (!html) return null;
    var origin = originOf(url);
    var m1 =
      /var\s+url\s*=\s*['"]([^'"]+)['"]/i.exec(html) ||
      /window\.location\.href\s*=\s*['"]([^'"]+)['"]/i.exec(html);
    if (m1) {
      var redirected = absUrl(m1[1], url);
      if (redirected && redirected !== url && redirected.indexOf('player.php') < 0) {
        var r1 = await extract(redirected, depth + 1);
        if (r1) return r1;
      }
    }
    var streamUrl = findStream(html, origin);
    if (streamUrl) {
      return {
        url: streamUrl,
        quality: detectQualityFromUrl(streamUrl),
        headers: { 'User-Agent': UA_SRC, Referer: url, Origin: origin },
      };
    }
    var ifr = /<iframe[^>]+src=["']([^"']+)["']/i.exec(html);
    if (ifr) {
      var ifUrl = absUrl(ifr[1], url);
      if (ifUrl && ifUrl !== url) return await extract(ifUrl, depth + 1);
    }
  } catch (e) {
    dbg('generic error', url, e && e.message);
  }
  return null;
}
function isStreamUrl(u) {
  u = String(u || '').toLowerCase();
  return (
    u.indexOf('.m3u8') >= 0 ||
    u.indexOf('.mp4') >= 0 ||
    u.indexOf('/hls/') >= 0 ||
    u.indexOf('/stream/') >= 0 ||
    u.indexOf('playlist') >= 0
  );
}
async function extractOne(url, depth) {
  var server = detectServer(url);
  var result = null;
  try {
    // Player intermedio Cuevana → desenvuelve y re-extrae
    if (server === 'cuevana-player' || String(url).indexOf('player.php') >= 0) {
      var real = await unwrapCuevanaPlayer(url);
      if (real) return await extract(real, depth + 1);
    }
    if (server === 'voe') result = await resolveVoe(url);
    else if (server === 'streamwish') result = await resolveStreamWish(url);
    else if (server === 'vidhide') result = await resolveVidHide(url);
    else result = await resolveGeneric(url, depth);
  } catch (e) {
    dbg('resolver error', server, url, e && e.message);
    result = null;
  }
  if ((!result || !result.url) && server !== 'unknown' && server !== 'cuevana-player') {
    try {
      result = await resolveGeneric(url, depth);
    } catch (e) {}
  }
  return result;
}
async function extract(embedUrl, depth) {
  depth = depth || 0;
  if (!embedUrl || depth > 4) return null;

  // Siempre intentar desenvvolver player.php primero
  if (String(embedUrl).indexOf('player.php') >= 0 || String(embedUrl).indexOf('player.cuevana') >= 0) {
    var realEmbed = await unwrapCuevanaPlayer(embedUrl);
    if (realEmbed && realEmbed !== embedUrl) {
      dbg('player.php →', realEmbed);
      return await extract(realEmbed, depth + 1);
    }
  }

  var candidates = embedCandidates(embedUrl);
  dbg('candidatos', candidates);
  for (var i = 0; i < candidates.length; i++) {
    var r = await extractOne(candidates[i], depth);
    if (r && r.url && r.url !== candidates[i] && isStreamUrl(r.url)) {
      dbg('OK', candidates[i], '→', r.url);
      return r;
    }
  }
  return null;
}
async function getTmdbInfo(tmdbId, isMovie) {
  var endpoint = isMovie ? 'movie' : 'tv';
  async function fetchLang(lang) {
    try {
      return await httpGetJson(
        TMDB + '/' + endpoint + '/' + tmdbId + '?api_key=' + srcTmdbKey() + '&language=' + lang
      );
    } catch (e) {
      return null;
    }
  }
  var es = await fetchLang('es-MX');
  var eses = await fetchLang('es-ES');
  var en = await fetchLang('en-US');
  var dateStr = isMovie
    ? (es && es.release_date) || (en && en.release_date)
    : (es && es.first_air_date) || (en && en.first_air_date);
  var year = null;
  if (dateStr && String(dateStr).length >= 4)
    year = parseInt(String(dateStr).slice(0, 4), 10);
  return {
    id: tmdbId,
    latino: (es && (es.title || es.name)) || '',
    castellano: (eses && (eses.title || eses.name)) || '',
    ingles: (en && (en.title || en.name)) || '',
    year: year,
  };
}
function extractNextData(html) {
  var m = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!m) return null;
  try {
    var data = JSON.parse(m[1]);
    return data.props && data.props.pageProps ? data.props.pageProps : null;
  } catch (e) {
    return null;
  }
}
function videoGroupsFromData(videos) {
  var langMap = {
    latino: 'Latino',
    spanish: 'Castellano',
    english: 'Inglés',
    japanese: 'Japonés',
  };
  var groups = [];
  Object.keys(langMap).forEach(function (key) {
    var list = videos[key];
    if (!list || !list.length) return;
    var vids = [];
    list.forEach(function (v) {
      var cyber = (v.cyberlocker || '').toString();
      var url = (v.result || '').toString();
      var quality = (v.quality || 'HD').toString();
      if (!url) return;
      vids.push({ cyberlocker: cyber, url: url, quality: quality });
    });
    if (vids.length) groups.push({ language: langMap[key], videos: vids });
  });
  return groups;
}
async function scrapeMovie(tmdb) {
  var prefix = srcBase() + '/ver-pelicula/';
  var titles = [tmdb.latino, tmdb.castellano, tmdb.ingles];
  var candidates = [];
  titles.forEach(function (title) {
    if (!title || !String(title).trim()) return;
    var slug = slugify(title);
    if (!slug) return;
    candidates.push(prefix + slug);
    candidates.push(prefix + slug + '-' + tmdb.id);
    if (tmdb.year) candidates.push(prefix + slug + '-' + tmdb.year);
  });
  candidates = candidates.filter(function (v, i, a) {
    return a.indexOf(v) === i;
  });
  for (var i = 0; i < candidates.length; i++) {
    var html = await httpGet(candidates[i], {
      Accept: 'text/html',
      'Accept-Language': 'es-ES,es;q=0.9',
    });
    if (
      html &&
      html.indexOf('__NEXT_DATA__') >= 0 &&
      html.indexOf('"thisMovie"') >= 0
    ) {
      var pageProps = extractNextData(html);
      if (pageProps && pageProps.thisMovie && pageProps.thisMovie.videos) {
        return videoGroupsFromData(pageProps.thisMovie.videos);
      }
    }
  }
  return [];
}
async function scrapeEpisode(tmdb, season, episode) {
  var nombres = [];
  if (tmdb.latino && tmdb.latino.trim()) nombres.push(tmdb.latino);
  if (tmdb.castellano && tmdb.castellano.trim()) nombres.push(tmdb.castellano);
  if (tmdb.ingles && tmdb.ingles.trim()) nombres.push(tmdb.ingles);
  var candidates = [];
  nombres.forEach(function (nombre) {
    var slug = slugify(nombre);
    if (!slug) return;
    candidates.push(
      srcBase() +
        '/episodio/' +
        slug +
        '-temporada-' +
        season +
        '-episodio-' +
        episode
    );
    candidates.push(
      srcBase() +
        '/episodio/' +
        slug +
        '-' +
        tmdb.id +
        '-temporada-' +
        season +
        '-episodio-' +
        episode
    );
  });
  for (var i = 0; i < candidates.length; i++) {
    var html = await httpGet(candidates[i], {
      Accept: 'text/html',
      'Accept-Language': 'es-ES,es;q=0.9',
    });
    if (
      html &&
      html.indexOf('__NEXT_DATA__') >= 0 &&
      html.indexOf('"episode"') >= 0
    ) {
      var pageProps = extractNextData(html);
      if (pageProps && pageProps.episode && pageProps.episode.videos) {
        return videoGroupsFromData(pageProps.episode.videos);
      }
    }
  }
  return [];
}
async function processVideo(group, video) {
  try {
    var embedUrl = String(video.url || '').trim();
    if (!embedUrl) return null;
    var extracted = await extract(embedUrl, 0);
    if (!extracted || !extracted.url) {
      dbg('descartado (sin m3u8)', embedUrl);
      return null;
    }
    var serverName = video.cyberlocker
      ? video.cyberlocker.charAt(0).toUpperCase() + video.cyberlocker.slice(1)
      : 'Servidor';
    var q = extracted.quality;
    if (!q || q === 'Unknown') q = video.quality || 'HD';
    var langLabel = normalizeLanguage(group.language);
    var code = langCode(langLabel);
    var isHls =
      String(extracted.url).indexOf('.m3u8') >= 0 ||
      String(extracted.url).indexOf('/hls/') >= 0;
    return {
      name: langLabel + ' · ' + serverName + ' · ' + q,
      title: langLabel + ' - ' + serverName,
      url: extracted.url,
      quality: q,
      language: langLabel,
      lang: langLabel,
      audio: langLabel,
      langCode: code,
      provider: serverName,
      isHls: isHls,
      headers: extracted.headers || {
        'User-Agent': UA_SRC,
        Referer: originOf(embedUrl) + '/',
      },
    };
  } catch (e) {
    dbg('processVideo error', e && e.message);
    return null;
  }
}

/** Resuelve tmdbId a partir de URL de ficha Cuevana o id tmdb: */
async function resolveTmdbIdFromId(id) {
  id = String(id || '').trim();
  if (!id) return null;
  if (/^\d+$/.test(id)) return parseInt(id, 10);
  if (id.indexOf('tmdb:') === 0) {
    var parts = id.split(':');
    var n = parseInt(parts[parts.length - 1], 10);
    return isNaN(n) ? null : n;
  }
  // URL → leer __NEXT_DATA__ y sacar TMDbId
  if (/^https?:\/\//i.test(id)) {
    var html = await httpGet(id, { Accept: 'text/html' });
    if (!html) return null;
    var pp = extractNextData(html);
    if (!pp) return null;
    var raw = pp.thisMovie || pp.thisSerie || pp.movie || pp.serie || pp.episode || null;
    if (raw && (raw.TMDbId || raw.tmdbId || raw.tmdb_id)) {
      return parseInt(raw.TMDbId || raw.tmdbId || raw.tmdb_id, 10);
    }
    // a veces en el propio pageProps
    if (pp.TMDbId) return parseInt(pp.TMDbId, 10);
  }
  return null;
}

/**
 * getStreams real para Nuvio.
 * id = URL de ficha | tmdb:movie:N | número
 */
async function getStreamsReal(id, type, season, episode) {
  var tmdbId = await resolveTmdbIdFromId(id);
  if (!tmdbId) {
    dbg('sin tmdbId para', id);
    return [];
  }
  var isMovie =
    String(type || '').toLowerCase().indexOf('tv') < 0 &&
    String(type || '').toLowerCase().indexOf('series') < 0;

  // Si la URL es de serie, forzar tv
  if (/\/ver-serie\//i.test(String(id)) || /\/episodio\//i.test(String(id))) {
    isMovie = false;
  }

  var tmdb = await getTmdbInfo(tmdbId, isMovie);
  if (!tmdb.latino && !tmdb.ingles && !tmdb.castellano) return [];

  var groups = isMovie
    ? await scrapeMovie(tmdb)
    : await scrapeEpisode(tmdb, season || 1, episode || 1);

  var jobs = [];
  groups.forEach(function (group) {
    group.videos.forEach(function (video) {
      // Sin filtro: intenta resolver TODOS los servidores (streamwish, voe, dood, etc.)
      jobs.push(processVideo(group, video));
    });
  });

  var results = await Promise.all(jobs);
  var out = [];
  var seen = {};
  results.forEach(function (r) {
    if (!r || !r.url || seen[r.url]) return;
    seen[r.url] = true;
    out.push(r);
  });
  return out;
}


// ─── CATALOG + API NUVIO ─────────────────────────────────────────

/**
 * Repo Nuvio – Cuevana
 *
 * Flujo:
 *  1) getHome / search / getDiscover → items con id = URL de la ficha
 *  2) La app abre detalles con ese id (URL)
 *  3) getMeta(url) lee esa URL, parsea __NEXT_DATA__ y devuelve meta (+ seasons)
 *  4) getStreams(id, type, season, episode) obtiene servidores (headers, idioma, calidad)
 *
 * Config usuario (ajustes del repo en la app):
 *   globalThis.__nuvioConfig.current.base_url
 *   globalThis.__nuvioConfig.current.tmdb_key
 */

var DEFAULT_BASE = 'https://wv3.cuevana3.eu';
var TMDB_BASE = 'https://api.themoviedb.org/3';
var TMDB_IMG = 'https://image.tmdb.org/t/p';
var DEFAULT_TMDB_KEY = 'a2d9bbed370d9f678e34006f8750a5a5';
var TMDB_LANG = 'es-MX';

var GENEROS = [
  'accion', 'aventura', 'animacion', 'ciencia-ficcion', 'crimen',
  'drama', 'familia', 'fantasia', 'misterio', 'romance', 'suspense', 'terror',
  'comedia',
];

var UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function cfg() {
  return (globalThis.__nuvioConfig && globalThis.__nuvioConfig.current) || {};
}

function BASE() {
  var b = (cfg().base_url || DEFAULT_BASE).toString().replace(/\/$/, '');
  return b || DEFAULT_BASE;
}

function TMDB_KEY() {
  var k = (cfg().tmdb_key || '').toString().trim();
  return k || DEFAULT_TMDB_KEY;
}

async function fetchHtml(url) {
  var res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
      Referer: BASE() + '/',
    },
  });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' → ' + url);
  return await res.text();
}

function getNextData(html) {
  var m = String(html || '').match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch (e) {
    return null;
  }
}

function readInt(v, fallback) {
  if (typeof v === 'number') return Math.floor(v);
  if (typeof v === 'string') {
    var n = parseInt(v, 10);
    return isNaN(n) ? fallback : n;
  }
  return fallback;
}

function yearFromDate(d) {
  if (!d) return null;
  var s = String(d);
  if (s.length >= 4) {
    var y = parseInt(s.slice(0, 4), 10);
    return isNaN(y) ? null : y;
  }
  return null;
}

// ─── TMDB helpers ────────────────────────────────────────────────────────────

async function tmdbGet(path, query) {
  var q = Object.assign(
    { api_key: TMDB_KEY(), language: TMDB_LANG },
    query || {}
  );
  var qs = Object.keys(q)
    .map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(q[k]);
    })
    .join('&');
  var res = await fetch(TMDB_BASE + path + '?' + qs);
  if (!res.ok) throw new Error('TMDB HTTP ' + res.status);
  return await res.json();
}

async function tmdbFindByTitle(title, type, year) {
  if (!title) return null;
  var path = type === 'tv' || type === 'series' ? '/search/tv' : '/search/movie';
  var query = { query: title, page: 1 };
  if (year) {
    if (type === 'tv' || type === 'series') query.first_air_date_year = year;
    else query.year = year;
  }
  try {
    var data = await tmdbGet(path, query);
    var results = (data && data.results) || [];
    return results[0] || null;
  } catch (e) {
    return null;
  }
}

async function tmdbDetail(id, type) {
  var path = type === 'tv' || type === 'series' ? '/tv/' + id : '/movie/' + id;
  try {
    return await tmdbGet(path, {});
  } catch (e) {
    return null;
  }
}

async function tmdbSeasons(tvId) {
  var detail = await tmdbDetail(tvId, 'tv');
  if (!detail || !Array.isArray(detail.seasons)) return [];
  var out = [];
  for (var i = 0; i < detail.seasons.length; i++) {
    var s = detail.seasons[i];
    if (!s || s.season_number === 0) continue;
    var season = {
      number: s.season_number,
      name: s.name || 'Temporada ' + s.season_number,
      episodes: [],
    };
    try {
      var epData = await tmdbGet('/tv/' + tvId + '/season/' + s.season_number, {});
      var eps = (epData && epData.episodes) || [];
      season.episodes = eps.map(function (ep) {
        return {
          number: ep.episode_number,
          id: 'tmdb:series:' + tvId + ':s' + s.season_number + 'e' + ep.episode_number,
          title: ep.name || 'Episodio ' + ep.episode_number,
          overview: ep.overview || '',
          still: ep.still_path ? TMDB_IMG + '/w300' + ep.still_path : null,
          runtime: ep.runtime || null,
        };
      });
    } catch (e) {}
    out.push(season);
  }
  return out;
}

// ─── mapItem: cada item lleva URL como id ────────────────────────────────────

function mapItem(raw, forceType) {
  if (!raw || typeof raw !== 'object') return null;

  var isTv =
    forceType === 'tv' ||
    forceType === 'series' ||
    !!(raw.slug && (raw.slug.season || raw.slug.episode)) ||
    (raw.url && String(raw.url.slug || raw.url).indexOf('series') >= 0);

  if (forceType === 'movie') isTv = false;

  var type = isTv ? 'series' : 'movie';
  var mediaType = isTv ? 'tv' : 'movie';

  var title =
    raw.title ||
    raw.name ||
    (raw.slug && raw.slug.name) ||
    'Sin título';

  var tmdbId =
    raw.TMDbId ||
    raw.tmdbId ||
    raw.tmdb_id ||
    (raw.extra && raw.extra.tmdbId) ||
    null;
  if (tmdbId) tmdbId = parseInt(tmdbId, 10);
  if (isNaN(tmdbId)) tmdbId = null;

  var slug =
    (raw.slug && (typeof raw.slug === 'string' ? raw.slug : raw.slug.name)) ||
    (raw.url && (typeof raw.url === 'string' ? raw.url : raw.url.slug)) ||
    raw.permalink ||
    null;
  if (slug) {
    slug = String(slug)
      .replace(/^\/+/, '')
      .replace(/^(ver-serie|ver-pelicula|series|peliculas)\//, '')
      .replace(/\/$/, '');
  }

  var poster =
    (raw.images && (raw.images.poster || raw.images.poster_path)) ||
    raw.poster ||
    raw.image ||
    raw.poster_path ||
    null;
  if (poster && poster.indexOf('http') !== 0 && poster.indexOf('/') === 0) {
    poster = TMDB_IMG + '/w342' + poster;
  }

  var backdrop =
    (raw.images && (raw.images.backdrop || raw.images.backdrop_path)) ||
    raw.backdrop ||
    raw.backdrop_path ||
    null;
  if (backdrop && backdrop.indexOf('http') !== 0 && backdrop.indexOf('/') === 0) {
    backdrop = TMDB_IMG + '/w780' + backdrop;
  }

  var rating =
    (raw.rate && raw.rate.average != null ? Number(raw.rate.average) : null) ||
    (raw.vote_average != null ? Number(raw.vote_average) : null);

  var year = yearFromDate(raw.releaseDate || raw.release_date || raw.first_air_date);
  var overview = raw.overview || raw.sinopsis || '';

  var genres = [];
  if (Array.isArray(raw.genres)) {
    genres = raw.genres
      .map(function (g) {
        return g && g.name ? String(g.name) : typeof g === 'string' ? g : null;
      })
      .filter(Boolean);
  }

  // URL de ficha Cuevana — ESTE es el id que viaja a la página de contenido
  var cuevanaUrl = null;
  if (slug) {
    cuevanaUrl = BASE() + (isTv ? '/ver-serie/' : '/ver-pelicula/') + slug;
  } else if (raw.url && typeof raw.url === 'string' && /^https?:\/\//i.test(raw.url)) {
    cuevanaUrl = raw.url;
  }

  // id preferente = URL (la app lo pasa a getMeta / getStreams)
  var id = cuevanaUrl || (tmdbId ? 'tmdb:' + type + ':' + tmdbId : 'cuevana:' + type + ':' + (slug || title));

  var extra = {
    source: 'cuevana',
    mediaType: mediaType,
  };
  if (tmdbId) extra.tmdbId = tmdbId;
  if (slug) extra.cuevanaSlug = slug;
  if (cuevanaUrl) extra.cuevanaUrl = cuevanaUrl;

  var item = {
    id: id,
    title: String(title).trim(),
    type: type,
    poster: poster,
    backdrop: backdrop,
    overview: overview,
    year: year != null ? String(year) : null,
    rating: rating,
    genres: genres,
    url: cuevanaUrl,
    extra: extra,
  };
  if (tmdbId) item.tmdbId = tmdbId;
  if (slug) item.slug = slug;

  return item;
}

// ─── Listados ────────────────────────────────────────────────────────────────

async function fetchList(opts) {
  opts = opts || {};
  var tipo = opts.tipo || null;
  var genero = opts.genero || null;
  var seccion = opts.seccion || opts.categoria || null;
  var page = opts.page || 1;
  var pathOpt = opts.path || null;

  var path = '';
  var mode = 'movies';

  if (pathOpt) {
    path = String(pathOpt);
    if (path.indexOf('/') !== 0) path = '/' + path;
  } else if (genero && genero.length && genero !== 'todos') {
    path = '/genero/' + genero;
  } else if (seccion) {
    switch (String(seccion).toLowerCase()) {
      case 'peliculas':
      case 'ultimas':
      case 'movie':
        path = '/peliculas';
        break;
      case 'estrenos-movie':
      case 'estrenos_peliculas':
        path = '/peliculas/estrenos';
        break;
      case 'tendencias-movie':
      case 'tendencias_peliculas':
        path = '/peliculas/tendencias/dia';
        break;
      case 'generos':
      case 'genero':
        path = '/genero/' + (genero || 'accion');
        break;
      case 'series':
      case 'tv':
        path = '/series';
        break;
      case 'estrenos-tv':
      case 'estrenos_series':
        path = '/series/estrenos';
        break;
      case 'tendencias-tv':
      case 'tendencias_series':
        path = '/series/tendencias/semana';
        break;
      case 'episodios':
        path = '/episodios';
        mode = 'episodes';
        break;
      default:
        path = '/peliculas';
    }
  } else {
    switch (String(tipo || '').toLowerCase()) {
      case 'movie':
      case 'pelicula':
      case 'peliculas':
        path = '/peliculas';
        break;
      case 'tv':
      case 'serie':
      case 'series':
        path = '/series';
        break;
      case 'tendencias':
        path = '/peliculas/tendencias/dia';
        break;
      case 'episodios':
      case 'capitulos':
        path = '/episodios';
        mode = 'episodes';
        break;
      default:
        path = '/peliculas';
    }
  }

  var url = BASE() + path;
  if (page > 1) url = BASE() + path + '/page/' + page;

  var html = await fetchHtml(url);
  var next = getNextData(html);
  if (!next) throw new Error('No se encontró __NEXT_DATA__ en ' + url);

  var pp = (next.props && next.props.pageProps) || {};
  var items = [];

  if (mode === 'episodes' && Array.isArray(pp.episodes)) {
    for (var i = 0; i < pp.episodes.length; i++) {
      var ep = pp.episodes[i];
      if (!ep || typeof ep !== 'object') continue;
      var sSlug = (ep.slug && ep.slug.name) || '';
      var s = (ep.slug && ep.slug.season) || '';
      var e = (ep.slug && ep.slug.episode) || '';
      var mapped = mapItem(
        {
          title: ep.title,
          image: ep.image,
          TMDbId: ep.TMDbId,
          releaseDate: ep.releaseDate,
          slug: { name: sSlug, season: s, episode: e },
          url: { slug: 'series/' + sSlug },
        },
        'tv'
      );
      if (mapped) {
        mapped.extra = mapped.extra || {};
        mapped.extra.season = readInt(s, null);
        mapped.extra.episode = readInt(e, null);
        mapped.extra.cuevanaUrl =
          BASE() + '/episodio/' + sSlug + '-temporada-' + s + '-episodio-' + e;
        // episodio: id = URL del episodio
        mapped.id = mapped.extra.cuevanaUrl;
        mapped.url = mapped.extra.cuevanaUrl;
        items.push(mapped);
      }
    }
  } else if (Array.isArray(pp.movies)) {
    var force = path.indexOf('/series') === 0 ? 'tv' : null;
    for (var j = 0; j < pp.movies.length; j++) {
      var m = mapItem(pp.movies[j], force);
      if (m) items.push(m);
    }
  }

  return { items: items, url: url };
}

async function enrichWithTmdb(item, opts) {
  opts = opts || {};
  if (!item) return item;
  var type = item.type === 'series' ? 'tv' : 'movie';
  var tmdbId = (item.extra && item.extra.tmdbId) || item.tmdbId || null;

  if (!tmdbId) {
    var found = await tmdbFindByTitle(
      item.title,
      type,
      item.year ? parseInt(item.year, 10) : null
    );
    if (found && found.id) {
      tmdbId = found.id;
      if (!item.poster && found.poster_path)
        item.poster = TMDB_IMG + '/w342' + found.poster_path;
      if (!item.backdrop && found.backdrop_path)
        item.backdrop = TMDB_IMG + '/w780' + found.backdrop_path;
      if (!item.overview && found.overview) item.overview = found.overview;
      if (!item.year) {
        var y = yearFromDate(found.release_date || found.first_air_date);
        if (y) item.year = String(y);
      }
      if (!item.rating && found.vote_average)
        item.rating = Number(found.vote_average);
    }
  }

  if (tmdbId) {
    item.tmdbId = tmdbId;
    item.extra = item.extra || {};
    item.extra.tmdbId = tmdbId;
    item.extra.mediaType = type;
    // Mantener id = URL si ya la tenía
    if (!item.url && !/^https?:\/\//i.test(String(item.id))) {
      // no pisar URL-id
    }
  }

  if (tmdbId && opts.seasons && type === 'tv') {
    item.seasons = await tmdbSeasons(tmdbId);
  }

  if (tmdbId && (!item.genres || !item.genres.length || !item.overview)) {
    var tmdbData = await tmdbDetail(tmdbId, type);
    if (tmdbData) {
      if ((!item.genres || !item.genres.length) && Array.isArray(tmdbData.genres)) {
        item.genres = tmdbData.genres.map(function (g) {
          return g.name;
        });
      }
      if (!item.overview && tmdbData.overview) item.overview = tmdbData.overview;
      if (!item.poster && tmdbData.poster_path)
        item.poster = TMDB_IMG + '/w342' + tmdbData.poster_path;
      if (!item.backdrop && tmdbData.backdrop_path)
        item.backdrop = TMDB_IMG + '/w780' + tmdbData.backdrop_path;
    }
  }

  return item;
}

// ─── API Nuvio ───────────────────────────────────────────────────────────────

async function getHome() {
  var rows = [];

  try {
    var movies = await fetchList({ tipo: 'movie', page: 1 });
    rows.push({
      id: 'hero',
      type: 'hero',
      title: 'Destacados',
      imageStyle: 'backdrop',
      items: (movies.items || []).slice(0, 8),
    });
  } catch (e) {}

  try {
    var series = await fetchList({ tipo: 'tv', page: 1 });
    rows.push({
      id: 'cuevana-series',
      type: 'row',
      title: 'Series',
      imageStyle: 'poster',
      items: series.items || [],
    });
  } catch (e) {}

  try {
    var trend = await fetchList({ tipo: 'tendencias', page: 1 });
    rows.push({
      id: 'cuevana-tendencias',
      type: 'row',
      title: 'Tendencias del día',
      imageStyle: 'poster',
      items: trend.items || [],
    });
  } catch (e) {}

  // Banner promo (usa el primer item de películas si hay)
  if (rows.length && rows[0].items && rows[0].items[0]) {
    var first = rows[0].items[0];
    rows.splice(1, 0, {
      id: 'banner_promo',
      type: 'banner',
      title: first.title || 'Destacado',
      banner: first.backdrop || first.poster,
      items: [first],
    });
  }

  rows.push({
    id: 'catalogs_home',
    type: 'catalog',
    title: 'Catálogos',
    items: [
      { id: 'cat_movies', title: 'Películas', type: 'catalog', poster: null },
      { id: 'cat_series', title: 'Series', type: 'catalog', poster: null },
      { id: 'cat_tendencias', title: 'Tendencias', type: 'catalog', poster: null },
    ],
  });

  return { rows: rows };
}

async function search(query) {
  // Nuvio pasa args = [query] ; también aceptamos {query}
  var q = query;
  if (q && typeof q === 'object') q = q.query || q.q || '';
  if (arguments.length > 0 && typeof arguments[0] === 'string') q = arguments[0];
  q = String(q || '').trim();
  if (!q) return { items: [] };

  var url = BASE() + '/search?q=' + encodeURIComponent(q);
  var html = await fetchHtml(url);
  var next = getNextData(html);
  if (!next) return { items: [] };

  var movies =
    (next.props && next.props.pageProps && next.props.pageProps.movies) || [];
  var items = [];
  for (var i = 0; i < movies.length; i++) {
    var m = mapItem(movies[i]);
    if (m) items.push(m);
  }
  return { items: items };
}

function getDiscoverFilters(opts) {
  opts = opts || {};
  var tipo = opts.tipo || 'movie';
  var seccion = opts.seccion || '';

  var filters = [
    {
      id: 'tipo',
      label: 'Tipo',
      options: [
        { id: 'movie', label: 'Películas' },
        { id: 'tv', label: 'Series' },
      ],
    },
  ];

  if (tipo === 'tv' || tipo === 'series') {
    filters.push({
      id: 'seccion',
      label: 'Sección',
      options: [
        { id: 'series', label: 'Series' },
        { id: 'estrenos-tv', label: 'Estrenos' },
        { id: 'tendencias-tv', label: 'Tendencias' },
      ],
    });
  } else {
    filters.push({
      id: 'seccion',
      label: 'Sección',
      options: [
        { id: 'peliculas', label: 'Últimas publicadas' },
        { id: 'estrenos-movie', label: 'Estrenos' },
        { id: 'tendencias-movie', label: 'Tendencias' },
        { id: 'generos', label: 'Géneros' },
      ],
    });
    if (seccion === 'generos' || seccion === 'genero') {
      filters.push({
        id: 'genero',
        label: 'Género',
        options: GENEROS.map(function (g) {
          return {
            id: g,
            label: g.charAt(0).toUpperCase() + g.slice(1).replace(/-/g, ' '),
          };
        }),
      });
    }
  }

  return { filters: filters };
}

async function getDiscover(opts) {
  opts = opts || {};
  var page = parseInt(opts.page, 10) || 1;
  var tipo = opts.tipo || 'movie';
  var seccion = opts.seccion || '';
  var genero = opts.genero || '';

  // Defaults por tipo
  if (!seccion) {
    seccion = tipo === 'tv' || tipo === 'series' ? 'series' : 'peliculas';
  }

  var list;
  try {
    list = await fetchList({
      tipo: tipo,
      seccion: seccion,
      genero: genero,
      page: page,
    });
  } catch (e) {
    return { items: [], hasMore: false, page: page, error: String(e && e.message || e) };
  }

  var items = (list && list.items) || [];
  return {
    items: items,
    hasMore: items.length >= 18,
    page: page,
  };
}

/**
 * getMeta(id)
 * id puede ser:
 *  - URL completa de Cuevana (preferido: viene del home/search)
 *  - tmdb:movie:123 / tmdb:series:456
 *  - cuevana:movie:slug / cuevana:series:slug
 */
async function getMeta(id, opts) {
  opts = opts || {};
  id = String(id || '').trim();
  if (!id) throw new Error('getMeta: id vacío');

  var item = null;
  var raw = null;
  var media = 'movie';

  // 1) URL directa → leer ficha
  if (/^https?:\/\//i.test(id)) {
    var html = await fetchHtml(id);
    var next = getNextData(html);
    if (next) {
      var pp = (next.props && next.props.pageProps) || {};
      raw = pp.thisMovie || pp.thisSerie || pp.movie || pp.serie || null;
      if (!raw && pp.movies && pp.movies[0]) raw = pp.movies[0];
    }
    var isSerieUrl = /\/ver-serie\//i.test(id) || /\/serie\//i.test(id);
    media = isSerieUrl ? 'tv' : 'movie';
    if (raw) {
      item = mapItem(raw, media === 'tv' ? 'tv' : 'movie');
      if (item) {
        item.id = id; // conservar la URL como id
        item.url = id;
        item.extra = item.extra || {};
        item.extra.cuevanaUrl = id;
      }
    } else {
      item = {
        id: id,
        title: id.split('/').pop() || id,
        type: media === 'tv' ? 'series' : 'movie',
        url: id,
        extra: { source: 'cuevana', cuevanaUrl: id, mediaType: media },
      };
    }
  } else {
    // 2) tmdb: / cuevana:
    var parts = id.split(':');
    var key = id;
    var knownTmdbId = null;

    if (parts[0] === 'tmdb' && parts.length >= 3) {
      media = parts[1] === 'series' || parts[1] === 'tv' ? 'tv' : 'movie';
      knownTmdbId = parseInt(parts[2], 10);
      key = parts[2];
    } else if (parts[0] === 'cuevana' && parts.length >= 3) {
      media = parts[1] === 'series' || parts[1] === 'tv' ? 'tv' : 'movie';
      key = parts.slice(2).join(':');
    }

    if (knownTmdbId && !isNaN(knownTmdbId)) {
      item = {
        id: id,
        title: '',
        type: media === 'tv' ? 'series' : 'movie',
        extra: { source: 'cuevana', tmdbId: knownTmdbId, mediaType: media },
        tmdbId: knownTmdbId,
      };
    } else if (!/^\d+$/.test(key)) {
      var detailUrl =
        BASE() + (media === 'tv' ? '/ver-serie/' : '/ver-pelicula/') + key;
      try {
        var html2 = await fetchHtml(detailUrl);
        var next2 = getNextData(html2);
        if (next2) {
          var pp2 = (next2.props && next2.props.pageProps) || {};
          raw = pp2.thisMovie || pp2.thisSerie || pp2.movie || pp2.serie || null;
        }
      } catch (e) {}
      if (raw) {
        item = mapItem(raw, media === 'tv' ? 'tv' : 'movie');
        if (item) {
          item.id = detailUrl;
          item.url = detailUrl;
        }
      } else {
        item = {
          id: detailUrl,
          title: key,
          type: media === 'tv' ? 'series' : 'movie',
          url: detailUrl,
          extra: { source: 'cuevana', mediaType: media, cuevanaSlug: key, cuevanaUrl: detailUrl },
        };
      }
    }
  }

  if (!item) throw new Error('No se pudo construir item para ' + id);

  item = await enrichWithTmdb(item, {
    seasons: item.type === 'series',
  });

  if (!item.genres) item.genres = [];
  // Devolver el item plano (Nuvio ContentService hace fromJson del mapa)
  return item;
}


/**
 * getStreams — usa la fuente real (VOE / StreamWish / VidHide).
 * id = URL de ficha (preferido) | tmdb:movie:N | número TMDB
 */
async function getStreams(id, type, season, episode) {
  try {
    var list = await getStreamsReal(id, type, season, episode);
    if (list && list.length) {
      return { streams: list };
    }
  } catch (e) {
    if (typeof console !== 'undefined') {
      try { console.log('[Cuevana] getStreams error', e && e.message); } catch (_) {}
    }
  }
  // Sin servidores reales: lista vacía (la app no debe mostrar demo)
  return { streams: [] };
}

async function getCatalogs() {
  return {
    catalogs: [
      { id: 'cat_movies', title: 'Películas', description: 'Listado de películas' },
      { id: 'cat_series', title: 'Series', description: 'Listado de series' },
      { id: 'cat_tendencias', title: 'Tendencias', description: 'Tendencias del día' },
    ],
  };
}

async function getCatalog(catalogId, opts) {
  opts = opts || {};
  var page = parseInt(opts.page, 10) || 1;
  var tipo = 'movie';
  if (String(catalogId).indexOf('serie') >= 0 || String(catalogId).indexOf('tv') >= 0) tipo = 'tv';
  if (String(catalogId).indexOf('tend') >= 0) tipo = 'tendencias';
  var list = await fetchList({ tipo: tipo, page: page });
  var items = (list || []).map(mapListItem).filter(Boolean);
  return { items: items, hasMore: items.length >= 20, page: page };
}

// Export para el runtime de Nuvio
async function getNews() {
  try {
    var list = await fetchList({ seccion: 'episodios', page: 1 });
    var items = (list && list.items) || [];
    return {
      items: items.slice(0, 12).map(function (it) {
        return {
          title: it.title || 'Episodio',
          message: (it.extra && it.extra.season != null)
            ? ('T' + it.extra.season + ' E' + (it.extra.episode || ''))
            : 'Capítulo reciente',
          poster: it.poster,
          id: it.id,
          url: it.url || it.id,
        };
      }),
    };
  } catch (e) {
    return { items: [] };
  }
}

if (typeof module !== 'undefined') {
  module.exports = {
    getHome: getHome,
    search: search,
    getDiscoverFilters: getDiscoverFilters,
    getDiscover: getDiscover,
    getMeta: getMeta,
    getStreams: getStreams,
    getCatalogs: getCatalogs,
    getCatalog: getCatalog,
    getNews: getNews,
  };
}
