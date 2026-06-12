// content.js — Injected into YouTube pages.
// Extracts transcript text from the transcript panel DOM.

(() => {
  'use strict';

  /**
   * Attempt to open the transcript panel if it isn't already visible.
   * YouTube buries it behind: ⋯ menu → "Show transcript".
   * Returns true if the panel was already open or we successfully triggered it.
   */
  async function ensureTranscriptOpen() {
    // Check if transcript panel is already rendered with segments
    const existing = document.querySelector(
      'ytd-transcript-segment-list-renderer, ytd-transcript-search-panel-renderer'
    );
    if (existing && existing.querySelectorAll('ytd-transcript-segment-renderer').length > 0) {
      return true;
    }

    // Try to find and click the "Show transcript" button.
    // Step 1: Expand the description / engagement panel "...more" area
    //         (on newer YT layouts the transcript button lives in the engagement panels)
    const engagementPanels = document.querySelector('ytd-engagement-panel-section-list-renderer');

    // Step 2: Look for the "Show transcript" button in the description or menu
    // Try the structured description first (newer layout)
    const buttons = Array.from(document.querySelectorAll(
      'button, tp-yt-paper-button, ytd-button-renderer, yt-button-shape button'
    ));

    const transcriptBtn = buttons.find((btn) => {
      const text = (btn.textContent || '').trim().toLowerCase();
      return text.includes('show transcript') || text.includes('transcript');
    });

    if (transcriptBtn) {
      transcriptBtn.click();
      // Wait for the panel to render
      return await waitForSelector('ytd-transcript-segment-renderer', 4000);
    }

    // Alternative: try the ⋯ menu on the video
    const menuBtn = document.querySelector(
      'ytd-video-primary-info-renderer #button-shape button, ' +
      'ytd-menu-renderer yt-icon-button, ' +
      '#top-level-buttons-computed + ytd-menu-renderer button'
    );

    if (menuBtn) {
      menuBtn.click();
      await sleep(600);
      const menuItems = Array.from(document.querySelectorAll(
        'tp-yt-paper-listbox ytd-menu-service-item-renderer, ' +
        'ytd-menu-popup-renderer tp-yt-paper-listbox yt-formatted-string'
      ));
      const showTx = menuItems.find((el) => {
        return (el.textContent || '').toLowerCase().includes('transcript');
      });
      if (showTx) {
        showTx.click();
        return await waitForSelector('ytd-transcript-segment-renderer', 4000);
      }
    }

    return false;
  }

  /**
   * Poll for a selector to appear in the DOM.
   */
  function waitForSelector(selector, timeout = 3000) {
    return new Promise((resolve) => {
      if (document.querySelector(selector)) return resolve(true);
      const start = Date.now();
      const interval = setInterval(() => {
        if (document.querySelector(selector)) {
          clearInterval(interval);
          resolve(true);
        } else if (Date.now() - start > timeout) {
          clearInterval(interval);
          resolve(false);
        }
      }, 200);
    });
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  /**
   * Extract transcript segments from the DOM.
   * Returns { ok: true, text } or { ok: false, error }.
   */
  function extractSegments() {
    const segments = document.querySelectorAll('ytd-transcript-segment-renderer');
    if (!segments.length) {
      return { ok: false, error: 'No captions found on this page.' };
    }

    const lines = [];
    segments.forEach((seg) => {
      // Each segment has a timestamp div and a text div.
      // We want only the text content, skipping timestamps.
      const textEl = seg.querySelector(
        '.segment-text, ' +
        'yt-formatted-string.segment-text, ' +
        '#content yt-formatted-string:last-child, ' +
        '[class*="segment-text"]'
      );
      if (textEl) {
        const line = textEl.textContent.trim();
        if (line) lines.push(line);
      } else {
        // Fallback: grab all text, then strip the leading timestamp pattern
        const raw = seg.textContent.trim();
        // Remove timestamps like "0:00", "1:23:45", etc.
        const cleaned = raw.replace(/^\s*\d{1,2}(:\d{2}){1,2}\s*/, '').trim();
        if (cleaned) lines.push(cleaned);
      }
    });

    if (!lines.length) {
      return { ok: false, error: 'No captions found on this page.' };
    }

    // Join into continuous text — single space between segments
    const text = lines.join(' ');
    return { ok: true, text };
  }

  // ── Message listener ──
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action !== 'fetchTranscript') return;

    (async () => {
      // Check we're on a YouTube watch page
      if (!location.hostname.includes('youtube.com') || !location.pathname.startsWith('/watch')) {
        sendResponse({ ok: false, error: 'Navigate to a YouTube video page first.' });
        return;
      }

      const opened = await ensureTranscriptOpen();
      if (!opened) {
        // One more try: maybe segments loaded but our open attempt failed — check anyway
        const result = extractSegments();
        sendResponse(result);
        return;
      }

      // Small delay for DOM to settle after opening the panel
      await sleep(500);
      const result = extractSegments();
      sendResponse(result);
    })();

    // Return true to indicate async sendResponse
    return true;
  });
})();
