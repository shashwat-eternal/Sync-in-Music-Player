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


/*
=================================================================
DEPRECATED: SPOTIFY API (Provides 30-second previews only)
=================================================================

// Spotify Credentials
const SPOTIFY_CLIENT_ID = '5b19ebba467b4ffabca5031c45c1686b';
const SPOTIFY_CLIENT_SECRET = 'c7b25cc107744219a2e90e3dee01e3c5';
let spotifyToken = null;

// Get Spotify Access Token
const getSpotifyToken = async () => {
    try {
        const response = await axios({
            method: 'post',
            url: 'https://accounts.spotify.com/api/token',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + (Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'))
            },
            data: 'grant_type=client_credentials'
        });
        spotifyToken = response.data.access_token;
        console.log("Spotify token fetched successfully!");
    } catch (error) {
        console.error('Error fetching Spotify token:', error.response?.data || error.message);
        spotifyToken = null;
    }
};

// Search Endpoint for Spotify
app.get('/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Search query is required' });

    if (!spotifyToken) {
        await getSpotifyToken();
        if (!spotifyToken) return res.status(500).json({ error: 'Spotify authentication failed' });
    }

    try {
        const response = await axios.get('https://api.spotify.com/v1/search', {
            headers: { 'Authorization': `Bearer ${spotifyToken}` },
            params: { q: query, type: 'track', limit: 20, market: 'US' }
        });

        const apiResults = response.data.tracks.items;

        const formattedTracks = apiResults.map(track => ({
            id: track.id,
            title: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            album: track.album.name,
            art: track.album.images[0]?.url || 'covers/default.jpg',
            durationSeconds: Math.floor(track.duration_ms / 1000),
            isFavorite: false,
            streamUrl: track.preview_url || null,
            playable: track.preview_url ? true : false
        }));

        res.json(formattedTracks);

    } catch (error) {
        if (error.response?.status === 401) {
            spotifyToken = null; // Token expired
            return res.status(500).json({ error: 'Spotify token expired. Try again.' });
        }
        console.error('Spotify search error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch search results' });
    }
});
*/


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // We don't need to fetch a token on startup anymore.
});

