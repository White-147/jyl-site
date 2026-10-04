<h1 align="center">JYL Portfolio Site</h1>

<p align="center">Personal job-hunting portfolio single-page app: IT comprehensive role covering data engineering, business system delivery, and Windows native desktop engineering.</p>

<p align="center">
  <a href="./README.md">简体中文</a> | <a href="./README.en.md">English</a>
</p>

<p align="center">
  <a href="https://github.com/White-147/jyl-site/actions/workflows/deploy.yml"><img alt="Deploy" src="https://img.shields.io/github/actions/workflow/status/White-147/jyl-site/deploy.yml?branch=main&style=for-the-badge&label=deploy"></a>
  <img alt="Status" src="https://img.shields.io/badge/status-live-7952B3?style=for-the-badge">
  <img alt="Stack" src="https://img.shields.io/badge/stack-React%2019%20%2B%20TypeScript%20%2B%20Vite%20%2B%20Tailwind-2E7D32?style=for-the-badge">
  <img alt="Deploy" src="https://img.shields.io/badge/deploy-GitHub%20Pages-0078D4?style=for-the-badge">
  <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache--2.0-blue?style=for-the-badge"></a>
</p>

<p align="center">
  <img src="./materials/site/hero.webp" alt="Portfolio site hero section screenshot" width="900">
</p>

A personal job-hunting portfolio single-page app, organised around an "IT comprehensive role" and covering four focus areas: data engineering, business system delivery, Windows native desktop engineering, and game development (Unreal Engine). It showcases verifiable projects such as MiLuStudio, XiaoLouAI and SyLabAI, and ships an in-site UE study-notes section plus the graduation thesis.

The site offers project filtering by direction (AI Apps / Enterprise Systems / Big Data), fuzzy skill search, light/dark theme switching, one-click project previews, and a resume PDF download. Mobile is adapted separately (bottom tab bar plus a persistent glass top bar), since roughly 60% of traffic comes from phones.

