// popup.js
const captureBtn = document.getElementById('captureBtn');
const errorMsg = document.getElementById('errorMsg');

captureBtn.addEventListener('click', () => {
  captureBtn.classList.add('loading');
  captureBtn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-dasharray="50" stroke-dashoffset="25"/>
    </svg>
    Capturando...
  `;

  chrome.runtime.sendMessage({ action: 'captureScreen' }, (response) => {
    if (chrome.runtime.lastError || (response && response.error)) {
      const errText = (response && response.error) || chrome.runtime.lastError.message;
      errorMsg.textContent = '⚠️ Error: ' + errText;
      errorMsg.style.display = 'block';
      captureBtn.classList.remove('loading');
      captureBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        Capturar pantalla
      `;
      return;
    }
    // Close popup after successful capture
    window.close();
  });
});
