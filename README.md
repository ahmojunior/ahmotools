# ahmotools

A lightweight, client-side utility hub designed to clean up text for LLMs and process small media files. It runs entirely in your browser without external servers, databases, or account requirements.

![](https://github.com/ahmojunior/ahmotools/blob/main/banner.png?raw=true)

## Features

* **Workspace Editor:** A minimalist text area for editing `.txt`, `.md`, and `.py` files.
* **Space Stripper:** Removes excessive double-line breaks from pasted text to condense formatting and save LLM context tokens.
* **Video & Audio Trimmer:** Uses `ffmpeg.wasm` to cut MP4, WebM, and MP3 files locally. It handles files up to 500MB.
* **CC Fetcher Extension:** A companion Chromium extension that pulls raw closed captions directly from YouTube video pages and sends them to your workspace.

## Setup and Installation

The project consists of a static web app and a browser extension.

### Web Application

Because the video trimmer relies on WebAssembly, the browser requires specific Cross-Origin-Isolation headers to function correctly. You cannot just double-click the HTML file if you want to use the trimmer.

1. Open your terminal in the project directory.
2. Run the included server script: `./serve.sh`.
3. Open `http://localhost:8080` in your browser.

### Companion Extension

1. Open Brave or Google Chrome and navigate to `chrome://extensions/`.
2. Toggle "Developer mode" on in the top right corner.
3. Click "Load unpacked" and select the `extension` folder located in this repository.

## Usage

### Fetching Transcripts

Navigate to a YouTube video. Click the CC Fetcher extension icon and select "Fetch Captions". Once loaded, click "Send to ahmotools" to push the text directly into your local workspace tab.

### Optimizing Text

Paste your text into the Workspace tab. Click "Strip Spaces" to automatically remove blank lines and trailing whitespace. You can export the cleaned result as a `.txt`, `.md`, or `.py` file.

### Trimming Media

Switch to the Video Trimmer tab. Drop a supported media file into the drop zone. Input your start and end times in seconds, then click "Trim". The file processes locally in your browser's memory and downloads automatically when finished.
