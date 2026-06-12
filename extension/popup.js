// popup.js — Popup UI logic for ahmotools CC Fetcher.

(() => {
  'use strict';

  const fetchBtn  = document.getElementById('fetch-btn');
  const statusEl  = document.getElementById('status');
  const previewEl = document.getElementById('preview');
  const actionsEl = document.getElementById('actions');
  const copyBtn   = document.getElementById('copy-btn');
  const sendBtn   = document.getElementById('send-btn');

  let lastText = '';

  // ── Helpers ──

  function showStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = `status visible status-${type}`;
  }

  function hideStatus() {
    statusEl.className = 'status';
  }

  function showPreview(text) {
    const truncated = text.length > 600 ? text.slice(0, 600) + '...' : text;
    previewEl.textContent = truncated;
    previewEl.classList.add('visible');
  }

  function showActions() {
    actionsEl.classList.add('visible');
  }

  function resetUI() {
    hideStatus();
    previewEl.classList.remove('visible');
    previewEl.textContent = '';
    actionsEl.classList.remove('visible');
    lastText = '';
  }

  // ── Fetch handler ──

  fetchBtn.addEventListener('click', async () => {
    resetUI();
    fetchBtn.disabled = true;
    fetchBtn.innerHTML = '<span class="spinner"></span>Fetching...';

    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.url || !tab.url.includes('youtube.com/watch')) {
        showStatus('Navigate to a YouTube video page first.', 'error');
        fetchBtn.disabled = false;
        fetchBtn.textContent = 'Fetch Captions';
        return;
      }

      // Ensure content script is injected (in case the page was open before extension install)
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js'],
        });
      } catch (_) {
        // Content script might already be injected — that's fine
      }

      // Send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'fetchTranscript' });

      if (!response) {
        showStatus('No response from page. Try refreshing the YouTube tab.', 'error');
      } else if (!response.ok) {
        showStatus(response.error || 'No captions found on this page.', 'error');
      } else {
        lastText = response.text;
        const wordCount = lastText.split(/\s+/).filter(Boolean).length;
        showStatus(`Fetched ${wordCount} words.`, 'success');
        showPreview(lastText);
        showActions();
      }
    } catch (err) {
      showStatus('Failed to connect to the page. Try refreshing the YouTube tab.', 'error');
      console.error('CC Fetcher error:', err);
    }

    fetchBtn.disabled = false;
    fetchBtn.textContent = 'Fetch Captions';
  });

  // ── Copy to clipboard ──

  copyBtn.addEventListener('click', async () => {
    if (!lastText) return;
    try {
      await navigator.clipboard.writeText(lastText);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy to Clipboard'; }, 1500);
    } catch (_) {
      // Fallback: textarea copy
      const ta = document.createElement('textarea');
      ta.value = lastText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy to Clipboard'; }, 1500);
    }
  });

  // ── Send to ahmotools tab ──
  // Finds an open ahmotools tab and injects the text into the editor textarea.

  sendBtn.addEventListener('click', async () => {
    if (!lastText) return;

    try {
      const allTabs = await chrome.tabs.query({});
      const ahmoTab = allTabs.find((t) =>
        t.url && (t.url.includes('ahmotools') || t.title?.includes('ahmotools'))
      );

      if (!ahmoTab) {
        showStatus('No ahmotools tab found. Open ahmotools first, then try again.', 'error');
        return;
      }

      // Inject the text into the ahmotools editor
      await chrome.scripting.executeScript({
        target: { tabId: ahmoTab.id },
        func: (text) => {
          const editor = document.getElementById('editor');
          if (editor) {
            editor.value = text;
            editor.dispatchEvent(new Event('input', { bubbles: true }));
          }
        },
        args: [lastText],
      });

      // Switch to the ahmotools tab
      await chrome.tabs.update(ahmoTab.id, { active: true });
      const win = await chrome.windows.get(ahmoTab.windowId);
      if (win) await chrome.windows.update(win.id, { focused: true });

      sendBtn.textContent = 'Sent!';
      setTimeout(() => { sendBtn.textContent = 'Send to ahmotools'; }, 1500);
    } catch (err) {
      showStatus('Failed to send. Make sure ahmotools is open in a tab.', 'error');
      console.error('Send to ahmotools error:', err);
    }
  });
})();
