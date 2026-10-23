# Cuevana – Repo Nuvio

Repo de prueba para [Nuvio Launcher](https://github.com/). Sube este repo a GitHub e instálalo en la app con `usuario/repo`.

## Archivos

| Archivo | Uso |
|---------|-----|
| `nuvio.json` | Manifiesto del repo (nombre, config, entry) |
| `index.js` | Lógica: home, search, discover, meta, streams, catalogs |

## Flujo de contenido

1. **Home / Buscar / Descubrir** → cada item tiene `id` = **URL de la ficha** (ej. `https://wv3.cuevana3.eu/ver-pelicula/...`).
2. La app abre **Detalles** pasando ese `id`.
3. **`getMeta(id)`** descarga esa URL, lee `__NEXT_DATA__` y devuelve título, poster, overview, temporadas (series vía TMDB).
4. **`getStreams(id, type, season, episode)`** usa la misma URL (o URL de episodio) y devuelve servidores con `url`, `headers`, `language`, `quality`.

## Config (ajustes del repo en la app)

- `base_url` — dominio Cuevana (por defecto `https://wv3.cuevana3.eu`)
- `tmdb_key` — API key TMDB opcional

## Subir a GitHub

```bash
cd nuvio_cuevana_repo
git init
git add .
git commit -m "Cuevana repo for Nuvio"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/nuvio-cuevana.git
git push -u origin main
```

En Nuvio: **Comunidad / Instalar repo** → `TU_USUARIO/nuvio-cuevana`.

## Contrato JS (resumen)

```js
getHome() → { rows: [{ id, type: 'hero'|'row'|'banner'|'catalog', title, items }] }
search(query) → { items: [meta] }
getDiscoverFilters() → { filters: [{ id, label }] }
getDiscover({ filter }) → { items }
getMeta(id) → meta   // id = URL o tmdb:movie:N
getStreams(id, type, season, episode) → { streams: [{ url, name, quality, language, headers, isHls }] }
getCatalogs() → { catalogs }
getCatalog(id) → { items }
```

Cada `meta` incluye `id` (URL), `title`, `type`, `poster`, `backdrop`, `overview`, `year`, `rating`, `genres`, `url`, `extra`, y si es serie `seasons[]`.
