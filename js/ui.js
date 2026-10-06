'use strict';
// HUD, toolbar, menu and input

// ---------- HUD ----------
const coinsEl = document.getElementById('coins');
const toastEl = document.getElementById('toast');
let toastTimer = 0;

function updateHud() {
  coinsEl.textContent = '🪙 ' + save.coins;
}

const comboEl = document.getElementById('combo');
function updateCombo() {
  const showCombo = combo >= 3 && performance.now() - lastHit < 1300;
  comboEl.style.opacity = showCombo ? 1 : 0;
  if (showCombo) comboEl.textContent = `x${combo} COMBO!`;
}

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.style.opacity = 1;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastEl.style.opacity = 0), 1400);
}

document.getElementById('mute').onclick = (e) => {
  e.currentTarget.textContent = toggleMute() ? '🔇' : '🔊';
};
document.getElementById('heal').onclick = () => {
  resetScene();
  say(LINES.heal, true);
};
document.getElementById('roomBtn').onclick = openMenu;

// ---------- Toolbar ----------
const bar = document.getElementById('toolbar');

function renderTools() {
  bar.innerHTML = '';
  TOOLS.forEach((t) => {
    const locked = !save.unlocked.includes(t.id);
    const b = document.createElement('button');
    b.className = 'tool' + (t.id === tool ? ' active' : '') + (locked ? ' locked' : '') + (offHere(t) ? ' off' : '');
    b.innerHTML = `<span>${t.icon}</span><small>${locked ? '🪙 ' + t.price : t.name}</small>`;
    b.title = `${t.name} (${t.key.toUpperCase()})`;
    b.onclick = () => selectTool(t, b);
    bar.appendChild(b);
  });
}

// Shake a toolbar button to say "no"
function wiggle(el) {
  if (!el) return;
  el.classList.remove('nope');
  void el.offsetWidth;
  el.classList.add('nope');
}

// Selecting a locked tool buys it if you can afford it.
function selectTool(t, el) {
  ac();
  if (offHere(t)) {
    toast(`No ${t.icon} ${t.name} in the ${currentRoom().name}!`);
    wiggle(el);
    return;
  }
  if (!save.unlocked.includes(t.id)) {
    if (save.coins >= t.price) {
      save.coins -= t.price;
      save.unlocked.push(t.id);
      persist();
      updateHud();
      sfx.coin();
      toast(`Unlocked ${t.icon} ${t.name}!`);
    } else {
      toast(`Need ${t.price - save.coins} more 🪙 for the ${t.name}`);
      wiggle(el);
      return;
    }
  }
  setTool(t.id);
  resetCursor();
  renderTools();
}

// ---------- Pointer and keyboard ----------
// The other tools draw their own icon as the cursor.
function resetCursor() {
  canvas.style.cursor = tool === 'grab' ? 'grab' : 'none';
}

// Smoothed pointer velocity, used for punch direction and throwing.
function trackPointer() {
  pointer.vx += (pointer.x - pointer.lastX - pointer.vx) * 0.5;
  pointer.vy += (pointer.y - pointer.lastY - pointer.vy) * 0.5;
  pointer.lastX = pointer.x;
  pointer.lastY = pointer.y;
}

canvas.addEventListener('pointerdown', (e) => {
  ac();
  pointer.x = pointer.lastX = e.clientX;
  pointer.y = pointer.lastY = e.clientY;
  pointer.inside = true;
  canvas.setPointerCapture(e.pointerId);
  useTool();
});
canvas.addEventListener('pointermove', (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.inside = true;
});
canvas.addEventListener('pointerleave', () => {
  if (!drag) pointer.inside = false;
});

// Letting go throws whatever you were holding.
window.addEventListener('pointerup', () => {
  if (drag) {
    drag.px = drag.x - pointer.vx;
    drag.py = drag.y - pointer.vy;
    endDrag();
    resetCursor();
  }
  if (heldProp) {
    // Heavier furniture flies a little slower
    const k = 1.25 - 0.15 * heldProp.mass,
      clamp = (v) => Math.max(-40, Math.min(40, v * k));
    heldProp.vx = clamp(pointer.vx);
    heldProp.vy = clamp(pointer.vy);
    heldProp.va = (pointer.vx * 0.012) / heldProp.mass;
    dropProp();
    resetCursor();
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    menuEl.classList.add('hidden');
    return;
  }
  const key = e.key.toLowerCase();
  if (key === 'a') {
    ac();
    openAirlock();
    return;
  }
  const t = TOOLS.find((t) => t.key === key);
  if (t) selectTool(t, bar.children[TOOLS.indexOf(t)]);
});
window.addEventListener('resize', resize);

// ---------- Menu ----------
const menuEl = document.getElementById('menu');

function openMenu() {
  renderLooks();
  renderRooms();
  menuEl.classList.remove('hidden');
}

function renderLooks() {
  const list = document.getElementById('looks');
  list.innerHTML = '';
  for (const [id, look] of Object.entries(LOOKS)) {
    const b = document.createElement('button');
    b.className = 'look' + (id === lookId ? ' current' : '');
    b.innerHTML = `<span>${look.icon}</span>${look.name}`;
    b.onclick = () => {
      chooseLook(id);
      persist();
      renderLooks();
    };
    list.appendChild(b);
  }
}

function renderRooms() {
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
}

function chooseRoom(id) {
  ac();
  enterRoom(id);
  persist();
  menuEl.classList.add('hidden');
  resetScene();
  if (offHere(TOOLS.find((t) => t.id === tool))) setTool('punch');
  renderTools();
  say([`Ooh, the ${currentRoom().name.toLowerCase()}! Please be gentle.`], true);
}
