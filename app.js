class MusicPlayer {
    constructor() {
        this.currentSong = null;
        this.currentIndex = 0;
        this.isPlaying = false;
        this.songs = []; 
        this.playlists = [];
        this.getDOMElements();
        this.init();
    }

    getDOMElements() {
        this.searchInput = document.getElementById('searchInput');
        this.audio = document.getElementById('audioElement');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.progressBar = document.getElementById('progressBar');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.songArt = document.getElementById('songArt');
        this.songTitle = document.getElementById('songTitle');
        this.songArtist = document.getElementById('songArtist');
        this.currentTimeEl = document.getElementById('currentTime');
        this.totalDurationEl = document.getElementById('totalDuration');
        this.mainView = document.getElementById('mainView');
        this.sidebarNav = document.getElementById('sidebarNav');
        this.playerFavBtn = document.getElementById('playerFavBtn');
        this.themeToggle = document.getElementById('themeToggle');
        this.playlistList = document.getElementById('playlistList');
        this.newPlaylistBtn = document.getElementById('newPlaylistBtn');
        this.modal = document.getElementById('playlistModal');
        this.closeModalBtn = document.getElementById('closeModal');
        this.cancelPlaylistBtn = document.getElementById('cancelPlaylist');
        this.savePlaylistBtn = document.getElementById('savePlaylist');
    }

    init() {
        this.audio.volume = this.volumeSlider.value;
        this.renderPlaylists();
        this.switchView('home');
        this.bindEvents();
    }

    bindEvents() {
        this.searchInput.addEventListener('change', (e) => this.handleSearch(e.target.value));
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.nextBtn.addEventListener('click', () => this.nextSong());
        this.prevBtn.addEventListener('click', () => this.prevSong());
        this.playerFavBtn.addEventListener('click', () => this.toggleFavorite(this.currentSong.id));
        this.audio.addEventListener('timeupdate', () => this.updateProgressBar());
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audio.addEventListener('ended', () => this.nextSong());
        this.progressBar.addEventListener('input', (e) => this.seek(e.target.value));
        this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
        this.newPlaylistBtn.addEventListener('click', () => this.showCreatePlaylistModal());
        this.closeModalBtn.addEventListener('click', () => this.hideCreatePlaylistModal());
        this.cancelPlaylistBtn.addEventListener('click', () => this.hideCreatePlaylistModal());
        this.savePlaylistBtn.addEventListener('click', () => this.createPlaylist());
        this.themeToggle.addEventListener('click', () => this.toggleTheme());

        this.sidebarNav.addEventListener('click', (e) => {
            const navItem = e.target.closest('.nav-item');
            if (!navItem) return;
            this.sidebarNav.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            navItem.classList.add('active');
            if (navItem.dataset.view) {
                this.switchView(navItem.dataset.view);
            } else if (navItem.dataset.playlistId) {
                this.switchView('playlist', parseInt(navItem.dataset.playlistId));
            }
        });

        // Combined event listener for song lists and playlist cards
        this.mainView.addEventListener('click', (e) => {
            const songItem = e.target.closest('.song-item');
            const playlistCard = e.target.closest('.playlist-card');

            if (songItem) {
                const songId = parseInt(songItem.dataset.id);
                if (e.target.closest('.more-options-btn')) {
                    this.showContextMenu(songId, e.target.closest('.more-options-btn'));
                } else if (e.target.closest('.song-item-fav-btn')) {
                    this.toggleFavorite(songId);
                } else {
                    const songIndex = this.songs.findIndex(s => s.id === songId);
                    this.currentIndex = songIndex;
                    this.loadSong(this.songs[this.currentIndex]);
                    this.playSong();
                }
            } else if (playlistCard) {
                const playlistId = playlistCard.dataset.playlistId;
                this.fetchAndDisplayPlaylistSongs(playlistId);
            }
        });
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.context-menu') && !e.target.closest('.more-options-btn')) {
                this.closeContextMenu();
            }
        });
    }

    async handleSearch(query) {
        const lowerCaseQuery = query.toLowerCase().trim();
        if (!lowerCaseQuery) return;
        this.renderSongListView(`Searching for "${query}"...`, []);
        try {
            const response = await fetch(`http://localhost:3000/search?q=${lowerCaseQuery}`);
            const results = await response.json();
            this.songs = results;
            this.renderSongListView(`Results for "${query}"`, this.songs);
        } catch (error) {
            console.error('Search failed:', error);
            this.renderSongListView(`Error searching for "${query}"`, []);
        }
    }
    
    loadSong(song) {
        if (!song) return;
        this.currentSong = song;
        this.audio.src = song.streamUrl; 
        this.songTitle.textContent = song.title;
        this.songArtist.textContent = song.artist;
        this.songArt.src = song.art || 'covers/default.jpg';
        this.updatePlayerFavBtn(song.isFavorite);
    }

    updateProgressBar() {
        if (this.audio.duration) {
            this.currentTimeEl.textContent = this.formatTime(this.audio.currentTime);
            const progressPercent = (this.audio.currentTime / this.audio.duration) * 100;
            this.progressBar.value = this.audio.currentTime;
            this.progressBar.style.setProperty('--progress-percent', `${progressPercent}%`);
        }
    }

    updateDuration() {
        this.totalDurationEl.textContent = this.formatTime(this.audio.duration);
        this.progressBar.max = this.audio.duration;
    }

    async switchView(viewId, playlistId = null) {
        if (viewId === 'home') {
            this.mainView.innerHTML = `<h2 class="view-title">Featured Playlists</h2><p>Loading...</p>`;
            try {
                const response = await fetch('http://localhost:3000/featured-playlists');
                const playlists = await response.json();
                this.renderFeaturedPlaylists(playlists);
            } catch (error) {
                this.mainView.innerHTML = `<h2 class="view-title">Featured Playlists</h2><p>Could not load playlists.</p>`;
            }
        } else if (viewId === 'favorites') {
            const title = "Favorites";
            const songsToRender = this.songs.filter(song => song.isFavorite);
            this.renderSongListView(title, songsToRender);
        } else if (viewId === 'playlist') {
            const playlist = this.playlists.find(p => p.id === playlistId);
            if (playlist) {
                this.songs = playlist.songs;
                this.renderSongListView(playlist.name, this.songs);
            }
        }
    }
    
    renderFeaturedPlaylists(playlists) {
        let content = `<h2 class="view-title">Featured Playlists</h2>`;
        if (playlists.length === 0) {
            content += `<p>No playlists found.</p>`;
        } else {
            content += `<div class="playlist-grid">
                ${playlists.map(playlist => `
                    <div class="playlist-card" data-playlist-id="${playlist.id}">
                        <img src="${playlist.image}" alt="${playlist.name}">
                        <div class="playlist-card-name">${playlist.name}</div>
                    </div>
                `).join('')}
            </div>`;
        }
        this.mainView.innerHTML = content;
    }
    
    async fetchAndDisplayPlaylistSongs(playlistId) {
        this.mainView.innerHTML = `<h2 class="view-title">Loading Playlist...</h2>`;
        try {
            const response = await fetch(`http://localhost:3000/playlist-songs?id=${playlistId}`);
            const data = await response.json();
            this.songs = data.songs;
            this.renderSongListView(data.name, this.songs);
        } catch (error) {
            console.error('Failed to fetch playlist songs:', error);
            this.mainView.innerHTML = `<h2 class="view-title">Error</h2><p>Could not load songs for this playlist.</p>`;
        }
    }

    renderSongListView(title, songs) {
        let content = `<h2 class="view-title">${title}</h2>`;
        if (songs.length === 0) {
            content += `<p>No songs found in this list.</p>`;
        } else {
            const header = `<div class="song-list-header">
                <div>#</div><div>Title</div><div>Album</div><div style="text-align:center;">Time</div><div></div>
            </div>`;
            content += header + `<ul class="song-list">${songs.map(song => this.getSongItemHTML(song)).join('')}</ul>`;
        }
        this.mainView.innerHTML = content;
    }

    getSongItemHTML(song) {
        const favoriteClass = song.isFavorite ? 'is-favorite' : '';
        const favoriteIcon = song.isFavorite ? 'fas' : 'far';
        return `
            <li class="song-item" data-id="${song.id}">
                <div class="song-item-art"><img src="${song.art}" alt="${song.album}"></div>
                <div class="song-item-title">${song.title}<br><span class="song-item-artist">${song.artist}</span></div>
                <div class="song-item-album">${song.album}</div>
                <div class="song-item-duration">${this.formatTime(song.durationSeconds)}</div>
                <div class="song-item-options">
                    <button class="btn-icon song-item-fav-btn ${favoriteClass}"><i class="${favoriteIcon} fa-heart"></i></button>
                    <button class="btn-icon more-options-btn"><i class="fas fa-ellipsis-h"></i></button>
                </div>
            </li>
        `;
    }
    
    toggleFavorite(songId) { /* ... (unchanged) ... */ }
    updatePlayerFavBtn(isFavorite) { /* ... (unchanged) ... */ }
    renderPlaylists() { /* ... (unchanged) ... */ }
    playSong() { if(!this.currentSong) return; this.isPlaying = true; this.audio.play(); this.playPauseBtn.querySelector('i').className = 'fas fa-pause'; }
    pauseSong() { this.isPlaying = false; this.audio.pause(); this.playPauseBtn.querySelector('i').className = 'fas fa-play'; }
    togglePlayPause() { this.isPlaying ? this.pauseSong() : this.playSong(); }
    nextSong() { if (this.songs.length === 0) return; this.currentIndex = (this.currentIndex + 1) % this.songs.length; this.loadSong(this.songs[this.currentIndex]); this.playSong(); }
    prevSong() { if (this.songs.length === 0) return; this.currentIndex = (this.currentIndex - 1 + this.songs.length) % this.songs.length; this.loadSong(this.songs[this.currentIndex]); this.playSong(); }
    seek(value) { this.audio.currentTime = value; }
    setVolume(value) { this.audio.volume = value; }
    formatTime(seconds) { if (isNaN(seconds)) return '0:00'; const minutes = Math.floor(seconds / 60); const secs = Math.floor(seconds % 60); return `${minutes}:${secs < 10 ? '0' : ''}${secs}`; }
    showContextMenu(songId, button) { /* ... (unchanged) ... */ }
    closeContextMenu() { /* ... (unchanged) ... */ }
    addSongToPlaylist(songId, playlistId) { /* ... (unchanged) ... */ }
    toggleTheme() { /* ... (unchanged) ... */ }
    showCreatePlaylistModal() { /* ... (unchanged) ... */ }
    hideCreatePlaylistModal() { /* ... (unchanged) ... */ }
    createPlaylist() { /* ... (unchanged) ... */ }
}

document.addEventListener('DOMContentLoaded', () => { new MusicPlayer(); });