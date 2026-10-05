'use strict';
// HUD, toolbar, menu and input

const coinsEl = document.getElementById('coins');
const toastEl = document.getElementById('toast');
const bar = document.getElementById('toolbar');
let toastTimer = 0;

function updateHud() { coinsEl.textContent = '🪙 ' + save.coins; }
function toast(msg) {
  toastEl.textContent = msg; toastEl.style.opacity = 1;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.style.opacity = 0, 1400);
}

function renderTools() {
  bar.innerHTML = '';
  TOOLS.forEach(t => {
    const locked = !save.unlocked.includes(t.id);
    const b = document.createElement('button');
    b.className = 'tool' + (t.id === tool ? ' active' : '') + (locked ? ' locked' : '') + (offHere(t) ? ' off' : '');
    b.innerHTML = `<span>${t.icon}</span><small>${locked ? '🪙 ' + t.price : t.name}</small>`;
    b.title = `${t.name} (${t.key.toUpperCase()})`;
    b.onclick = () => selectTool(t, b);
    bar.appendChild(b);
  });
}

function selectTool(t, el) {
  ac();
  if (offHere(t)) {
    toast(`No ${t.icon} ${t.name} in the ${currentRoom().name}!`);
    if (el) { el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); }
    return;
  }
  if (!save.unlocked.includes(t.id)) {
    if (save.coins >= t.price) {
      save.coins -= t.price; save.unlocked.push(t.id); persist(); updateHud();
      sfx.coin(); toast(`Unlocked ${t.icon} ${t.name}!`);
    } else {
      toast(`Need ${t.price - save.coins} more 🪙 for the ${t.name}`);
      if (el) { el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); }
      return;
    }
  }
  tool = t.id;
  canvas.style.cursor = tool === 'grab' ? 'grab' : 'none';
  renderTools();
}

canvas.addEventListener('pointerdown', e => {
  ac();
  pointer.x = pointer.lastX = e.clientX; pointer.y = pointer.lastY = e.clientY;
  pointer.inside = true;
  canvas.setPointerCapture(e.pointerId);
  useTool();
});
canvas.addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.inside = true; });
canvas.addEventListener('pointerleave', () => { if (!drag) pointer.inside = false; });
window.addEventListener('pointerup', () => {
  if (drag) {
    drag.px = drag.x - pointer.vx; drag.py = drag.y - pointer.vy;
    drag = null;
    canvas.style.cursor = tool === 'grab' ? 'grab' : 'none';
  }
  if (heldProp) {
    // Heavier furniture flies a little slower
    const k = 1.25 - 0.15 * heldProp.mass, clamp = v => Math.max(-40, Math.min(40, v * k));
    heldProp.vx = clamp(pointer.vx); heldProp.vy = clamp(pointer.vy);
    heldProp.va = pointer.vx * 0.012 / heldProp.mass;
    heldProp = null;
    canvas.style.cursor = tool === 'grab' ? 'grab' : 'none';
  }
});
window.addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'a') { ac(); openAirlock(); return; }
  const t = TOOLS.find(t => t.key === e.key.toLowerCase());
  if (t) selectTool(t, bar.children[TOOLS.indexOf(t)]);
});
window.addEventListener('resize', resize);

document.getElementById('mute').onclick = e => {
  muted = !muted;
  e.currentTarget.textContent = muted ? '🔇' : '🔊';
};
function resetScene() {
  buildDummy(); buildProps(); heldProp = null; pain = 0; sessionDmg = 0; hurtT = 0; drag = null;
  bombs.length = 0; pianos.length = 0; projectiles.length = 0; couches.length = 0; vikings.length = 0; zapT = 0;
  airlock.t = -1; airlock.cooldown = 0; updateAirlockBtn();
}
document.getElementById('heal').onclick = () => { resetScene(); say(LINES.heal, true); };

const menuEl = document.getElementById('menu');
function renderLooks() {
  const list = document.getElementById('looks');
  list.innerHTML = '';
  for (const [id, look] of Object.entries(LOOKS)) {
    const b = document.createElement('button');
    b.className = 'look' + (id === lookId ? ' current' : '');
    b.innerHTML = `<span>${look.icon}</span>${look.name}`;
    b.onclick = () => { lookId = save.look = id; persist(); renderLooks(); };
    list.appendChild(b);
  }
}
function openMenu() {
  renderLooks();
  const list = document.getElementById('rooms');
  list.innerHTML = '';
  for (const room of ROOMS) {
    const b = document.createElement('button');
    b.className = 'room' + (room.id === roomId ? ' current' : '');
    const cv = document.createElement('canvas');
    renderThumb(room, cv);
    const label = document.createElement('div');
    label.textContent = room.name;
    b.append(cv, label);
    b.onclick = () => chooseRoom(room.id);
    list.appendChild(b);
  }
  menuEl.classList.remove('hidden');
}
function chooseRoom(id) {
  ac();
  roomId = save.room = id; persist();
  menuEl.classList.add('hidden');
  resetScene();
  if (offHere(TOOLS.find(t => t.id === tool))) tool = 'punch';
  renderTools();
  say([`Ooh, the ${currentRoom().name.toLowerCase()}! Please be gentle.`], true);
}
document.getElementById('roomBtn').onclick = openMenu;
window.addEventListener('keydown', e => { if (e.key === 'Escape' && !menuEl.classList.contains('hidden')) menuEl.classList.add('hidden'); });
