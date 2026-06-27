/* ============================================================
   МОР: Побег с «Вигилии»
   Low-poly horror FPS, single-file game engine on Three.js
   ============================================================ */

(() => {
'use strict';

// ---------------------------------------------------------------
// GLOBAL STATE
// ---------------------------------------------------------------
const STATE = {
  running: false,
  paused: false,
  isMobile: /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || ('ontouchstart' in window && window.innerWidth < 1100),
  character: 'sentinel',
  levelIndex: 0,
  player: {
    hp: 100, maxHp: 100,
    spore: 0, maxSpore: 100,
    ammo: 12, maxAmmo: 24, reserveAmmo: 36,
    speed: 4.2, runMult: 1.9,
    radius: 0.38,
    height: 1.7,
    canShoot: true,
    keys: {}, // inventory item keys collected this level
  },
  charDefs: {
    sentinel: { hpBonus: 30, speedMult: 0.9, ammoBonus: 0 },
    warden:   { hpBonus: 0,  speedMult: 1.18, ammoBonus: 12 },
  },
  flags: {}, // global quest flags
};

// ---------------------------------------------------------------
// THREE BASICS
// ---------------------------------------------------------------
let renderer, scene, camera;
let clock = new THREE.Clock();
const canvas = document.getElementById('gameCanvas');

function initRenderer(){
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, STATE.isMobile ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x05060a);

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05060a, 0.055);

  camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.05, 100);
  camera.position.set(0, 1.7, 0);

  window.addEventListener('resize', onResize);
  onResize();
}

function onResize(){
  if(!renderer) return;
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  const orientNotice = document.getElementById('orientNotice');
  if(STATE.isMobile && window.innerHeight > window.innerWidth){
    orientNotice.classList.add('show');
  } else {
    orientNotice.classList.remove('show');
  }
}

// ---------------------------------------------------------------
// MATERIALS (shared, low-poly stylised palette)
// ---------------------------------------------------------------
const MAT = {};
function buildMaterials(){
  MAT.hullWall   = new THREE.MeshStandardMaterial({ color: 0x1a2229, roughness: 0.85, metalness: 0.25 });
  MAT.hullFloor  = new THREE.MeshStandardMaterial({ color: 0x14181d, roughness: 0.9, metalness: 0.2 });
  MAT.hullCeil   = new THREE.MeshStandardMaterial({ color: 0x10141a, roughness: 0.95, metalness: 0.1 });
  MAT.steelTrim  = new THREE.MeshStandardMaterial({ color: 0x3d4a56, roughness: 0.5, metalness: 0.6 });
  MAT.steelDark  = new THREE.MeshStandardMaterial({ color: 0x232b32, roughness: 0.6, metalness: 0.5 });
  MAT.glassPanel = new THREE.MeshStandardMaterial({ color: 0x6fa8d0, roughness: 0.2, metalness: 0.1, transparent:true, opacity:0.35, emissive:0x1c3a4a, emissiveIntensity:0.4 });
  MAT.signalLamp = new THREE.MeshStandardMaterial({ color: 0xe8c468, emissive: 0xe8c468, emissiveIntensity: 1.4, roughness:0.4 });
  MAT.dangerLamp = new THREE.MeshStandardMaterial({ color: 0xc9492f, emissive: 0xc9492f, emissiveIntensity: 1.6, roughness:0.4 });
  MAT.mold       = new THREE.MeshStandardMaterial({ color: 0x4a6b35, roughness: 1.0, metalness: 0.0, emissive:0x2a4015, emissiveIntensity:0.25 });
  MAT.moldDark   = new THREE.MeshStandardMaterial({ color: 0x394d2a, roughness: 1.0, metalness: 0.0 });
  MAT.sporeGlow  = new THREE.MeshStandardMaterial({ color: 0xa8e063, emissive: 0xa8e063, emissiveIntensity: 1.2, roughness:0.6, transparent:true, opacity:0.85 });
  MAT.door       = new THREE.MeshStandardMaterial({ color: 0x4a525e, roughness: 0.4, metalness: 0.7 });
  MAT.doorLocked = new THREE.MeshStandardMaterial({ color: 0x4a525e, roughness: 0.4, metalness: 0.7, emissive:0xc9492f, emissiveIntensity:0.3 });
  MAT.crate      = new THREE.MeshStandardMaterial({ color: 0x5a4a38, roughness: 0.95, metalness: 0.0 });
  MAT.pipeMetal  = new THREE.MeshStandardMaterial({ color: 0x52606b, roughness: 0.35, metalness: 0.8 });
  MAT.terminal   = new THREE.MeshStandardMaterial({ color: 0x2c3640, roughness: 0.3, metalness: 0.6 });
  MAT.terminalScreen = new THREE.MeshStandardMaterial({ color: 0x68c4e8, emissive: 0x68c4e8, emissiveIntensity: 0.9 });
  MAT.knightArmor = new THREE.MeshStandardMaterial({ color: 0x7c8590, roughness: 0.45, metalness: 0.6 });
  MAT.knightTrim  = new THREE.MeshStandardMaterial({ color: 0xe8c468, roughness: 0.4, metalness: 0.7, emissive:0xe8c468, emissiveIntensity:0.3 });
  MAT.moldFlesh  = new THREE.MeshStandardMaterial({ color: 0x6b8a4a, roughness: 0.8, metalness: 0.0, emissive:0x3a5520, emissiveIntensity:0.35 });
  MAT.moldEye    = new THREE.MeshStandardMaterial({ color: 0xe8e8c0, emissive: 0xd8e060, emissiveIntensity: 1.8 });
  MAT.podShell   = new THREE.MeshStandardMaterial({ color: 0xcfd3d6, roughness:0.3, metalness:0.6 });
}

