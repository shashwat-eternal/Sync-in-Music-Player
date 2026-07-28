/* ==========================================================================
   SYNC IN — app.js
   YouTube playback goes through the official IFrame Player API (legitimate,
   ToS-compliant embed — no stream extraction). Search hits our backend,
   which calls the YouTube Data API v3. See sync-in-backend/README section
   for the required API key.
   ========================================================================== */

const BACKEND_URL = 'http://localhost:3000';

/* ---------- small color helpers for the mood field ---------- */
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return { h, s, l };
}
function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}

class MusicPlayer {
  constructor() {
    this.localSongs = [
      { id: 'local-1', type: 'local', title: 'Tum Hi Ho', artist: 'Arijit Singh', album: 'Aashiqui 2', src: 'music/tum-hi-ho.mp3', art: 'covers/aashiqui-2.jpg', durationSeconds: 262, isFavorite: false },
      { id: 'local-2', type: 'local', title: 'Kal Ho Naa Ho', artist: 'Sonu Nigam', album: 'Kal Ho Naa Ho', src: 'music/kal-ho-naa-ho.mp3', art: 'covers/kal-ho-naa-ho.jpg', durationSeconds: 326, isFavorite: true },
      { id: 'local-3', type: 'local', title: 'Shape of You', artist: 'Ed Sheeran', album: '÷ (Divide)', src: 'music/shape-of-you.mp3', art: 'covers/divide.jpg', durationSeconds: 233, isFavorite: false },
      { id: 'local-4', type: 'local', title: 'Bohemian Rhapsody', artist: 'Queen', album: 'A Night at the Opera', src: 'music/bohemian-rhapsody.mp3', art: 'covers/a-night-at-the-opera.jpg', durationSeconds: 355, isFavorite: false },
      { id: 'local-5', type: 'local', title: 'Channa Mereya', artist: 'Arijit Singh', album: 'Ae Dil Hai Mushkil', src: 'music/channa-mereya.mp3', art: 'covers/ae-dil-hai-mushkil.jpg', durationSeconds: 291, isFavorite: false },
      { id: 'local-6', type: 'local', title: 'Perfect', artist: 'Ed Sheeran', album: '÷ (Divide)', src: 'music/perfect.mp3', art: 'covers/divide.jpg', durationSeconds: 263, isFavorite: true },
      { id: 'local-7', type: 'local', title: 'Raabta', artist: 'Arijit Singh', album: 'Agent Vinod', src: 'music/raabta.mp3', art: 'covers/agent-vinod.jpg', durationSeconds: 239, isFavorite: false },
      { id: 'local-8', type: 'local', title: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours', src: 'music/blinding-lights.mp3', art: 'covers/after-hours.jpg', durationSeconds: 200, isFavorite: false }
    ];

    this.songs = [];
    this.currentSong = null;
    this.currentIndex = 0;
    this.isPlaying = false;
    this.isScrubbing = false;
    this.repeatMode = 'off'; // off | all | one
    this.queue = [];
    this.playlists = [];
    this.youtubeFavorites = this.loadYoutubeFavorites();
    this.crossfadeEnabled = localStorage.getItem('crossfadeEnabled') === 'true';

    // dual-element crossfade engine
    this.activeKey = 'A';
    this.audioGraphReady = false;
    this.isCrossfading = false;
    this.crossfadeDuration = 6;
    this.crossfadeTimeoutId = null;

    // YouTube IFrame Player
    this.ytPlayer = null;
    this.ytReady = false;
    this._ytApiPromise = null;

    // lyrics
    this.lyricsLines = null;
    this.lyricsRequestId = 0;

    this.cacheDom();
    this.init();
  }

  /* ============================= SETUP ============================= */

  cacheDom() {
    this.searchShell = document.getElementById('searchShell');
    this.searchInput = document.getElementById('searchInput');
    this.mainView = document.getElementById('mainView');
    this.sidebar = document.getElementById('sidebar');
    this.sidebarNav = document.getElementById('sidebarNav');
    this.sidebarToggle = document.getElementById('sidebarToggle');
    this.playlistList = document.getElementById('playlistList');
    this.newPlaylistBtn = document.getElementById('newPlaylistBtn');
    this.themeToggle = document.getElementById('themeToggle');

    this.audios = { A: document.getElementById('audioA'), B: document.getElementById('audioB') };
    this.npArtWrap = document.getElementById('npArtWrap');
    this.songArt = document.getElementById('songArt');
    this.ytFrame = document.getElementById('ytFrame');
    this.songTitle = document.getElementById('songTitle');
    this.songArtist = document.getElementById('songArtist');
    this.playerFavBtn = document.getElementById('playerFavBtn');

    this.playPauseBtn = document.getElementById('playPauseBtn');
    this.playIcon = document.getElementById('playIcon');
    this.pauseIcon = document.getElementById('pauseIcon');
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.progressBar = document.getElementById('progressBar');
    this.currentTimeEl = document.getElementById('currentTime');
    this.totalDurationEl = document.getElementById('totalDuration');
    this.volumeSlider = document.getElementById('volumeSlider');

    this.crossfadeToggle = document.getElementById('crossfadeToggle');
    this.repeatToggle = document.getElementById('repeatToggle');
    this.sleepTimerBtn = document.getElementById('sleepTimerBtn');
    this.sleepPopover = document.getElementById('sleepPopover');
    this.timerStatus = document.getElementById('timerStatus');
    this.timerCancelBtn = document.getElementById('timerCancelBtn');

    this.drawer = document.getElementById('drawer');
    this.drawerToggle = document.getElementById('drawerToggle');
    this.queueList = document.getElementById('queueList');
    this.queueHeading = document.getElementById('queueHeading');
    this.clearQueueBtn = document.getElementById('clearQueueBtn');
    this.sidebarQueueCount = document.getElementById('sidebarQueueCount');
    this.lyricsBody = document.getElementById('lyricsBody');

    this.vizCanvas = document.getElementById('vizCanvas');
    this.vizCtx = this.vizCanvas.getContext('2d');

    this.toastStack = document.getElementById('toastStack');

    this.modal = document.getElementById('playlistModal');
    this.closeModalBtn = document.getElementById('closeModal');
    this.cancelPlaylistBtn = document.getElementById('cancelPlaylist');
    this.savePlaylistBtn = document.getElementById('savePlaylist');
  }

  init() {
    this.volumeSlider.value = 0.8;
    this.setVolume(0.8);
    this.crossfadeToggle.classList.toggle('is-active', this.crossfadeEnabled);
    this.resizeVizCanvas();
    window.addEventListener('resize', () => this.resizeVizCanvas());
    this.renderPlaylists();
    this.switchView('home');
    this.bindEvents();
    this.startMainLoop();
  }

  /* ============================= EVENTS ============================= */

  bindEvents() {
    this.searchInput.addEventListener('input', this.debounce((e) => this.handleSearch(e.target.value), 420));

    this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
    this.nextBtn.addEventListener('click', () => this.nextSong());
    this.prevBtn.addEventListener('click', () => this.prevSong());
    this.playerFavBtn.addEventListener('click', () => { if (this.currentSong) this.toggleFavorite(this.currentSong.id); });

    this.progressBar.addEventListener('input', (e) => {
      this.isScrubbing = true;
      this.currentTimeEl.textContent = this.formatTime(Number(e.target.value));
    });
    this.progressBar.addEventListener('change', (e) => {
      this.seek(Number(e.target.value));
      this.isScrubbing = false;
    });
    this.volumeSlider.addEventListener('input', (e) => this.setVolume(Number(e.target.value)));

    this.sidebarToggle.addEventListener('click', () => this.sidebar.classList.toggle('open'));
    this.drawerToggle.addEventListener('click', () => this.drawer.classList.toggle('collapsed'));
    this.themeToggle.addEventListener('click', () => this.toggleTheme());

    this.crossfadeToggle.addEventListener('click', () => {
      this.crossfadeEnabled = !this.crossfadeEnabled;
      localStorage.setItem('crossfadeEnabled', String(this.crossfadeEnabled));
      this.crossfadeToggle.classList.toggle('is-active', this.crossfadeEnabled);
      this.showToast(this.crossfadeEnabled ? 'Crossfade on — local tracks blend into each other' : 'Crossfade off');
    });

    this.repeatToggle.addEventListener('click', () => {
      this.repeatMode = this.repeatMode === 'off' ? 'all' : this.repeatMode === 'all' ? 'one' : 'off';
      this.repeatToggle.classList.toggle('is-active', this.repeatMode !== 'off');
      this.repeatToggle.title = `Repeat: ${this.repeatMode}`;
      this.showToast(`Repeat: ${this.repeatMode}`);
    });

    this.sleepTimerBtn.addEventListener('click', (e) => { e.stopPropagation(); this.sleepPopover.classList.toggle('hidden'); });
    this.sleepPopover.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', () => this.sleepPopover.classList.add('hidden'));
    this.sleepPopover.querySelectorAll('.timer-chip').forEach((chip) => {
      chip.addEventListener('click', () => this.setSleepTimer(Number(chip.dataset.mins)));
    });
    this.timerCancelBtn.addEventListener('click', () => this.cancelSleepTimer());

    document.querySelectorAll('.drawer-tab').forEach((tab) => {
      tab.addEventListener('click', () => this.openDrawerTab(tab.dataset.tab));
    });
    this.clearQueueBtn.addEventListener('click', () => { this.queue = []; this.renderQueue(); });
    this.bindQueueDnD();

    this.newPlaylistBtn.addEventListener('click', () => this.modal.classList.remove('hidden'));
    this.closeModalBtn.addEventListener('click', () => this.hidePlaylistModal());
    this.cancelPlaylistBtn.addEventListener('click', () => this.hidePlaylistModal());
    this.savePlaylistBtn.addEventListener('click', () => this.createPlaylist());
    this.modal.addEventListener('click', (e) => { if (e.target === this.modal) this.hidePlaylistModal(); });

    this.sidebarNav.addEventListener('click', (e) => {
      const item = e.target.closest('.nav-item');
      if (!item) return;
      if (item.dataset.view === 'queue') { this.openDrawerTab('queue'); this.drawer.classList.remove('collapsed'); return; }
      this.sidebarNav.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
      item.classList.add('active');
      if (item.dataset.view) this.switchView(item.dataset.view);
      else if (item.dataset.playlistId) this.switchView('playlist', Number(item.dataset.playlistId));
      this.sidebar.classList.remove('open');
    });

    this.mainView.addEventListener('click', (e) => {
      const row = e.target.closest('.song-item');
      if (!row) return;
      const songId = row.dataset.id;
      const index = this.songs.findIndex((s) => s.id === songId);
      if (e.target.closest('.more-btn')) { this.showContextMenu(songId, e.target.closest('.more-btn')); return; }
      if (e.target.closest('.fav-btn')) { this.toggleFavorite(songId); return; }
      if (e.target.closest('.queue-add-btn')) { this.addToQueue(this.songs[index]); return; }
      if (index !== -1) this.playTrackAt(index);
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.context-menu') && !e.target.closest('.more-btn')) this.closeContextMenu();
    });

    for (const el of Object.values(this.audios)) {
      el.addEventListener('ended', (e) => { if (e.target === this.audios[this.activeKey]) this.handleTrackEnded(); });
      el.addEventListener('error', () => {
        if (this.currentSong && this.currentSong.type === 'local') this.showToast(`Couldn't load "${this.currentSong.title}"`, 'error');
      });
    }
  }

  debounce(fn, ms) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; }

