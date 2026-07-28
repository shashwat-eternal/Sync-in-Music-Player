-- Music Player Database Schema
-- Generated SQL statements for table creation

CREATE TABLE Songs (
    song_id INTEGER PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL,
    album VARCHAR(255),
    genre VARCHAR(100),
    year INTEGER,
    duration INTEGER,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    bitrate INTEGER,
    language VARCHAR(50),
    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    play_count INTEGER DEFAULT 0,
    last_played TIMESTAMP
);

CREATE TABLE Albums (
    album_id INTEGER PRIMARY KEY AUTO_INCREMENT,
    album_name VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL,
    release_year INTEGER,
    genre VARCHAR(100),
    cover_art_path VARCHAR(500),
    total_tracks INTEGER,
    language VARCHAR(50)
);

CREATE TABLE Artists (
    artist_id INTEGER PRIMARY KEY AUTO_INCREMENT,
    artist_name VARCHAR(255) NOT NULL UNIQUE,
    biography TEXT,
    country VARCHAR(100),
    genre VARCHAR(100),
    image_path VARCHAR(500),
    active_years VARCHAR(50)
);

CREATE TABLE Playlists (
    playlist_id INTEGER PRIMARY KEY AUTO_INCREMENT,
    playlist_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    total_songs INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0,
    is_favorite BOOLEAN DEFAULT FALSE
);

CREATE TABLE PlaylistSongs (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    playlist_id INTEGER NOT NULL,
    song_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (playlist_id) REFERENCES Playlists(playlist_id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES Songs(song_id) ON DELETE CASCADE
);

CREATE TABLE UserSettings (
    setting_id INTEGER PRIMARY KEY AUTO_INCREMENT,
    setting_name VARCHAR(100) NOT NULL UNIQUE,
    setting_value VARCHAR(500),
    setting_type VARCHAR(50),
    description TEXT
);

CREATE TABLE SearchHistory (
    search_id INTEGER PRIMARY KEY AUTO_INCREMENT,
    search_query VARCHAR(255) NOT NULL,
    search_type VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    results_count INTEGER
);

