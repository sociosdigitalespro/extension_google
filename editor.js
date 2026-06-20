/**
 * editor.js – SnapEdit Chrome Extension
 * Full image editor with Crop and Smart Erase tools
 */

// ─── DOM References ───────────────────────────────────────────────────────────
const mainCanvas    = document.getElementById('mainCanvas');
const overlayCanvas = document.getElementById('overlayCanvas');
const canvasContainer = document.getElementById('canvasContainer');
const canvasWrapper   = document.getElementById('canvasWrapper');
const loadingOverlay  = document.getElementById('loadingOverlay');
const btnUndo         = document.getElementById('btnUndo');
const btnSave         = document.getElementById('btnSave');
const undoCount       = document.getElementById('undoCount');
const toolCropBtn     = document.getElementById('toolCrop');
const toolEraseBtn    = document.getElementById('toolErase');
const infoTool        = document.getElementById('infoTool');
const infoDims        = document.getElementById('infoDims');
const hintBar         = document.getElementById('hintBar');
const hintIcon        = document.querySelector('.hint-icon');
const hintText        = document.getElementById('hintText');
const toastEl         = document.getElementById('toast');

const ctx     = mainCanvas.getContext('2d', { willReadFrequently: true });
const overlay = overlayCanvas.getContext('2d');

// ─── State ────────────────────────────────────────────────────────────────────
let currentTool   = 'crop';   // 'crop' | 'erase'
let history       = [];       // ImageData snapshots for undo
let isDrawing     = false;
let startX = 0, startY = 0;
let currentX = 0, currentY = 0;

// ─── Hints ────────────────────────────────────────────────────────────────────
const HINTS = {
  crop:  { icon: '✂️',  text: 'Arrastra para seleccionar el área de recorte. Se aplicará automáticamente al soltar el ratón.' },
  erase: { icon: '🪄', text: 'Arrastra para seleccionar el área a borrar. El borde exterior determinará el color de relleno.' },
};

// ─── Toast helper ─────────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = 'default', duration = 2500) {
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.className = `toast ${type} show`;
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
  }, duration);
}

// ─── Tool selection ───────────────────────────────────────────────────────────
function selectTool(tool) {
  currentTool = tool;

  toolCropBtn.classList.toggle('active', tool === 'crop');
  toolEraseBtn.classList.toggle('active', tool === 'erase');

  overlayCanvas.className = `tool-${tool}`;

  const hint = HINTS[tool];
  hintIcon.textContent = hint.icon;
  hintText.textContent = hint.text;

  hintBar.className = `hint-bar ${tool}-mode`;

  const toolName = tool === 'crop' ? 'Recorte' : 'Borrado';
  infoTool.innerHTML = `Herramienta: <strong>${toolName}</strong>`;
}

toolCropBtn.addEventListener('click', () => selectTool('crop'));
toolEraseBtn.addEventListener('click', () => selectTool('erase'));

// ─── History management ───────────────────────────────────────────────────────
function pushHistory() {
  const snap = ctx.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
  history.push(snap);
  if (history.length > 30) history.shift(); // cap at 30 steps
  updateUndoBtn();
}

function undo() {
  if (history.length === 0) return;
  const snap = history.pop();
  ctx.putImageData(snap, 0, 0);
  updateUndoBtn();
  updateDimensions();
  showToast('↩ Deshecho', 'default', 1500);
}

function updateUndoBtn() {
  btnUndo.disabled = history.length === 0;
  undoCount.textContent = history.length > 0 ? history.length : '';
}

// ─── Dimensions display ───────────────────────────────────────────────────────
function updateDimensions() {
  infoDims.textContent = `${mainCanvas.width} × ${mainCanvas.height}px`;
}

// ─── Overlay drawing ──────────────────────────────────────────────────────────
function clearOverlay() {
  overlay.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
}

