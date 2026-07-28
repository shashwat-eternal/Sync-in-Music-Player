/* ==========================================================================
   SYNC IN — backend
   Search only. All playback happens client-side through YouTube's own
   IFrame Player API, so this server never touches or re-serves YouTube's
   media streams — it just proxies search against the official
   YouTube Data API v3.

   Setup:
     1. Get a free API key: console.cloud.google.com -> new project ->
        enable "YouTube Data API v3" -> Credentials -> Create API key.
     2. Copy .env.example to .env and paste the key in.
     3. npm install && npm start
   ========================================================================== */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.YOUTUBE_API_KEY;

app.use(cors());
app.use(express.json());

// ISO 8601 duration (e.g. "PT3M42S") -> seconds
function isoDurationToSeconds(iso) {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || '');
  if (!match) return 0;
  const [, h, m, s] = match;
  return (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0);
}

function decodeHtml(str = '') {
  return str
    .replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', youtubeApiConfigured: Boolean(API_KEY), node: process.version });
});

app.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Missing query parameter "q".' });

  if (!API_KEY) {
    return res.status(500).json({
      error: 'YouTube search is not configured.',
      suggestion: 'Add a YOUTUBE_API_KEY to sync-in-backend/.env — see the README for a 2-minute setup.'
    });
  }

  try {
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.search = new URLSearchParams({
      part: 'snippet', q, type: 'video', maxResults: '18',
      videoCategoryId: '10', // Music
      key: API_KEY
    }).toString();

    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchRes.ok) {
      const reason = searchData?.error?.errors?.[0]?.reason;
      const friendly = reason === 'quotaExceeded'
        ? 'The YouTube API daily quota has been used up — try again tomorrow, or use a fresh API key.'
        : (searchData?.error?.message || 'YouTube search failed.');
      return res.status(searchRes.status).json({ error: friendly });
    }

    const ids = (searchData.items || []).map((item) => item.id?.videoId).filter(Boolean);
    if (ids.length === 0) return res.json([]);

    const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    detailsUrl.search = new URLSearchParams({ part: 'contentDetails,snippet', id: ids.join(','), key: API_KEY }).toString();
    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();
    if (!detailsRes.ok) return res.status(detailsRes.status).json({ error: 'Could not load video details.' });

    const results = (detailsData.items || [])
      .map((item) => {
        const durationSeconds = isoDurationToSeconds(item.contentDetails?.duration);
        return {
          id: item.id,
          title: decodeHtml(item.snippet?.title || 'Untitled'),
          artist: decodeHtml(item.snippet?.channelTitle || 'Unknown artist'),
          album: 'YouTube',
          art: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
          durationSeconds,
          isLive: item.contentDetails?.duration === 'P0D'
        };
      })
      // filter out live streams and anything absurdly long/short (shorts, DJ sets)
      .filter((r) => !r.isLive && r.durationSeconds >= 45 && r.durationSeconds <= 1200)
      .map(({ isLive, ...rest }) => rest);

    res.json(results);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Unexpected error while searching YouTube.' });
  }
});

app.use((req, res) => res.status(404).json({ error: 'Not found.' }));

app.listen(PORT, () => {
  console.log(`Sync In backend running on http://localhost:${PORT}`);
  if (!API_KEY) console.warn('⚠️  No YOUTUBE_API_KEY set — YouTube search will be disabled until you add one to .env');
});
