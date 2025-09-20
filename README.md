# Sync In - A Modern Web-Based Music Player

Sync In is a sleek, responsive music player built with vanilla JavaScript, featuring a Node.js back-end that streams full-length, high-quality tracks from YouTube. The project boasts a clean, modern interface with both light and dark themes, playlist management, and a dynamic search feature.

## Features

**Core Functionality:**
- Sleek & Responsive UI: A beautiful, modern interface designed to work flawlessly on both desktop and mobile devices
- Light & Dark Modes: Easily switch between a light or dark theme to suit your preference
- Full Playback Controls: Standard controls including play, pause, next, previous, a draggable progress bar, and volume adjustment
- Dynamic Search: Seamlessly search your local library first, and if no results are found, automatically query YouTube for new music
- Full-Length Streaming: Integrated with YouTube to provide high-quality, full-length audio streams
- Playlist Management: Create custom playlists and add songs to them with ease
- Enhanced Favorites System: Mark any song (local or YouTube) as a "favorite" for quick access in a dedicated view

**Audio Sources:**
- Local Music Library: Pre-loaded collection of local audio files
- YouTube Integration: Search and stream music directly from YouTube
- Persistent Favorites: YouTube favorites are saved locally and persist between sessions

## Tech Stack

**Front-End:**
- HTML5
- CSS3 (with extensive use of CSS Variables for easy theming)
- Vanilla JavaScript (ES6+), organized with a modern class-based structure

**Back-End:**
- Node.js
- Express.js for creating the API server
- @distube/ytdl-core for YouTube audio extraction
- youtube-sr for YouTube search functionality
- CORS for enabling cross-origin requests

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm (Node Package Manager)

### 1. Clone the Repository
```bash
git clone https://github.com/shashwat-eternal/Sync-in-Music-Player.git
cd Sync-in-Music-Player
```

### 2. Set up the Back-End
```bash
cd sync-in-backend
npm install
```

### 3. Start the Server
```bash
node server.js
```
The back-end will now be running on http://localhost:3000.

### 4. Launch the Front-End
Navigate back to the root project folder and open `index.html` in your browser. Using a live server extension in your code editor is recommended for the best development experience.

## Project Structure
```
Sync-in-Music-Player/
├── index.html              # Main HTML file
├── app.js                  # Frontend JavaScript logic
├── style.css              # Styling and themes
├── covers/                # Local album artwork
├── music/                 # Local music files
└── sync-in-backend/       # Backend server
    ├── server.js          # Express server with YouTube integration
    ├── package.json       # Backend dependencies
    └── node_modules/      # Backend packages
```

## API Endpoints

- `GET /search?q=query` - Search for music on YouTube
- `GET /stream?id=videoId` - Stream audio from a YouTube video
- `GET /health` - Health check endpoint
- `GET /test/:videoId` - Test if a specific video is accessible

## Features in Detail

### YouTube Integration
- Search YouTube for music with intelligent filtering for music content
- Stream high-quality audio directly from YouTube videos
- Automatic fallback and error handling for unavailable content
- Smart caching to reduce API calls and improve performance

### Enhanced Favorites System
- Local songs: Favorites stored in song objects
- YouTube songs: Favorites stored in localStorage for persistence
- Combined favorites view showing both local and YouTube favorites
- Visual indicators to distinguish between local and YouTube tracks

### Error Handling
- Graceful handling of unavailable YouTube videos
- Automatic song skipping for failed tracks
- Detailed error messages and user feedback
- Retry mechanisms for temporary network issues

## Browser Compatibility
- Chrome (recommended)
- Firefox
- Safari
- Edge

## Known Limitations
- YouTube video availability can change without notice
- Some videos may be geo-blocked or have streaming restrictions
- Requires active internet connection for YouTube features

## Contributing
Feel free to submit issues, fork the repository, and create pull requests for any improvements.

## License
This project is open source and available under the MIT License.

## Disclaimer
This project is for educational purposes. YouTube content is subject to their terms of service and copyright policies.
