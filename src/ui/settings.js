const isWebKitMessageHandlerAvailable = window.webkit &&
  window.webkit.messageHandlers &&
  window.webkit.messageHandlers.live;
const isWebView2 = window.chrome && window.chrome.webview;

function doSendMessage(message) {
  if (isWebKitMessageHandlerAvailable) {
    window.webkit.messageHandlers.live.postMessage(message);
  } else if (isWebView2) {
    window.chrome.webview.postMessage(message);
  }
}

function closeWithResult(result) {
  doSendMessage({ method: "close_and_send", params: [JSON.stringify(result)] });
}

function getMode() {
  return document.querySelector('input[name="mode"]:checked').value; // "prep" | "rename"
}

function getScope() {
  return document.querySelector('input[name="scope"]:checked').value; // "track" | "set"
}

function updateVisibility() {
  const mode = getMode();
  document.getElementById('prepOptions').style.display   = mode === 'prep'   ? '' : 'none';
  document.getElementById('renameOptions').style.display = mode === 'rename' ? '' : 'none';
}

function run() {
  const mode = getMode();

  if (mode === 'prep') {
    closeWithResult({
      cancelled: false,
      mode: 'prep',
      warp:   document.getElementById('warp').checked,
      align:  document.getElementById('align').checked,
      mute:   document.getElementById('mute').checked,
      rename: document.getElementById('renameAsPartOfPrep').checked,
    });
  } else {
    closeWithResult({
      cancelled: false,
      mode: 'rename',
      scope: getScope(), // "track" | "set"
    });
  }
}

function cancel() {
  closeWithResult({ cancelled: true });
}

document.addEventListener('DOMContentLoaded', () => {
  updateVisibility();
  document.querySelectorAll('input[name="mode"]').forEach((el) => {
    el.addEventListener('change', updateVisibility);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') run();
    if (e.key === 'Escape') cancel();
  });
});