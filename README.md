# Sync In — a mood-reactive music player

A local-library + YouTube music player with a "Mood Field" interface: a drifting
gradient background that re-tunes itself to the dominant color of whatever's
currently playing. Built with vanilla JS on the front end and a small Express
search proxy on the back end.

## What changed in this version

YouTube playback now goes through **YouTube's own IFrame Player API** instead
of extracting raw audio streams. That means:
- Playback is stable — it isn't dependent on reverse-engineering YouTube's
  player internals, which is what kept breaking the old approach.
- Search is powered by the official **YouTube Data API v3**, so it needs a
  free API key (see setup below) instead of scraping search results.
- The backend no longer has a `/stream` endpoint — there's nothing to proxy,
  since the browser talks to YouTube directly through the embed.

## Features

- **Local library + YouTube search**, unified in one interface
- **Mood Field** — the background gradient samples each track's cover art
  (or derives a consistent palette from a YouTube video ID) and re-tunes live
- **Queue with drag-and-drop reordering**, plus "play next" / "add to queue"
  from any track's menu
- **Crossfade** between local tracks (Web Audio dual-buffer engine); toggle
  in the player bar
- **Synced lyrics** via [lrclib.net](https://lrclib.net), an open lyrics
  database — falls back to plain lyrics or "not found" gracefully
- **Sleep timer** (15/30/45/60 min) with a gradual fade-out before pausing
- **Live audio visualizer** for local tracks (real FFT data via Web Audio's
  AnalyserNode); YouTube tracks show an ambient pulse instead, since a
  cross-origin embed's audio can't be analyzed — that's a browser security
  boundary, not a bug
- Favorites, playlists, light/dark theme, responsive layout

## Project structure

```
Sync-in-Music-Player-main/
├── sync-in/
│   ├── index.html
│   ├── app.js
│   ├── style.css
│   ├── covers/
│   └── music/
└── sync-in-backend/
    ├── server.js          # /search proxy to the YouTube Data API v3
    ├── package.json
    └── .env.example
```

## Setup

### 1. Get a YouTube Data API key (free)
1. Go to [console.cloud.google.com](https://console.cloud.google.com) → create a project.
2. APIs & Services → Library → enable **YouTube Data API v3**.
3. APIs & Services → Credentials → Create credentials → API key.
4. The free tier gives 10,000 quota units/day; each search costs ~100 units,
   so you get roughly 100 searches a day, which is plenty for personal use.

### 2. Backend
```bash
cd sync-in-backend
npm install
cp .env.example .env
# paste your key into .env
npm start
```
Runs on `http://localhost:3000`.

### 3. Frontend
Open `sync-in/index.html` in a browser, or serve the `sync-in/` folder with a
live-server extension for the best experience (some browsers restrict local
file `fetch` calls).

## API

- `GET /search?q=...` — searches YouTube via the Data API v3, returns
  `{ id, title, artist, album, art, durationSeconds }[]`
- `GET /health` — reports whether an API key is configured

## Known limitations

- Crossfade only applies between two local tracks — a transition involving a
  YouTube track just does a quick fade, since two independent YouTube embeds
  can't be gain-blended the way two `<audio>` elements can.
- The visualizer only reflects real audio data for local tracks, for the
  cross-origin reason above.
- Free-tier YouTube API quota caps daily searches; the UI surfaces a clear
  message if you hit it.

## License
MIT.