function drawSelection(x, y, w, h) {
  clearOverlay();

  const isCrop  = currentTool === 'crop';
  const primary = isCrop ? '#6366f1' : '#f97316';
  const fill    = isCrop ? 'rgba(99,102,241,0.08)' : 'rgba(249,115,22,0.08)';

  // Darken outside selection
  overlay.fillStyle = 'rgba(0,0,0,0.45)';
  overlay.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height);

  // Clear inside so it shows the image
  overlay.clearRect(x, y, w, h);

  // Subtle inner fill tint
  overlay.fillStyle = fill;
  overlay.fillRect(x, y, w, h);

  // Dashed border
  overlay.save();
  overlay.strokeStyle = primary;
  overlay.lineWidth = 1.5;
  overlay.setLineDash([6, 4]);
  overlay.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  overlay.restore();

  // Corner handles
  const handleSize = 8;
  const corners = [
    [x, y],
    [x + w - handleSize, y],
    [x, y + h - handleSize],
    [x + w - handleSize, y + h - handleSize],
  ];

  overlay.fillStyle = primary;
  for (const [cx, cy] of corners) {
    overlay.beginPath();
    overlay.roundRect(cx, cy, handleSize, handleSize, 2);
    overlay.fill();
  }

  // Size label
  if (Math.abs(w) > 60 && Math.abs(h) > 20) {
    const label = `${Math.abs(Math.round(w))} × ${Math.abs(Math.round(h))}`;
    overlay.save();
    overlay.font = '600 11px Inter, sans-serif';
    const tw = overlay.measureText(label).width;
    const lx = x + w / 2 - tw / 2 - 6;
    const ly = y < 22 ? y + h + 6 : y - 22;
    overlay.fillStyle = primary;
    overlay.beginPath();
    overlay.roundRect(lx, ly, tw + 12, 18, 4);
    overlay.fill();
    overlay.fillStyle = '#fff';
    overlay.fillText(label, lx + 6, ly + 13);
    overlay.restore();
  }
}

// ─── Normalise rect so width/height are always positive ──────────────────────
function normaliseRect(x1, y1, x2, y2) {
  return {
    x: Math.round(Math.min(x1, x2)),
    y: Math.round(Math.min(y1, y2)),
    w: Math.round(Math.abs(x2 - x1)),
    h: Math.round(Math.abs(y2 - y1)),
  };
}

// ─── Clamp rect to canvas bounds ─────────────────────────────────────────────
function clampRect(x, y, w, h) {
  const cx = Math.max(0, x);
  const cy = Math.max(0, y);
  const cw = Math.min(w - (cx - x), mainCanvas.width  - cx);
  const ch = Math.min(h - (cy - y), mainCanvas.height - cy);
  return { x: cx, y: cy, w: cw, h: ch };
}

// ─── TOOL: Crop ───────────────────────────────────────────────────────────────
function applyCrop(x, y, w, h) {
  if (w < 2 || h < 2) return;
  pushHistory();

  const imgData = ctx.getImageData(x, y, w, h);
  mainCanvas.width  = w;
  mainCanvas.height = h;
  overlayCanvas.width  = w;
  overlayCanvas.height = h;
  ctx.putImageData(imgData, 0, 0);
  clearOverlay();
  updateDimensions();
  showToast(`✂️ Recortado a ${w}×${h}px`, 'success');
}

// ─── TOOL: Smart Erase ───────────────────────────────────────────────────────
/**
 * Samples pixels around the border of the selection rectangle (outside)
 * and computes the dominant / average RGBA colour. Then fills the
 * selection with that colour.
 */
function applyErase(x, y, w, h) {
  if (w < 2 || h < 2) return;
  pushHistory();

  const borderColor = sampleBorderColor(x, y, w, h);
  ctx.fillStyle = `rgba(${borderColor.r},${borderColor.g},${borderColor.b},${borderColor.a / 255})`;
  ctx.fillRect(x, y, w, h);
  clearOverlay();
  showToast(`🪄 Borrado con color adyacente`, 'success');
}

/**
 * Samples a ring of pixels OUTSIDE the selection rectangle and returns
 * the average RGBA.
 *
 * Strategy:
 *   - Take a 4px-wide band around all 4 sides
 *   - Average all sampled pixels
 */
function sampleBorderColor(rx, ry, rw, rh) {
  const BAND  = 6; // pixels wide to sample outside
  const STEP  = 2; // every N pixels (for performance)
  const cw    = mainCanvas.width;
  const ch    = mainCanvas.height;

  let r = 0, g = 0, b = 0, a = 0, count = 0;

  function sample(sx, sy) {
    if (sx < 0 || sy < 0 || sx >= cw || sy >= ch) return;
    const data = ctx.getImageData(sx, sy, 1, 1).data;
    r += data[0]; g += data[1]; b += data[2]; a += data[3];
    count++;
  }

  // Top band
  for (let bx = rx - BAND; bx <= rx + rw + BAND; bx += STEP) {
    for (let by = ry - BAND; by < ry; by += STEP) sample(bx, by);
  }
  // Bottom band
  for (let bx = rx - BAND; bx <= rx + rw + BAND; bx += STEP) {
    for (let by = ry + rh; by <= ry + rh + BAND; by += STEP) sample(bx, by);
  }
  // Left band
  for (let by = ry; by < ry + rh; by += STEP) {
    for (let bx = rx - BAND; bx < rx; bx += STEP) sample(bx, by);
  }
  // Right band
  for (let by = ry; by < ry + rh; by += STEP) {
    for (let bx = rx + rw; bx <= rx + rw + BAND; bx += STEP) sample(bx, by);
  }

  if (count === 0) {
    // Fallback: sample the entire perimeter of the selection itself
    for (let px = rx; px < rx + rw; px += STEP) { sample(px, ry); sample(px, ry + rh - 1); }
    for (let py = ry; py < ry + rh; py += STEP) { sample(rx, py); sample(rx + rw - 1, py); }
  }

  if (count === 0) return { r: 255, g: 255, b: 255, a: 255 };

  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
    a: Math.round(a / count),
  };
}

