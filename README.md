# MySteamLibrary

Bibliotecas de Steam y GOG: grid con buscador, filtros por tags, características,
plataformas y modo avanzado (VR, accesibilidad, idiomas).

## Desarrollo

```powershell
npm install
npm run dev     # http://localhost:5173
npm run build   # genera dist/
npm run lint
```

## Despliegue en GitHub Pages

La app usa `base: './'`, así que funciona en `usuario.github.io/repo/` y en
dominios propios sin cambios. Incluye `public/404.html` (las URLs desconocidas
vuelven a la app) y `public/.nojekyll`.

- **Automático:** al hacer push a `main`, el workflow `.github/workflows/deploy.yml`
  publica `dist/` (activa Pages con origen *GitHub Actions* en los ajustes del repo).
- **Manual:** `npm run deploy` (publica `dist/` en la rama `gh-pages`).

## Datos

La app carga `public/data/steam-library.csv` y `public/data/gog-library.json`.
Los CSV/JSON originales e intermedios viven en `data/` (ignorada por git) y los
scripts de generación en `scripts/` (también ignorados).