// ---------------------------------------------------------------
// LEVEL / WORLD CONTAINER
// ---------------------------------------------------------------
let world = {
  group: null,
  colliders: [],   // {minX,maxX,minZ,maxZ,minY,maxY}
  doors: [],       // interactive doors {mesh, locked, requiresKey, openFn, box}
  pickups: [],     // {mesh, type, box, taken}
  terminals: [],   // {mesh, box, used, onUse}
  monsters: [],
  exitTrigger: null,
  sporeZones: [],  // areas that drain spore meter faster / spawn ambient particles
  spawnPoint: new THREE.Vector3(),
  spawnYaw: 0,
};

function clearWorld(){
  if(world.group) scene.remove(world.group);
  world.group = new THREE.Group();
  scene.add(world.group);
  world.colliders = [];
  world.doors = [];
  world.pickups = [];
  world.terminals = [];
  world.monsters.forEach(m => m.dispose && m.dispose());
  world.monsters = [];
  world.exitTrigger = null;
  world.sporeZones = [];
}

function addCollider(x, z, w, d, minY=0, maxY=3){
  const c = {
    minX: x - w/2, maxX: x + w/2,
    minZ: z - d/2, maxZ: z + d/2,
    minY, maxY
  };
  world.colliders.push(c);
  return c;
}

// box helper for room shells: walls around a w x d room centered at (cx,cz), wall thickness t, height h
function buildRoomShell(cx, cz, w, d, h, opts={}){
  const t = 0.3;
  const g = new THREE.Group();
  // floor
  const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), opts.floorMat || MAT.hullFloor);
  floor.position.set(cx, -0.1, cz);
  floor.receiveShadow = true;
  g.add(floor);
  // ceiling
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), MAT.hullCeil);
  ceil.position.set(cx, h + 0.1, cz);
  g.add(ceil);

  const gaps = opts.gaps || []; // [{wall:'n'|'s'|'e'|'w', from, to}] in local coords along wall length, defines opening (door)
  const wallSegs = [
    { wall:'n', cx: cx, cz: cz - d/2, len: w, axis:'x' },
    { wall:'s', cx: cx, cz: cz + d/2, len: w, axis:'x' },
    { wall:'e', cx: cx + w/2, cz: cz, len: d, axis:'z' },
    { wall:'w', cx: cx - w/2, cz: cz, len: d, axis:'z' },
  ];

  wallSegs.forEach(seg => {
    const segGaps = gaps.filter(gp => gp.wall === seg.wall);
    buildWallWithGaps(g, seg, segGaps, t, h, cx, cz, w, d);
  });

  world.group.add(g);
  return g;
}

