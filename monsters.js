/* ============================================================
   МОР — Монстры: Плесневики
   ============================================================ */
(() => {
'use strict';
const M = window.__MOLD;
const { MAT, world, pState, STATE } = M;
const THREE_ = window.THREE;

// Build a low-poly "moldling" creature: hunched fleshy mold golem with glowing eyes
// Materials are cloned per-monster so hit-flash effects don't bleed across all
// monsters sharing the same base material.
function buildMoldlingMesh(){
  const g = new THREE_.Group();
  const fleshMat = MAT.moldFlesh.clone();
  const darkMat = MAT.moldDark.clone();
  const eyeMat = MAT.moldEye.clone();
  const glowMat = MAT.sporeGlow.clone();

  // torso (irregular blob)
  const torso = new THREE_.Mesh(new THREE_.IcosahedronGeometry(0.42, 1), fleshMat);
  torso.scale.set(1, 1.15, 0.85);
  torso.position.y = 0.75;
  g.add(torso);

  // head blob
  const head = new THREE_.Mesh(new THREE_.IcosahedronGeometry(0.24, 1), fleshMat);
  head.position.set(0, 1.28, 0.05);
  g.add(head);

  // eyes
  const eyeGeo = new THREE_.SphereGeometry(0.045, 6, 6);
  const eyeL = new THREE_.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.09, 1.3, 0.22);
  const eyeR = new THREE_.Mesh(eyeGeo, eyeMat);
  eyeR.position.set(0.09, 1.3, 0.22);
  g.add(eyeL, eyeR);

  // arms (thin tendrils with clubbed end)
  function makeArm(side){
    const ag = new THREE_.Group();
    const upper = new THREE_.Mesh(new THREE_.CylinderGeometry(0.07, 0.1, 0.5, 6), fleshMat);
    upper.position.set(side*0.4, 0.85, 0);
    upper.rotation.z = side * 0.5;
    ag.add(upper);
    const claw = new THREE_.Mesh(new THREE_.IcosahedronGeometry(0.12, 0), darkMat);
    claw.position.set(side*0.62, 0.6, 0.05);
    ag.add(claw);
    return ag;
  }
  const armL = makeArm(-1), armR = makeArm(1);
  g.add(armL, armR);

  // legs (stubby)
  function makeLeg(side){
    const leg = new THREE_.Mesh(new THREE_.CylinderGeometry(0.1, 0.13, 0.55, 6), fleshMat);
    leg.position.set(side*0.18, 0.28, 0);
    return leg;
  }
  g.add(makeLeg(-1), makeLeg(1));

  // spore glow bumps
  for(let i=0;i<4;i++){
    const bump = new THREE_.Mesh(new THREE_.SphereGeometry(0.05, 6, 6), glowMat);
    bump.position.set((Math.random()-0.5)*0.5, 0.5+Math.random()*0.7, (Math.random()-0.5)*0.4);
    g.add(bump);
  }

  g.traverse(o => { if(o.isMesh){ o.castShadow = true; }});
  // store refs for animation
  g.userData.armL = armL;
  g.userData.armR = armR;
  g.userData.torso = torso;
  g.userData.head = head;

  return g;
}

const MONSTER_DEFS = {
  drifter: { hp: 50, speed: 1.7, dmg: 8, attackRange: 1.1, sight: 7.5, scale: 1.0 },
  bloat:    { hp: 70, speed: 1.3, dmg: 14, attackRange: 1.2, sight: 6.0, scale: 1.25 },
  sprinter: { hp: 36, speed: 3.0, dmg: 10, attackRange: 1.0, sight: 9.0, scale: 0.85 },
};

function disposeMeshDeep(root){
  root.traverse(o => {
    if(o.isMesh){
      if(o.geometry) o.geometry.dispose();
      if(o.material) o.material.dispose();
    }
  });
}

function spawnMonster(x, z, type='drifter', patrolPoints=null){
  const def = MONSTER_DEFS[type] || MONSTER_DEFS.drifter;
  const mesh = buildMoldlingMesh();
  mesh.scale.setScalar(def.scale);
  mesh.position.set(x, 0, z);
  world.group.add(mesh);

  // simple hit-target = torso (in world space, child of mesh)
  const hitMesh = mesh.userData.torso;

  const monster = {
    mesh, hitMesh, type,
    hp: def.hp, maxHp: def.hp,
    speed: def.speed, dmg: def.dmg,
    attackRange: def.attackRange, sight: def.sight,
    x, z, alive: true,
    state: 'idle', // idle, chase, attack, dead
    attackCooldown: 0,
    patrolPoints: patrolPoints || [{x,z}],
    patrolIdx: 0,
    animT: Math.random()*10,
    deathT: 0,
    stagger: 0,
    dispose(){ world.group.remove(mesh); disposeMeshDeep(mesh); }
  };
  world.monsters.push(monster);
  return monster;
}

function damageMonster(monster, dmg){
  if(!monster.alive) return;
  monster.hp -= dmg;
  monster.stagger = 0.15;
  // flash
  monster.mesh.traverse(o => {
    if(o.isMesh && o.material && o.material.emissive){
      o.material.emissiveIntensity = (o.material.emissiveIntensity||0.3) + 1.2;
    }
  });
  if(monster.hp <= 0){
    killMonster(monster);
  }
}

function killMonster(monster){
  monster.alive = false;
  monster.state = 'dead';
  M.showToast('Плесневик уничтожен');
}

function updateMonster(monster, dt, playerPos){
  if(!monster.alive){
    // sink + shrink death anim
    monster.deathT += dt;
    monster.mesh.position.y -= dt*0.6;
    monster.mesh.scale.multiplyScalar(Math.max(0, 1 - dt*1.5));
    if(monster.deathT > 1.2){
      world.group.remove(monster.mesh);
      disposeMeshDeep(monster.mesh);
      const idx = world.monsters.indexOf(monster);
      if(idx>=0) world.monsters.splice(idx,1);
    }
    return;
  }

  const dx = playerPos.x - monster.x, dz = playerPos.z - monster.z;
  const dist = Math.hypot(dx, dz);

  if(monster.stagger > 0){ monster.stagger -= dt; }

  // state transitions
  if(dist < monster.sight) monster.state = 'chase';
  else if(monster.state === 'chase' && dist > monster.sight*1.6) monster.state = 'idle';

  let moveX=0, moveZ=0;
  if(monster.state === 'chase'){
    if(dist > monster.attackRange){
      moveX = dx/dist; moveZ = dz/dist;
    } else {
      // attack
      monster.attackCooldown -= dt;
      if(monster.attackCooldown <= 0){
        monster.attackCooldown = 1.1;
        applyDamageToPlayer(monster.dmg);
        monster.lungeT = 0.25;
      }
    }
  } else {
    // idle patrol toward patrol point
    const target = monster.patrolPoints[monster.patrolIdx];
    const pdx = target.x - monster.x, pdz = target.z - monster.z;
    const pd = Math.hypot(pdx,pdz);
    if(pd < 0.3){
      monster.patrolIdx = (monster.patrolIdx+1) % monster.patrolPoints.length;
    } else if(monster.patrolPoints.length > 1){
      moveX = pdx/pd; moveZ = pdz/pd;
    }
  }

  if(monster.stagger <= 0 && (moveX||moveZ)){
    const spd = monster.speed * dt;
    let nx = monster.x + moveX*spd;
    let nz = monster.z + moveZ*spd;
    // collide against world colliders (simple radius push)
    const r = 0.4;
    for(const c of world.colliders){
      const closestX = Math.max(c.minX, Math.min(nx, c.maxX));
      const closestZ = Math.max(c.minZ, Math.min(nz, c.maxZ));
      const cdx = nx-closestX, cdz = nz-closestZ;
      const dsq = cdx*cdx+cdz*cdz;
      if(dsq < r*r){
        const d2 = Math.sqrt(dsq)||0.0001;
        nx += (cdx/d2)*(r-d2);
        nz += (cdz/d2)*(r-d2);
      }
    }
    monster.x = nx; monster.z = nz;
    monster.mesh.position.x = nx;
    monster.mesh.position.z = nz;
    monster.mesh.rotation.y = Math.atan2(moveX, moveZ);
  }

  // bob / limb animation
  monster.animT += dt * (monster.state==='chase' ? 6 : 2.2);
  monster.mesh.userData.armL.rotation.x = Math.sin(monster.animT)*0.5;
  monster.mesh.userData.armR.rotation.x = -Math.sin(monster.animT)*0.5;
  monster.mesh.position.y = Math.abs(Math.sin(monster.animT*0.5))*0.05;

  if(monster.lungeT > 0){
    monster.lungeT -= dt;
    monster.mesh.userData.torso.scale.set(1.15,0.95,1.15);
  } else {
    monster.mesh.userData.torso.scale.set(1,1.15,0.85);
  }

  // decay flash
  monster.mesh.traverse(o => {
    if(o.isMesh && o.material && o.material.emissive && o.material.emissiveIntensity > 0.3){
      o.material.emissiveIntensity = Math.max(0.3, o.material.emissiveIntensity - dt*4);
    }
  });
}

function applyDamageToPlayer(dmg){
  STATE.player.hp -= dmg;
  M.updateHud();
  const flash = document.getElementById('flashHit');
  flash.style.opacity = 0.55;
  setTimeout(()=> flash.style.opacity = 0, 150);
  if(navigator.vibrate) navigator.vibrate(80);
  if(STATE.player.hp <= 0){
    window.__MOLD_ONDEATH && window.__MOLD_ONDEATH();
  }
}

M.spawnMonster = spawnMonster;
M.damageMonster = damageMonster;
M.updateMonster = updateMonster;
M.applyDamageToPlayer = applyDamageToPlayer;
M.MONSTER_DEFS = MONSTER_DEFS;

})();
