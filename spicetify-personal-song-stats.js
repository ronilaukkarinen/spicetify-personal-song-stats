// @ts-check

console.log('Personal Song Stats: Extension file loaded');

(function PersonalSongStats() {
    console.log('Personal Song Stats: Function starting, Spicetify available:', !!Spicetify);
    
    if (!Spicetify?.showNotification) {
        console.log('Personal Song Stats: Spicetify not ready, retrying...');
        setTimeout(PersonalSongStats, 1000);
        return;
    }
    
    console.log('Personal Song Stats: Spicetify ready, initializing...');

    let statsContainer = null;
    let lastTrackUri = null;
    let lastFmApiKey = localStorage.getItem('pss-lastfm-api-key');
    let lastFmUsername = localStorage.getItem('pss-lastfm-username');

    const LASTFM_BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

    function formatLastPlayed(timestamp, playCount = 0) {
        if (!timestamp) {
            // If we have plays but no timestamp, Last.fm couldn't find the specific timestamp
            if (playCount > 0) {
                return 'unknown date';
            }
            return 'never';
        }
        
        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);
        
        if (diffInHours < 24) {
            const hours = Math.floor(diffInHours);
            if (hours < 1) {
                const minutes = Math.floor(diffInHours * 60);
                return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
            }
            return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        } else if (diffInHours < 24 * 7) {
            const days = Math.floor(diffInHours / 24);
            if (days === 1) return 'yesterday';
            return `${days} days ago`;
        } else if (diffInHours < 24 * 30) {
            const weeks = Math.floor(diffInHours / (24 * 7));
            return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString('en-GB', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric' 
            });
        }
    }

    function formatReleaseDate(dateString) {
        if (!dateString) return 'Unknown release date';
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                // If it's just a year, format as "Released YEAR"
                if (typeof dateString === 'number' || /^\d{4}$/.test(dateString)) {
                    return `Released ${dateString}`;
                }
                return 'Unknown release date';
            }
            
            // Format as DD.MM.YYYY
            const day = date.getDate();
            const month = date.getMonth() + 1; // getMonth() returns 0-11
            const year = date.getFullYear();
            
            return `Song released ${day}.${month}.${year}`;
        } catch (error) {
            console.warn('Error formatting release date:', error);
            return 'Unknown release date';
        }
    }

    function formatPlayCount(count) {
        const numCount = parseInt(count) || 0;
        if (numCount === 0) return null; // Will be handled by special first-time message
        if (numCount === 1) return '1 play';
        return `${numCount} plays`;
    }

    async function fetchLastFmData(artist, track) {
        console.log('Personal Song Stats: fetchLastFmData() called for', artist, '-', track);
        
        if (!lastFmApiKey || !lastFmUsername) {
            console.log('Personal Song Stats: Missing Last.fm credentials - API key:', !!lastFmApiKey, 'Username:', !!lastFmUsername);
            return { playcount: '?', lastPlayed: null };
        }

        try {
            // Get basic track info first
            const trackInfoResponse = await fetch(
                `${LASTFM_BASE_URL}?method=track.getInfo&api_key=${lastFmApiKey}&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&username=${lastFmUsername}&format=json`
            );
            
            if (!trackInfoResponse.ok) {
                throw new Error(`HTTP ${trackInfoResponse.status}`);
            }
            
            const trackData = await trackInfoResponse.json();
            
            if (trackData.error) {
                console.warn('Last.fm API error:', trackData.message);
                return { playcount: '?', lastPlayed: null };
            }
            
            const trackInfo = trackData.track;
            const playcount = trackInfo?.userplaycount || '0';
            
            // Try to get last played time using track-specific search
            let lastPlayed = null;
            if (parseInt(playcount) > 0) {
                try {
                    console.log('Personal Song Stats: Getting track history to find last played time');
                    
                    // Use user.getTrackScrobbles to get all scrobbles for this specific track
                    const trackScrobblesResponse = await fetch(
                        `${LASTFM_BASE_URL}?method=user.getTrackScrobbles&api_key=${lastFmApiKey}&user=${lastFmUsername}&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&format=json`
                    );
                    
                    console.log('Personal Song Stats: Track scrobbles response status:', trackScrobblesResponse.status);
                    
                    if (trackScrobblesResponse.ok) {
                        const scrobblesData = await trackScrobblesResponse.json();
                        if (scrobblesData.trackscrobbles?.scrobble) {
                            const scrobbles = Array.isArray(scrobblesData.trackscrobbles.scrobble) 
                                ? scrobblesData.trackscrobbles.scrobble 
                                : [scrobblesData.trackscrobbles.scrobble];
                            
                            // Get the most recent scrobble (first in the array)
                            if (scrobbles.length > 0 && scrobbles[0]?.date?.uts) {
                                lastPlayed = parseInt(scrobbles[0].date.uts);
                                console.log('Personal Song Stats: Found last played from track scrobbles:', lastPlayed);
                            }
                        }
                    } else {
                        console.log('Personal Song Stats: Track scrobbles API not available, trying alternative method');
                        
                        // Fallback: Search through user's track library
                        const libraryResponse = await fetch(
                            `${LASTFM_BASE_URL}?method=library.getTracks&api_key=${lastFmApiKey}&user=${lastFmUsername}&artist=${encodeURIComponent(artist)}&limit=1000&format=json`
                        );
                        
                        if (libraryResponse.ok) {
                            const libraryData = await libraryResponse.json();
                            if (libraryData.tracks?.track) {
                                const tracks = Array.isArray(libraryData.tracks.track) 
                                    ? libraryData.tracks.track 
                                    : [libraryData.tracks.track];
                                
                                const thisTrack = tracks.find(t => 
                                    t.name.toLowerCase() === track.toLowerCase()
                                );
                                
                                if (thisTrack?.date?.uts) {
                                    lastPlayed = parseInt(thisTrack.date.uts);
                                    console.log('Personal Song Stats: Found last played from library:', lastPlayed);
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.log('Personal Song Stats: Track history API failed:', e);
                }
            }
            
            return { playcount, lastPlayed };
        } catch (error) {
            console.warn('Error fetching Last.fm data:', error);
            return { playcount: '?', lastPlayed: null };
        }
    }

    async function fetchReleaseDateFromAPIs(artist, trackName) {
        try {
            // Try Last.fm public API (no key needed for basic info)
            console.log('Personal Song Stats: Trying Last.fm for release date');
            const lastfmUrl = `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=YOUR_API_KEY&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(trackName)}&format=json`;
            
            try {
                const response = await fetch(lastfmUrl);
                const data = await response.json();
                
                if (data.track?.album?.['@attr']?.releasedate) {
                    const releaseDate = data.track.album['@attr'].releasedate;
                    console.log('Personal Song Stats: Found release date from Last.fm:', releaseDate);
                    return releaseDate;
                }
            } catch (e) {
                console.log('Personal Song Stats: Last.fm API failed');
            }
            
            // Try MusicBrainz API
            console.log('Personal Song Stats: Trying MusicBrainz for release date');
            try {
                // Search for the recording first
                const searchUrl = `https://musicbrainz.org/ws/2/recording/?query=artist:"${encodeURIComponent(artist)}" AND recording:"${encodeURIComponent(trackName)}"&fmt=json&limit=1`;
                
                const searchResponse = await fetch(searchUrl);
                const searchData = await searchResponse.json();
                
                if (searchData.recordings && searchData.recordings.length > 0) {
                    const recording = searchData.recordings[0];
                    if (recording.releases && recording.releases.length > 0) {
                        const release = recording.releases[0];
                        if (release.date) {
                            console.log('Personal Song Stats: Found release date from MusicBrainz:', release.date);
                            return release.date;
                        }
                    }
                }
            } catch (e) {
                console.log('Personal Song Stats: MusicBrainz API failed');
            }
            
            return null;
        } catch (error) {
            console.warn('Error fetching release date from APIs:', error);
            return null;
        }
    }

    function getSpotifyReleaseDate(track) {
        try {
            console.log('Personal Song Stats: Getting release date from track data');
            console.log('Personal Song Stats: Full track album object:', JSON.stringify(track?.album, null, 2));
            console.log('Personal Song Stats: Full player item album object:', JSON.stringify(Spicetify.Player.data?.item?.album, null, 2));
            
            // Try to get release date from various sources in the track/album data
            let releaseDate = null;
            
            // First try the track's album data
            if (track?.album?.release_date) {
                releaseDate = track.album.release_date;
                console.log('Personal Song Stats: Found release date in track.album.release_date:', releaseDate);
            } else if (track?.album?.date) {
                if (typeof track.album.date === 'string') {
                    releaseDate = track.album.date;
                } else if (track.album.date.year) {
                    return track.album.date.year;
                }
                console.log('Personal Song Stats: Found release date in track.album.date:', releaseDate);
            }
            
            // Try player data as fallback
            if (!releaseDate && Spicetify.Player.data?.item?.album?.release_date) {
                releaseDate = Spicetify.Player.data.item.album.release_date;
                console.log('Personal Song Stats: Found release date in Player.data.item.album.release_date:', releaseDate);
            }
            
            // Try other common album date fields
            if (!releaseDate) {
                const albumData = track?.album || Spicetify.Player.data?.item?.album;
                console.log('Personal Song Stats: Checking all album fields:', Object.keys(albumData || {}));
                
                if (albumData?.year) {
                    console.log('Personal Song Stats: Found year field:', albumData.year);
                    return albumData.year;
                }
                if (albumData?.release_date_precision && albumData?.release_date) {
                    releaseDate = albumData.release_date;
                    console.log('Personal Song Stats: Found release_date with precision:', releaseDate);
                }
            }
            
            if (releaseDate) {
                console.log('Personal Song Stats: Returning full release date:', releaseDate);
                return releaseDate;
            }
            
            console.log('Personal Song Stats: No release date found');
            return null;
        } catch (error) {
            console.warn('Error getting Spotify release date:', error);
            return null;
        }
    }

    function createStatsContainer() {
        const container = document.createElement('div');
        container.className = 'personal-song-stats';
        container.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 13px;
            color: var(--spice-subtext);
            margin-top: 8px;
            padding: 8px 0;
            font-weight: 400;
        `;
        
        container.innerHTML = `
            <div class="pss-stat-line">Loading song statistics...</div>
        `;
        
        return container;
    }

    function injectStyles() {
        if (document.getElementById('personal-song-stats-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'personal-song-stats-styles';
        style.textContent = `
            .personal-song-stats {
                opacity: 0.8;
                transition: opacity 0.2s ease;
            }
            .personal-song-stats:hover {
                opacity: 1;
            }
            .pss-separator {
                opacity: 0.5;
            }
        `;
        document.head.appendChild(style);
    }

    async function updateStats() {
        console.log('Personal Song Stats: updateStats() called');
        console.log('Personal Song Stats: Spicetify.Player object:', Spicetify.Player);
        console.log('Personal Song Stats: Spicetify.Player.data:', Spicetify.Player.data);
        
        // Try different ways to get track data
        let track = null;
        let trackSource = '';
        
        if (Spicetify.Player.data?.track) {
            track = Spicetify.Player.data.track;
            trackSource = 'Player.data.track';
        } else if (Spicetify.Player.data?.item) {
            track = Spicetify.Player.data.item;
            trackSource = 'Player.data.item';
        } else if (Spicetify.Queue?.track) {
            track = Spicetify.Queue.track;
            trackSource = 'Queue.track';
        } else if (Spicetify.Queue?.data?.track) {
            track = Spicetify.Queue.data.track;
            trackSource = 'Queue.data.track';
        }
        
        if (!track) {
            console.log('Personal Song Stats: No track data available from any source');
            return;
        }
        
        console.log('Personal Song Stats: Track found via:', trackSource);
        console.log('Personal Song Stats: Track object:', track);
        console.log('Personal Song Stats: Track album data:', track?.album);
        console.log('Personal Song Stats: Player item album:', Spicetify.Player.data?.item?.album);

        const trackUri = track.uri;
        console.log('Personal Song Stats: Current track URI:', trackUri);
        
        if (trackUri === lastTrackUri) {
            console.log('Personal Song Stats: Same track as before, skipping');
            return;
        }
        lastTrackUri = trackUri;

        const artist = track.metadata.artist_name;
        const trackName = track.metadata.title;
        console.log('Personal Song Stats: Track info - Artist:', artist, 'Track:', trackName);

        if (!statsContainer) {
            // Target the right sidebar artist info section
            const rightSidebar = document.querySelector('.Root__right-sidebar');
            if (!rightSidebar) {
                console.log('Personal Song Stats: Right sidebar not found');
                return;
            }

            // Try multiple selectors for the artist section
            let artistSection = rightSidebar.querySelector('.main-trackInfo-artists');
            if (!artistSection) {
                artistSection = rightSidebar.querySelector('[class*="trackInfo-artists"]');
            }
            if (!artistSection) {
                artistSection = rightSidebar.querySelector('[class*="artist"]');
            }
            if (!artistSection) {
                // Try to find any element that contains artist links
                const artistLinks = rightSidebar.querySelectorAll('a[href*="/artist/"]');
                if (artistLinks.length > 0) {
                    artistSection = artistLinks[artistLinks.length - 1].parentNode;
                }
            }
            
            if (!artistSection) {
                console.log('Personal Song Stats: Artist section not found with any selector');
                console.log('Personal Song Stats: Available elements in right sidebar:', rightSidebar.innerHTML.substring(0, 500));
                return;
            }
            
            console.log('Personal Song Stats: Found artist section:', artistSection);

            console.log('Personal Song Stats: Found artist section, creating stats container');
            statsContainer = createStatsContainer();
            
            try {
                artistSection.parentNode.insertBefore(statsContainer, artistSection.nextSibling);
                console.log('Personal Song Stats: Successfully inserted stats container');
            } catch (error) {
                console.error('Personal Song Stats: Failed to insert stats container', error);
                return;
            }
        }

        const statLineEl = statsContainer.querySelector('.pss-stat-line');
        statLineEl.textContent = 'Loading song statistics...';

        console.log('Personal Song Stats: Fetching data from Last.fm and getting release date...');
        const [lastFmData] = await Promise.all([
            fetchLastFmData(artist, trackName)
        ]);
        
        // Get release date from Spotify data first
        let releaseYear = getSpotifyReleaseDate(track);
        
        // If no release date from Spotify, try online APIs
        if (!releaseYear) {
            console.log('Personal Song Stats: No release date from Spotify, trying online APIs...');
            releaseYear = await fetchReleaseDateFromAPIs(artist, trackName);
        }

        console.log('Personal Song Stats: Data received - Play count:', lastFmData.playcount, 'Last played:', lastFmData.lastPlayed, 'Release year:', releaseYear);

        // Build the stats text
        const playCount = parseInt(lastFmData.playcount) || 0;
        const lastPlayedFormatted = formatLastPlayed(lastFmData.lastPlayed, playCount);
        
        // Special case for first-time listening
        if (playCount === 0) {
            statLineEl.textContent = 'You are hearing this for the first time.';
        } else {
            const playCountText = formatPlayCount(lastFmData.playcount);
            const lastPlayedFormatted = formatLastPlayed(lastFmData.lastPlayed, playCount);
            const releaseDateText = formatReleaseDate(releaseYear);
            
            // Build the text parts - only include parts we have valid data for
            const textParts = [playCountText];
            
            // Only add last played if we have a valid timestamp (not "unknown date" or "never")
            if (lastPlayedFormatted && !lastPlayedFormatted.includes('unknown') && lastPlayedFormatted !== 'never') {
                textParts.push(`Last play ${lastPlayedFormatted}`);
            }
            
            // Only add release date if we have it
            if (releaseYear) {
                textParts.push(releaseDateText);
            }
            
            statLineEl.textContent = textParts.join('. ') + '.';
        }
        
        console.log('Personal Song Stats: Stats updated successfully');
    }

    function onSongChange() {
        console.log('Personal Song Stats: Song changed, removing existing container');
        
        // Remove existing stats container if it exists
        const existingContainer = document.querySelector('.personal-song-stats');
        if (existingContainer) {
            existingContainer.remove();
            console.log('Personal Song Stats: Removed existing container');
        }
        
        statsContainer = null;
        setTimeout(updateStats, 100);
    }

    function showConfigDialog() {
        const modal = Spicetify.PopupModal.display({
            title: 'Song stats',
            content: `
                <div style="padding: 20px;">
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 4px; font-weight: 500;">Last.fm API Key:</label>
                        <input type="text" id="pss-api-key" value="${lastFmApiKey || ''}" 
                               style="width: 100%; padding: 8px; border: 1px solid var(--spice-button); background: var(--spice-card); color: var(--spice-text); border-radius: 4px;" 
                               placeholder="Enter your Last.fm API key">
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 4px; font-weight: 500;">Last.fm Username:</label>
                        <input type="text" id="pss-username" value="${lastFmUsername || ''}" 
                               style="width: 100%; padding: 8px; border: 1px solid var(--spice-button); background: var(--spice-card); color: var(--spice-text); border-radius: 4px;" 
                               placeholder="Enter your Last.fm username">
                    </div>
                    <div style="font-size: 12px; color: var(--spice-subtext); margin-bottom: 16px;">
                        Get your API key from: <a href="https://www.last.fm/api/account/create" target="_blank" style="color: var(--spice-text);">https://www.last.fm/api/account/create</a>
                    </div>
                    <button id="pss-save" style="background: var(--spice-button); color: var(--spice-text); border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                        Save
                    </button>
                </div>
            `,
            isLarge: false
        });

        setTimeout(() => {
            const saveButton = document.getElementById('pss-save');
            if (saveButton) {
                saveButton.onclick = () => {
                    const apiKey = document.getElementById('pss-api-key').value.trim();
                    const username = document.getElementById('pss-username').value.trim();
                    
                    if (apiKey) {
                        localStorage.setItem('pss-lastfm-api-key', apiKey);
                        lastFmApiKey = apiKey;
                    }
                    
                    if (username) {
                        localStorage.setItem('pss-lastfm-username', username);
                        lastFmUsername = username;
                    }
                    
                    if (modal && modal.hide) {
                        modal.hide();
                    } else {
                        // Alternative way to close modal
                        const modalElement = document.querySelector('[data-testid="popup-modal"]');
                        if (modalElement) {
                            modalElement.remove();
                        }
                    }
                    Spicetify.showNotification('Settings saved!');
                    
                    setTimeout(() => {
                        onSongChange();
                    }, 500);
                };
            }
        }, 100);
    }

    // Try different menu registration methods
    try {
        new Spicetify.Menu.Item('Song stats', false, showConfigDialog).register();
    } catch (e) {
        // Fallback: try alternative menu API
        try {
            Spicetify.Menu.registerItem('Song stats', showConfigDialog);
        } catch (e2) {
            // Final fallback: add to context menu
            try {
                Spicetify.ContextMenu.registerItem('Song stats', showConfigDialog);
            } catch (e3) {
                console.warn('Personal Song Stats: Could not register menu item', e3);
                // Add notification about keyboard shortcut
                setTimeout(() => {
                    Spicetify.showNotification('Song stats loaded! Open dev tools and run: PersonalSongStatsConfig()');
                }, 2000);
            }
        }
    }

    // Make config function globally available for testing
    window.PersonalSongStatsConfig = showConfigDialog;

    console.log('Personal Song Stats: Injecting styles...');
    injectStyles();
    
    console.log('Personal Song Stats: Adding event listener for song changes...');
    Spicetify.Player.addEventListener('songchange', onSongChange);
    
    console.log('Personal Song Stats: Setting initial timeout to update stats...');
    setTimeout(updateStats, 1000);
})();