function buildWallWithGaps(g, seg, segGaps, t, h, cx, cz, w, d){
  const half = seg.len / 2;
  // build wall as series of segments excluding gap ranges
  const sorted = segGaps.slice().sort((a,b)=>a.from-b.from);
  let cursor = -half;
  const pieces = [];
  sorted.forEach(gp => {
    if(gp.from > cursor) pieces.push([cursor, gp.from]);
    cursor = gp.to;
  });
  if(cursor < half) pieces.push([cursor, half]);
  if(pieces.length === 0) pieces.push([-half, half]);

  pieces.forEach(([a,b]) => {
    const len = b - a;
    if(len <= 0.01) return;
    const mid = (a + b) / 2;
    let mesh;
    if(seg.axis === 'x'){
      mesh = new THREE.Mesh(new THREE.BoxGeometry(len, h, t), MAT.hullWall);
      mesh.position.set(seg.cx + mid, h/2, seg.cz);
    } else {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(t, h, len), MAT.hullWall);
      mesh.position.set(seg.cx, h/2, seg.cz + mid);
    }
    mesh.castShadow = true; mesh.receiveShadow = true;
    g.add(mesh);
    // collider
    if(seg.axis === 'x'){
      addCollider(seg.cx + mid, seg.cz, len, t + 0.2, 0, h);
    } else {
      addCollider(seg.cx, seg.cz + mid, t + 0.2, len, 0, h);
    }
  });

  // lintel above gaps (so it still reads as a wall with a doorway, not a hole to ceiling)
  sorted.forEach(gp => {
    const len = gp.to - gp.from;
    const mid = (gp.from + gp.to) / 2;
    const lintelH = h - 2.3;
    if(lintelH > 0.05){
      let mesh;
      if(seg.axis === 'x'){
        mesh = new THREE.Mesh(new THREE.BoxGeometry(len, lintelH, t), MAT.hullWall);
        mesh.position.set(seg.cx + mid, 2.3 + lintelH/2, seg.cz);
      } else {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(t, lintelH, len), MAT.hullWall);
        mesh.position.set(seg.cx, 2.3 + lintelH/2, seg.cz + mid);
      }
      g.add(mesh);
    }
  });
}

// trim strip light along a wall (visual only)
function addTrimLight(x, y, z, w, d, mat=MAT.signalLamp){
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), mat);
  m.position.set(x, y, z);
  world.group.add(m);
  const light = new THREE.PointLight(mat.color.getHex(), 0.6, 6, 2);
  light.position.set(x, y - 0.1, z);
  world.group.add(light);
  return m;
}

function addCeilingLight(x, z, h, color=0xbfd4e0, intensity=0.9){
  const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.12, 8), MAT.steelDark);
  fixture.position.set(x, h - 0.1, z);
  world.group.add(fixture);
  const light = new THREE.PointLight(color, intensity, 9, 2);
  light.position.set(x, h - 0.3, z);
  world.group.add(light);
  return light;
}

// crate prop
function addCrate(x, z, y=0.4, scale=1, rotY=0){
  const c = new THREE.Mesh(new THREE.BoxGeometry(0.8*scale, 0.8*scale, 0.8*scale), MAT.crate);
  c.position.set(x, y, z);
  c.rotation.y = rotY;
  c.castShadow = true; c.receiveShadow = true;
  world.group.add(c);
  addCollider(x, z, 0.8*scale, 0.8*scale, 0, 0.8*scale*2);
  return c;
}