// ─── Mouse / Pointer events ───────────────────────────────────────────────────
function getCanvasPos(e) {
  const rect = overlayCanvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (overlayCanvas.width  / rect.width),
    y: (e.clientY - rect.top)  * (overlayCanvas.height / rect.height),
  };
}

overlayCanvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  overlayCanvas.setPointerCapture(e.pointerId);
  const pos = getCanvasPos(e);
  isDrawing = true;
  startX = pos.x;
  startY = pos.y;
  currentX = pos.x;
  currentY = pos.y;
});

overlayCanvas.addEventListener('pointermove', (e) => {
  if (!isDrawing) return;
  e.preventDefault();
  const pos = getCanvasPos(e);
  currentX = pos.x;
  currentY = pos.y;
  const { x, y, w, h } = normaliseRect(startX, startY, currentX, currentY);
  drawSelection(x, y, w, h);
});

overlayCanvas.addEventListener('pointerup', (e) => {
  if (!isDrawing) return;
  e.preventDefault();
  isDrawing = false;

  const { x, y, w, h } = normaliseRect(startX, startY, currentX, currentY);
  const clamped = clampRect(x, y, w, h);

  clearOverlay();

  if (clamped.w < 4 || clamped.h < 4) {
    // Too small — ignore
    return;
  }

  if (currentTool === 'crop') {
    applyCrop(clamped.x, clamped.y, clamped.w, clamped.h);
  } else if (currentTool === 'erase') {
    applyErase(clamped.x, clamped.y, clamped.w, clamped.h);
  }
});

overlayCanvas.addEventListener('pointercancel', () => {
  isDrawing = false;
  clearOverlay();
});

// ─── Save ─────────────────────────────────────────────────────────────────────
function saveImage() {
  const link = document.createElement('a');
  const ts   = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  link.download = `snapedit-${ts}.png`;
  link.href = mainCanvas.toDataURL('image/png');
  link.click();
  showToast('💾 Imagen guardada', 'success');
}

btnSave.addEventListener('click', saveImage);
btnUndo.addEventListener('click', undo);

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;

  if (e.key === 'c' || e.key === 'C') selectTool('crop');
  if (e.key === 'e' || e.key === 'E') selectTool('erase');

  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    undo();
  }

  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveImage();
  }
});

// ─── Load screenshot from storage ────────────────────────────────────────────
function loadScreenshot(dataUrl) {
  const img = new Image();
  img.onload = () => {
    mainCanvas.width    = img.width;
    mainCanvas.height   = img.height;
    overlayCanvas.width  = img.width;
    overlayCanvas.height = img.height;

    ctx.drawImage(img, 0, 0);
    updateDimensions();

    // Hide loading overlay
    loadingOverlay.classList.add('hidden');
    setTimeout(() => { loadingOverlay.style.display = 'none'; }, 400);

    // Centre the canvas in the wrapper
    centreCanvas(img.width, img.height);

    showToast('📸 Captura cargada correctamente', 'success');
  };
  img.onerror = () => {
    loadingOverlay.style.display = 'none';
    showToast('❌ Error al cargar la captura', 'error', 4000);
  };
  img.src = dataUrl;
}

function centreCanvas(imgW, imgH) {
  const wrapperW = canvasWrapper.clientWidth  - 48;
  const wrapperH = canvasWrapper.clientHeight - 48;
  const scale    = Math.min(1, wrapperW / imgW, wrapperH / imgH);

  // Use CSS transform scale for display but keep canvas at full resolution
  canvasContainer.style.transformOrigin = 'top left';
  if (scale < 1) {
    canvasContainer.style.transform = `scale(${scale})`;
    // Adjust wrapper content size so scroll works correctly
    canvasContainer.style.marginBottom = `${imgH * scale - imgH}px`;
    canvasContainer.style.marginRight  = `${imgW * scale - imgW}px`;
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
(function init() {
  selectTool('crop');
  updateUndoBtn();

  // Load screenshot from session storage
  chrome.storage.session.get(['screenshot'], (result) => {
    if (result && result.screenshot) {
      loadScreenshot(result.screenshot);
    } else {
      // Fallback: show error
      loadingOverlay.style.display = 'none';
      showToast('⚠️ No se encontró captura. Cierra esta pestaña e inténtalo de nuevo.', 'error', 6000);
    }
  });
})();
