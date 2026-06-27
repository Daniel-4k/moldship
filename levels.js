/* ============================================================
   МОР — Уровни корабля «Вигилия»
   6 отсеков, нарастающее заражение плесенью
   ============================================================ */
(() => {
'use strict';
const M = window.__MOLD;
const {
  STATE, MAT, world,
  buildRoomShell, addTrimLight, addCeilingLight, addCrate, addPipe,
  addMoldPatch, addMoldFloorCreep, addDoor, addPickup, addTerminal,
  addExitZone, addSporeZone, setObjective, setLevelTag, KEY_NAMES,
} = M;
const THREE_ = window.THREE;

KEY_NAMES.hangarKey = 'ключ-карта ангара';
KEY_NAMES.crewKey = 'ключ-карта жилого блока';
KEY_NAMES.medKey = 'ключ-карта лазарета';
KEY_NAMES.engineKey = 'инженерный код доступа';
KEY_NAMES.bridgeKey = 'командный ключ-карта';

const LEVELS = [];

// ---------------------------------------------------------------
// LEVEL 1 — ANGAR (tutorial: movement, shooting, first key)
// ---------------------------------------------------------------
LEVELS.push({
  name: 'ОТСЕК 1 / 6 — АНГАР',
  spawn: { x: 0, z: 8, yaw: Math.PI },
  build(){
    // main hangar room
    buildRoomShell(0, 0, 14, 20, 4.2, {
      gaps: [
        { wall:'n', from:-1.2, to:1.2 }, // door to corridor north
      ]
    });
    addCeilingLight(0, 5, 4.2);
    addCeilingLight(-4, -4, 4.2);
    addCeilingLight(4, 8, 4.2, 0xe8c468, 0.6);
    addTrimLight(-6.9, 1.2, 0, 0.1, 6, MAT.signalLamp);
    addTrimLight(6.9, 1.2, 0, 0.1, 6, MAT.signalLamp);

    // props: crates, shuttle hull silhouette
    addCrate(-4, 6, 0.4, 1);
    addCrate(-3.2, 6, 0.4, 1);
    addCrate(-4, 7.2, 0.4, 1.2);
    addCrate(5, -3, 0.4, 1.3);
    addCrate(5.8, -3.8, 0.4, 1);
    addPipe(-6.8, 3, 2, 8, 'z', 0.1);
    addPipe(6.8, 3, -2, 6, 'z', 0.1);

    // mold creeping in from one corner — first sign of infestation
    addMoldFloorCreep(5, -7, 2.2);
    addMoldPatch(6.5, 0.4, -8, 1.4);
    addMoldPatch(6.8, 1.2, -7, 1.0, 'x');
    addSporeZone(5.5, -7.5, 3);

    // first moldling — slow, easy
    M.spawnMonster(5, -6, 'drifter', [{x:5,z:-6},{x:3,z:-8},{x:6,z:-9}]);

    // key pickup, locked door north leads to corridor
    addPickup(-5, -8, 'key', { keyId:'hangarKey', promptText:'забрать ключ-карту ангара' });
    addPickup(2, 4, 'ammo', { amount: 12 });

    const northDoor = addDoor(0, -10, 1.6, 'x', { locked:true, requiresKey:'hangarKey' });

    // corridor segment beyond door, leads to exit trigger of level 1
    buildRoomShell(0, -12.5, 3.2, 5, 3.4, {
      gaps:[ { wall:'n', from:-1.2, to:1.2 }, { wall:'s', from:-1.2, to:1.2 } ]
    });
    addCeilingLight(0, -12.5, 3.4, 0xbfd4e0, 0.5);
    addExitZone(0, -13.9, 2.4, 1.6);

    setObjective('Найдите ключ-карту ангара и пройдите на север');
  }
});

// ---------------------------------------------------------------
// LEVEL 2 — CREW QUARTERS (corridors + rooms, first locked terminal)
// ---------------------------------------------------------------
LEVELS.push({
  name: 'ОТСЕК 2 / 6 — ЖИЛОЙ БЛОК',
  spawn: { x: 0, z: 6, yaw: Math.PI },
  build(){
    // entry hall
    buildRoomShell(0, 5, 4, 4, 3.6, { gaps:[ {wall:'s', from:-1.2, to:1.2}, {wall:'n', from:-1, to:1} ] });
    addCeilingLight(0, 5, 3.6);

    // central corridor running north
    buildRoomShell(0, -2, 3, 10, 3.4, { gaps:[ {wall:'s', from:-1,to:1}, {wall:'n', from:-1,to:1}, {wall:'e', from:-1,to:1}, {wall:'w', from:-1,to:1} ] });
    addCeilingLight(0, -2, 3.4, 0xbfd4e0, 0.5);
    addCeilingLight(0, -5, 3.4, 0xbfd4e0, 0.5);
    addPipe(1.4, 3.0, -2, 10, 'z', 0.07);

    // west room — sleeping quarters with mold overrun
    buildRoomShell(-4.5, -2, 6, 6, 3.4, { gaps:[ {wall:'e', from:-1, to:1} ] });
    addCeilingLight(-4.5, -2, 3.4, 0x9aa893, 0.5);
    addCrate(-6.5, -4, 0.4, 1);
    addCrate(-6.5, 0, 0.4, 1);
    addMoldFloorCreep(-5, -1, 3);
    addMoldPatch(-7, 0.6, -2, 1.6, 'x');
    addMoldPatch(-7, 1.4, 0, 1.1, 'x');
    addSporeZone(-5, -1, 3.5);
    addPickup(-3.5, -4.5, 'health', { amount: 25 });

    // east room — washroom, contains key
    buildRoomShell(4.5, -2, 6, 6, 3.4, { gaps:[ {wall:'w', from:-1, to:1} ] });
    addCeilingLight(4.5, -2, 3.4);
    addCrate(6.5, 0, 0.4, 0.9);
    addPickup(6, -3.5, 'key', { keyId:'crewKey', promptText:'забрать ключ-карту жилого блока' });
    addPickup(3.5, 0.5, 'ammo', { amount: 10 });

    // monsters: two drifters patrolling corridor + sleeping quarters
    M.spawnMonster(0, -4, 'drifter', [{x:0,z:-4},{x:0,z:1},{x:0,z:-6}]);
    M.spawnMonster(-5, -1, 'drifter', [{x:-5,z:-1},{x:-6.5,z:-3},{x:-3.5,z:0}]);

    // north room — locked terminal room, requires crewKey, leads to exit
    buildRoomShell(0, -9.5, 5, 5, 3.4, { gaps:[ {wall:'s', from:-1,to:1}, {wall:'n', from:-1.2,to:1.2} ] });
    addCeilingLight(0, -9.5, 3.4, 0xe8c468, 0.6);
    const lockedDoor = addDoor(0, -7, 1.6, 'x', { locked:true, requiresKey:'crewKey' });
    addTerminal(1.6, -11.5, Math.PI, {
      promptText: 'активировать аварийный шлюз',
      onUse(){
        M.showToast('Аварийный шлюз активирован');
        setObjective('Пройдите через открытый шлюз на восток');
      }
    });

    addExitZone(0, -10.6, 3, 1.2);

    setObjective('Соберите ключ-карту жилого блока и активируйте шлюз');
  }
});

// ---------------------------------------------------------------
// LEVEL 3 — INFIRMARY (medbay overrun, two-key puzzle)
// ---------------------------------------------------------------
LEVELS.push({
  name: 'ОТСЕК 3 / 6 — ЛАЗАРЕТ',
  spawn: { x: 0, z: 6.5, yaw: Math.PI },
  build(){
    buildRoomShell(0, 5, 5, 5, 3.6, { gaps:[ {wall:'s',from:-1.2,to:1.2}, {wall:'n',from:-1.2,to:1.2} ] });
    addCeilingLight(0, 5, 3.6);
    addMoldFloorCreep(2, 6.5, 1.8);

    // main ward - heavily infected
    buildRoomShell(0, -2, 12, 9, 3.8, {
      gaps:[ {wall:'s',from:-1.2,to:1.2}, {wall:'w',from:-1.2,to:1.2}, {wall:'e',from:-1.2,to:1.2}, {wall:'n',from:-1.2,to:1.2} ]
    });
    addCeilingLight(-4, -2, 3.8, 0x9aa893, 0.4);
    addCeilingLight(4, -2, 3.8, 0x9aa893, 0.4);
    addMoldFloorCreep(-3, -3, 3.5);
    addMoldFloorCreep(4, -1, 3);
    addMoldPatch(-5.8, 1, -3, 1.8, 'x');
    addMoldPatch(5.8, 1.2, 0, 1.6, 'x');
    addMoldPatch(0, 1.4, -6.3, 1.5, 'z');
    addSporeZone(-3, -3, 4);
    addSporeZone(3, -1, 3.5);
    addCrate(-5, -5, 0.4, 1);
    addCrate(5, -5, 0.4, 1);
    addPipe(0, 3.4, -6.8, 11, 'x', 0.08);

    M.spawnMonster(-3, -3, 'bloat', [{x:-3,z:-3},{x:-4,z:-5},{x:-2,z:-1}]);
    M.spawnMonster(3, -1, 'drifter', [{x:3,z:-1},{x:4,z:-4},{x:2,z:1}]);
    M.spawnMonster(0, -6, 'sprinter', [{x:0,z:-6},{x:-2,z:-6},{x:2,z:-6}]);

    // west wing - pharmacy, has medKey
    buildRoomShell(-8, -2, 4, 5, 3.4, { gaps:[ {wall:'e',from:-1,to:1} ] });
    addCeilingLight(-8, -2, 3.4);
    addPickup(-9, -3, 'key', { keyId:'medKey', promptText:'забрать ключ-карту лазарета' });
    addPickup(-8, 0, 'health', { amount: 30 });

    // east wing - storage, has ammo + 2nd half needed for terminal
    buildRoomShell(8, -2, 4, 5, 3.4, { gaps:[ {wall:'w',from:-1,to:1} ] });
    addCeilingLight(8, -2, 3.4);
    addPickup(8.5, -3.5, 'ammo', { amount: 16 });
    addCrate(9, 0, 0.4, 1);

    // north — quarantine door + terminal requiring medKey, leads to exit
    buildRoomShell(0, -9, 5, 5, 3.4, { gaps:[ {wall:'s',from:-1.2,to:1.2}, {wall:'n',from:-1.2,to:1.2} ] });
    addCeilingLight(0, -9, 3.4, 0xc9492f, 0.4);
    addDoor(0, -6.5, 1.6, 'x', { locked:true, requiresKey:'medKey' });
    addTerminal(1.6, -11, Math.PI, {
      promptText:'отключить карантинный протокол',
      onUse(){
        M.showToast('Карантинный протокол отключен');
        setObjective('Пройдите на север к машинному отделению');
      }
    });
    addExitZone(0, -10, 3, 1.2);

    setObjective('Найдите ключ-карту лазарета, минуя заражённую палату');
  }
});

// ---------------------------------------------------------------
// LEVEL 4 — ENGINE ROOM (largest level, code puzzle across rooms)
// ---------------------------------------------------------------
LEVELS.push({
  name: 'ОТСЕК 4 / 6 — МАШИННОЕ ОТДЕЛЕНИЕ',
  spawn: { x: 0, z: 8.5, yaw: Math.PI },
  build(){
    buildRoomShell(0, 7, 5, 5, 4, { gaps:[ {wall:'s',from:-1.2,to:1.2}, {wall:'n',from:-1.2,to:1.2} ] });
    addCeilingLight(0, 7, 4);

    // huge reactor hall - central
    buildRoomShell(0, -1, 16, 11, 5.2, {
      gaps:[ {wall:'s',from:-1.2,to:1.2}, {wall:'n',from:-1.2,to:1.2}, {wall:'w',from:-1.2,to:1.2}, {wall:'e',from:-1.2,to:1.2} ]
    });
    // reactor core (big glowing cylinder, decorative + collider)
    const core = new THREE_.Mesh(new THREE_.CylinderGeometry(1.6, 1.6, 4.5, 14), MAT.steelTrim);
    core.position.set(0, 2.25, -1);
    world.group.add(core);
    M.addCollider(0, -1, 3.4, 3.4, 0, 5);
    const coreGlow = new THREE_.Mesh(new THREE_.CylinderGeometry(1.0,1.0,4.6,14), MAT.sporeGlow);
    coreGlow.position.set(0,2.25,-1);
    world.group.add(coreGlow);
    const coreLight = new THREE_.PointLight(0xa8e063, 1.2, 14, 2);
    coreLight.position.set(0,2.5,-1);
    world.group.add(coreLight);

    addCeilingLight(-6, -1, 5.2, 0xbfd4e0, 0.5);
    addCeilingLight(6, -1, 5.2, 0xbfd4e0, 0.5);
    addCeilingLight(-6, 4, 5.2, 0xbfd4e0, 0.4);
    addCeilingLight(6, 4, 5.2, 0xbfd4e0, 0.4);

    addMoldFloorCreep(-6, 3, 3);
    addMoldFloorCreep(6, -4, 3.4);
    addMoldPatch(-7.8, 1.2, 3, 1.8, 'x');
    addMoldPatch(7.8, 1.4, -4, 1.8, 'x');
    addPipe(-7.9, 3.4, 0, 10, 'z', 0.1);
    addPipe(7.9, 3.4, 0, 10, 'z', 0.1);
    addCrate(-5, 5, 0.4, 1);
    addCrate(5, -5.5, 0.4, 1.2);
    addCrate(5.8, -5.5, 0.4, 1);

    addSporeZone(-6, 3, 3.5);
    addSporeZone(6, -4, 3.8);

    M.spawnMonster(-6, 3, 'bloat', [{x:-6,z:3},{x:-7,z:5},{x:-5,z:1}]);
    M.spawnMonster(6, -4, 'bloat', [{x:6,z:-4},{x:7,z:-5},{x:5,z:-2}]);
    M.spawnMonster(0, -1, 'sprinter', [{x:0,z:-1},{x:3,z:2},{x:-3,z:-3},{x:3,z:-3}]);
    M.spawnMonster(-3, 4, 'drifter', [{x:-3,z:4},{x:-1,z:5}]);

    addPickup(0, 5.5, 'ammo', { amount: 16 });

    // west control room - first half of engineering code
    buildRoomShell(-10.5, -1, 5, 6, 3.4, { gaps:[ {wall:'e', from:-1.2,to:1.2} ] });
    addCeilingLight(-10.5, -1, 3.4);
    addTerminal(-10.5, -2.5, 0, {
      promptText:'считать журнал доступа (часть 1)',
      onUse(){
        STATE.flags.codePart1 = true;
        M.showToast('Получена часть кода: 4 7 ...');
        checkEngineCode();
      }
    });
    addPickup(-12, 1, 'health', { amount: 25 });

    // east control room - second half of code
    buildRoomShell(10.5, -1, 5, 6, 3.4, { gaps:[ {wall:'w', from:-1.2,to:1.2} ] });
    addCeilingLight(10.5, -1, 3.4);
    addTerminal(10.5, -2.5, Math.PI, {
      promptText:'считать журнал доступа (часть 2)',
      onUse(){
        STATE.flags.codePart2 = true;
        M.showToast('Получена часть кода: ... 2 9');
        checkEngineCode();
      }
    });
    addPickup(12, 1, 'ammo', { amount: 14 });

    function checkEngineCode(){
      if(STATE.flags.codePart1 && STATE.flags.codePart2){
        STATE.player.keys.engineKey = true;
        M.showToast('Код инженерного доступа собран: 4729');
        setObjective('Код получен — пройдите на север к мостику');
        if(world.__engineDoor) M.openDoor(world.__engineDoor);
      }
    }

    // north exit corridor - locked by engineKey (collected from both terminals)
    buildRoomShell(0, -9, 4, 5, 3.4, { gaps:[ {wall:'s',from:-1.2,to:1.2}, {wall:'n',from:-1.2,to:1.2} ] });
    addCeilingLight(0, -9, 3.4, 0xe8c468, 0.5);
    const engineDoor = addDoor(0, -6.5, 1.6, 'x', { locked:true, requiresKey:'engineKey' });
    world.__engineDoor = engineDoor;
    addExitZone(0, -10.6, 3, 1.2);

    setObjective('Соберите обе части кода доступа в боковых отсеках');
  }
});

// ---------------------------------------------------------------
// LEVEL 5 — BRIDGE (vertical-feeling, sniping moldlings, final key)
// ---------------------------------------------------------------
LEVELS.push({
  name: 'ОТСЕК 5 / 6 — МОСТИК',
  spawn: { x: 0, z: 7, yaw: Math.PI },
  build(){
    buildRoomShell(0, 5.5, 5, 5, 3.8, { gaps:[ {wall:'s',from:-1.2,to:1.2}, {wall:'n',from:-1.2,to:1.2} ] });
    addCeilingLight(0, 5.5, 3.8);

    // command bridge - wide room with viewport "glass"
    buildRoomShell(0, -2, 14, 10, 4.4, {
      gaps:[ {wall:'s',from:-1.2,to:1.2}, {wall:'w',from:-1.2,to:1.2}, {wall:'e',from:-1.2,to:1.2} ]
    });
    addCeilingLight(-4,-2,4.4); addCeilingLight(4,-2,4.4, 0xbfd4e0,0.5);

    // big viewport window showing stars
    const viewport = new THREE_.Mesh(new THREE_.PlaneGeometry(10, 2.4), MAT.glassPanel);
    viewport.position.set(0, 2.6, -6.85);
    world.group.add(viewport);
    // simple starfield behind viewport
    const starGeo = new THREE_.BufferGeometry();
    const starCount = 220;
    const starPos = new Float32Array(starCount*3);
    for(let i=0;i<starCount;i++){
      starPos[i*3] = (Math.random()-0.5)*30;
      starPos[i*3+1] = 1 + Math.random()*8;
      starPos[i*3+2] = -10 - Math.random()*20;
    }
    starGeo.setAttribute('position', new THREE_.BufferAttribute(starPos,3));
    const stars = new THREE_.Points(starGeo, new THREE_.PointsMaterial({color:0xffffff, size:0.06}));
    world.group.add(stars);

    // captain's console row (props)
    for(let i=-2;i<=2;i++){
      const c = new THREE_.Mesh(new THREE_.BoxGeometry(0.9,0.9,0.5), MAT.terminal);
      c.position.set(i*1.6, 0.45, -4.5);
      world.group.add(c);
      M.addCollider(i*1.6, -4.5, 0.9, 0.5, 0, 0.9);
      const scr = new THREE_.Mesh(new THREE_.BoxGeometry(0.7,0.3,0.05), MAT.terminalScreen);
      scr.position.set(i*1.6, 0.85, -4.23);
      world.group.add(scr);
    }

    addMoldFloorCreep(-5, 1, 3);
    addMoldFloorCreep(5, 2, 2.6);
    addMoldPatch(-6.8, 1.3, 1, 1.6, 'x');
    addMoldPatch(6.8, 1.4, 2, 1.4, 'x');
    addSporeZone(-5, 1, 3.2);

    M.spawnMonster(-4, 1, 'sprinter', [{x:-4,z:1},{x:-5,z:3},{x:-3,z:-2}]);
    M.spawnMonster(4, 2, 'sprinter', [{x:4,z:2},{x:5,z:3},{x:3,z:-2}]);
    M.spawnMonster(0, -3, 'bloat', [{x:0,z:-3},{x:-2,z:-4},{x:2,z:-4}]);

    addPickup(-6, -4, 'ammo', { amount: 16 });
    addPickup(6, -4, 'health', { amount: 30 });

    // captain's ready room - east, holds bridge key
    buildRoomShell(9, -2, 4, 5, 3.4, { gaps:[ {wall:'w', from:-1.2,to:1.2} ] });
    addCeilingLight(9,-2,3.4);
    addPickup(9.5, -3, 'key', { keyId:'bridgeKey', promptText:'забрать командный ключ-карту' });
    addCrate(10.5, -1, 0.4, 1);

    // west — armory, more ammo
    buildRoomShell(-9, -2, 4, 5, 3.4, { gaps:[ {wall:'e', from:-1.2,to:1.2} ] });
    addCeilingLight(-9,-2,3.4);
    addPickup(-9.5, -3, 'ammo', { amount: 20 });

    // north — locked exit toward docking bay
    buildRoomShell(0, -9.5, 5, 5, 3.4, { gaps:[ {wall:'s',from:-1.2,to:1.2}, {wall:'n',from:-1.2,to:1.2} ] });
    addCeilingLight(0,-9.5,3.4, 0xe8c468, 0.5);
    addDoor(0, -7, 1.6, 'x', { locked:true, requiresKey:'bridgeKey' });
    addTerminal(1.6, -11.5, Math.PI, {
      promptText:'открыть стыковочный отсек',
      onUse(){
        M.showToast('Стыковочный отсек открыт');
        setObjective('Пройдите на север к спасательным капсулам');
      }
    });
    addExitZone(0, -10.6, 3, 1.2);

    setObjective('Заберите командный ключ-карту в каюте капитана');
  }
});

// ---------------------------------------------------------------
// LEVEL 6 — DOCKING BAY (final gauntlet + escape capsule)
// ---------------------------------------------------------------
LEVELS.push({
  name: 'ОТСЕК 6 / 6 — СТЫКОВОЧНЫЙ ОТСЕК',
  spawn: { x: 0, z: 7.5, yaw: Math.PI },
  build(){
    buildRoomShell(0, 6, 5, 5, 3.8, { gaps:[ {wall:'s',from:-1.2,to:1.2}, {wall:'n',from:-1.2,to:1.2} ] });
    addCeilingLight(0,6,3.8);

    // large docking hall, heavily infested — final stand
    buildRoomShell(0, -3, 16, 14, 5, {
      gaps:[ {wall:'s',from:-1.2,to:1.2}, {wall:'n',from:-1.4,to:1.4} ]
    });
    addCeilingLight(-5,-1,5,0x9aa893,0.4);
    addCeilingLight(5,-1,5,0x9aa893,0.4);
    addCeilingLight(-5,-6,5,0x9aa893,0.4);
    addCeilingLight(5,-6,5,0x9aa893,0.4);

    // heavy mold everywhere - this is the worst part of the ship
    addMoldFloorCreep(-5,-1,4);
    addMoldFloorCreep(5,-1,4);
    addMoldFloorCreep(0,-7,4.5);
    addMoldPatch(-7.8,1.5,-1,2,'x');
    addMoldPatch(7.8,1.6,-1,2,'x');
    addMoldPatch(0,1.7,-9.8,2,'z');
    addMoldPatch(-4,1.2,-9.8,1.4,'z');
    addMoldPatch(4,1.3,-9.8,1.4,'z');
    addSporeZone(-5,-1,4.5);
    addSporeZone(5,-1,4.5);
    addSporeZone(0,-7,5);

    addCrate(-6,3,0.4,1);
    addCrate(6,3,0.4,1.1);
    addPipe(-7.9,3.6,-2,12,'z',0.1);
    addPipe(7.9,3.6,-2,12,'z',0.1);

    // final gauntlet of monsters
    M.spawnMonster(-5,-1,'bloat',[{x:-5,z:-1},{x:-6,z:-4},{x:-3,z:2}]);
    M.spawnMonster(5,-1,'bloat',[{x:5,z:-1},{x:6,z:-4},{x:3,z:2}]);
    M.spawnMonster(0,-7,'bloat',[{x:0,z:-7},{x:-2,z:-9},{x:2,z:-9}]);
    M.spawnMonster(-3,-5,'sprinter',[{x:-3,z:-5},{x:0,z:-3},{x:-4,z:-8}]);
    M.spawnMonster(3,-5,'sprinter',[{x:3,z:-5},{x:0,z:-3},{x:4,z:-8}]);

    addPickup(-2, 1, 'ammo', { amount: 24 });
    addPickup(2, 1, 'health', { amount: 35 });
    addPickup(0, -9.5, 'ammo', { amount: 20 });

    // capsule chamber - north end, the actual escape
    buildRoomShell(0, -13, 7, 6, 3.6, { gaps:[ {wall:'s', from:-1.4, to:1.4} ] });
    addCeilingLight(0,-13,3.6,0xe8c468,0.7);

    // escape pod - visual centerpiece
    const podGroup = new THREE_.Group();
    const podBody = new THREE_.Mesh(new THREE_.CapsuleGeometry ? new THREE_.CapsuleGeometry(1.1, 2.0, 4, 10) : new THREE_.CylinderGeometry(1.1,1.1,3,10), MAT.podShell);
    podBody.rotation.z = Math.PI/2;
    podBody.position.set(0, 1.1, -14.5);
    podGroup.add(podBody);
    const podGlow = new THREE_.Mesh(new THREE_.RingGeometry(1.0,1.3,16), MAT.sporeGlow);
    podGlow.position.set(1.6, 1.1, -14.5);
    podGlow.rotation.y = Math.PI/2;
    podGroup.add(podGlow);
    world.group.add(podGroup);
    const podLight = new THREE_.PointLight(0xe8c468, 1.4, 7, 2);
    podLight.position.set(0,1.6,-14);
    world.group.add(podLight);

    addExitZone(0, -14.5, 3, 2);

    setObjective('Доберитесь до спасательной капсулы — последний рывок!');
  }
});

M.LEVELS = LEVELS;

})();