// pipe prop (decorative, along wall)
function addPipe(x, y, z, length, axis='z', radius=0.08){
  const geo = new THREE.CylinderGeometry(radius, radius, length, 8);
  const m = new THREE.Mesh(geo, MAT.pipeMetal);
  m.position.set(x, y, z);
  if(axis === 'z') m.rotation.x = Math.PI/2;
  if(axis === 'x') m.rotation.z = Math.PI/2;
  world.group.add(m);
  return m;
}

// mold patch decal-ish (flattened irregular blob using icosphere squashed)
function addMoldPatch(x, y, z, scale=1, onWall=null){
  const geo = new THREE.IcosahedronGeometry(0.5 * scale, 1);
  const mesh = new THREE.Mesh(geo, MAT.mold);
  mesh.position.set(x, y, z);
  mesh.scale.set(1, 0.35, 1);
  if(onWall === 'x'){ mesh.scale.set(0.3, 1, 1); }
  if(onWall === 'z'){ mesh.scale.set(1, 1, 0.3); }
  mesh.rotation.y = Math.random()*Math.PI*2;
  world.group.add(mesh);
  // small glowing spore bumps
  for(let i=0;i<3;i++){
    const bump = new THREE.Mesh(new THREE.SphereGeometry(0.05 + Math.random()*0.04, 6, 6), MAT.sporeGlow);
    bump.position.set(
      x + (Math.random()-0.5)*scale*0.6,
      y + (Math.random()-0.5)*scale*0.2 + 0.1,
      z + (Math.random()-0.5)*scale*0.6
    );
    world.group.add(bump);
  }
  return mesh;
}

function addMoldFloorCreep(x, z, radius=1.5){
  const geo = new THREE.CircleGeometry(radius, 10);
  const mesh = new THREE.Mesh(geo, MAT.moldDark);
  mesh.rotation.x = -Math.PI/2;
  mesh.position.set(x, 0.001, z);
  world.group.add(mesh);
  return mesh;
}

// simple sliding/swinging door as interactive object
function addDoor(x, z, width=1.6, axis='x', opts={}){
  const h = 2.3;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(axis==='x'?width:0.2, h, axis==='x'?0.2:width), opts.locked ? MAT.doorLocked : MAT.door);
  mesh.position.set(x, h/2, z);
  world.group.add(mesh);

  const door = {
    mesh, x, z, axis, width, h,
    locked: !!opts.locked,
    requiresKey: opts.requiresKey || null,
    opened: false,
    box: { minX:x-(axis==='x'?width/2:0.3), maxX:x+(axis==='x'?width/2:0.3), minZ:z-(axis==='x'?0.3:width/2), maxZ:z+(axis==='x'?0.3:width/2), minY:0, maxY:h },
    promptText: opts.promptText || 'открыть',
  };
  world.doors.push(door);
  if(!door.opened){
    door.collider = addCollider(x, z, axis==='x'?width:0.4, axis==='x'?0.4:width, 0, h);
  }
  return door;
}

function openDoor(door){
  if(door.opened) return;
  door.opened = true;
  // animate slide up into ceiling
  const startY = door.mesh.position.y;
  const targetY = startY + 2.6;
  const dur = 600;
  const t0 = performance.now();
  function anim(){
    const t = Math.min(1, (performance.now()-t0)/dur);
    door.mesh.position.y = startY + (targetY-startY)*t;
    if(t < 1) requestAnimationFrame(anim);
    else door.mesh.visible = false;
  }
  anim();
  // remove this door's specific collider by reference
  if(door.collider){
    const idx = world.colliders.indexOf(door.collider);
    if(idx >= 0) world.colliders.splice(idx, 1);
    door.collider = null;
  }
}

