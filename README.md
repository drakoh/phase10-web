# Phase 10 Web

A mobile-first, bilingual (French/English) web recreation of the official Phase 10
card game, built as an installable PWA (offline-capable). Includes a single-player
Journey mode with progressive difficulty.

## Development

```bash
npm install
npm run dev        # http://localhost:5173/phase10-web/
npm run test       # vitest
npm run build      # production build -> dist/
npm run preview    # preview production build
```

## Deploy

Pushes to `main` trigger the GitHub Actions workflow in `.github/workflows/deploy.yml`,
which builds and deploys to GitHub Pages.

Live URL: https://drakoh.github.io/phase10-web/

## Access on your phone

Scan this QR code to open the app on your phone (no typing needed):

![QR code to open Phase 10 Web](public/qr.png)

## License / Disclaimer

Fan project. Phase 10® is a trademark of Mattel. Not affiliated with or endorsed by Mattel.