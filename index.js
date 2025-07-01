// @ts-check

(function PersonalSongStats() {
    if (!Spicetify?.showNotification) {
        setTimeout(PersonalSongStats, 1000);
        return;
    }

    let statsContainer = null;
    let lastTrackUri = null;
    let lastFmApiKey = localStorage.getItem('pss-lastfm-api-key');
    let lastFmUsername = localStorage.getItem('pss-lastfm-username');

    const LASTFM_BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

    function formatDate(timestamp) {
        if (!timestamp) return 'Never';
        
        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);
        
        if (diffInHours < 24) {
            const hours = Math.floor(diffInHours);
            if (hours < 1) {
                const minutes = Math.floor(diffInHours * 60);
                return `${minutes}m ago`;
            }
            return `${hours}h ago`;
        } else if (diffInHours < 24 * 7) {
            const days = Math.floor(diffInHours / 24);
            return `${days}d ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    function formatReleaseDate(dateString) {
        if (!dateString) return 'Unknown';
        
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Unknown';
        
        return date.getFullYear().toString();
    }

    async function fetchLastFmData(artist, track) {
        if (!lastFmApiKey || !lastFmUsername) {
            return { playcount: '?', lastPlayed: null };
        }

        try {
            const response = await fetch(
                `${LASTFM_BASE_URL}?method=track.getInfo&api_key=${lastFmApiKey}&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&username=${lastFmUsername}&format=json`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                console.warn('Last.fm API error:', data.message);
                return { playcount: '?', lastPlayed: null };
            }
            
            const trackInfo = data.track;
            const playcount = trackInfo?.userplaycount || '0';
            const lastPlayed = trackInfo?.userloved === '1' ? Date.now() / 1000 : null;
            
            return { playcount, lastPlayed };
        } catch (error) {
            console.warn('Error fetching Last.fm data:', error);
            return { playcount: '?', lastPlayed: null };
        }
    }

    async function fetchSpotifyReleaseDate(trackUri) {
        try {
            const track = await Spicetify.CosmosAsync.get(`sp://core-track/v1/tracks/${trackUri.split(':')[2]}`);
            return track?.album?.date?.year || null;
        } catch (error) {
            console.warn('Error fetching Spotify release date:', error);
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
            font-size: 12px;
            color: var(--spice-subtext);
            margin-left: 8px;
            font-weight: 400;
        `;
        
        container.innerHTML = `
            <span class="pss-playcount" title="Last.fm play count">♫ ?</span>
            <span class="pss-separator">•</span>
            <span class="pss-last-played" title="Last played">⏰ ?</span>
            <span class="pss-separator">•</span>
            <span class="pss-release-date" title="Release year">📅 ?</span>
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
        if (!Spicetify.Player.data?.track) return;

        const track = Spicetify.Player.data.track;
        const trackUri = track.uri;
        
        if (trackUri === lastTrackUri) return;
        lastTrackUri = trackUri;

        const artist = track.metadata.artist_name;
        const trackName = track.metadata.title;

        if (!statsContainer) {
            const nowPlayingBar = document.querySelector('[data-testid="now-playing-widget"]');
            if (!nowPlayingBar) return;

            const artistLink = nowPlayingBar.querySelector('a[href*="/artist/"]');
            if (!artistLink) return;

            statsContainer = createStatsContainer();
            artistLink.parentNode.insertBefore(statsContainer, artistLink.nextSibling);
        }

        const playcountEl = statsContainer.querySelector('.pss-playcount');
        const lastPlayedEl = statsContainer.querySelector('.pss-last-played');
        const releaseDateEl = statsContainer.querySelector('.pss-release-date');

        playcountEl.textContent = '♫ ...';
        lastPlayedEl.textContent = '⏰ ...';
        releaseDateEl.textContent = '📅 ...';

        const [lastFmData, releaseYear] = await Promise.all([
            fetchLastFmData(artist, trackName),
            fetchSpotifyReleaseDate(trackUri)
        ]);

        playcountEl.textContent = `♫ ${lastFmData.playcount}`;
        lastPlayedEl.textContent = `⏰ ${formatDate(lastFmData.lastPlayed)}`;
        releaseDateEl.textContent = `📅 ${releaseYear || 'Unknown'}`;
    }

    function onSongChange() {
        statsContainer = null;
        setTimeout(updateStats, 100);
    }

    function showConfigDialog() {
        const modal = Spicetify.PopupModal.display({
            title: 'Personal Song Stats Configuration',
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
                    
                    modal.hide();
                    Spicetify.showNotification('Settings saved!');
                    
                    setTimeout(() => {
                        onSongChange();
                    }, 500);
                };
            }
        }, 100);
    }

    new Spicetify.Menu.Item('Personal Song Stats Settings', false, showConfigDialog).register();

    injectStyles();
    
    Spicetify.Player.addEventListener('songchange', onSongChange);
    
    setTimeout(updateStats, 1000);
})();