// pickup item (key, ammo, health)
function addPickup(x, z, type, opts={}){
  const y = opts.y !== undefined ? opts.y : 0.55;
  let mesh;
  if(type === 'key'){
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 6, 12), MAT.signalLamp);
    g.add(body);
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.22), MAT.signalLamp);
    stem.position.set(0, 0, 0.17);
    g.add(stem);
    mesh = g;
  } else if(type === 'ammo'){
    mesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.32), MAT.steelTrim);
  } else if(type === 'health'){
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.28,0.28,0.1), new THREE.MeshStandardMaterial({color:0xd8d3c4, emissive:0x885555, emissiveIntensity:0.2}));
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.2,0.12), new THREE.MeshStandardMaterial({color:0xb3402f, emissive:0xb3402f, emissiveIntensity:0.4}));
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.08,0.12), new THREE.MeshStandardMaterial({color:0xb3402f, emissive:0xb3402f, emissiveIntensity:0.4}));
    g.add(base, crossV, crossH);
    mesh = g;
  } else {
    mesh = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), MAT.sporeGlow);
  }
  mesh.position.set(x, y, z);
  world.group.add(mesh);
  const light = new THREE.PointLight(type==='key'?0xe8c468:0xffffff, 0.4, 2.5, 2);
  light.position.set(x, y+0.1, z);
  world.group.add(light);

  const pickup = {
    mesh, light, type, x, z, y,
    keyId: opts.keyId || null,
    amount: opts.amount || (type==='ammo'?12:type==='health'?30:0),
    taken: false,
    box: { minX:x-0.4, maxX:x+0.4, minZ:z-0.4, maxZ:z+0.4, minY:0, maxY:y+0.4 },
    promptText: opts.promptText || (type==='key' ? 'забрать ключ-карту' : type==='ammo' ? 'забрать патроны' : 'забрать аптечку'),
    bobT: Math.random()*10,
  };
  world.pickups.push(pickup);
  return pickup;
}

// terminal (quest objective - "activate system")
function addTerminal(x, z, rotY, opts={}){
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 0.35), MAT.terminal);
  base.position.y = 0.55;
  g.add(base);
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.3, 0.05), MAT.terminalScreen);
  screen.position.set(0, 0.95, 0.18);
  screen.rotation.x = -0.3;
  g.add(screen);
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  world.group.add(g);
  const light = new THREE.PointLight(0x68c4e8, 0.5, 3, 2);
  light.position.set(x, 1, z);
  world.group.add(light);

  const terminal = {
    mesh: g, screen, x, z, used: false,
    box: { minX:x-0.6, maxX:x+0.6, minZ:z-0.6, maxZ:z+0.6, minY:0, maxY:1.3 },
    promptText: opts.promptText || 'активировать систему',
    onUse: opts.onUse || (()=>{}),
    requiresKey: opts.requiresKey || null,
  };
  world.terminals.push(terminal);
  return terminal;
}

// exit trigger zone (capsule / level transition)
function addExitZone(x, z, w, d){
  world.exitTrigger = { minX:x-w/2, maxX:x+w/2, minZ:z-d/2, maxZ:z+d/2 };
}

// spore zone - ambient hazard area that fills spore meter & spawns particles
function addSporeZone(x, z, radius){
  world.sporeZones.push({ x, z, radius: radius*radius });
}

// ---------------------------------------------------------------
// PLAYER MOVEMENT / COLLISION
// ---------------------------------------------------------------
const pState = {
  pos: new THREE.Vector3(0, 1.7, 0),
  yaw: 0, pitch: 0,
  velY: 0,
  bobT: 0,
};

function resolveCollisionXZ(nx, nz){
  const r = STATE.player.radius;
  let x = nx, z = nz;
  for(const c of world.colliders){
    if(pState.pos.y - 0.1 > c.maxY || pState.pos.y + 1.6 < c.minY) continue;
    const closestX = Math.max(c.minX, Math.min(x, c.maxX));
    const closestZ = Math.max(c.minZ, Math.min(z, c.maxZ));
    const dx = x - closestX, dz = z - closestZ;
    const distSq = dx*dx + dz*dz;
    if(distSq < r*r){
      const dist = Math.sqrt(distSq) || 0.0001;
      const pushX = (dx/dist) * (r - dist);
      const pushZ = (dz/dist) * (r - dist);
      x += pushX; z += pushZ;
    }
  }
  return {x, z};
}

