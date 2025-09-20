

const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');
const { search } = require('youtube-sr').default;

const app = express();
const PORT = 3000;

app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Range']
}));


const videoInfoCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; 


app.get('/search', async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
    }

    try {
        console.log(`Searching for: ${query}`);
        const searchResults = await search(query, { 
            limit: 30,
            type: 'video',
            safeSearch: false
        });

        
        const musicVideos = searchResults.filter(video => {
            const duration = video.duration / 1000;
            const title = video.title.toLowerCase();
            
            return duration >= 60 && duration <= 900 && 
                   !title.includes('#shorts') &&
                   !title.includes('livestream') &&
                   video.channel?.verified !== false;
        });

        const formattedTracks = musicVideos.slice(0, 15).map(video => ({
            id: video.id,
            title: video.title || 'Unknown Title',
            artist: video.channel?.name || 'Unknown Artist',
            album: 'YouTube',
            art: video.thumbnail?.url || 'covers/default.jpg',
            durationSeconds: Math.floor(video.duration / 1000)
        }));
        
        console.log(`Found ${formattedTracks.length} music results for: ${query}`);
        if (formattedTracks.length > 0) {
            console.log(`Top result: "${formattedTracks[0].title}" by ${formattedTracks[0].artist} (${formattedTracks[0].id})`);
        }
        res.json(formattedTracks);
    } catch (error) {
        console.error('Error in /search:', error.message);
        res.status(500).json({ error: 'Failed to fetch search results from YouTube' });
    }
});


app.get('/stream', async (req, res) => {
    const videoId = req.query.id;
    if (!videoId || !ytdl.validateID(videoId)) {
        return res.status(400).json({ error: 'Valid Video ID is required' });
    }

    console.log(`Attempting to stream video ID: ${videoId}`);

    try {
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        
        const cached = videoInfoCache.get(videoId);
        let info;
        
        if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
            console.log(`Using cached info for ${videoId}`);
            info = cached.info;
        } else {
            console.log(`Fetching fresh info for ${videoId}`);
            
            const agent = ytdl.createAgent([
                {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                    "Accept-Encoding": "gzip, deflate",
                    "DNT": "1",
                    "Connection": "keep-alive",
                    "Upgrade-Insecure-Requests": "1"
                }
            ]);

            info = await ytdl.getInfo(videoUrl, {
                agent: agent,
                requestOptions: {
                    timeout: 10000,
                    headers: {
                        'Cookie': '',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                }
            });
            
            
            videoInfoCache.set(videoId, {
                info: info,
                timestamp: Date.now()
            });
            
            console.log(`Successfully got info for ${videoId}: ${info.videoDetails.title}`);
        }

        
        const audioFormat = ytdl.chooseFormat(info.formats, { 
            quality: 'highestaudio',
            filter: format => format.hasAudio && !format.hasVideo
        });

        if (!audioFormat) {
            console.log(`No suitable audio format found for ${videoId}`);
            return res.status(404).json({ 
                error: 'No suitable audio format found for this video',
                videoId: videoId
            });
        }

        console.log(`Streaming format: ${audioFormat.container}, bitrate: ${audioFormat.audioBitrate || 'unknown'}`);


        res.setHeader('Content-Type', audioFormat.mimeType || 'audio/webm');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Access-Control-Allow-Origin', '*');

        
        const range = req.headers.range;
        if (range && audioFormat.contentLength) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : audioFormat.contentLength - 1;
            const chunksize = (end - start) + 1;
            
            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${audioFormat.contentLength}`);
            res.setHeader('Content-Length', chunksize);
        }

        
        const streamAgent = ytdl.createAgent([
            {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        ]);

        
        const audioStream = ytdl(videoUrl, { 
            format: audioFormat,
            agent: streamAgent,
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            }
        });

        audioStream.on('error', (streamError) => {
            console.error(`Audio stream error for ${videoId}:`, streamError.message);
            if (!res.headersSent) {
                res.status(500).json({ 
                    error: `Streaming failed: ${streamError.message}`,
                    videoId: videoId
                });
            }
        });

        audioStream.on('info', (info, format) => {
            console.log(`Started streaming: ${info.videoDetails.title}`);
        });

        req.on('close', () => {
            console.log(`Client disconnected from stream ${videoId}`);
            audioStream.destroy();
        });

        audioStream.pipe(res);

    } catch (error) {
        console.error(`Major error streaming ${videoId}:`, error.message);
        
        let errorMessage = 'Error creating audio stream';
        if (error.message.includes('Video unavailable')) {
            errorMessage = 'Video is unavailable or private';
        } else if (error.message.includes('410')) {
            errorMessage = 'Video no longer exists';
        } else if (error.message.includes('403')) {
            errorMessage = 'Access forbidden - video may be region-locked';
        } else if (error.message.includes('429')) {
            errorMessage = 'Too many requests - please wait and try again';
        }
        
        if (!res.headersSent) {
            res.status(500).json({ 
                error: errorMessage,
                videoId: videoId,
                suggestion: 'Try searching for a different song'
            });
        }
    }
});


app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        cache_size: videoInfoCache.size,
        library: '@distube/ytdl-core'
    });
});


app.get('/test/:videoId', async (req, res) => {
    const videoId = req.params.videoId;
    try {
        const info = await ytdl.getBasicInfo(`https://www.youtube.com/watch?v=${videoId}`);
        res.json({
            title: info.videoDetails.title,
            author: info.videoDetails.author.name,
            length: info.videoDetails.lengthSeconds,
            available: true
        });
    } catch (error) {
        res.json({
            videoId: videoId,
            available: false,
            error: error.message
        });
    }
});


setInterval(() => {
    const now = Date.now();
    for (const [key, value] of videoInfoCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            videoInfoCache.delete(key);
        }
    }
    if (videoInfoCache.size > 0) {
        console.log(`Cache cleanup: ${videoInfoCache.size} items remaining`);
    }
}, 30 * 60 * 1000); 

app.listen(PORT, () => {
    console.log(`Sync In Backend running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Test endpoint: http://localhost:${PORT}/test/dQw4w9WgXcQ`);
});