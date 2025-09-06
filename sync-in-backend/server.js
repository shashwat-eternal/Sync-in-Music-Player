// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());


// =================================================================
// NEW: AUDIUS API ENDPOINT FOR FULL-LENGTH STREAMING
// =================================================================

app.get('/search-audius', async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
    }

    // You can use any name for your app.
    const APP_NAME = "SyncInMusicPlayer";
    // We need to use a public Audius API host.
    const HOST = "https://discoveryprovider.audius.co";
    
    const url = `${HOST}/v1/tracks/search?query=${encodeURIComponent(query)}&app_name=${APP_NAME}`;

    try {
        const response = await axios.get(url);
        // The actual search results are in the 'data' property of the response
        const apiResults = response.data.data;

        // Transform the Audius data to match the format your front-end expects
        const formattedTracks = apiResults.map(track => {
            // Construct the stream URL using the track's ID. This is the key for playback.
            const streamUrl = `${HOST}/v1/tracks/${track.id}/stream?app_name=${APP_NAME}`;
            
            return {
                id: track.id,
                title: track.title,
                artist: track.user.name,
                album: track.genre || "Single", // Use genre as album, or fallback
                art: track.artwork['480x480'] || track.artwork['150x150'] || 'covers/default.jpg',
                durationSeconds: track.duration,
                isFavorite: false,
                streamUrl: streamUrl, // The direct, playable MP3 link!
                playable: true
            };
        });

        res.json(formattedTracks);

    } catch (error) {
        console.error('Audius search error:', error.message);
        res.status(500).json({ error: 'Failed to fetch from Audius' });
    }
});
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // We don't need to fetch a token on startup anymore.
});