  /* ============================= SEARCH ============================= */

  async handleSearch(query) {
    const q = query.toLowerCase().trim();
    if (!q) { this.switchView('home'); return; }

    const localResults = this.localSongs.filter((s) =>
      s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q) || s.album.toLowerCase().includes(q));

    if (localResults.length > 0) {
      this.songs = localResults;
      this.renderSongListView(`In your library`, `Results for "${query}"`, this.songs);
      return;
    }

    this.searchShell.classList.add('is-loading');
    this.renderSongListView(`Searching YouTube…`, `Looking up "${query}"`, []);
    try {
      const res = await fetch(`${BACKEND_URL}/search?q=${encodeURIComponent(q)}`);
      const results = await res.json();
      if (!res.ok) throw new Error(results.error || 'Search failed');
      this.songs = results.map((song) => ({
        ...song, type: 'youtube', isFavorite: this.youtubeFavorites.some((f) => f.id === song.id)
      }));
      this.renderSongListView(`YouTube results`, `"${query}" — via the official YouTube API`, this.songs);
    } catch (err) {
      console.error('Search failed:', err);
      this.renderSongListView('Search unavailable', err.message.includes('fetch')
        ? 'Backend not reachable — is the server running on :3000?' : err.message, []);
    } finally {
      this.searchShell.classList.remove('is-loading');
    }
  }

  /* ============================= VIEWS ============================= */

  switchView(viewId, playlistId = null) {
    if (viewId === 'home') {
      this.songs = this.localSongs;
      this.renderSongListView('My Music', `${this.songs.length} local tracks`, this.songs);
      if (!this.currentSong) this.loadSong(this.songs[0], { autoplay: false });
    } else if (viewId === 'favorites') {
      const localFavs = this.localSongs.filter((s) => s.isFavorite);
      const ytFavs = this.youtubeFavorites.map((s) => ({ ...s, isFavorite: true }));
      this.songs = [...localFavs, ...ytFavs];
      this.renderSongListView('Favorites', `${this.songs.length} tracks`, this.songs);
    } else if (viewId === 'playlist') {
      const pl = this.playlists.find((p) => p.id === playlistId);
      if (pl) { this.songs = pl.songs; this.renderSongListView(pl.name, `${pl.songs.length} tracks`, this.songs); }
    }
  }

  renderSongListView(title, subtitle, songs) {
    let html = `<h2 class="view-title">${this.escapeHtml(title)}</h2><p class="view-subtitle">${this.escapeHtml(subtitle)}</p>`;
    if (songs.length === 0) {
      html += `<div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none"><path d="M9 18V5l12-2v13" stroke="currentColor" stroke-width="1.6"/><circle cx="6" cy="18" r="3" stroke="currentColor" stroke-width="1.6"/><circle cx="18" cy="16" r="3" stroke="currentColor" stroke-width="1.6"/></svg>
        <strong>Nothing here yet</strong><span>Try a different search, or add tracks to a playlist.</span></div>`;
    } else {
      html += `<div class="song-list-header"><div>#</div><div>Title</div><div>Album</div><div style="text-align:center;">Time</div><div></div></div>`;
      html += `<ul class="song-list">${songs.map((s, i) => this.getSongItemHTML(s, i)).join('')}</ul>`;
    }
    this.mainView.innerHTML = html;
    this.refreshNowPlayingHighlight();
  }

  getSongItemHTML(song, index) {
    const favClass = song.isFavorite ? 'is-favorite' : '';
    const badge = song.type === 'youtube' ? '<span class="badge badge--youtube">YouTube</span>' : '<span class="badge badge--local">Local</span>';
    return `
      <li class="song-item" data-id="${song.id}" data-index="${index}">
        <div class="song-item-index"><span class="idx-num">${index + 1}</span><span class="eq-mini"><span></span><span></span><span></span></span></div>
        <div class="song-item-main">
          <img class="song-item-art" src="${song.art || 'covers/default.jpg'}" alt="">
          <div class="song-item-text">
            <div class="song-item-title">${this.escapeHtml(song.title)}</div>
            <div class="song-item-artist">${this.escapeHtml(song.artist)} ${badge}</div>
          </div>
        </div>
        <div class="song-item-album">${this.escapeHtml(song.album || '')}</div>
        <div class="song-item-duration">${this.formatTime(song.durationSeconds)}</div>
        <div class="song-item-actions">
          <button class="fav-btn ${favClass}" title="Favorite"><svg viewBox="0 0 24 24" fill="none"><path d="M12 21s-7.2-4.6-9.7-9A5.5 5.5 0 0112 6.5 5.5 5.5 0 0121.7 12c-2.5 4.4-9.7 9-9.7 9z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></button>
          <button class="queue-add-btn" title="Add to queue"><svg viewBox="0 0 24 24" fill="none"><path d="M4 7h13M4 12h9M4 17h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M19 13v6M16 16h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
          <button class="more-btn" title="More"><svg viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/></svg></button>
        </div>
      </li>`;
  }

  refreshNowPlayingHighlight() {
    this.mainView.querySelectorAll('.song-item').forEach((row) => {
      row.classList.toggle('now-playing', !!this.currentSong && row.dataset.id === this.currentSong.id);
    });
  }

  /* ============================= PLAYBACK CORE ============================= */

  playTrackAt(index) { this.cancelCrossfade(); this.currentIndex = index; this.loadSong(this.songs[index], { autoplay: true }); }

  loadSong(song, { autoplay = false } = {}) {
    if (!song) return;
    this.currentSong = song;
    this.songTitle.textContent = song.title;
    this.songArtist.textContent = `${song.artist} · ${song.type === 'youtube' ? 'YouTube' : 'Local'}`;
    this.updatePlayerFavBtn(song.isFavorite);
    this.refreshNowPlayingHighlight();
    this.loadLyricsFor(song);

    if (song.type === 'local') {
      this.npArtWrap.classList.remove('is-youtube');
      this.songArt.src = song.art || 'covers/default.jpg';
      if (this.ytReady && this.ytPlayer) this.ytPlayer.pauseVideo();

      const el = this.audios[this.activeKey];
      el.src = song.src;
      el.currentTime = 0;
      el.volume = Number(this.volumeSlider.value);
      el.load();
      this.updateMoodFromLocalArt(song.art);
      if (autoplay) this.playSong();
    } else {
      this.npArtWrap.classList.add('is-youtube');
      this.songArt.src = song.art || 'covers/default.jpg';
      this.audios.A.pause(); this.audios.B.pause();
      this.updateMoodFromSeed(song.id);

      this.createYtPlayerIfNeeded().then((player) => {
        this.applyVolumeToYt();
        if (this.currentSong !== song) return; // user navigated away while player was loading
        if (autoplay) player.loadVideoById(song.id); else player.cueVideoById(song.id);
      }).catch(() => this.showToast('Could not load the YouTube player — check your connection', 'error'));
    }
  }

  playSong() {
    if (!this.currentSong) return;
    if (!this.audioGraphReady) this.initAudioGraph();
    if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume();

    if (this.currentSong.type === 'local') {
      this.audios[this.activeKey].play().then(() => {
        this.isPlaying = true; this.updatePlayPauseIcon(true);
      }).catch((err) => { console.error(err); this.showToast(`Playback failed for "${this.currentSong.title}"`, 'error'); });
    } else if (this.ytReady && this.ytPlayer) {
      this.ytPlayer.playVideo();
      this.isPlaying = true; this.updatePlayPauseIcon(true);
    }
  }

  pauseSong() {
    if (this.currentSong?.type === 'local') this.audios[this.activeKey].pause();
    else if (this.ytReady && this.ytPlayer) this.ytPlayer.pauseVideo();
    this.isPlaying = false; this.updatePlayPauseIcon(false);
  }

  togglePlayPause() { this.isPlaying ? this.pauseSong() : this.playSong(); }
  updatePlayPauseIcon(playing) { this.playIcon.classList.toggle('hidden', playing); this.pauseIcon.classList.toggle('hidden', !playing); }

  handleTrackEnded() {
    if (this.repeatMode === 'one') { this.seek(0); this.playSong(); return; }
    this.nextSong();
  }

  nextSong() {
    this.cancelCrossfade();
    let next = null, fromQueue = false;
    if (this.queue.length > 0) { next = this.queue[0]; fromQueue = true; }
    else if (this.songs.length > 0) {
      let idx = this.currentIndex + 1;
      if (idx >= this.songs.length) {
        if (this.repeatMode === 'all') idx = 0; else { this.pauseSong(); return; }
      }
      this.currentIndex = idx; next = this.songs[idx];
    }
    if (!next) return;
    if (fromQueue) { this.queue.shift(); this.renderQueue(); }
    this.loadSong(next, { autoplay: true });
  }

  prevSong() {
    this.cancelCrossfade();
    if (this.getCurrentTime() > 3 && this.currentSong) { this.seek(0); return; }
    if (this.songs.length === 0) return;
    let idx = this.currentIndex - 1;
    if (idx < 0) idx = this.repeatMode === 'all' ? this.songs.length - 1 : 0;
    this.currentIndex = idx;
    this.loadSong(this.songs[idx], { autoplay: true });
  }

  seek(value) {
    if (this.currentSong?.type === 'youtube') { if (this.ytReady && this.ytPlayer) this.ytPlayer.seekTo(value, true); }
    else { this.audios[this.activeKey].currentTime = value; }
  }

  getCurrentTime() {
    if (this.currentSong?.type === 'youtube') return (this.ytReady && this.ytPlayer?.getCurrentTime) ? this.ytPlayer.getCurrentTime() : 0;
    return this.audios[this.activeKey].currentTime || 0;
  }
  getDuration() {
    if (this.currentSong?.type === 'youtube') return (this.ytReady && this.ytPlayer?.getDuration) ? this.ytPlayer.getDuration() : 0;
    return this.audios[this.activeKey].duration || 0;
  }

  setEffectiveVolume(v) {
    this.audios.A.volume = v; this.audios.B.volume = v;
    if (this.ytReady && this.ytPlayer) this.ytPlayer.setVolume(Math.round(v * 100));
  }
  setVolume(v) { this.setEffectiveVolume(v); this.volumeSlider.style.setProperty('--vol-percent', `${v * 100}%`); }
  applyVolumeToYt() { if (this.ytReady && this.ytPlayer) this.ytPlayer.setVolume(Math.round(Number(this.volumeSlider.value) * 100)); }

  /* ============================= YOUTUBE (official IFrame API) ============================= */

  ensureYouTubeAPI() {
    if (this._ytApiPromise) return this._ytApiPromise;
    this._ytApiPromise = new Promise((resolve) => {
      if (window.YT && window.YT.Player) { resolve(window.YT); return; }
      const prevCb = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (prevCb) prevCb(); resolve(window.YT); };
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    });
    return this._ytApiPromise;
  }

  createYtPlayerIfNeeded() {
    if (this.ytPlayer) return Promise.resolve(this.ytPlayer);
    return this.ensureYouTubeAPI().then((YT) => new Promise((resolve) => {
      this.ytPlayer = new YT.Player(this.ytFrame, {
        playerVars: { autoplay: 0, playsinline: 1, modestbranding: 1, rel: 0, iv_load_policy: 3 },
        events: {
          onReady: () => {
            this.ytReady = true;
            const frame = this.ytPlayer.getIframe();
            if (frame) frame.classList.add('np-yt-frame');
            resolve(this.ytPlayer);
          },
          onStateChange: (e) => this.handleYtStateChange(e),
          onError: () => {
            this.showToast(`"${this.currentSong?.title || 'This video'}" is unavailable — skipping`, 'error');
            setTimeout(() => this.nextSong(), 1200);
          }
        }
      });
    }));
  }

  handleYtStateChange(e) {
    const YTS = window.YT.PlayerState;
    if (e.data === YTS.PLAYING) { this.isPlaying = true; this.updatePlayPauseIcon(true); }
    else if (e.data === YTS.PAUSED) { this.isPlaying = false; this.updatePlayPauseIcon(false); }
    else if (e.data === YTS.ENDED) { this.handleTrackEnded(); }
  }

  /* ============================= CROSSFADE (local ↔ local) ============================= */

  initAudioGraph() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new Ctx();
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 128;
    this.analyser.smoothingTimeConstant = 0.82;
    this.gains = { A: this.audioCtx.createGain(), B: this.audioCtx.createGain() };
    this.sources = {
      A: this.audioCtx.createMediaElementSource(this.audios.A),
      B: this.audioCtx.createMediaElementSource(this.audios.B)
    };
    this.sources.A.connect(this.gains.A); this.gains.A.connect(this.analyser);
    this.sources.B.connect(this.gains.B); this.gains.B.connect(this.analyser);
    this.analyser.connect(this.audioCtx.destination);
    this.gains[this.activeKey].gain.value = 1;
    this.gains[this.activeKey === 'A' ? 'B' : 'A'].gain.value = 0;
    this.vizData = new Uint8Array(this.analyser.frequencyBinCount);
    this.audioGraphReady = true;
  }

  peekNextTrack() {
    if (this.queue.length > 0) return this.queue[0];
    if (this.repeatMode === 'one') return this.currentSong;
    const idx = this.currentIndex + 1;
    if (idx < this.songs.length) return this.songs[idx];
    if (this.repeatMode === 'all' && this.songs.length > 0) return this.songs[0];
    return null;
  }

  maybeStartCrossfade(t, d) {
    if (!this.crossfadeEnabled || this.isCrossfading || !this.isPlaying) return;
    if (!this.currentSong || this.currentSong.type !== 'local' || !d) return;
    if (d - t > this.crossfadeDuration) return;
    const next = this.peekNextTrack();
    if (!next || next.type !== 'local' || next.id === this.currentSong.id) return;
    this.startCrossfade(next);
  }

  startCrossfade(nextTrack) {
    if (!this.audioGraphReady) return;
    this.isCrossfading = true;
    const fromKey = this.activeKey, toKey = fromKey === 'A' ? 'B' : 'A';
    const toEl = this.audios[toKey];
    toEl.src = nextTrack.src; toEl.currentTime = 0; toEl.volume = Number(this.volumeSlider.value);
    toEl.load();
    toEl.play().catch(() => {});

    const now = this.audioCtx.currentTime, dur = this.crossfadeDuration;
    this.gains[fromKey].gain.cancelScheduledValues(now);
    this.gains[fromKey].gain.setValueAtTime(this.gains[fromKey].gain.value, now);
    this.gains[fromKey].gain.linearRampToValueAtTime(0, now + dur);
    this.gains[toKey].gain.cancelScheduledValues(now);
    this.gains[toKey].gain.setValueAtTime(0, now);
    this.gains[toKey].gain.linearRampToValueAtTime(1, now + dur);

    this.crossfadeTimeoutId = setTimeout(() => this.finishCrossfade(toKey, nextTrack), dur * 1000);
  }

  finishCrossfade(newActiveKey, nextTrack) {
    const oldKey = newActiveKey === 'A' ? 'B' : 'A';
    this.audios[oldKey].pause();
    this.activeKey = newActiveKey;
    this.isCrossfading = false;
    this.crossfadeTimeoutId = null;

    if (this.queue.length > 0 && this.queue[0].id === nextTrack.id) { this.queue.shift(); this.renderQueue(); }
    else { const idx = this.songs.findIndex((s) => s.id === nextTrack.id); if (idx !== -1) this.currentIndex = idx; }

    this.currentSong = nextTrack;
    this.songTitle.textContent = nextTrack.title;
    this.songArtist.textContent = `${nextTrack.artist} · Local`;
    this.songArt.src = nextTrack.art || 'covers/default.jpg';
    this.updatePlayerFavBtn(nextTrack.isFavorite);
    this.updateMoodFromLocalArt(nextTrack.art);
    this.refreshNowPlayingHighlight();
    this.loadLyricsFor(nextTrack);
  }

  cancelCrossfade() {
    if (!this.isCrossfading) return;
    clearTimeout(this.crossfadeTimeoutId);
    this.crossfadeTimeoutId = null;
    this.isCrossfading = false;
    const inactiveKey = this.activeKey === 'A' ? 'B' : 'A';
    if (this.audioGraphReady) {
      this.gains[this.activeKey].gain.cancelScheduledValues(this.audioCtx.currentTime);
      this.gains[this.activeKey].gain.setValueAtTime(1, this.audioCtx.currentTime);
      this.gains[inactiveKey].gain.cancelScheduledValues(this.audioCtx.currentTime);
      this.gains[inactiveKey].gain.setValueAtTime(0, this.audioCtx.currentTime);
    }
    this.audios[inactiveKey].pause();
  }

  /* ============================= QUEUE ============================= */

  addToQueue(song) { this.queue.push(song); this.renderQueue(); this.showToast(`Added "${song.title}" to queue`); }

  playQueueItemAt(i) {
    this.cancelCrossfade();
    const song = this.queue.splice(i, 1)[0];
    this.renderQueue();
    this.loadSong(song, { autoplay: true });
  }

  removeFromQueue(i) { this.queue.splice(i, 1); this.renderQueue(); }

  renderQueue() {
    this.queueList.innerHTML = this.queue.length ? this.queue.map((song, i) => `
      <li class="queue-item" draggable="true" data-index="${i}">
        <span class="grip"><svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="6" r="1.4" fill="currentColor"/><circle cx="9" cy="12" r="1.4" fill="currentColor"/><circle cx="9" cy="18" r="1.4" fill="currentColor"/><circle cx="15" cy="6" r="1.4" fill="currentColor"/><circle cx="15" cy="12" r="1.4" fill="currentColor"/><circle cx="15" cy="18" r="1.4" fill="currentColor"/></svg></span>
        <img src="${song.art || 'covers/default.jpg'}" alt="">
        <div class="qi-text"><div class="qi-title">${this.escapeHtml(song.title)}</div><div class="qi-artist">${this.escapeHtml(song.artist)}</div></div>
        <button class="qi-remove" data-index="${i}" aria-label="Remove"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
      </li>`).join('') : `<li class="lyrics-status" style="list-style:none;">Queue is empty — hit the + on any track to add it.</li>`;
    this.sidebarQueueCount.textContent = String(this.queue.length);
    this.sidebarQueueCount.classList.toggle('hidden', this.queue.length === 0);
    this.queueHeading.textContent = `Up next (${this.queue.length})`;
  }

  bindQueueDnD() {
    let dragIndex = null;
    this.queueList.addEventListener('dragstart', (e) => {
      const li = e.target.closest('.queue-item'); if (!li) return;
      dragIndex = Number(li.dataset.index);
      li.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    this.queueList.addEventListener('dragend', () => {
      this.queueList.querySelectorAll('.queue-item').forEach((li) => li.classList.remove('dragging', 'drag-over'));
    });
    this.queueList.addEventListener('dragover', (e) => {
      e.preventDefault();
      const li = e.target.closest('.queue-item'); if (!li) return;
      this.queueList.querySelectorAll('.queue-item').forEach((n) => n.classList.remove('drag-over'));
      li.classList.add('drag-over');
    });
    this.queueList.addEventListener('drop', (e) => {
      e.preventDefault();
      const li = e.target.closest('.queue-item'); if (!li || dragIndex === null) return;
      const dropIndex = Number(li.dataset.index);
      const [moved] = this.queue.splice(dragIndex, 1);
      this.queue.splice(dropIndex, 0, moved);
      dragIndex = null;
      this.renderQueue();
    });
    this.queueList.addEventListener('click', (e) => {
      if (e.target.closest('.qi-remove')) { this.removeFromQueue(Number(e.target.closest('.qi-remove').dataset.index)); return; }
      const li = e.target.closest('.queue-item');
      if (li) this.playQueueItemAt(Number(li.dataset.index));
    });
  }

  openDrawerTab(tab) {
    document.querySelectorAll('.drawer-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
    document.getElementById('queuePanel').classList.toggle('active', tab === 'queue');
    document.getElementById('lyricsPanel').classList.toggle('active', tab === 'lyrics');
  }

  /* ============================= LYRICS (lrclib.net — open lyrics DB) ============================= */

  cleanTitleForLyrics(title) {
    return title
      .replace(/\(.*?\)|\[.*?\]/g, '')
      .replace(/official\s*(video|audio|lyric[s]?|music\s*video)?/gi, '')
      .replace(/lyrics?/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  async loadLyricsFor(song) {
    const reqId = ++this.lyricsRequestId;
    this.lyricsLines = null;
    this.lyricsBody.innerHTML = `<p class="lyrics-status">Searching lyrics…</p>`;
    try {
      const track = this.cleanTitleForLyrics(song.title);
      const url = `https://lrclib.net/api/search?track_name=${encodeURIComponent(track)}&artist_name=${encodeURIComponent(song.artist)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('lookup failed');
      const results = await res.json();
      if (reqId !== this.lyricsRequestId) return; // a newer track loaded meanwhile
      const best = Array.isArray(results) && results.length ? (results.find((r) => r.syncedLyrics) || results[0]) : null;
      this.renderLyrics(best);
    } catch {
      if (reqId === this.lyricsRequestId) this.lyricsBody.innerHTML = `<p class="lyrics-status">Lyrics unavailable right now.</p>`;
    }
  }

  parseLRC(lrc) {
    const timeTag = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;
    const out = [];
    for (const line of lrc.split('\n')) {
      const tags = [];
      let m;
      timeTag.lastIndex = 0;
      while ((m = timeTag.exec(line))) {
        const ms = m[3] ? Number(m[3].padEnd(3, '0')) : 0;
        tags.push(Number(m[1]) * 60 + Number(m[2]) + ms / 1000);
      }
      const text = line.replace(timeTag, '').trim();
      tags.forEach((t) => out.push({ time: t, text }));
    }
    return out.sort((a, b) => a.time - b.time);
  }

  renderLyrics(entry) {
    if (!entry || (!entry.syncedLyrics && !entry.plainLyrics)) {
      this.lyricsBody.innerHTML = `<p class="lyrics-status">No lyrics found for this track.</p>`;
      return;
    }
    if (entry.syncedLyrics) {
      this.lyricsLines = this.parseLRC(entry.syncedLyrics);
      this.lyricsBody.innerHTML = this.lyricsLines.map((l) => `<p class="lyrics-line">${this.escapeHtml(l.text) || '♪'}</p>`).join('');
    } else {
      this.lyricsBody.innerHTML = entry.plainLyrics.split('\n').map((l) => `<p class="lyrics-line">${this.escapeHtml(l)}</p>`).join('');
    }
  }

  updateLyricsHighlight(t) {
    if (!this.lyricsLines || !this.lyricsLines.length) return;
    let active = -1;
    for (let i = 0; i < this.lyricsLines.length; i++) { if (this.lyricsLines[i].time <= t) active = i; else break; }
    const nodes = this.lyricsBody.querySelectorAll('.lyrics-line');
    nodes.forEach((n, i) => n.classList.toggle('active', i === active));
    if (active >= 0 && nodes[active] && !this.drawer.classList.contains('collapsed')) {
      nodes[active].scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  /* ============================= SLEEP TIMER ============================= */

  setSleepTimer(minutes) {
    this.cancelSleepTimer(false);
    this.sleepEndAt = Date.now() + minutes * 60000;
    this.sleepFadeStarted = false;
    this.sleepIntervalId = setInterval(() => this.tickSleepTimer(), 1000);
    this.timerStatus.textContent = `Pausing in ${this.formatCountdown(minutes * 60)}`;
    this.timerStatus.classList.remove('hidden');
    this.timerCancelBtn.classList.remove('hidden');
    document.querySelectorAll('.timer-chip').forEach((c) => c.classList.toggle('active', Number(c.dataset.mins) === minutes));
    this.showToast(`Sleep timer set for ${minutes} min`);
  }

  tickSleepTimer() {
    const remaining = Math.max(0, Math.round((this.sleepEndAt - Date.now()) / 1000));
    this.timerStatus.textContent = remaining > 0 ? `Pausing in ${this.formatCountdown(remaining)}` : 'Pausing…';
    if (remaining <= 8 && !this.sleepFadeStarted) { this.sleepFadeStarted = true; this.fadeOutForSleep(8); }
    if (remaining <= 0) { this.pauseSong(); this.cancelSleepTimer(); }
  }

  fadeOutForSleep(seconds) {
    this.preSleepVolume = Number(this.volumeSlider.value);
    const steps = 16; let i = 0;
    this.sleepFadeInterval = setInterval(() => {
      i++;
      this.setEffectiveVolume(Math.max(0, this.preSleepVolume * (1 - i / steps)));
      if (i >= steps) clearInterval(this.sleepFadeInterval);
    }, (seconds * 1000) / steps);
  }

  cancelSleepTimer(reset = true) {
    clearInterval(this.sleepIntervalId); clearInterval(this.sleepFadeInterval);
    this.sleepIntervalId = null;
    if (reset) {
      this.timerStatus.classList.add('hidden');
      this.timerCancelBtn.classList.add('hidden');
      document.querySelectorAll('.timer-chip').forEach((c) => c.classList.remove('active'));
      if (this.preSleepVolume != null) { this.setEffectiveVolume(this.preSleepVolume); this.preSleepVolume = null; }
    }
  }

  formatCountdown(totalSeconds) {
    const m = Math.floor(totalSeconds / 60), s = totalSeconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  /* ============================= VISUALIZER ============================= */

  resizeVizCanvas() {
    const rect = this.vizCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.vizCanvas.width = Math.max(1, rect.width * dpr);
    this.vizCanvas.height = Math.max(1, rect.height * dpr);
  }

  drawVisualizerFrame() {
    const ctx = this.vizCtx, w = this.vizCanvas.width, h = this.vizCanvas.height;
    ctx.clearRect(0, 0, w, h);
    if (!this.isPlaying) return;

    if (this.currentSong?.type === 'local' && this.audioGraphReady) {
      this.analyser.getByteFrequencyData(this.vizData);
      const rootStyle = getComputedStyle(document.documentElement);
      const moodA = rootStyle.getPropertyValue('--mood-a').trim();
      const cyanRgb = rootStyle.getPropertyValue('--cyan-rgb').trim();
      const grad = ctx.createLinearGradient(0, h, 0, 0);
      grad.addColorStop(0, `rgba(${moodA},0.85)`);
      grad.addColorStop(1, `rgba(${cyanRgb},0.9)`);
      ctx.fillStyle = grad;
      const bars = this.vizData.length;
      const barW = w / bars;
      for (let i = 0; i < bars; i++) {
        const barH = (this.vizData[i] / 255) * h * 0.85;
        ctx.fillRect(i * barW, h - barH, barW * 0.7, barH);
      }
    } else if (this.currentSong?.type === 'youtube') {
      // Cross-origin YouTube audio can't be analyzed for real FFT data, so we
      // show an honest ambient pulse instead of a fake-looking spectrum.
      const t = performance.now() / 1000;
      ctx.beginPath();
      const mid = h / 2;
      for (let x = 0; x <= w; x += 4) {
        const y = mid + Math.sin(x * 0.02 + t * 2) * (h * 0.18) * (0.6 + 0.4 * Math.sin(t * 1.3));
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(${getComputedStyle(document.documentElement).getPropertyValue('--magenta-rgb')},0.5)`;
      ctx.lineWidth = 2 * (window.devicePixelRatio || 1);
      ctx.stroke();
    }
  }

  /* ============================= MOOD FIELD ============================= */

  setMoodVars(c1, c2, c3) {
    const root = document.documentElement.style;
    root.setProperty('--mood-a', `${c1.r},${c1.g},${c1.b}`);
    root.setProperty('--mood-b', `${c2.r},${c2.g},${c2.b}`);
    root.setProperty('--mood-c', `${c3.r},${c3.g},${c3.b}`);
  }

  updateMoodFromLocalArt(src) {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = this._moodCanvas || (this._moodCanvas = document.createElement('canvas'));
        canvas.width = 8; canvas.height = 8;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 8, 8);
        const data = ctx.getImageData(0, 0, 8, 8).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
        r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n);
        const hsl = rgbToHsl(r, g, b);
        const c1 = hslToRgb(hsl.h, Math.min(1, hsl.s + 0.3), 0.56);
        const c2 = hslToRgb((hsl.h + 130) % 360, 0.7, 0.5);
        const c3 = hslToRgb((hsl.h + 260) % 360, 0.75, 0.55);
        this.setMoodVars(c1, c2, c3);
      } catch { this.updateMoodFromSeed(src); }
    };
    img.onerror = () => this.updateMoodFromSeed(src);
    img.src = src;
  }

  updateMoodFromSeed(seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    const h = hash % 360;
    this.setMoodVars(hslToRgb(h, 0.78, 0.58), hslToRgb((h + 130) % 360, 0.7, 0.5), hslToRgb((h + 260) % 360, 0.75, 0.55));
  }

  /* ============================= MAIN LOOP ============================= */

  startMainLoop() {
    const tick = () => {
      const t = this.getCurrentTime(), d = this.getDuration();
      if (d > 0 && !this.isScrubbing) {
        this.currentTimeEl.textContent = this.formatTime(t);
        this.totalDurationEl.textContent = this.formatTime(d);
        this.progressBar.max = d;
        this.progressBar.value = t;
        this.progressBar.style.setProperty('--progress-percent', `${(t / d) * 100}%`);
      }
      this.updateLyricsHighlight(t);
      this.maybeStartCrossfade(t, d);
      this.drawVisualizerFrame();
      requestAnimationFrame(tick);
    };
    tick();
  }

  /* ============================= FAVORITES / PLAYLISTS ============================= */

  toggleFavorite(songId) {
    const song = this.songs.find((s) => s.id === songId) || this.localSongs.find((s) => s.id === songId);
    if (!song) return;

    if (song.type === 'local') {
      const local = this.localSongs.find((s) => s.id === songId);
      local.isFavorite = !local.isFavorite;
      song.isFavorite = local.isFavorite;
    } else {
      const idx = this.youtubeFavorites.findIndex((f) => f.id === songId);
      if (idx >= 0) { this.youtubeFavorites.splice(idx, 1); song.isFavorite = false; }
      else { this.youtubeFavorites.push({ ...song, isFavorite: true, addedAt: new Date().toISOString() }); song.isFavorite = true; }
      this.saveYoutubeFavorites();
    }

    if (this.currentSong?.id === songId) this.updatePlayerFavBtn(song.isFavorite);
    const row = this.mainView.querySelector(`.song-item[data-id="${songId}"] .fav-btn`);
    if (row) row.classList.toggle('is-favorite', song.isFavorite);
  }

  updatePlayerFavBtn(isFavorite) { this.playerFavBtn.classList.toggle('is-favorite', !!isFavorite); }

  loadYoutubeFavorites() { try { return JSON.parse(localStorage.getItem('youtubeFavorites') || '[]'); } catch { return []; } }
  saveYoutubeFavorites() { localStorage.setItem('youtubeFavorites', JSON.stringify(this.youtubeFavorites)); }

  showContextMenu(songId, button) {
    this.closeContextMenu();
    const song = this.songs.find((s) => s.id === songId);
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    let html = '';
    html += `<div class="context-menu-item" data-action="play-next"><svg viewBox="0 0 24 24" fill="none"><path d="M4 7h13M4 12h9M4 17h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span>Play next</span></div>`;
    html += `<div class="context-menu-item" data-action="add-queue"><svg viewBox="0 0 24 24" fill="none"><path d="M19 13v6M16 16h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span>Add to queue</span></div>`;
    html += `<div class="context-divider"></div><h4>Add to playlist</h4>`;
    html += this.playlists.length
      ? this.playlists.map((pl) => `<div class="context-menu-item" data-action="add-playlist" data-playlist-id="${pl.id}"><svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span>${this.escapeHtml(pl.name)}</span></div>`).join('')
      : `<div class="context-menu-item disabled">No playlists yet</div>`;
    menu.innerHTML = html;
    document.body.appendChild(menu);
    const rect = button.getBoundingClientRect();
    menu.style.top = `${Math.max(8, window.scrollY + rect.top - menu.offsetHeight - 6)}px`;
    menu.style.left = `${Math.min(window.innerWidth - menu.offsetWidth - 8, rect.left - menu.offsetWidth + rect.width)}px`;
    menu.addEventListener('click', (e) => {
      const item = e.target.closest('.context-menu-item');
      if (!item || item.classList.contains('disabled')) return;
      if (item.dataset.action === 'play-next') this.queue.unshift(song);
      else if (item.dataset.action === 'add-queue') this.queue.push(song);
      else if (item.dataset.action === 'add-playlist') this.addSongToPlaylist(songId, Number(item.dataset.playlistId));
      this.renderQueue();
      this.closeContextMenu();
    });
  }
  closeContextMenu() { document.querySelector('.context-menu')?.remove(); }

  addSongToPlaylist(songId, playlistId) {
    const song = this.songs.find((s) => s.id === songId) || this.localSongs.find((s) => s.id === songId);
    const playlist = this.playlists.find((p) => p.id === playlistId);
    if (!song || !playlist) return;
    if (playlist.songs.find((s) => s.id === songId)) { this.showToast(`Already in "${playlist.name}"`); return; }
    playlist.songs.push(song);
    this.showToast(`Added to "${playlist.name}"`);
  }

  hidePlaylistModal() {
    this.modal.classList.add('hidden');
    document.getElementById('playlistName').value = '';
    document.getElementById('playlistDescription').value = '';
  }
  createPlaylist() {
    const name = document.getElementById('playlistName').value.trim();
    if (!name) return;
    this.playlists.push({ id: Date.now(), name, songs: [] });
    this.renderPlaylists();
    this.hidePlaylistModal();
  }
  renderPlaylists() {
    this.playlistList.innerHTML = this.playlists.map((pl) =>
      `<li class="nav-item" data-playlist-id="${pl.id}"><svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span>${this.escapeHtml(pl.name)}</span></li>`
    ).join('');
  }

  /* ============================= MISC ============================= */

  toggleTheme() {
    const body = document.body;
    body.dataset.colorScheme = body.dataset.colorScheme === 'dark' ? 'light' : 'dark';
  }

  showToast(message, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast ${type === 'error' ? 'error' : ''}`;
    el.textContent = message;
    this.toastStack.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 3200);
  }

  formatTime(seconds) {
    if (isNaN(seconds) || seconds == null) return '0:00';
    const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  escapeHtml(str) { const d = document.createElement('div'); d.textContent = str ?? ''; return d.innerHTML; }
}

document.addEventListener('DOMContentLoaded', () => { window.player = new MusicPlayer(); });
