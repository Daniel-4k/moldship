/* ============================================================
   МОР — Главный цикл игры
   ============================================================ */
(() => {
'use strict';
const M = window.__MOLD;
const { STATE, MAT, world, pState, input, scene, camera, renderer } = M;
const THREE_ = window.THREE;

let ambientLight, hemiLight;

function setupLighting(){
  ambientLight = new THREE_.AmbientLight(0x2a3038, 0.55);
  scene().add(ambientLight);
  hemiLight = new THREE_.HemisphereLight(0x3a4550, 0x12161a, 0.4);
  scene().add(hemiLight);
}

function loadLevel(idx){
  const lvl = M.LEVELS[idx];
  M.clearWorld();
  STATE.player.keys = {};
  STATE.flags = {};
  lvl.build();
  pState.pos.set(lvl.spawn.x, STATE.player.height, lvl.spawn.z);
  pState.yaw = lvl.spawn.yaw;
  pState.pitch = 0;
  pState.velY = 0;
  M.setLevelTag(lvl.name);
  M.updateHud();
  STATE.player.ammo = Math.min(STATE.player.maxAmmo, STATE.player.ammo);
}

function applyCharacterStats(){
  const def = STATE.charDefs[STATE.character];
  STATE.player.maxHp = 100 + def.hpBonus;
  STATE.player.hp = STATE.player.maxHp;
  STATE.player.speed = 4.2 * def.speedMult;
  STATE.player.maxAmmo = 24 + def.ammoBonus;
  STATE.player.ammo = STATE.player.maxAmmo;
  STATE.player.reserveAmmo = 36 + def.ammoBonus;
  STATE.player.spore = 0;
}

function startGame(){
  applyCharacterStats();
  STATE.levelIndex = 0;
  document.getElementById('menuScreen').classList.add('hidden');
  document.getElementById('deathScreen').classList.add('hidden');
  document.getElementById('winScreen').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  loadLevel(0);
  STATE.running = true;
  if(!STATE.isMobile){
    M.showToast('ЛКМ — захват курсора, WASD — движение, ЛКМ — стрельба, E — взаимодействие, Shift — бег');
  }
}

function onPlayerDeath(){
  STATE.running = false;
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('deathScreen').classList.remove('hidden');
  if(document.pointerLockElement) document.exitPointerLock();
}
window.__MOLD_ONDEATH = onPlayerDeath;

function onLevelComplete(){
  STATE.levelIndex++;
  if(STATE.levelIndex >= M.LEVELS.length){
    STATE.running = false;
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('winScreen').classList.remove('hidden');
    if(document.pointerLockElement) document.exitPointerLock();
  } else {
    // keep hp/ammo, reset per-level keys/flags, fresh spore baseline reduced
    STATE.player.spore = Math.max(0, STATE.player.spore - 30);
    M.showToast('Отсек пройден. Переход...');
    loadLevel(STATE.levelIndex);
  }
}

// ---------------------------------------------------------------
// UPDATE LOOP
// ---------------------------------------------------------------
function updatePlayer(dt){
  camera().rotation.order = 'YXZ';
  camera().rotation.y = pState.yaw;
  camera().rotation.x = pState.pitch;

  const speed = STATE.player.speed;
  const fwd = input.fwd, strafe = input.strafe;
  const mag = Math.hypot(fwd, strafe);
  let mx=0, mz=0;
  if(mag > 0.001){
    const nfwd = fwd/Math.max(1,mag), nstr = strafe/Math.max(1,mag);
    const sinY = Math.sin(pState.yaw), cosY = Math.cos(pState.yaw);
    // forward vector in world (yaw=0 looks toward -Z in three.js camera convention)
    const fx = -sinY, fz = -cosY;
    const rx = cosY, rz = -sinY;
    mx = (fx*nfwd + rx*nstr);
    mz = (fz*nfwd + rz*nstr);
    const len = Math.hypot(mx,mz) || 1;
    mx/=len; mz/=len;
  }

  const moveSpeed = speed * (input.run ? 1.9 : 1) * Math.min(1,mag);
  const targetX = pState.pos.x + mx*moveSpeed*dt;
  const targetZ = pState.pos.z + mz*moveSpeed*dt;
  const resolved = M.resolveCollisionXZ(targetX, targetZ);
  pState.pos.x = resolved.x;
  pState.pos.z = resolved.z;

  // bob
  pState.bobT += dt * moveSpeed * 2.2;
  const bobY = (mag>0.05) ? Math.abs(Math.sin(pState.bobT))*0.045 : 0;
  pState.pos.y = STATE.player.height + bobY;

  camera().position.set(pState.pos.x, pState.pos.y, pState.pos.z);

  // spore zone damage-over-time to spore meter
  let inSpore = false;
  for(const z of world.sporeZones){
    const dx = pState.pos.x - z.x, dz = pState.pos.z - z.z;
    if(dx*dx+dz*dz < z.radius){ inSpore = true; break; }
  }
  if(inSpore){
    STATE.player.spore = Math.min(STATE.player.maxSpore, STATE.player.spore + dt*9);
  } else {
    STATE.player.spore = Math.max(0, STATE.player.spore - dt*5);
  }
  if(STATE.player.spore >= STATE.player.maxSpore){
    STATE.player.hp -= dt*6;
    M.updateHud();
    if(STATE.player.hp <= 0) onPlayerDeath();
  }

  document.getElementById('vignette').style.opacity = inSpore ? 0.55 : (STATE.player.hp < 30 ? 0.35 : 0);
}

function updateInteractPrompt(){
  const best = findInteractable();
  const promptEl = document.getElementById('interactPrompt');
  if(best){
    promptEl.classList.remove('hidden');
    promptEl.innerHTML = `Нажмите <b>${STATE.isMobile?'ВЗАИМ.':'E'}</b> — ${best.obj.promptText}`;
    M.__nearest = best;
  } else {
    promptEl.classList.add('hidden');
    M.__nearest = null;
  }
}

function findInteractable(){
  const px = pState.pos.x, pz = pState.pos.z;
  let best = null, bestD = 2.0;
  const check = (obj, kind, doneFlag) => {
    if(obj[doneFlag]) return;
    const cx = (obj.box.minX+obj.box.maxX)/2, cz=(obj.box.minZ+obj.box.maxZ)/2;
    const d = Math.hypot(px-cx, pz-cz);
    if(d < bestD){ bestD = d; best = {obj, kind}; }
  };
  world.pickups.forEach(p => check(p, 'pickup', 'taken'));
  world.terminals.forEach(t => check(t, 'terminal', 'used'));
  world.doors.forEach(d => { if(d.locked && !d.opened) check(d, 'door', 'opened'); });
  return best;
}

// patch triggerInteract to use this module's finder (override the stub in game.js)
function triggerInteractReal(){
  if(!STATE.running) return;
  const best = M.__nearest;
  if(!best) return;
  const { obj, kind } = best;
  if(kind === 'pickup') M.collectPickup(obj);
  else if(kind === 'terminal'){
    if(obj.used) return;
    if(obj.requiresKey && !STATE.player.keys[obj.requiresKey]){
      M.showToast('Нужен доступ — найдите ключ-карту', true);
      return;
    }
    obj.used = true;
    obj.screen.material.color.set(0xa8e063);
    obj.screen.material.emissive.set(0xa8e063);
    obj.screen.material.emissiveIntensity = 2.2;
    obj.onUse();
  } else if(kind === 'door'){
    if(obj.requiresKey && !STATE.player.keys[obj.requiresKey]){
      M.showToast('Дверь заблокирована — нужен ключ-карта', true);
      return;
    }
    M.openDoor(obj);
    M.showToast('Дверь открыта');
  }
}
M.triggerInteractReal = triggerInteractReal;

function checkExitTrigger(){
  if(!world.exitTrigger) return;
  const t = world.exitTrigger;
  if(M.pointInBox(pState.pos.x, pState.pos.z, t)){
    onLevelComplete();
  }
}

let lastFrame = performance.now();
function tick(){
  requestAnimationFrame(tick);
  const now = performance.now();
  let dt = (now - lastFrame) / 1000;
  lastFrame = now;
  dt = Math.min(dt, 0.05);

  if(STATE.running){
    updatePlayer(dt);
    updateInteractPrompt();
    world.monsters.slice().forEach(mo => M.updateMonster(mo, dt, pState.pos));
    checkExitTrigger();
  }

  renderer().render(scene(), camera());
}

// ---------------------------------------------------------------
// UI WIRING
// ---------------------------------------------------------------
function wireMenu(){
  const cards = document.querySelectorAll('.char-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      cards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      STATE.character = card.dataset.char;
    });
  });
  document.getElementById('startBtn').addEventListener('click', startGame);
  document.getElementById('retryBtn').addEventListener('click', () => {
    document.getElementById('deathScreen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    applyCharacterStats();
    loadLevel(STATE.levelIndex); // restart current level, not whole game
    STATE.running = true;
  });
  document.getElementById('restartBtn').addEventListener('click', () => {
    document.getElementById('winScreen').classList.add('hidden');
    document.getElementById('menuScreen').classList.remove('hidden');
  });
}

function boot(){
  const loadFill = document.getElementById('loadFill');
  const loadTxt = document.getElementById('loadTxt');
  const steps = ['инициализация рендера', 'сборка материалов', 'калибровка управления', 'готово'];
  let p = 0;
  function step(){
    p++;
    loadFill.style.width = (p/steps.length*100)+'%';
    loadTxt.textContent = steps[p-1] || 'готово';
    if(p < steps.length){
      setTimeout(step, 160);
    } else {
      setTimeout(() => {
        document.getElementById('loadingScreen').classList.add('hidden');
      }, 200);
    }
  }
  M.initRenderer();
  setupLighting();
  M.buildMaterials();
  M.setupDesktopInput();
  if(STATE.isMobile) M.setupMobileInput();
  wireMenu();
  step();
  tick();
}

if(document.readyState === 'loading'){
  window.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

})();