Live at [https://white-147.github.io/jyl-site/](https://white-147.github.io/jyl-site/). Content is driven by a SQLite database (`database/portfolio.db`) as the single source of truth; builds export it to JSON automatically, and pushing to `main` triggers GitHub Actions to build and deploy to GitHub Pages.

> Note: site content and the resume stay aligned (real projects and real company names). Only compressed WebP files live in `public/`; raw originals are no longer kept in the repo or on this machine (the old archive was cleaned up in 2026-09) and should be restored from an external backup, then compressed again.

## Features

- Single-page scrolling layout with three theme modes (light / dark / follow system), status-bar colour synced
- **Project filtering by direction**: AI Apps / Enterprise Systems / Big Data; each project row carries a thumbnail, direction tag, GitHub link and screenshot lightbox
- **Skill profiles**: eight role-direction groups, fuzzy search (case / punctuation / whitespace normalised), quick high-frequency tags
- **About**: staged narrative (early / recent / daily) plus four capability-chain metric cards (data engineering, delivery, AI toolchain, UE game dev)
- **Section navigation**: a persistent glass top bar (brand plus notes / theme / resume / back-to-top), a full-height glass rail on desktop and tablet (section nodes with a reading-progress liquid column), and a floating pill tab bar on mobile
- **Live project previews**: each project's static frontend embedded under `public/preview/`, opened from the "Try online" action; backend-less projects show a demo banner matched to their own palette (light/dark)
- **Docs section**: the thesis and UE notes at `#/docs`, with a **two-level rail** (document list → that document's TOC), section cover pages, heading anchors, cross-document links, image lightbox, copy-enabled body, and view transitions when switching sections or backing out
- **Education and certificates**: a full-width school bar plus a 2x2 certificate/award grid, click to enlarge the proof image
- **Contact**: click-to-copy email, GitHub link, and a one-click watermarked resume PDF
- Mobile: persistent glass top bar, floating bottom tab bar, safe-area handling, single-column layout
- **Touch interaction**: on phones and tablets the highlight follows the **scroll position** (the card you are looking at lights up, one at a time) with a separate press feedback on tap; filter chips and the docs sidebar are excluded, since a lit chip reads as a selected one; desktop keeps its mouse hover unchanged
- Content-driven: SQLite -> JSON at build time -> bundle and deploy, so content edits never touch components
- **Content protection**: obfuscated contact rendering with decoy addresses, iframe guards on preview pages, `robots.txt` rejecting AI-corpus crawlers, full-page diagonal watermark on the resume PDF (text layer preserved, ATS-friendly)
- **Read-only content**: selection and copying are disabled site-wide; only the contact emails and the docs body text are whitelisted via `data-copyable`
- **Accessibility**: WCAG 2.2 AA contrast in both themes (verified with a headless browser), lightbox focus trap and focus restore, full keyboard access, `prefers-reduced-motion` respected, print intercepted and redirected to the PDF resume
- **Performance**: only the name font is inlined for the first screen, CJK fonts limited to three weights (400/500/700) and preloaded on demand, below-the-fold sections render lazily, infinite animations pause off-screen, desktop CLS 0

## Tech Stack

| Module | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4 |
| Motion | GSAP (hero entrance sequence) + IntersectionObserver (scroll reveal); `prefers-reduced-motion` respected site-wide |
| Fonts | Five-layer system: Noto Sans SC (body), Smiley Sans (display), Liu Jian Mao Cao (name), Fraunces (numbers), Victor Mono (mono) - all self-hosted, subset via `scripts/subset-fonts.mjs` and first-screen inlined via `inline-firstscreen-fonts.mjs` |
| Icon | The 蒋 mark rendered from the Liu Jian Mao Cao typeface by `scripts/gen_icons.py`, exported as a full favicon set plus maskable |
| Data | SQLite (`database/portfolio.db`, content source) |
| Scripting | Node.js (data seed/export, font and icon pipelines, contact encoding, docs build and assertions) + Python (resume watermarking, image compression, icon generation) |
| Deployment | GitHub Pages + GitHub Actions (`deploy.yml`) |

## Architecture

```mermaid
flowchart LR
    JSON["src/data/*.json\nbuild data"] -->|db:seed| DB[("SQLite\nportfolio.db source")]
    DB -->|db:export| JSON2["src/data/*.json\n(exported at build time)"]
    JSON2 --> Build["Vite Build\nReact 19 + TS"]
    Docs["docs/**/source\nthesis / UE notes"] -->|docs:build| Pages["public/docs/pages\n+ src/data/docs.json"]
    Pages --> Build
    Build --> Dist["dist/"]
    Dist -->|upload-pages-artifact| GH["GitHub Pages\nauto deploy"]
```

Content and presentation are fully separated: projects, skills, experience and copy all come from `src/data/*.json`, and components only render them. Docs pages are built from the raw sources under `docs/**/source` by `scripts/build-docs.mjs`. Both pipelines run at build time, so there is no backend at runtime.

## Directory Structure

```text
jyl-site/
├── database/
│   └── portfolio.db          # SQLite content database (source of truth)
├── MAINTAINING.md            # Engineering maintenance (coupled edits, conventions, revision log)
├── materials/                # Source materials (originals, raw images, font sources; gitignored)
├── docs/                     # Docs-section **content sources**
│   ├── thesis/source/{md,pdf}/   # Thesis source (pandoc HTML converted from .docx)
│   ├── theory/source/{md,pdf}/   # UE theory source (markdown notes + original PDFs)
│   └── combat/source/{md,pdf}/   # UE practice source (markdown notes)
├── public/
│   ├── downloads/resume.pdf  # Site resume (overwrite with the latest version)
│   ├── 404.html              # SPA fallback: deep-link refresh -> app entry
│   ├── robots.txt            # Crawl policy (allow search engines, reject AI-corpus crawlers)
│   ├── sitemap.xml           # Site structure
│   ├── manifest.webmanifest  # Icon manifest (includes Android maskable)
│   ├── preview/              # Embedded project previews (static bundles)
│   ├── docs/pages/           # Generated docs pages (gitignored)
│   ├── favicons/             # Site icons (generated by scripts/gen_icons.py)
│   └── images/               # All site images (flat; category by filename prefix):
│                             #   avatar-* avatar | brand-* ornaments
│                             #   cert-* certificates | proj-* project screenshots
├── scripts/
│   ├── seed-db.mjs           # JSON -> database (npm run db:seed)
│   ├── export-db.mjs         # database -> JSON (npm run db:export)
│   ├── subset-fonts.mjs      # Font subsetting (rerun after copy changes)
│   ├── inline-firstscreen-fonts.mjs   # Inline first-screen fonts (runs automatically)
│   ├── gen_icons.py          # Site icons rendered from the Liu Jian Mao Cao typeface
│   ├── build-docs.mjs        # Docs build: split sources into pages, emit nav and manifest
│   ├── check-docs.mjs        # Docs output self-check (missing images, dangling outline, conflicts)
│   ├── check-anchors.mjs     # Real-browser assertions (anchor landing, subbar material, nav smoke)
│   ├── prepare-thesis.mjs    # Thesis .docx -> HTML
│   ├── optimize_images.py    # Compress images to WebP (thesis and UE notes)
│   ├── encode-contact.mjs    # Contact obfuscation table generator
│   ├── watermark_resume.py   # Full-page diagonal watermark for the resume PDF
│   ├── polish-previews.mjs   # Inject demo banners and iframe guards into previews
│   └── start-all.ps1 / .bat  # One-click local launcher for this site and its projects
├── src/
│   ├── data/*.json           # Build data (exported from the database)
│   ├── data/navigation.ts    # Section registry (navigation and scroll spy share it)
│   ├── data/scrollTargets.ts # Single source of truth for anchor offsets
│   ├── data/contact.ts       # Contact obfuscation layer
│   ├── fonts/                # Font subsets (generated by subset-fonts.mjs)
│   ├── hooks/                # useTheme / useScrollSpy / useAnchorScroll etc.
│   └── components/           # Page components
├── .github/workflows/deploy.yml
├── DESIGN.md                 # Design system (tokens and component rules)
├── PRODUCT.md                # Product brief (users, anti-references, principles)
├── MAINTAINING.md            # Engineering maintenance (read before changing code)
└── LICENSE
```

> The repository root keeps only "functional families": `src` (app source), `public` (deploy root),
> `docs` (docs-section content sources), `materials` (source materials), `scripts`, `database`.
> Grouping rules, `.gitignore` policy and history are documented in [MAINTAINING.md](./MAINTAINING.md).

## Local Development

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # type check + production build (outputs dist/)
npm run preview  # preview the production build
```

> Both `dev` and `build` rebuild the docs section first (`predev` / `prebuild`), so the converters never need to be run by hand.

## Content Maintenance (Data Flow)

The source of truth is `database/portfolio.db` (SQLite); builds export it to JSON automatically:

```bash
npm run db:seed    # rebuild/overwrite the database from src/data/*.json
npm run db:export  # export JSON from the database (run automatically by npm run build)
npm run build      # = db:export + type check + build
```

Two ways to edit content: change `src/data/*.json` then `npm run db:seed`, or edit the database with any SQLite tool then `npm run db:export`.

> All other maintenance commands (font subsetting, resume watermark, icon generation, contact
> encoding, preview injection, the docs pipeline scripts) are documented in
> [MAINTAINING.md](./MAINTAINING.md), and are visible under `scripts` in `package.json`.

## Docs Section (Thesis, UE Theory, UE Practice)

The docs section lives at `#/docs` (hash routing, no server rewrite needed) and turns two kinds of
external sources into a readable document site: a **two-level rail** (level 1 = document list,
level 2 = that document's TOC), section cover pages, heading anchors, click-to-zoom images
(reusing the site lightbox), copy-enabled body text, cross-document links (optionally with a
`#heading` anchor) and view transitions when switching sections or backing out.
Three sections: thesis, UE theory, UE practice.

Sources live under `docs/<section>/source/` (the thesis as pandoc-generated HTML, the UE notes as
markdown). The builder **splits each source greedily at heading level** so a long article no longer
takes dozens of swipes to reach the end. Format constraints, workflows and verification steps are
documented in [MAINTAINING.md](./MAINTAINING.md).

## Anti-Scraping and Content Protection

Client-side measures cannot truly block scraping. The goal is to raise the cost of indiscriminate collection without hurting a recruiter's normal use of the site: `robots.txt` allows search engines but rejects AI-corpus crawlers and bulk scraping; `sitemap.xml` publishes the structure; contact details never appear in plain text; the resume PDF carries a full-page watermark while keeping its text layer (still ATS-parseable); embedded preview pages get iframe guards. Content is read-only at the frontend level — selection and copying are disabled site-wide, with only the contact emails and the docs body text whitelisted — and printing is intercepted and redirected to the PDF resume.

> Per-layer measures and their locations are documented in [MAINTAINING.md](./MAINTAINING.md).

## Live Project Previews

Each project's static frontend is embedded in the site (`public/preview/<id>/`, served directly from the GitHub Pages subpath):

| Project | Entry | Data source |
| --- | --- | --- |
| SyLabAI / XiaoLouAI / MiLuAssistantWeb | static frontend + demo banner | no backend (UI demo) |
| MiLuStudio | embedded demo mode (`VITE_EMBEDDED_DEMO`) | built-in sample project, deterministic local flow is interactive |
| BookRecommendation | embedded demo mode (`VUE_APP_EMBEDDED_DEMO`) + demo auto-login | built-in sample data (books / recommendations / borrowing) |
| ShopRecommendation | separate Render deployment (also linked from the site) | full backend |

Supporting tooling: `scripts/polish-previews.mjs` injects a demo banner matched to each project's own palette (light and dark) and gracefully replaces backend-less errors; `scripts/sync-preview.mjs <source dist> public/preview/<name>` copies a local production build into the site (adding the icon declarations and verifying that asset references are relative).

## Deploying to GitHub Pages

GitHub Actions is already configured (`.github/workflows/deploy.yml`), so pushing to `main` builds and deploys automatically:

1. Build: `npm ci` -> `npm run build` (exports JSON from the database, rebuilds the docs section, type-checks and bundles)
2. Deploy: `upload-pages-artifact` uploads `dist/`, `deploy-pages` publishes to GitHub Pages
3. URL: https://white-147.github.io/jyl-site/

> To use a custom domain, bind it under Settings -> Pages.
>
> A note on speed: all assets are same-origin, so `github.io` is noticeably slow from mainland China without a proxy (the first screen is fine once cached). The code-side size work is done; the remaining bottleneck is the network path, so no mirror or proxy deployment is planned.

## Related Documents

- [DESIGN.md](./DESIGN.md) - design system: colour, typography, elevation, components, prohibitions
- [PRODUCT.md](./PRODUCT.md) - product brief: target users, anti-references, design principles, accessibility
- [MAINTAINING.md](./MAINTAINING.md) - engineering maintenance: coupled-edit checklist, directory and build conventions, revision log (**read before changing code**)