function pointInBox(x, z, box){
  return x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ;
}

// ---------------------------------------------------------------
// INPUT — desktop
// ---------------------------------------------------------------
const input = {
  fwd:0, strafe:0, run:false, fire:false, interact:false,
  lookDX:0, lookDY:0,
};

function setupDesktopInput(){
  window.addEventListener('keydown', e => {
    if(!STATE.running) return;
    switch(e.code){
      case 'KeyW': case 'ArrowUp': input.fwd = 1; break;
      case 'KeyS': case 'ArrowDown': input.fwd = -1; break;
      case 'KeyA': case 'ArrowLeft': input.strafe = -1; break;
      case 'KeyD': case 'ArrowRight': input.strafe = 1; break;
      case 'ShiftLeft': case 'ShiftRight': input.run = true; break;
      case 'KeyE': triggerInteract(); break;
      case 'Escape': break;
    }
  });
  window.addEventListener('keyup', e => {
    switch(e.code){
      case 'KeyW': case 'ArrowUp': if(input.fwd===1) input.fwd=0; break;
      case 'KeyS': case 'ArrowDown': if(input.fwd===-1) input.fwd=0; break;
      case 'KeyA': case 'ArrowLeft': if(input.strafe===-1) input.strafe=0; break;
      case 'KeyD': case 'ArrowRight': if(input.strafe===1) input.strafe=0; break;
      case 'ShiftLeft': case 'ShiftRight': input.run = false; break;
    }
  });

  canvas.addEventListener('mousedown', e => {
    if(!STATE.running) return;
    if(document.pointerLockElement !== canvas){ canvas.requestPointerLock(); return; }
    if(e.button === 0) fireWeapon();
  });
  document.addEventListener('mousemove', e => {
    if(document.pointerLockElement !== canvas) return;
    pState.yaw -= e.movementX * 0.0022;
    pState.pitch -= e.movementY * 0.0022;
    pState.pitch = Math.max(-1.3, Math.min(1.3, pState.pitch));
  });
}

