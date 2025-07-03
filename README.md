# 🎵 Personal song stats for Spotify

![Spicetify](https://img.shields.io/badge/Spicetify-Extension-1DB954?style=for-the-badge&logo=spotify&logoColor=white)
![Last.fm](https://img.shields.io/badge/Last.fm-API-D51007?style=for-the-badge&logo=last.fm&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Version](https://img.shields.io/badge/version-1.0.2-blue?style=for-the-badge)

A Spicetify extension that displays your personal song statistics in the right nav right before the song title.

![image](https://github.com/user-attachments/assets/85bf24dd-d70b-429a-bd77-022ff01af21c)

## Features

- **Last.fm play count**: Shows how many times you've played the current song
- **Last played**: Displays when you last played the song (relative time for recent plays, dates for older ones)
- **Release date**: Shows the year the song was released
- **Real-time updates**: Stats update automatically when songs change
- **Clean integration**: Seamlessly integrates into Spotify's bottom bar design

## Requirements

- [Spicetify CLI](https://spicetify.app) installed and configured
- A Last.fm account
- Last.fm API key (free)

## Setup instructions

### 1. Install the extension

1. Download or clone this repository
2. Copy the main JavaScript file to your Spicetify extensions directory:
   ```bash
   # Windows  
   copy spicetify-personal-song-stats.js %APPDATA%\spicetify\Extensions\

   # macOS/Linux
   cp spicetify-personal-song-stats.js ~/.config/spicetify/Extensions/
   ```

3. Apply the extension:
   ```bash
   spicetify config extensions spicetify-personal-song-stats.js
   spicetify apply
   ```

### 2. Get your Last.fm API key

1. Visit [Last.fm API Account Creation](https://www.last.fm/api/account/create)
2. Fill out the form (application name can be anything, like "Personal Use")
3. Copy your API key

### 3. Configure the extension

1. Open Spotify (with Spicetify applied)
2. Click on your profile menu (top right)
3. Select "Personal Song Stats Settings"
4. Enter your Last.fm API key and username
5. Click "Save"

## Usage

Once configured, the extension will automatically display song statistics in the right nav. The stats update automatically when you change songs.

## Configuration options

The extension stores your settings locally in your browser:
- **Last.fm API key**: Required for fetching play counts
- **Last.fm username**: Required for personal statistics

## Troubleshooting

### Stats show "?" or "Unknown"

- Verify your Last.fm API key and username are correct
- Check that the song exists in your Last.fm library
- Ensure you have scrobbled the track to Last.fm

### Extension not appearing

- Make sure Spicetify is properly installed and applied
- Check that the extension files are in the correct directory
- Try restarting Spotify

### API rate limiting

- The extension respects Last.fm API limits
- If you see temporary "?" values, wait a moment for the next API call

## Privacy

This extension:

- Stores your Last.fm credentials locally in your browser
- Only makes API calls to Last.fm and Spotify's internal APIs
- Does not collect or transmit any personal data elsewhere

## Development

If you want to contribute or modify the extension:

### Setup

1. Clone this repository
2. Make your changes to `spicetify-personal-song-stats.js`
3. Copy the file to Spicetify extensions directory:
   ```bash
   # Find your Spicetify extensions path
   spicetify path -e
   
   # Copy the updated file
   cp spicetify-personal-song-stats.js /path/to/spicetify/Extensions/
   ```
4. Apply changes:
   ```bash
   spicetify apply
   ```

### Debugging

- Open Spotify with DevTools enabled (automatically enabled by Spicetify)
- Check console for "Personal Song Stats:" messages
- Use browser DevTools to inspect the extension behavior
- Look for API response status codes if Last.fm integration isn't working

### File Structure

- `spicetify-personal-song-stats.js` - Main extension file
- `index.js` - Entry point for Spicetify marketplace
- `manifest.json` - Extension metadata
- `README.md` - Documentation
- `CHANGELOG.md` - Version history

## Contributing

Feel free to submit issues and pull requests to improve the extension.

## License

MIT License - feel free to modify and distribute.
