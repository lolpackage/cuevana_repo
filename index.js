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
  var page = opts.page || 1;

  var path = '';
  var mode = 'movies';

  if (genero && genero.length) {
    if (GENEROS.indexOf(genero) === -1) {
      throw new Error('Género no válido: ' + genero);
    }
    path = '/genero/' + genero;
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
      case 'anime':
      case 'dorama':
        path = '/series';
        break;
      case 'tendencias':
      case 'series-populares':
      case 'tv-tendencias':
        path = '/series/tendencias/dia';
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

function getDiscoverFilters() {
  return {
    filters: [
      { id: 'all', label: 'Todo' },
      { id: 'movie', label: 'Películas' },
      { id: 'series', label: 'Series' },
      { id: 'accion', label: 'Acción' },
      { id: 'comedia', label: 'Comedia' },
      { id: 'drama', label: 'Drama' },
      { id: 'terror', label: 'Terror' },
      { id: 'animacion', label: 'Animación' },
    ],
  };
}

async function getDiscover(opts) {
  opts = opts || {};
  if (typeof opts === 'string') opts = { filter: opts };
  var filter = (opts.filter || opts.genre || opts.tipo || 'all').toString().toLowerCase();

  var tipo = null;
  var genero = null;
  if (filter === 'movie' || filter === 'peliculas') tipo = 'movie';
  else if (filter === 'series' || filter === 'tv') tipo = 'series';
  else if (GENEROS.indexOf(filter) >= 0) genero = filter;
  else if (filter === 'all' || filter === 'todo') tipo = 'movie';
  else tipo = 'movie';

  try {
    var list = await fetchList({ tipo: tipo, genero: genero, page: 1 });
    return { items: list.items || [] };
  } catch (e) {
    return { items: [] };
  }
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
 * getStreams(id, type, season, episode)
 * id = URL de la ficha o tmdb:xx
 * Devuelve { streams: [ { url, name, quality, language, headers, isHls } ] }
 *
 * Nota: extracción real de embeds depende del host. Aquí:
 *  - Intentamos leer embeds de la página Cuevana
 *  - Si no hay, devolvemos streams demo para probar el player
 */
async function getStreams(id, type, season, episode) {
  id = String(id || '').trim();
  type = String(type || 'movie').toLowerCase();
  season = season != null ? parseInt(season, 10) : null;
  episode = episode != null ? parseInt(episode, 10) : null;

  var streams = [];
  var pageUrl = null;

  if (/^https?:\/\//i.test(id)) {
    pageUrl = id;
    // Si es serie y tenemos s/e, intentar URL de episodio
    if ((type.indexOf('series') >= 0 || type.indexOf('tv') >= 0) && season && episode) {
      var slugMatch = id.match(/\/ver-serie\/([^\/?#]+)/i);
      if (slugMatch) {
        pageUrl =
          BASE() +
          '/episodio/' +
          slugMatch[1] +
          '-temporada-' +
          season +
          '-episodio-' +
          episode;
      }
    }
  } else if (id.indexOf('cuevana:') === 0) {
    var p = id.split(':');
    var media = p[1] === 'series' || p[1] === 'tv' ? 'tv' : 'movie';
    var slug = p.slice(2).join(':');
    if (media === 'tv' && season && episode) {
      pageUrl =
        BASE() +
        '/episodio/' +
        slug +
        '-temporada-' +
        season +
        '-episodio-' +
        episode;
    } else {
      pageUrl = BASE() + (media === 'tv' ? '/ver-serie/' : '/ver-pelicula/') + slug;
    }
  }

  if (pageUrl) {
    try {
      var html = await fetchHtml(pageUrl);
      // Buscar posibles embeds / m3u8 / mp4 en el HTML y __NEXT_DATA__
      var next = getNextData(html);
      var candidates = [];

      if (next) {
        var json = JSON.stringify(next);
        var reUrl = /https?:\/\/[^"'\\s]+?\.(?:m3u8|mp4)[^"'\\s]*/gi;
        var m;
        while ((m = reUrl.exec(json)) !== null) {
          candidates.push(m[0]);
        }
        // videos en pageProps
        try {
          var pp = (next.props && next.props.pageProps) || {};
          var vids = pp.videos || pp.embeds || pp.players || [];
          if (Array.isArray(vids)) {
            for (var i = 0; i < vids.length; i++) {
              var v = vids[i];
              if (!v) continue;
              var u = v.url || v.file || v.src || v.link;
              if (u) candidates.push(String(u));
            }
          }
        } catch (e) {}
      }

      // HTML plano
      var reHtml = /https?:\/\/[^"'\\s]+?\.(?:m3u8|mp4)[^"'\\s]*/gi;
      var mh;
      while ((mh = reHtml.exec(html)) !== null) {
        candidates.push(mh[0]);
      }

      var seen = {};
      for (var c = 0; c < candidates.length; c++) {
        var url = candidates[c].replace(/\\u0026/g, '&').replace(/\\/g, '');
        if (seen[url]) continue;
        seen[url] = true;
        var isHls = url.indexOf('.m3u8') >= 0;
        streams.push({
          name: isHls ? 'HLS' : 'MP4',
          url: url,
          quality: 'auto',
          language: 'es',
          provider: 'cuevana',
          headers: {
            'User-Agent': UA,
            Referer: BASE() + '/',
            Origin: BASE(),
          },
          isHls: isHls,
        });
      }
    } catch (e) {
      // sigue a fallback
    }
  }

  // Fallback demo para probar player si no hubo extracción
  if (streams.length === 0) {
    streams = [
      {
        name: 'Demo MP4',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        quality: '1080p',
        language: 'en',
        provider: 'demo',
        headers: { 'User-Agent': UA },
        isHls: false,
      },
      {
        name: 'Demo HLS',
        url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8',
        quality: 'auto',
        language: 'en',
        provider: 'demo',
        headers: { 'User-Agent': UA },
        isHls: true,
      },
    ];
  }

  return { streams: streams };
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

async function getCatalog(catalogId) {
  var tipo = 'movie';
  if (catalogId === 'cat_series') tipo = 'series';
  if (catalogId === 'cat_tendencias') tipo = 'tendencias';
  try {
    var list = await fetchList({ tipo: tipo, page: 1 });
    return { items: list.items || [] };
  } catch (e) {
    return { items: [] };
  }
}

// Export para el runtime de Nuvio
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
  };
}