// ---------------------------------------------------------------
// INPUT — mobile (joystick + look zone + buttons)
// ---------------------------------------------------------------
function setupMobileInput(){
  document.getElementById('mobileControls').classList.add('active');

  const joyZone = document.getElementById('joyZone');
  const joyBase = document.getElementById('joyBase');
  const joyNub = document.getElementById('joyNub');
  let joyTouchId = null, joyOriginX=0, joyOriginY=0;
  const maxR = 50;

  joyZone.addEventListener('touchstart', e => {
    const t = e.changedTouches[0];
    joyTouchId = t.identifier;
    joyOriginX = t.clientX; joyOriginY = t.clientY;
    joyBase.style.left = (joyOriginX-54)+'px';
    joyBase.style.top = (joyOriginY-54)+'px';
    joyBase.style.display = 'block';
    e.preventDefault();
  }, {passive:false});

  joyZone.addEventListener('touchmove', e => {
    for(const t of e.changedTouches){
      if(t.identifier !== joyTouchId) continue;
      let dx = t.clientX - joyOriginX, dy = t.clientY - joyOriginY;
      const len = Math.hypot(dx,dy);
      if(len > maxR){ dx = dx/len*maxR; dy = dy/len*maxR; }
      joyNub.style.transform = `translate(${dx}px, ${dy}px)`;
      input.strafe = Math.max(-1, Math.min(1, dx/maxR));
      input.fwd = Math.max(-1, Math.min(1, -dy/maxR));
    }
    e.preventDefault();
  }, {passive:false});

  function joyEnd(e){
    for(const t of e.changedTouches){
      if(t.identifier !== joyTouchId) continue;
      joyTouchId = null;
      joyBase.style.display = 'none';
      joyNub.style.transform = 'translate(0,0)';
      input.fwd = 0; input.strafe = 0;
    }
  }
  joyZone.addEventListener('touchend', joyEnd);
  joyZone.addEventListener('touchcancel', joyEnd);

  // look zone (drag to rotate camera)
  const lookZone = document.getElementById('lookZone');
  let lookTouchId = null, lastX=0, lastY=0;
  lookZone.addEventListener('touchstart', e => {
    const t = e.changedTouches[0];
    lookTouchId = t.identifier;
    lastX = t.clientX; lastY = t.clientY;
    e.preventDefault();
  }, {passive:false});
  lookZone.addEventListener('touchmove', e => {
    for(const t of e.changedTouches){
      if(t.identifier !== lookTouchId) continue;
      const dx = t.clientX - lastX, dy = t.clientY - lastY;
      lastX = t.clientX; lastY = t.clientY;
      pState.yaw -= dx * 0.0045;
      pState.pitch -= dy * 0.0045;
      pState.pitch = Math.max(-1.3, Math.min(1.3, pState.pitch));
    }
    e.preventDefault();
  }, {passive:false});
  function lookEnd(e){
    for(const t of e.changedTouches){ if(t.identifier===lookTouchId) lookTouchId=null; }
  }
  lookZone.addEventListener('touchend', lookEnd);
  lookZone.addEventListener('touchcancel', lookEnd);

  // buttons
  const btnFire = document.getElementById('btnFire');
  const btnRun = document.getElementById('btnRun');
  const btnInteract = document.getElementById('btnInteract');

  btnFire.addEventListener('touchstart', e => { e.preventDefault(); btnFire.classList.add('active'); fireWeapon(); }, {passive:false});
  btnFire.addEventListener('touchend', e => { e.preventDefault(); btnFire.classList.remove('active'); });

  let runOn = false;
  btnRun.addEventListener('touchstart', e => {
    e.preventDefault();
    runOn = !runOn;
    input.run = runOn;
    btnRun.classList.toggle('on', runOn);
  }, {passive:false});

  btnInteract.addEventListener('touchstart', e => {
    e.preventDefault();
    btnInteract.classList.add('active');
    triggerInteract();
  }, {passive:false});
  btnInteract.addEventListener('touchend', e => { e.preventDefault(); btnInteract.classList.remove('active'); });
}

// ---------------------------------------------------------------
// INTERACTION / WEAPON
// ---------------------------------------------------------------
let nearestInteractable = null;

function findNearestInteractable(){
  const px = pState.pos.x, pz = pState.pos.z;
  let best = null, bestD = 2.2;
  const check = (obj, kind) => {
    if(obj.taken || obj.used || obj.opened) return;
    const cx = (obj.box.minX+obj.box.maxX)/2, cz=(obj.box.minZ+obj.box.maxZ)/2;
    const d = Math.hypot(px-cx, pz-cz);
    if(d < bestD){ bestD = d; best = {obj, kind}; }
  };
  world.pickups.forEach(p => check(p, 'pickup'));
  world.terminals.forEach(t => check(t, 'terminal'));
  world.doors.forEach(d => { if(d.locked && !d.opened) check(d, 'door'); });
  return best;
}

function triggerInteract(){
  // Real lookup + handling lives in main.js (M.__nearest), which has access
  // to world state computed each frame. This stub stays for any internal
  // desktop keydown call paths but defers to the canonical implementation.
  if(window.__MOLD && window.__MOLD.triggerInteractReal){
    window.__MOLD.triggerInteractReal();
  }
}

function collectPickup(p){
  if(p.taken) return;
  p.taken = true;
  world.group.remove(p.mesh);
  world.group.remove(p.light);
  if(p.type === 'key'){
    STATE.player.keys[p.keyId] = true;
    showToast(`Получено: ${KEY_NAMES[p.keyId] || 'ключ-карта'}`);
  } else if(p.type === 'ammo'){
    STATE.player.reserveAmmo = Math.min(96, STATE.player.reserveAmmo + p.amount);
    showToast(`+${p.amount} зарядов`);
  } else if(p.type === 'health'){
    STATE.player.hp = Math.min(STATE.player.maxHp, STATE.player.hp + p.amount);
    showToast(`+${p.amount} здоровья`);
    updateHud();
  }
}

