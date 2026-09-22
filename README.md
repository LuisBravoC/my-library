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

## Listas personales (Supabase, opcional)

Lectura pública, escritura solo del dueño. Sin las env vars la sección queda
desactivada y la app funciona igual.

1. Crea un proyecto en Supabase y ejecuta `supabase/schema.sql` en el SQL Editor
   (pon tu email en las políticas `solo dueno`).
2. Crea tu usuario en Authentication → Users → **Add user** (email + contraseña
   robusta, marca auto-confirm) y desactiva *Allow new users to sign up*.
3. Copia `.env.example` a `.env.local` con `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY` y `VITE_OWNER_EMAIL`.
4. Para producción, añade esos tres como Secrets del repo (Settings → Secrets →
   Actions); el workflow ya los inyecta en el build.

Las listas tienen URLs compartibles (`/lista/mi-top-rpg`, slug inmutable generado
al crear) con botón de copiar enlace; funcionan con el `404.html` igual que
`/steam` y `/login`.
