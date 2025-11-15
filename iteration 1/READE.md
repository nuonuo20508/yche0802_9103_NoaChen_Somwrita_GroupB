# Audio-Driven Line Visualization

An interactive audio visualization built with p5.js.  
The project animates groups of 30-degree tilted parallel lines that respond to different audio sources, including uploaded audio files, video audio tracks, and live microphone input.

---

## Overview

This project explores the relationship between **sound** and **minimal line-based graphics**.  
Instead of using complex shapes or colors, it focuses on how a single visual motif—tilted parallel lines—can change dynamically with audio energy.

Users can:
- Upload an **audio file** (e.g. MP3, WAV)
- Upload a **video file** with an audio track (e.g. MP4, MOV)
- Use their **microphone** to drive the visualization in real time

The animation responds to audio level by changing the number, length, thickness, and density of line groups across the canvas.

---

## Features

- **Multiple audio sources**
  - Audio files via `loadSound()` (MP3, WAV, OGG, M4A, AAC, FLAC)
  - Video files via `<video>` + Web Audio API `AnalyserNode` (MP4, AVI, MOV, MKV, WebM)
  - Live microphone input via `p5.AudioIn`

- **Intelligent file handling**
  - Automatic format detection and validation
  - File size warnings for files over 100MB
  - Error messages for unsupported formats
  - Loading progress indicators with color-coded status

- **Audio-reactive visualization**
  - Number of line groups changes with sound level (1-8 groups)
  - Line length mapped to audio amplitude (50-300 pixels scaled)
  - Line spacing and density depend on loudness
  - Stroke weight scales with window size for consistent aesthetics
  - Ultra-sensitive threshold (0.001) for microphone and video audio detection

- **Minimalist visual style**
  - All visuals are based on 30° tilted parallel lines
  - Warm color palette with cream background (247, 241, 219)
  - Soft "trails" created with semi-transparent background redraw (alpha: 25)
  - Random line direction (4 possible orientations per group)
  - Dynamic stroke weights: 5 preset options scaled to window size

- **Interactive controls**
  - Upload button for audio / video files
  - Play / pause button for file mode
  - Microphone toggle button to switch between file mode and mic mode
  - Clicking on the canvas toggles play / pause when a file is loaded

- **Smart audio processing**
  - Amplitude smoothing (0.8) to reduce visual jitter
  - Smooth fade-out (0.5s) when pausing audio
  - Automatic video looping when playing
  - Silent oscillator fallback for error handling

- **Responsive & adaptive**
  - Full-window canvas that resizes with browser
  - Stroke thickness and scale auto-adjust to window dimensions
  - Visual consistency across different screen sizes

---

## Technology Stack

- **p5.js** – canvas rendering and animation loop
- **p5.sound** – audio input and amplitude analysis (`p5.Amplitude`, `p5.AudioIn`)
- **Web Audio API** – analyzing audio tracks from HTML `<video>` elements (`AudioContext`, `AnalyserNode`)
- **HTML / CSS / JavaScript** – basic UI and styling

---

## File Structure

```text
.
├── index.html    # Page structure and UI elements (buttons, file input)
├── sketch.js     # Main p5.js sketch and audio/visual logic
├── style.css     # Basic layout and canvas styles
└── libraries/
    ├── p5.min.js
    └── p5.sound.min.js
```

---

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Edge, etc.)
- A simple HTTP server (for example):
  - VS Code Live Server extension, or
  - `npx http-server`, `python -m http.server`, etc.

### Run the Project

1. Place all project files in the same directory (as shown in the file structure).
2. Start a local server in that directory, for example:

   ```bash
   # Example using http-server
   npx http-server .
   ```

3. Open the displayed `http://localhost:xxxx` URL in your browser.
4. You should see:
   - The full-window canvas
   - A file upload input
   - Buttons for starting audio, play/pause, and microphone

---

## Usage & Interaction

### 1. Uploading an Audio or Video File

1. Click the **file upload** input and choose an audio or video file.
2. The UI will:
   - Show the file name and whether it is treated as *audio* or *video*
   - Enable the **Play / Pause** button
3. Click **“Start Audio”** (if visible) to activate the browser’s audio context (required by some browsers).
4. Click **Play / Pause**:
   - In **audio mode**, a `p5.SoundFile` is played and analyzed via `p5.Amplitude`.
   - In **video mode**, the `<video>` element is played; its audio track is analyzed via a Web Audio API `AnalyserNode`.

### 2. Using the Microphone

