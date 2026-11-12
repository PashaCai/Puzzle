'use strict';
const $ = s => document.querySelector(s);
const {GRID, ROWS, COUNT, WIDTH, HEIGHT, tileRect, alignment} = PuzzleCore;
const faces = PORTRAITS.map(p => ({...p, url: '', image: null, status: 'loading'}));
let selected = 0, tiles = Array(COUNT).fill(0), initial = [...tiles];
let experiment = 1, stream = null, flat = true, rotation = -17, draft = null;
let records = [], calibrations = {};
try { records = JSON.parse(localStorage.getItem('face-puzzle-archive') || '[]'); if (!Array.isArray(records)) records = []; } catch {}
try { calibrations = JSON.parse(localStorage.getItem('face-puzzle-calibrations-v1') || '{}') || {}; } catch {}
function notify(message) {
  $('#toast').textContent = message; $('#toast').style.display = 'block';
  clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => $('#toast').style.display = 'none', 3500);
}
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not read this photo. Please try a JPG or PNG.')); image.src = url;
  });
}
function normalizedCanvas(image, points, adjust = {}) {
  const canvas = document.createElement('canvas'); canvas.width = WIDTH; canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#e8ebdf'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const t = alignment(points, image.naturalWidth || image.width, image.naturalHeight || image.height, adjust);
  ctx.translate(t.x, t.y); ctx.rotate(t.angle); ctx.scale(t.scale, t.scale); ctx.translate(-t.cx, -t.cy);
  ctx.imageSmoothingQuality = 'high'; ctx.drawImage(image, 0, 0); return canvas;
}
function normalizeFace(face, config) {
  window.clearDetail?.();
  const canvas = normalizedCanvas(face.image, config.landmarks, config.adjust);
  face.canvas = canvas; face.url = canvas.toDataURL('image/jpeg', .94); face.status = 'ready';
  face.config = {landmarks: config.landmarks.map(p => [...p]), adjust: {...config.adjust}};
}
function selectFace(index) {
  if (faces[index].status !== 'ready') return;
  selected = index; $('#currentFace').textContent = faces[index].name;
  renderFaces(); renderBoard(); updateActions();
}
function updateActions() {
  const ready = faces[selected]?.status === 'ready';
  $('#calibrate').disabled = !ready; $('#useWhole').disabled = !ready;
  $('#random').disabled = !faces.some(f => f.status === 'ready');
  $('#save').disabled = !tiles.every(i => faces[i]?.status === 'ready');
}
function renderFaces() {
  const scroll = $('#faces').scrollTop; $('#faces').replaceChildren();
  faces.forEach((face, index) => {
    const button = document.createElement('button'); button.className = 'face' + (selected === index ? ' active' : '');
    button.draggable = face.status === 'ready'; button.disabled = face.status !== 'ready';
    button.title = `Select ${face.name}`; button.setAttribute('aria-pressed', String(selected === index));
    const image = document.createElement('img'); if (face.url) image.src = face.url;
    image.alt = face.name; image.draggable = false;
    const label = document.createElement('span'); label.textContent = face.name + (face.status === 'ready' ? ' ↗' : face.status === 'error' ? ' / unavailable' : ' / loading');
    button.append(image, label); button.onclick = () => selectFace(index);
    button.ondragstart = e => e.dataTransfer.setData('text/plain', String(index)); $('#faces').append(button);
  });
  $('#faces').scrollTop = scroll; $('#sourceCount').textContent = String(faces.length).padStart(2, '0');
}
function replaceTile(index, faceIndex) {
  if (faces[faceIndex]?.status !== 'ready') return;
  window.clearDetail?.();
  tiles[index] = faceIndex; renderBoard(); updateActions();
  $('#board').children[index].focus({preventScroll: true});
}
function renderBoard() {
  const existingOverlay = document.querySelector('#board .detail-overlay');
  faces.forEach((face, index) => { if(face.url) $('#board').style.setProperty('--portrait-'+index, `url("${face.url}")`); });
  $('#board').replaceChildren();
  tiles.forEach((faceIndex, index) => {
    const button = document.createElement('button'); button.className = 'tile';
    if (faces[faceIndex].url) button.style.backgroundImage = `var(--portrait-${faceIndex})`;
    button.style.backgroundPosition = `${index % GRID / (GRID - 1) * 100}% ${Math.floor(index / GRID) / (ROWS - 1) * 100}%`;
    button.setAttribute('aria-label', `Tile ${index + 1}, row ${Math.floor(index / GRID) + 1}, column ${index % GRID + 1}. ${faces[faceIndex].name}. Replace with ${faces[selected].name}`);
    button.disabled = faces[selected].status !== 'ready';
    const number = document.createElement('small'); number.textContent = String(index + 1).padStart(2, '0'); button.append(number);
    button.onclick = () => replaceTile(index, selected);
    button.ondragover = e => e.preventDefault();
    button.ondrop = e => { e.preventDefault(); const value = e.dataTransfer.getData('text/plain'); if (!/^\d+$/.test(value)) return; const id = Number(value); if (faces[id]) replaceTile(index, id); };
    $('#board').append(button);
  }); if(existingOverlay) $('#board').append(existingOverlay); depth();
}
function depth() {
  const value = Number($('#depth').value); $('#depthValue').textContent = value + '%';
  document.querySelectorAll('.tile').forEach((tile, index) => tile.style.setProperty('--z', `${flat ? 0 : ((index * 7 + Math.floor(index / GRID)) % 5) * value / 8}px`));
  $('#board').style.transform = flat ? 'none' : `rotateX(9deg) rotateY(${rotation}deg) rotateZ(-6deg)`;
  $('#view').textContent = flat ? 'Flat view' : 'Angled view';
  $('#view').setAttribute('aria-pressed', String(flat));
}
$('#depth').oninput = depth; $('#view').onclick = () => { flat = !flat; depth(); };
$('#random').onclick = () => {
  window.clearDetail?.();
  const pool = faces.map((_, i) => i).filter(i => faces[i].status === 'ready' && ($('#includeSelf').checked || !faces[i].self));
  if (!pool.length) return notify('Include your face or add another portrait first.');
  tiles = Array.from({length: COUNT}, () => pool[Math.floor(Math.random() * pool.length)]); experiment++;
  $('#experimentNum').textContent = String(experiment).padStart(3, '0');
  $('#mixLabel').textContent = '40 × 52 / 2,080 PIECES · ' + String(experiment).padStart(3, '0'); renderBoard(); updateActions();
};
$('#reset').onclick = () => { window.clearDetail?.(); tiles = [...initial]; renderBoard(); updateActions(); notify('Back to where you started.'); };
$('#useWhole').onclick = () => { window.clearDetail?.(); tiles = Array(COUNT).fill(selected); initial = [...tiles]; renderBoard(); updateActions(); notify('New base face. Make it your own.'); };
let drag = null;
$('#stage').onpointerdown = e => { if (e.target.closest('button')) return; drag = {x: e.clientX, rotation}; $('#stage').setPointerCapture(e.pointerId); };
$('#stage').onpointermove = e => { if (drag) { rotation = Math.max(-55, Math.min(55, drag.rotation + (e.clientX - drag.x) / 4)); flat = false; depth(); } };
$('#stage').onpointerup = $('#stage').onpointercancel = () => drag = null;
function showPage(page) {
  $('#studio').hidden = page !== 'studio'; $('#archive').hidden = page !== 'archive';
  document.querySelectorAll('nav [data-page]').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  if (page === 'archive') renderArchive(); window.scrollTo(0, 0);
}
document.querySelectorAll('[data-page]').forEach(b => b.onclick = () => showPage(b.dataset.page));
$('#archiveStep').onclick = () => showPage('archive'); $('#about').onclick = () => $('#aboutDialog').showModal();
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => b.closest('dialog').close());
function stopCamera() { stream?.getTracks().forEach(t => t.stop()); stream = null; $('#video').srcObject = null; $('#shutter').disabled = true; $('#cameraPlaceholder').style.display = 'flex'; }
$('#cameraDialog').addEventListener('close', stopCamera);
function openCamera() { $('#cameraStatus').textContent = 'Your photo stays on this device.'; $('#cameraDialog').showModal(); }
$('#openCamera').onclick = $('#captureStep').onclick = openCamera;
$('#startCamera').onclick = async () => {
  try {
    stopCamera(); if (!navigator.mediaDevices?.getUserMedia) throw Error('Camera unavailable here. Upload a photo, or open the site on localhost or HTTPS.');
    stream = await navigator.mediaDevices.getUserMedia({video: {facingMode: 'user', width: 720, height: 960}, audio: false});
    if (!$('#cameraDialog').open) { stopCamera(); return; }
    $('#video').srcObject = stream; await $('#video').play(); $('#cameraPlaceholder').style.display = 'none'; $('#shutter').disabled = false;
    $('#cameraStatus').textContent = 'Centre your face in the oval, then take a photo.';
  } catch (e) { $('#cameraStatus').textContent = 'Could not start the camera: ' + (e.name === 'NotAllowedError' ? 'Allow camera access or upload a photo.' : e.message); }
};
$('#shutter').onclick = () => {
  const video = $('#video'); if (!video.videoWidth) return;
  const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d'); ctx.translate(canvas.width, 0); ctx.scale(-1, 1); ctx.drawImage(video, 0, 0);
  importImage(canvas.toDataURL('image/jpeg', .94));
};
async function importImage(url) {
  try {
    const image = await loadImage(url); $('#cameraDialog').close();
    openCalibration({id: 'self-' + Date.now(), name: 'My face ' + (faces.filter(f => f.self).length + 1), image, self: true, source: url}, true);
  } catch (e) { notify(e.message); }
}
$('#upload').onchange = async e => {
  const file = e.target.files[0]; if (!file) return;
  if (!file.type.startsWith('image/')) { notify('Please choose an image file.'); return; }
  const url = URL.createObjectURL(file); await importImage(url); URL.revokeObjectURL(url); e.target.value = '';
};
function openCalibration(face, isNew = false) {
  const config = face.config || {landmarks: [], adjust: {}};
  draft = {face, isNew, points: config.landmarks.map(p => [...p]), adjust: {...config.adjust}};
  $('#alignmentTitle').textContent = isNew ? 'Line up your new face.' : `Align ${face.name}`;
  $('#alignmentError').textContent = ''; syncAdjustments(); drawCalibration(); $('#alignmentDialog').showModal();
}
$('#calibrate').onclick = () => openCalibration(faces[selected]);
function syncAdjustments() {
  for (const key of ['zoom', 'x', 'y', 'angle']) {
    const value = draft.adjust[key] ?? (key === 'zoom' ? 1 : 0); $(`#align-${key}`).value = value;
    $(`#value-${key}`).textContent = key === 'zoom' ? Math.round(value * 100) + '%' : value + (key === 'angle' ? '°' : '');
  }
}
function drawCalibration() {
  const {image} = draft.face, canvas = $('#landmarkCanvas');
  canvas.width = Math.round(450 * image.naturalWidth / image.naturalHeight); canvas.height = 450;
  const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  draft.points.forEach(([x,y], i) => {
    ctx.beginPath(); ctx.arc(x * canvas.width, y * canvas.height, 5, 0, Math.PI * 2); ctx.fillStyle = '#d9f07c'; ctx.fill(); ctx.strokeStyle = '#283226'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px sans-serif'; ctx.fillText(String(i + 1), x * canvas.width + 9, y * canvas.height - 5);
  });
  const preview = $('#alignmentPreview'), pc = preview.getContext('2d'); pc.fillStyle = '#e8ebdf'; pc.fillRect(0, 0, WIDTH, HEIGHT);
  let valid = false;
  if (draft.points.length === 3) {
    try { pc.drawImage(normalizedCanvas(image, draft.points, draft.adjust), 0, 0); valid = true; $('#alignmentError').textContent = ''; }
    catch (e) { $('#alignmentError').textContent = e.message; }
  }
  pc.strokeStyle = '#cce879'; pc.lineWidth = 2; pc.setLineDash([9, 6]);
  for (const y of [340, 600]) { pc.beginPath(); pc.moveTo(0,y); pc.lineTo(WIDTH,y); pc.stroke(); }
  pc.beginPath(); pc.moveTo(300,0); pc.lineTo(300,HEIGHT); pc.stroke(); pc.setLineDash([]);
  pc.font = '18px sans-serif'; pc.fillStyle = '#d9f07c'; pc.fillText('Eye line', 12, 330); pc.fillText('Chin line', 12, 590);
  $('#alignmentHint').textContent = draft.points.length < 3 ? ['1. Click the pupil on the left of the image.', '2. Click the pupil on the right of the image.', '3. Click the bottom of the chin.'][draft.points.length] : 'All three points set. Fine-tune with the sliders or mark again.';
  $('#applyAlignment').disabled = !valid;
}
$('#landmarkCanvas').onclick = e => {
  if (!draft || draft.points.length >= 3) return;
  const box = e.currentTarget.getBoundingClientRect(); draft.points.push([(e.clientX - box.left) / box.width, (e.clientY - box.top) / box.height]); drawCalibration();
};
$('#remark').onclick = () => { draft.points = []; draft.adjust = {}; $('#alignmentError').textContent = ''; syncAdjustments(); drawCalibration(); };
$('#resetAlignment').onclick = () => {
  draft.points = (draft.face.landmarks || draft.face.config?.landmarks || []).map(p => [...p]); draft.adjust = {}; syncAdjustments(); drawCalibration();
};
for (const key of ['zoom', 'x', 'y', 'angle']) $(`#align-${key}`).oninput = e => { draft.adjust[key] = Number(e.target.value); syncAdjustments(); drawCalibration(); };
$('#applyAlignment').onclick = () => {
  try {
    normalizeFace(draft.face, {landmarks: draft.points, adjust: draft.adjust});
    if (draft.isNew) { faces.push(draft.face); selected = faces.length - 1; tiles = Array(COUNT).fill(selected); initial = [...tiles]; }
    else {
      calibrations[draft.face.id] = draft.face.config;
      try { localStorage.setItem('face-puzzle-calibrations-v1', JSON.stringify(calibrations)); } catch { notify('Alignment applied, but this browser could not save the settings.'); }
    }
    $('#currentFace').textContent = faces[selected].name; renderFaces(); renderBoard(); updateActions(); $('#alignmentDialog').close(); notify('All lined up. Let the experiment begin.');
  } catch (e) { $('#alignmentError').textContent = e.message; }
};
$('#alignmentDialog').addEventListener('close', () => draft = null);
$('#save').onclick = () => {
  $('#titleInput').value = 'Another me · ' + String(experiment).padStart(3, '0'); $('#reflection').value = ''; $('#saveError').textContent = ''; $('#saveDialog').showModal();
};
function composite() {
  const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 1560; const ctx = canvas.getContext('2d');
  tiles.forEach((faceIndex, index) => {
    const face = faces[faceIndex]; if (!face.canvas) throw Error('The portraits are still loading. Try again in a moment.');
    const src = tileRect(index), dst = tileRect(index, canvas.width, canvas.height);
    ctx.drawImage(face.canvas, src.x, src.y, src.width, src.height, dst.x, dst.y, dst.width, dst.height);
  }); if(window.detailLayer) ctx.drawImage(window.detailLayer,0,0,canvas.width,canvas.height); return canvas.toDataURL('image/jpeg', .94);
}
$('#confirmSave').onclick = () => {
  const button = $('#confirmSave'); button.disabled = true;
  try {
    const record = {id: globalThis.crypto?.randomUUID?.() || 'face-' + Date.now(), title: $('#titleInput').value.trim() || 'An unnamed possibility', reflection: $('#reflection').value, date: new Date().toLocaleDateString('en-GB'), image: composite(), grid: GRID, rows: ROWS};
    const next = [record, ...records]; localStorage.setItem('face-puzzle-archive', JSON.stringify(next)); records = next;
    updateCount(); $('#saveDialog').close(); notify('A new face in the yearbook.'); showPage('archive');
  } catch (e) { $('#saveError').textContent = e.name === 'QuotaExceededError' ? 'Your browser storage is full. Download and remove a few entries, then try again.' : e.message; }
  finally { button.disabled = false; }
};
function updateCount() { $('#count').textContent = records.length; }
function renderArchive() {
  const gallery = $('#gallery'); gallery.replaceChildren();
  if (!records.length) {
    const empty = document.createElement('div'); empty.className = 'empty'; empty.textContent = 'A blank yearbook. Who will you make first?';
    const button = document.createElement('button'); button.className = 'primary'; button.textContent = 'Make a face ↗'; button.onclick = () => showPage('studio'); empty.append(button); gallery.append(empty);
  }
  records.forEach(record => {
    const article = document.createElement('article'); article.className = 'archive-card';
    const image = document.createElement('img'); image.src = record.image; image.alt = record.title;
    const title = document.createElement('h3'); title.textContent = record.title;
    const date = document.createElement('small'); date.textContent = record.date + (record.grid ? ` · ${record.grid} × ${record.rows || record.grid}` : '');
    const reflection = document.createElement('p'); reflection.textContent = record.reflection || 'Every face has a story.';
    const download = document.createElement('button'); download.textContent = 'Download image ↗';
    download.onclick = () => { const link = document.createElement('a'); link.href = record.image; link.download = 'face-puzzle-' + record.id + '.jpg'; link.click(); };
    const remove = document.createElement('button'); remove.textContent = 'Remove';
    remove.onclick = () => { const next = records.filter(r => r.id !== record.id); try { localStorage.setItem('face-puzzle-archive', JSON.stringify(next)); records = next; updateCount(); renderArchive(); } catch { notify('Could not update browser storage.'); } };
    article.append(image, title, date, reflection, download, remove); gallery.append(article);
  });
}
async function initialize() {
  renderFaces(); renderBoard(); updateCount(); updateActions();
  await Promise.all(faces.map(async face => {
    try {
      face.image = await loadImage(window.PORTRAIT_DATA?.[face.id] || face.source);
      try { normalizeFace(face, calibrations[face.id] || {landmarks: face.landmarks, adjust: {}}); }
      catch { normalizeFace(face, {landmarks: face.landmarks, adjust: {}}); }
    } catch (error) { face.status = 'error'; face.error = error.name; }
  }));
  const ready = faces.findIndex(f => f.status === 'ready');
  if (ready >= 0) { selected = ready; tiles = Array(COUNT).fill(ready); initial = [...tiles]; $('#currentFace').textContent = faces[ready].name; }
  renderFaces(); renderBoard(); updateActions();
  const count = faces.filter(f => f.status === 'ready').length;
  $('#libraryStatus').textContent = `${count} / ${faces.length} aligned / eyes & chin`;
  if (count !== faces.length) notify(faces.some(f => f.error === 'SecurityError') ? 'Local image access is restricted. Open the standalone HTML or use start.cmd.' : 'Some photos could not load. Open the standalone HTML or extract the full source folder.');
}
initialize();
