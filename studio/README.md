# Lavish Astro Studio (dashboard)

Next.js 16 + TypeScript + Tailwind dashboard for the AI Astrology Video
Production Studio. See `../IMPLEMENTATION_PLAN.md` for phases and
`../ASTROLOGY_PRODUCTION_PROFILE.md` for the house style.

```bash
cd studio
npm install
npm run build && npm start        # http://localhost:3000
# or: npm run dev
```

* Projects are stored in `../projects/<slug>/` (git-ignored; holds personal
  photos and generated media). Override with `STUDIO_PROJECTS_DIR`.
* API keys go in `studio/.env.local` (git-ignored) as `ANTHROPIC_API_KEY`,
  `ELEVENLABS_API_KEY`, `SARVAM_API_KEY`. They are read server-side only.
* JSON API: `GET/POST /api/projects`, `GET /api/projects/<slug>`.

Phase 2 (this): dashboard, project creation with folder tree + `project.json`,
script / reference-image import, status and approvals, provider status.
Sections marked P3–P8 in the sidebar say "not built yet" until their phase.
