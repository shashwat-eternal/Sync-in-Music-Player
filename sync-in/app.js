class MusicPlayer {
    constructor() {
        this.currentSong = null;
        this.currentIndex = 0;
        this.isPlaying = false;
        this.songs = [];
        
        this.localSongs = [
            { id: 'local-1', type: 'local', title: "Tum Hi Ho", artist: "Arijit Singh", album: "Aashiqui 2", src: "music/tum-hi-ho.mp3", art: "covers/aashiqui-2.jpg", durationSeconds: 262, isFavorite: false },
            { id: 'local-2', type: 'local', title: "Kal Ho Naa Ho", artist: "Sonu Nigam", album: "Kal Ho Naa Ho", src: "music/kal-ho-naa-ho.mp3", art: "covers/kal-ho-naa-ho.jpg", durationSeconds: 326, isFavorite: true },
            { id: 'local-3', type: 'local', title: "Shape of You", artist: "Ed Sheeran", album: "÷ (Divide)", src: "music/shape-of-you.mp3", art: "covers/divide.jpg", durationSeconds: 233, isFavorite: false },
            { id: 'local-4', type: 'local', title: "Bohemian Rhapsody", artist: "Queen", album: "A Night at the Opera", src: "music/bohemian-rhapsody.mp3", art: "covers/a-night-at-the-opera.jpg", durationSeconds: 355, isFavorite: false },
            { id: 'local-5', type: 'local', title: "Channa Mereya", artist: "Arijit Singh", album: "Ae Dil Hai Mushkil", src: "music/channa-mereya.mp3", art: "covers/ae-dil-hai-mushkil.jpg", durationSeconds: 291, isFavorite: false },
            { id: 'local-6', type: 'local', title: "Perfect", artist: "Ed Sheeran", album: "÷ (Divide)", src: "music/perfect.mp3", art: "covers/divide.jpg", durationSeconds: 263, isFavorite: true },
            { id: 'local-7', type: 'local', title: "Raabta", artist: "Arijit Singh", album: "Agent Vinod", src: "music/raabta.mp3", art: "covers/agent-vinod.jpg", durationSeconds: 239, isFavorite: false },
            { id: 'local-8', type: 'local', title: "Blinding Lights", artist: "The Weeknd", album: "After Hours", src: "music/blinding-lights.mp3", art: "covers/after-hours.jpg", durationSeconds: 200, isFavorite: false }
        ];

       
        this.youtubeFavorites = this.loadYoutubeFavorites();
        this.playlists = [];
        this.getDOMElements();
        this.init();
    }

    
    loadYoutubeFavorites() {
        try {
            const saved = localStorage.getItem('youtubeFavorites');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading YouTube favorites:', error);
            return [];
        }
    }

     
    saveYoutubeFavorites() {
        try {
            localStorage.setItem('youtubeFavorites', JSON.stringify(this.youtubeFavorites));
        } catch (error) {
            console.error('Error saving YouTube favorites:', error);
        }
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
        this.playerFavBtn.addEventListener('click', () => { if (this.currentSong) this.toggleFavorite(this.currentSong.id); });
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

        this.mainView.addEventListener('click', (e) => {
            const songItem = e.target.closest('.song-item');
            if (!songItem) return;
            const songId = songItem.dataset.id;
            if (e.target.closest('.more-options-btn')) {
                this.showContextMenu(songId, e.target.closest('.more-options-btn'));
            } else if (e.target.closest('.song-item-fav-btn')) {
                this.toggleFavorite(songId);
            } else {
                const songIndex = this.songs.findIndex(s => s.id === songId);
                if (songIndex !== -1) {
                    this.currentIndex = songIndex;
                    this.loadSong(this.songs[this.currentIndex]);
                    this.playSong();
                }
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
        if (!lowerCaseQuery) {
            this.switchView('home');
            return;
        }

        const localResults = this.localSongs.filter(song => 
            song.title.toLowerCase().includes(lowerCaseQuery) ||
            song.artist.toLowerCase().includes(lowerCaseQuery) ||
            song.album.toLowerCase().includes(lowerCaseQuery)
        );

        if (localResults.length > 0) {
            this.songs = localResults;
            this.renderSongListView(`Results in My Music for "${query}"`, this.songs);
            return;
        }

        this.renderSongListView(`Searching YouTube for "${query}"...`, []);
        try {
            const response = await fetch(`http://localhost:3000/search?q=${lowerCaseQuery}`);
            const results = await response.json();
            if (!response.ok) { throw new Error(results.error || 'An unknown error occurred.'); }
            
            // Add favorite status to YouTube results
            this.songs = results.map(song => {
                const ytSong = { ...song, type: 'youtube' };
                // Check if this song is in favorites
                const isFavorite = this.youtubeFavorites.some(fav => fav.id === song.id);
                ytSong.isFavorite = isFavorite;
                return ytSong;
            });
            
            this.renderSongListView(`Results on YouTube for "${query}"`, this.songs);
        } catch (error) {
            console.error('Search failed:', error);
            this.renderSongListView(`Error: ${error.message}`, []);
        }
    }
    
    loadSong(song) {
        if (!song) return;
        this.currentSong = song;

        
        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
            this.loadingTimeout = null;
        }
        
        
        if (this.audioErrorHandler) {
            this.audio.removeEventListener('error', this.audioErrorHandler);
            this.audioErrorHandler = null;
        }
        if (this.audioSuccessHandler) {
            this.audio.removeEventListener('canplay', this.audioSuccessHandler);
            this.audioSuccessHandler = null;
        }

       
        this.audio.src = '';
        this.audio.load();

        
        this.songTitle.textContent = song.title;
        this.songArtist.textContent = song.artist;
        this.songArt.src = song.art || 'covers/default.jpg';
        this.updatePlayerFavBtn(song.isFavorite);

        if (song.type === 'local') {
            console.log('Loading local track:', song.title, 'by', song.artist);
            this.audio.src = song.src;
        } else if (song.type === 'youtube') {
            const streamUrl = `http://localhost:3000/stream?id=${song.id}`;
            console.log('Loading YouTube track:', song.title, 'by', song.artist, 'ID:', song.id);
            
            
            this.audio.src = streamUrl;
            this.audio.preload = 'metadata';
            
           
            const handleError = async (e) => {
                console.error('YouTube audio error for:', song.title);
                console.error('Error details:', this.audio.error);
                
                
                if (this.currentSong && this.currentSong.id === song.id) {
                    try {
                        const response = await fetch(streamUrl);
                        if (!response.ok) {
                            const errorData = await response.json();
                            console.error('Server error:', errorData);
                            
                            if (errorData.suggestion) {
                                this.songTitle.textContent = `Failed: ${song.title}`;
                                this.songArtist.textContent = errorData.suggestion;
                            } else {
                                this.songTitle.textContent = `Failed: ${song.title}`;
                                this.songArtist.textContent = 'Video unavailable - try another';
                            }
                        } else {
                            this.songTitle.textContent = `Playback failed: ${song.title}`;
                            this.songArtist.textContent = 'Try another song';
                        }
                    } catch (fetchError) {
                        this.songTitle.textContent = `Connection error: ${song.title}`;
                        this.songArtist.textContent = 'Check if backend is running';
                    }
                    
                    this.isPlaying = false;
                    this.playPauseBtn.querySelector('i').className = 'fas fa-play';
                    

                    if (this.songs.length > 1) {
                        console.log('Auto-skipping to next song in 3 seconds...');
                        setTimeout(() => {
                            this.nextSong();
                        }, 3000);
                    }
                }
            };

            const handleSuccess = () => {
                
                if (this.currentSong && this.currentSong.id === song.id) {
                    console.log('YouTube audio loaded successfully:', song.title);
                    
                }
            };
            
            this.audioErrorHandler = handleError;
            this.audioSuccessHandler = handleSuccess;
            
            this.audio.addEventListener('error', this.audioErrorHandler, { once: true });
            this.audio.addEventListener('canplay', this.audioSuccessHandler, { once: true });
            
            
            this.loadingTimeout = setTimeout(() => {
                if (this.currentSong && this.currentSong.id === song.id && this.audio.readyState < 2) {
                    console.log('Loading timeout for:', song.title);
                    this.songTitle.textContent = `Timeout: ${song.title}`;
                    this.songArtist.textContent = 'Taking too long - try another';
                    
                    
                    if (this.songs.length > 1) {
                        setTimeout(() => this.nextSong(), 2000);
                    }
                }
            }, 20000); 
        }
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

    switchView(viewId, playlistId = null) {
        if (viewId === 'home') {
            this.songs = this.localSongs;
            this.renderSongListView("My Local Music", this.songs);
            if (!this.currentSong && this.songs.length > 0) { this.loadSong(this.songs[0]); }
        } else if (viewId === 'favorites') {
            // Combine local and YouTube favorites
            const localFavorites = this.localSongs.filter(song => song.isFavorite);
            const youtubeFavorites = this.youtubeFavorites.map(song => ({...song, isFavorite: true}));
            
            const allFavorites = [...localFavorites, ...youtubeFavorites];
            this.songs = allFavorites;
            
            const title = `Favorites (${allFavorites.length})`;
            this.renderSongListView(title, allFavorites);
        } else if (viewId === 'playlist') {
            const playlist = this.playlists.find(p => p.id === playlistId);
            if (playlist) {
                this.songs = playlist.songs;
                this.renderSongListView(playlist.name, this.songs);
            }
        }
    }
    
    renderSongListView(title, songs) {
        let content = `<h2 class="view-title">${title}</h2>`;
        if (songs.length === 0) {
            content += `<p>No songs found.</p>`;
        } else {
            const header = `<div class="song-list-header"><div>#</div><div>Title</div><div>Album</div><div style="text-align:center;">Time</div><div></div></div>`;
            content += header + `<ul class="song-list">${songs.map(song => this.getSongItemHTML(song)).join('')}</ul>`;
        }
        this.mainView.innerHTML = content;
    }

    getSongItemHTML(song) {
        const favoriteClass = song.isFavorite ? 'is-favorite' : '';
        const favoriteIcon = song.isFavorite ? 'fas' : 'far';
        const songType = song.type === 'youtube' ? 'YouTube' : 'Local';
        
        return `
            <li class="song-item" data-id="${song.id}">
                <div class="song-item-art"><img src="${song.art}" alt="${song.album}"></div>
                <div class="song-item-title">${song.title}<br><span class="song-item-artist">${song.artist} • ${songType}</span></div>
                <div class="song-item-album">${song.album}</div>
                <div class="song-item-duration">${this.formatTime(song.durationSeconds)}</div>
                <div class="song-item-options">
                    <button class="btn-icon song-item-fav-btn ${favoriteClass}" title="Add to Favorites"><i class="${favoriteIcon} fa-heart"></i></button>
                    <button class="btn-icon more-options-btn"><i class="fas fa-ellipsis-h"></i></button>
                </div>
            </li>`;
    }
    
   
    toggleFavorite(songId) {
        
        let song = this.songs.find(s => s.id === songId);
        
        if (!song) {
            console.error('Song not found:', songId);
            return;
        }

        if (song.type === 'local') {
            
            let localSong = this.localSongs.find(s => s.id === songId);
            if (localSong) {
                localSong.isFavorite = !localSong.isFavorite;
                song.isFavorite = localSong.isFavorite; 
            }
        } else if (song.type === 'youtube') {
            
            const existingFavIndex = this.youtubeFavorites.findIndex(fav => fav.id === songId);
            
            if (existingFavIndex >= 0) {
               
                this.youtubeFavorites.splice(existingFavIndex, 1);
                song.isFavorite = false;
                console.log('Removed from YouTube favorites:', song.title);
            } else {
                
                const favoriteData = {
                    ...song,
                    isFavorite: true,
                    addedAt: new Date().toISOString()
                };
                this.youtubeFavorites.push(favoriteData);
                song.isFavorite = true;
                console.log('Added to YouTube favorites:', song.title);
            }
            
            this.saveYoutubeFavorites();
        }

        
        if (this.currentSong && this.currentSong.id === songId) {
            this.updatePlayerFavBtn(song.isFavorite);
        }

        const songItemInDOM = this.mainView.querySelector(`.song-item[data-id="${songId}"] .song-item-fav-btn`);
        if (songItemInDOM) {
            songItemInDOM.classList.toggle('is-favorite', song.isFavorite);
            songItemInDOM.querySelector('i').className = song.isFavorite ? 'fas fa-heart' : 'far fa-heart';
        }
    }

    updatePlayerFavBtn(isFavorite) { 
        this.playerFavBtn.classList.toggle('is-favorite', isFavorite); 
        this.playerFavBtn.querySelector('i').className = isFavorite ? 'fas fa-heart' : 'far fa-heart'; 
    }
    
    async playSong() {
        if (!this.currentSong) return;
        
        try {
            
            if (this.currentSong.type === 'youtube' && this.audio.readyState < 2) {
                console.log('Waiting for YouTube audio to load...');
                this.songTitle.textContent = `Loading: ${this.currentSong.title}`;
                
                
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Audio loading timeout'));
                    }, 15000); 

                    const onReady = () => {
                        clearTimeout(timeout);
                        this.audio.removeEventListener('canplay', onReady);
                        this.audio.removeEventListener('error', onError);
                        resolve();
                    };
                    
                    const onError = () => {
                        clearTimeout(timeout);
                        this.audio.removeEventListener('canplay', onReady);
                        this.audio.removeEventListener('error', onError);
                        reject(new Error('Audio loading failed'));
                    };
                    
                    if (this.audio.readyState >= 2) {
                        clearTimeout(timeout);
                        resolve();
                    } else {
                        this.audio.addEventListener('canplay', onReady, { once: true });
                        this.audio.addEventListener('error', onError, { once: true });
                    }
                });
                
                this.songTitle.textContent = this.currentSong.title;
            }
            
            this.isPlaying = true;
            await this.audio.play();
            this.playPauseBtn.querySelector('i').className = 'fas fa-pause';
            
        } catch (error) {
            console.error('Playback failed:', error);
            this.songTitle.textContent = `Playback failed: ${this.currentSong.title}`;
            this.isPlaying = false;
            this.playPauseBtn.querySelector('i').className = 'fas fa-play';
        }
    }

    pauseSong() { this.isPlaying = false; this.audio.pause(); this.playPauseBtn.querySelector('i').className = 'fas fa-play'; }
    togglePlayPause() { this.isPlaying ? this.pauseSong() : this.playSong(); }
    nextSong() { if (this.songs.length === 0) return; this.currentIndex = (this.currentIndex + 1) % this.songs.length; this.loadSong(this.songs[this.currentIndex]); this.playSong(); }
    prevSong() { if (this.songs.length === 0) return; this.currentIndex = (this.currentIndex - 1 + this.songs.length) % this.songs.length; this.loadSong(this.songs[this.currentIndex]); this.playSong(); }
    seek(value) { this.audio.currentTime = value; }
    setVolume(value) { this.audio.volume = value; }
    formatTime(seconds) { if (isNaN(seconds)) return '0:00'; const minutes = Math.floor(seconds / 60); const secs = Math.floor(seconds % 60); return `${minutes}:${secs < 10 ? '0' : ''}${secs}`; }
    
    showContextMenu(songId, button) { 
        this.closeContextMenu(); 
        const menu = document.createElement('div'); 
        menu.className = 'context-menu'; 
        let menuHTML = '<h4>Add to Playlist</h4><hr>'; 
        if (this.playlists.length > 0) { 
            this.playlists.forEach(pl => { 
                menuHTML += `<div class="context-menu-item" data-playlist-id="${pl.id}" data-song-id="${songId}"><i class="fas fa-list-music"></i><span>${pl.name}</span></div>`; 
            }); 
        } else { 
            menuHTML += `<div class="context-menu-item disabled">No playlists yet.</div>`; 
        } 
        menu.innerHTML = menuHTML; 
        document.body.appendChild(menu); 
        const rect = button.getBoundingClientRect(); 
        menu.style.top = `${window.scrollY + rect.top - menu.offsetHeight - 5}px`; 
        menu.style.left = `${rect.left - menu.offsetWidth + rect.width}px`; 
        menu.addEventListener('click', (e) => { 
            const item = e.target.closest('.context-menu-item'); 
            if (item && !item.classList.contains('disabled')) { 
                this.addSongToPlaylist(item.dataset.songId, parseInt(item.dataset.playlistId)); 
            } 
        }); 
    }
    
    closeContextMenu() { const existingMenu = document.querySelector('.context-menu'); if (existingMenu) { existingMenu.remove(); } }
    
    addSongToPlaylist(songId, playlistId) { 
        let song = this.songs.find(s => s.id === songId) || this.localSongs.find(s => s.id === songId); 
        const playlist = this.playlists.find(p => p.id === playlistId); 
        if (song && playlist) { 
            if (!playlist.songs.find(s => s.id === songId)) { 
                playlist.songs.push(song); 
                alert(`'${song.title}' added to '${playlist.name}'!`); 
            } else { 
                alert(`'${song.title}' is already in '${playlist.name}'.`); 
            } 
        } 
        this.closeContextMenu(); 
    }
    
    toggleTheme() { 
        const body = document.body; 
        body.dataset.colorScheme = body.dataset.colorScheme === 'dark' ? 'light' : 'dark'; 
        this.themeToggle.querySelector('i').className = body.dataset.colorScheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon'; 
    }
    
    showCreatePlaylistModal() { this.modal.classList.remove('hidden'); }
    hideCreatePlaylistModal() { this.modal.classList.add('hidden'); document.getElementById('playlistName').value = ''; document.getElementById('playlistDescription').value = ''; }
    createPlaylist() { const name = document.getElementById('playlistName').value.trim(); if (!name) return; this.playlists.push({ id: Date.now(), name, songs: [] }); this.renderPlaylists(); this.hideCreatePlaylistModal(); }
    renderPlaylists() { this.playlistList.innerHTML = this.playlists.map(pl => `<li class="nav-item" data-playlist-id="${pl.id}"><i class="fas fa-list-music"></i><span>${pl.name}</span></li>`).join(''); }
}

document.addEventListener('DOMContentLoaded', () => { new MusicPlayer(); });