1. Click the **Microphone** button.
2. The app will:
   - Stop any currently playing audio or video
   - Hide the file play/pause button
   - Request microphone permission from the browser
3. If permission is granted:
   - A `p5.AudioIn` object starts capturing audio
   - The microphone is connected to `p5.Amplitude`
   - The UI shows that the microphone is active
4. Click the Microphone button again to stop mic input and return to file mode (if a file was loaded previously).

### 3. Canvas Interaction

- Clicking on the **canvas** (not on buttons) toggles **Play / Pause** when a file has been uploaded.
- Window resize:
  - The canvas is resized to fill the window.
  - Stroke weights and scale are recalculated to keep the visuals balanced.

---

## Implementation Details

### Audio Analysis

The sketch supports three input modes but normalizes them into a single `level` value between `0` and `1`:

- **Audio file mode**
  - Uses `loadSound()` to create a `p5.SoundFile`
  - `p5.Amplitude` is connected to `soundFile`
  - `level = amplitude.getLevel()`

- **Video mode**
  - Uses `createVideo()` to load video
  - A Web Audio API `AudioContext` and `AnalyserNode` are created:
    - `source = audioContext.createMediaElementSource(video.elt)`
    - `source -> analyser -> destination`
  - `analyser.getByteFrequencyData()` returns an array of frequency magnitudes
  - The average magnitude is normalized to obtain `level`

- **Microphone mode**
  - Uses `p5.AudioIn()` and `mic.start()` to request permission
  - The microphone is connected to `p5.Amplitude` via `amplitude.setInput(mic)`
  - `level` is again read from `amplitude.getLevel()`

The `draw()` function decides which analysis path to use based on `isVideo`, `isUsingMic`, and the availability of `analyser` or `amplitude`.

### Visual Mapping

For each animation frame:

1. A semi-transparent background is drawn:

   ```js
   background(247, 241, 219, 25);
   ```

   This creates a fading trail effect.

2. The origin is translated to the canvas center:

   ```js
   translate(width / 2, height / 2);
   ```

3. The current audio level `level` is used to determine:

   - **Number of line groups**: `numGroups = map(level, 0, 1, 1, 8)`
   - **Lines per group**: `minLines` and `maxLines` depend on `level`
   - **Line length**: `minLength` and `maxLength` depend on `level` and global `scale`
   - **Line spacing**: `minSpacing` and `maxSpacing` shrink as the sound gets louder

4. For each group, `drawLineGroup()`:

   - Picks a random starting point `(x1, y1)` around the canvas center.
   - Chooses a line direction tilted at **30 degrees**.
   - Computes the endpoint `(x2, y2)` using trigonometry.
   - Draws several parallel lines, each vertically offset by a random spacing.
   - Uses randomly chosen stroke weights from `strokeOption`, scaled by window size.

Animation only occurs when either:
- A file is playing (`isPlaying === true`), or
- The microphone is active and started,

and the level is above a small threshold (0.001), to avoid noise when the signal is silent.

### Advanced Features

**Amplitude Smoothing**
- Uses `amplitude.smooth(0.8)` to reduce jitter from rapid audio fluctuations
- Provides smoother, more natural visual transitions

**Dynamic Stroke System**
- Five preset stroke weights: `[0.4, 0.8, 1, 2, 3.5]`
- Each weight is multiplied by the global `scale` factor based on window size
- Ensures consistent visual appearance across different screen resolutions

**Random Direction Logic**
- Each line group randomly chooses one of four diagonal orientations
- Uses `signX` and `signY` random multipliers (±1)
- Creates natural variation while maintaining the 30° tilt angle

**File Format Detection**
- Automatically identifies file type from extension
- Separate handling pipelines for audio vs. video files
- Graceful error handling for unsupported formats

**Browser Audio Context Management**
- Handles browser autoplay policies with `getAudioContext().resume()`
- User interaction required to activate audio context
- Smart state tracking to avoid unnecessary context restarts

**Debug & Development**
- Real-time console logging every 10 frames
- Displays: audio level, play state, mode, and active source
- Useful for troubleshooting and fine-tuning thresholds

---

## Possible Extensions

- Add color mapping based on frequency bands (e.g., bass vs treble).
- Introduce different geometric motifs (circles, polygons) that can be toggled by the user.
- Record short clips of microphone-driven visuals and export them as GIFs or videos.
- Add presets for different “visual styles” (minimal, chaotic, dense, etc.).

---

## Credits

- Built with [p5.js](https://p5js.org/) and [p5.sound](https://p5js.org/reference/#/libraries/p5.sound).
- Uses the Web Audio API for analyzing video audio tracks.