const KEY_NAMES = {};

function useTerminal(t){
  if(t.used) return;
  if(t.requiresKey && !STATE.player.keys[t.requiresKey]){
    showToast('Нужен доступ — найдите ключ-карту', true);
    return;
  }
  t.used = true;
  t.screen.material.emissiveIntensity = 2.2;
  t.screen.material.color.set(0xa8e063);
  t.screen.material.emissive.set(0xa8e063);
  t.onUse();
}

function tryOpenLockedDoor(door){
  if(door.requiresKey && !STATE.player.keys[door.requiresKey]){
    showToast('Дверь заблокирована — нужен ключ-карта', true);
    return;
  }
  openDoor(door);
  showToast('Дверь открыта');
}

function fireWeapon(){
  if(!STATE.player.canShoot) return;
  if(STATE.player.ammo <= 0){
    if(STATE.player.reserveAmmo > 0){
      const reload = Math.min(STATE.player.maxAmmo, STATE.player.reserveAmmo);
      STATE.player.reserveAmmo -= reload;
      STATE.player.ammo = reload;
      showToast('Перезарядка');
      updateHud();
    } else {
      showToast('Нет зарядов!', true);
    }
    return;
  }
  STATE.player.ammo--;
  updateHud();
  // raycast from camera center
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const ray = new THREE.Raycaster(camera.position, dir, 0.1, 30);
  const meshes = [];
  world.monsters.forEach(m => { if(m.alive) meshes.push(m.hitMesh); });
  const hits = ray.intersectObjects(meshes, false);
  flashMuzzle();
  if(hits.length){
    const hitMesh = hits[0].object;
    const monster = world.monsters.find(m => m.hitMesh === hitMesh);
    if(monster) damageMonster(monster, 34);
    showCrosshairHit();
  }
}

function flashMuzzle(){
  // brief light flash near camera
  const f = new THREE.PointLight(0xfff3c0, 2.2, 4, 2);
  f.position.copy(camera.position);
  scene.add(f);
  setTimeout(()=>scene.remove(f), 60);
}

function showCrosshairHit(){
  const ch = document.getElementById('crosshair');
  ch.classList.add('hit');
  setTimeout(()=>ch.classList.remove('hit'), 120);
}

// ---------------------------------------------------------------
// TOASTS / HUD
// ---------------------------------------------------------------
function showToast(text, danger=false){
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  if(danger){ el.style.borderColor = 'var(--danger)'; el.style.color = '#f08a6e'; }
  wrap.appendChild(el);
  setTimeout(()=> el.remove(), 3100);
}

function updateHud(){
  document.getElementById('hpFill').style.width = Math.max(0, STATE.player.hp) + '%';
  document.getElementById('sporeFill').style.width = Math.max(0, STATE.player.spore) + '%';
  document.getElementById('ammoCount').textContent = STATE.player.ammo;
}

function setObjective(text){
  document.getElementById('objectiveText').textContent = text;
}

function setLevelTag(text){
  document.getElementById('levelTag').textContent = text;
}

// expose internals needed by part 2 (levels & monsters) via namespace
window.__MOLD = {
  STATE, MAT, world, pState, input,
  scene: () => scene, camera: () => camera, renderer: () => renderer,
  clearWorld, addCollider, buildRoomShell, addTrimLight, addCeilingLight,
  addCrate, addPipe, addMoldPatch, addMoldFloorCreep, addDoor, openDoor,
  addPickup, addTerminal, addExitZone, addSporeZone,
  resolveCollisionXZ, pointInBox, showToast, updateHud, setObjective, setLevelTag,
  findNearestInteractable: () => nearestInteractable,
  KEY_NAMES,
  initRenderer, buildMaterials, setupDesktopInput, setupMobileInput,
  fireWeapon, collectPickup,
};

})();
