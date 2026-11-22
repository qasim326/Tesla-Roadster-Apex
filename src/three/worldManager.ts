import * as THREE from 'three';
import { THRUSTER_THEMES, ThrusterColorKey, WeatherCondition } from '../types/game';
import { ProceduralTextures } from './textures';

export const ROAD_HALF_WIDTH = 8.2;
export const CAR_HALF_WIDTH = 1.02;
export const LANE_X = [-5.2, -1.75, 1.75, 5.2];
const SEGMENT_LENGTH = 32;
const SEGMENT_COUNT = 14; // Covers z from +64 to -384

export type CollapseSide = 'none' | 'left' | 'right';

export interface RoadSegment {
  group: THREE.Group;
  leftDeckGroup: THREE.Group;
  rightDeckGroup: THREE.Group;
  leftBrokenGroup: THREE.Group;
  rightBrokenGroup: THREE.Group;
  leftWarnBar: THREE.Mesh;
  rightWarnBar: THREE.Mesh;
  gantryGroup: THREE.Group;
  zCenter: number;
  collapseSide: CollapseSide;
  lavaClearedAwarded: boolean;
}

export interface ObstacleEntity {
  id: number;
  kind: 'barrier' | 'sedan' | 'suv' | 'truck' | 'pad';
  mesh: THREE.Group;
  x: number;
  z: number;
  width: number;
  height: number;
  length: number;
  forwardSpeedMps: number;
  active: boolean;
  resolved: boolean;
  nearMissAwarded: boolean;
}

interface ParticleItem {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  isCore: boolean;
  isSpark: boolean;
  isLava: boolean;
}

export interface WorldManager {
  group: THREE.Group;
  segments: RoadSegment[];
  obstacles: ObstacleEntity[];
  resetForShowroom: () => void;
  resetForPlay: () => void;
  updateLobbyCruise: (dt: number, cruiseSpeedMps: number) => void;
  updateWorld: (
    dt: number,
    playerSpeedMps: number,
    distanceM: number,
    playing: boolean,
  ) => void;
  getGroundStateAt: (xPos: number, zPos: number) => 'solid' | 'lava';
  getPassedLavaSegment: (zPos: number) => RoadSegment | null;
  spawnThrusterParticles: (
    carX: number,
    carY: number,
    carZ: number,
    pitch: number,
    intensity: number,
    thrusterKey: ThrusterColorKey,
    dt: number,
  ) => void;
  spawnImpactSparks: (x: number, y: number, z: number) => void;
  spawnLavaSplash: (x: number, y: number, z: number) => void;
  spawnTireSpray: (carX: number, speedMps: number, dt: number) => void;
  updateWeatherVisuals: (
    weather: WeatherCondition,
    speedMps: number,
    dt: number,
  ) => void;
  updateParticles: (
    dt: number,
    worldScrollSpeedMps: number,
    thrusterKey: ThrusterColorKey,
  ) => void;
  dispose: () => void;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _sparkStartColor = new THREE.Color(0xfbbf24);
const _sparkEndColor = new THREE.Color(0xef4444);
const _lavaCoreColor = new THREE.Color(0xfef08a);
const _lavaEdgeColor = new THREE.Color(0xf97316);

function sliceHalfDeckUVs(geo: THREE.BoxGeometry, side: 'left' | 'right'): THREE.BoxGeometry {
  const uvAttr = geo.attributes.uv;
  const uMin = side === 'left' ? 0 : 0.5;
  for (let i = 0; i < uvAttr.count; i++) {
    const u = uvAttr.getX(i);
    uvAttr.setX(i, uMin + u * 0.5);
  }
  uvAttr.needsUpdate = true;
  return geo;
}

export function createWorldManager(textures: ProceduralTextures): WorldManager {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  // Shared Road & Viaduct Materials
  const roadMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.roadAlbedo,
      roughnessMap: textures.roadRoughness,
      roughness: 0.3,
      metalness: 0.25,
      envMapIntensity: 1.2,
    }),
  );

  const curbMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x151a24,
      roughness: 0.55,
      metalness: 0.35,
    }),
  );

  const pierMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0c1018,
      roughness: 0.78,
      metalness: 0.2,
    }),
  );

  const charredConcreteMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e1818,
      roughness: 0.85,
      metalness: 0.15,
      emissive: 0x450a0a,
      emissiveIntensity: 0.35,
    }),
  );

  const lavaMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.lavaTexture,
      emissiveMap: textures.lavaTexture,
      emissive: new THREE.Color(0xff4500),
      emissiveIntensity: 2.4,
      roughness: 0.4,
      metalness: 0.05,
    }),
  );

  const lavaRimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfb923c,
      emissive: 0xf97316,
      emissiveIntensity: 2.5,
      roughness: 0.3,
    }),
  );

  const amberGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    }),
  );

  const cyanGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: 0x06b6d4,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    }),
  );

  const gantrySteelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1a202c,
      roughness: 0.45,
      metalness: 0.65,
    }),
  );

  const gantryWarmLightMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xfde68a }),
  );
  const gantryCoolLightMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xbae6fd }),
  );

  // Split Half-Deck Geometries (each 8.2m wide so left + right form seamless 16.4m highway)
  const leftDeckGeo = trackGeo(
    sliceHalfDeckUVs(new THREE.BoxGeometry(8.2, 0.8, SEGMENT_LENGTH), 'left'),
  );
  const rightDeckGeo = trackGeo(
    sliceHalfDeckUVs(new THREE.BoxGeometry(8.2, 0.8, SEGMENT_LENGTH), 'right'),
  );
  const curbGeo = trackGeo(new THREE.BoxGeometry(0.65, 0.95, SEGMENT_LENGTH));
  const railGlowGeo = trackGeo(new THREE.BoxGeometry(0.14, 0.14, SEGMENT_LENGTH));
  const pierGeo = trackGeo(new THREE.BoxGeometry(3.2, 24, 2.8));

  const halfWarnGeo = trackGeo(new THREE.BoxGeometry(8.0, 0.07, 1.1));
  const gapEdgeMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.hazardStripe,
      emissive: 0xf97316,
      emissiveIntensity: 0.95,
      roughness: 0.35,
    }),
  );

  // Broken Road Slabs & Lava Pit Geometries (visible when one side crumbles into lava)
  const brokenSlopeGeo = trackGeo(new THREE.BoxGeometry(8.0, 0.65, 9.5));
  const brokenChunkGeo = trackGeo(new THREE.BoxGeometry(3.2, 0.55, 5.2));
  const fractureEdgeGeo = trackGeo(new THREE.BoxGeometry(0.28, 0.72, SEGMENT_LENGTH));
  const lavaPoolGeo = trackGeo(new THREE.PlaneGeometry(8.5, SEGMENT_LENGTH));
  lavaPoolGeo.rotateX(-Math.PI / 2);

  // Deep continuous molten lava river flowing far beneath the viaduct
  const deepLavaGeo = trackGeo(new THREE.PlaneGeometry(68, 460));
  deepLavaGeo.rotateX(-Math.PI / 2);
  const deepLavaFloor = new THREE.Mesh(deepLavaGeo, lavaMat);
  deepLavaFloor.position.set(0, -14.5, -160);
  group.add(deepLavaFloor);

  const gantryPillarGeo = trackGeo(new THREE.BoxGeometry(0.45, 7.6, 0.45));
  const gantryBeamGeo = trackGeo(new THREE.BoxGeometry(18.6, 0.45, 0.55));
  const gantryLedGeo = trackGeo(new THREE.BoxGeometry(8.1, 0.12, 0.22));

  function buildBrokenSideGroup(side: 'left' | 'right'): THREE.Group {
    const g = new THREE.Group();
    const xCenter = side === 'left' ? -4.1 : 4.1;
    const xSign = side === 'left' ? -1 : 1;

    // 1. Glowing Molten Lava Pit right below the collapsed road section
    const lavaPool = new THREE.Mesh(lavaPoolGeo, lavaMat);
    lavaPool.position.set(xCenter, -1.95, 0);
    g.add(lavaPool);

    // 2. Jagged glowing fracture wall along the center divider (x = 0)
    const centerFracture = new THREE.Mesh(fractureEdgeGeo, charredConcreteMat);
    centerFracture.position.set(0, -0.35, 0);
    g.add(centerFracture);

    const centerGlow = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.14, 0.18, SEGMENT_LENGTH)),
      lavaRimMat,
    );
    centerGlow.position.set(xSign * 0.1, -0.02, 0);
    g.add(centerGlow);

    // 3. Broken asphalt slab sloping down from approach edge (+Z) into the lava pit
    const entrySlope = new THREE.Mesh(brokenSlopeGeo, charredConcreteMat);
    entrySlope.position.set(xCenter, -1.15, SEGMENT_LENGTH * 0.5 - 4.4);
    entrySlope.rotation.x = -0.28; // Slopes down toward -Z (forward into lava!)
    entrySlope.rotation.z = xSign * -0.08;
    g.add(entrySlope);

    // 4. Broken exit ramp chunk rising out of the lava at the far edge (-Z)
    const exitChunk = new THREE.Mesh(brokenSlopeGeo, charredConcreteMat);
    exitChunk.position.set(xCenter, -1.15, -SEGMENT_LENGTH * 0.5 + 4.4);
    exitChunk.rotation.x = 0.28;
    exitChunk.rotation.z = xSign * 0.06;
    g.add(exitChunk);

    // 5. Half-submerged volcanic debris slabs inside the lava pit
    const debris1 = new THREE.Mesh(brokenChunkGeo, charredConcreteMat);
    debris1.position.set(xCenter - xSign * 1.4, -1.8, 1.5);
    debris1.rotation.set(0.18, 0.35, -0.22);
    g.add(debris1);

    const debris2 = new THREE.Mesh(brokenChunkGeo, charredConcreteMat);
    debris2.position.set(xCenter + xSign * 1.5, -1.85, -3.5);
    debris2.rotation.set(-0.22, -0.4, 0.19);
    g.add(debris2);

    // 6. Broken outer curb rail stubs + warm lava glow light
    const outerRailGlow = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.25, 0.25, SEGMENT_LENGTH)),
      lavaRimMat,
    );
    outerRailGlow.position.set(xSign * 8.2, -1.75, 0);
    g.add(outerRailGlow);

    g.visible = false;
    return g;
  }

  // 1. Build Modular Split-Deck Road Segments
  const segments: RoadSegment[] = [];
  for (let i = 0; i < SEGMENT_COUNT; i++) {
    const segGroup = new THREE.Group();
    const leftDeckGroup = new THREE.Group();
    const rightDeckGroup = new THREE.Group();
    const gantryGroup = new THREE.Group();

    // Left Half Deck (-8.2 .. 0)
    const lDeck = new THREE.Mesh(leftDeckGeo, roadMat);
    lDeck.position.set(-4.1, -0.4, 0);
    lDeck.receiveShadow = true;
    leftDeckGroup.add(lDeck);

    const lCurb = new THREE.Mesh(curbGeo, curbMat);
    lCurb.position.set(-8.5, 0.22, 0);
    lCurb.receiveShadow = true;
    leftDeckGroup.add(lCurb);

    const lRail = new THREE.Mesh(railGlowGeo, amberGlowMat);
    lRail.position.set(-8.15, 0.62, 0);
    leftDeckGroup.add(lRail);

    const lPier = new THREE.Mesh(pierGeo, pierMat);
    lPier.position.set(-3.6, -12.6, 0);
    leftDeckGroup.add(lPier);

    // Right Half Deck (0 .. +8.2)
    const rDeck = new THREE.Mesh(rightDeckGeo, roadMat);
    rDeck.position.set(4.1, -0.4, 0);
    rDeck.receiveShadow = true;
    rightDeckGroup.add(rDeck);

    const rCurb = new THREE.Mesh(curbGeo, curbMat);
    rCurb.position.set(8.5, 0.22, 0);
    rCurb.receiveShadow = true;
    rightDeckGroup.add(rCurb);

    const rRail = new THREE.Mesh(railGlowGeo, cyanGlowMat);
    rRail.position.set(8.15, 0.62, 0);
    rightDeckGroup.add(rRail);

    const rPier = new THREE.Mesh(pierGeo, pierMat);
    rPier.position.set(3.6, -12.6, 0);
    rightDeckGroup.add(rPier);

    // Broken Lava Collapse Sides
    const leftBrokenGroup = buildBrokenSideGroup('left');
    const rightBrokenGroup = buildBrokenSideGroup('right');

    // Approach Warning Bars (sit on the preceding intact segment's -Z edge)
    const leftWarnBar = new THREE.Mesh(halfWarnGeo, gapEdgeMat);
    leftWarnBar.position.set(-4.1, 0.04, -SEGMENT_LENGTH / 2 + 0.6);
    leftWarnBar.visible = false;

    const rightWarnBar = new THREE.Mesh(halfWarnGeo, gapEdgeMat);
    rightWarnBar.position.set(4.1, 0.04, -SEGMENT_LENGTH / 2 + 0.6);
    rightWarnBar.visible = false;

    // Overhead Gantry
    for (const side of [-1, 1]) {
      const gp = new THREE.Mesh(gantryPillarGeo, gantrySteelMat);
      gp.position.set(side * 9.05, 3.8, 0);
      gantryGroup.add(gp);
    }
    const gBeam = new THREE.Mesh(gantryBeamGeo, gantrySteelMat);
    gBeam.position.set(0, 7.6, 0);
    gantryGroup.add(gBeam);

    const gLedL = new THREE.Mesh(gantryLedGeo, gantryWarmLightMat);
    gLedL.position.set(-4.3, 7.33, 0);
    gantryGroup.add(gLedL);

    const gLedR = new THREE.Mesh(gantryLedGeo, gantryCoolLightMat);
    gLedR.position.set(4.3, 7.33, 0);
    gantryGroup.add(gLedR);

    gantryGroup.visible = i % 2 === 0;

    segGroup.add(leftDeckGroup);
    segGroup.add(rightDeckGroup);
    segGroup.add(leftBrokenGroup);
    segGroup.add(rightBrokenGroup);
    segGroup.add(leftWarnBar);
    segGroup.add(rightWarnBar);
    segGroup.add(gantryGroup);
    group.add(segGroup);

    const zCenter = 48 - i * SEGMENT_LENGTH;
    segGroup.position.z = zCenter;

    segments.push({
      group: segGroup,
      leftDeckGroup,
      rightDeckGroup,
      leftBrokenGroup,
      rightBrokenGroup,
      leftWarnBar,
      rightWarnBar,
      gantryGroup,
      zCenter,
      collapseSide: 'none',
      lavaClearedAwarded: false,
    });
  }

  // 2. City Skyline Monoliths + Unique Orbital Spaceport Horizon Landmark
  interface BuildingItem {
    group: THREE.Group;
    z: number;
  }
  const buildings: BuildingItem[] = [];
  const towerMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x161b24,
      roughness: 0.72,
      metalness: 0.28,
    }),
  );
  const bldgStripGeo = trackGeo(new THREE.BoxGeometry(0.16, 1, 0.16));

  for (let i = 0; i < 38; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const bGroup = new THREE.Group();
    const w = 9 + Math.random() * 11;
    const d = 9 + Math.random() * 12;
    const h = 42 + Math.random() * 94;

    const bodyGeo = trackGeo(new THREE.BoxGeometry(w, h, d));
    const body = new THREE.Mesh(bodyGeo, towerMat);
    bGroup.add(body);

    const stripMat = side === -1 ? amberGlowMat : cyanGlowMat;
    const strip = new THREE.Mesh(bldgStripGeo, stripMat);
    strip.scale.y = h;
    strip.position.set(-side * (w * 0.5 - 0.05), 0, d * 0.5 - 0.05);
    bGroup.add(strip);

    const stripBack = new THREE.Mesh(bldgStripGeo, stripMat);
    stripBack.scale.y = h;
    stripBack.position.set(-side * (w * 0.5 - 0.05), 0, -d * 0.5 + 0.05);
    bGroup.add(stripBack);

    const xPos = side * (20 + Math.random() * 38);
    const zPos = 40 - Math.floor(i / 2) * 23 - Math.random() * 10;
    bGroup.position.set(xPos, h * 0.5 - 32, zPos);

    group.add(bGroup);
    buildings.push({ group: bGroup, z: zPos });
  }

  // Unique SpaceX Orbital Viaduct Arch & Distant Launch Spire on the Horizon
  const horizonGroup = new THREE.Group();
  const haloRingGeo = trackGeo(new THREE.TorusGeometry(68, 0.35, 10, 64, Math.PI));
  const haloRingMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.28,
    }),
  );
  const haloRing = new THREE.Mesh(haloRingGeo, haloRingMat);
  haloRing.position.set(0, 6, -310);
  horizonGroup.add(haloRing);

  const innerHaloGeo = trackGeo(new THREE.TorusGeometry(52, 0.24, 8, 56, Math.PI));
  const innerHaloMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.24,
    }),
  );
  const innerHalo = new THREE.Mesh(innerHaloGeo, innerHaloMat);
  innerHalo.position.set(0, 2, -295);
  horizonGroup.add(innerHalo);

  const spireBaseGeo = trackGeo(new THREE.BoxGeometry(6, 110, 6));
  const spire = new THREE.Mesh(spireBaseGeo, towerMat);
  spire.position.set(42, 24, -270);
  horizonGroup.add(spire);

  const rocketBodyGeo = trackGeo(new THREE.CylinderGeometry(2.2, 2.4, 62, 16));
  const rocketMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.85,
      roughness: 0.25,
    }),
  );
  const rocketMesh = new THREE.Mesh(rocketBodyGeo, rocketMat);
  rocketMesh.position.set(34, 16, -268);
  horizonGroup.add(rocketMesh);

  const beaconGeo = trackGeo(new THREE.SphereGeometry(0.9, 10, 10));
  const beaconMesh = new THREE.Mesh(beaconGeo, amberGlowMat);
  beaconMesh.position.set(42, 80, -270);
  horizonGroup.add(beaconMesh);

  group.add(horizonGroup);

  // 3. Pooled Obstacles & Highway Traffic
  const obstacles: ObstacleEntity[] = [];
  const barrierBodyMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x262d3a,
      roughness: 0.55,
      metalness: 0.35,
    }),
  );
  const barrierTopMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.75,
      roughness: 0.3,
    }),
  );

  const trafficPaintPalette = [0x2a3342, 0x475569, 0x1e293b, 0x3b232b, 0x1f3542];
  const trafficPaintMats = trafficPaintPalette.map((hex) =>
    trackMat(
      new THREE.MeshStandardMaterial({
        color: hex,
        roughness: 0.26,
        metalness: 0.72,
        envMapIntensity: 1.2,
      }),
    ),
  );

  const trafficCabinMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.1,
      metalness: 0.45,
    }),
  );
  const trafficTailMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xff2a2a,
      emissive: 0xef4444,
      emissiveIntensity: 2.5,
    }),
  );
  const trafficHeadMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffe4b5,
      emissiveIntensity: 1.6,
    }),
  );
  const trafficWheelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x11151d,
      roughness: 0.8,
      metalness: 0.15,
    }),
  );
  const padMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 2.1,
      roughness: 0.18,
      transparent: true,
      opacity: 0.92,
    }),
  );

  const bBaseGeo = trackGeo(new THREE.BoxGeometry(3.0, 0.92, 1.05));
  const bCapGeo = trackGeo(new THREE.BoxGeometry(3.04, 0.14, 1.09));
  const bStripesGeo = trackGeo(new THREE.BoxGeometry(2.8, 0.45, 1.08));

  const sedanBodyGeo = trackGeo(new THREE.BoxGeometry(1.94, 0.62, 4.2));
  const sedanCabGeo = trackGeo(new THREE.BoxGeometry(1.56, 0.48, 2.05));
  const sedanTailGeo = trackGeo(new THREE.BoxGeometry(1.78, 0.09, 0.08));
  const sedanHeadGeo = trackGeo(new THREE.BoxGeometry(1.72, 0.08, 0.08));

  const suvBodyGeo = trackGeo(new THREE.BoxGeometry(2.08, 0.78, 4.5));
  const suvCabGeo = trackGeo(new THREE.BoxGeometry(1.78, 0.64, 2.65));
  const suvTailGeo = trackGeo(new THREE.BoxGeometry(1.9, 0.11, 0.08));

  const truckCargoGeo = trackGeo(new THREE.BoxGeometry(2.26, 1.85, 5.4));
  const truckCabGeo = trackGeo(new THREE.BoxGeometry(2.16, 1.38, 1.65));
  const truckTailGeo = trackGeo(new THREE.BoxGeometry(2.08, 0.14, 0.08));

  const tWheelGeo = trackGeo(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 14));
  tWheelGeo.rotateZ(Math.PI / 2);

  const padGeo = trackGeo(new THREE.BoxGeometry(2.7, 0.06, 5.4));
  const padFrameGeo = trackGeo(new THREE.BoxGeometry(2.96, 0.04, 5.66));

  function addTrafficWheels(g: THREE.Group, halfW: number, axleZ: number) {
    for (const sx of [-halfW, halfW]) {
      for (const sz of [-axleZ, axleZ]) {
        const w = new THREE.Mesh(tWheelGeo, trafficWheelMat);
        w.position.set(sx, 0.34, sz);
        g.add(w);
      }
    }
  }

  function createObstacleMesh(kind: ObstacleEntity['kind'], paintIdx: number): THREE.Group {
    const g = new THREE.Group();
    const paintMat = trafficPaintMats[paintIdx % trafficPaintMats.length];

    if (kind === 'barrier') {
      const base = new THREE.Mesh(bBaseGeo, barrierBodyMat);
      base.position.y = 0.46;
      base.castShadow = true;
      g.add(base);

      const cap = new THREE.Mesh(bCapGeo, barrierTopMat);
      cap.position.y = 0.98;
      g.add(cap);

      const strip = new THREE.Mesh(bStripesGeo, gapEdgeMat);
      strip.position.y = 0.46;
      g.add(strip);
    } else if (kind === 'sedan') {
      const body = new THREE.Mesh(sedanBodyGeo, paintMat);
      body.position.y = 0.54;
      body.castShadow = true;
      g.add(body);

      const cab = new THREE.Mesh(sedanCabGeo, trafficCabinMat);
      cab.position.set(0, 1.04, 0.12);
      g.add(cab);

      const tail = new THREE.Mesh(sedanTailGeo, trafficTailMat);
      tail.position.set(0, 0.66, 2.11);
      g.add(tail);

      const head = new THREE.Mesh(sedanHeadGeo, trafficHeadMat);
      head.position.set(0, 0.58, -2.11);
      g.add(head);

      addTrafficWheels(g, 0.94, 1.32);
    } else if (kind === 'suv') {
      const body = new THREE.Mesh(suvBodyGeo, paintMat);
      body.position.y = 0.64;
      body.castShadow = true;
      g.add(body);

      const cab = new THREE.Mesh(suvCabGeo, trafficCabinMat);
      cab.position.set(0, 1.28, 0.2);
      g.add(cab);

      const tail = new THREE.Mesh(suvTailGeo, trafficTailMat);
      tail.position.set(0, 0.78, 2.26);
      g.add(tail);

      const head = new THREE.Mesh(sedanHeadGeo, trafficHeadMat);
      head.position.set(0, 0.66, -2.26);
      g.add(head);

      addTrafficWheels(g, 1.02, 1.44);
    } else if (kind === 'truck') {
      const cargo = new THREE.Mesh(truckCargoGeo, paintMat);
      cargo.position.set(0, 1.28, 0.45);
      cargo.castShadow = true;
      g.add(cargo);

      const cab = new THREE.Mesh(truckCabGeo, trafficCabinMat);
      cab.position.set(0, 1.04, -2.9);
      g.add(cab);

      const tail = new THREE.Mesh(truckTailGeo, trafficTailMat);
      tail.position.set(0, 0.74, 3.16);
      g.add(tail);

      addTrafficWheels(g, 1.1, 2.2);
    } else {
      const frame = new THREE.Mesh(padFrameGeo, curbMat);
      frame.position.y = 0.02;
      g.add(frame);

      const glow = new THREE.Mesh(padGeo, padMat);
      glow.position.y = 0.04;
      g.add(glow);
    }
    g.visible = false;
    group.add(g);
    return g;
  }

  const poolKinds: ObstacleEntity['kind'][] = [
    ...Array<ObstacleEntity['kind']>(10).fill('barrier'),
    ...Array<ObstacleEntity['kind']>(12).fill('sedan'),
    ...Array<ObstacleEntity['kind']>(8).fill('suv'),
    ...Array<ObstacleEntity['kind']>(5).fill('truck'),
    ...Array<ObstacleEntity['kind']>(7).fill('pad'),
  ];

  poolKinds.forEach((kind, idx) => {
    const mesh = createObstacleMesh(kind, idx);
    const dims =
      kind === 'barrier'
        ? { width: 3.0, height: 1.05, length: 1.1 }
        : kind === 'sedan'
          ? { width: 1.95, height: 1.32, length: 4.2 }
          : kind === 'suv'
            ? { width: 2.08, height: 1.62, length: 4.5 }
            : kind === 'truck'
              ? { width: 2.26, height: 2.22, length: 6.4 }
              : { width: 2.9, height: 0.2, length: 5.5 };

    const speed =
      kind === 'sedan'
        ? 36 + (idx % 3) * 4
        : kind === 'suv'
          ? 31 + (idx % 3) * 3
          : kind === 'truck'
            ? 24 + (idx % 2) * 3
            : 0;

    obstacles.push({
      id: idx,
      kind,
      mesh,
      x: 0,
      z: -500,
      ...dims,
      forwardSpeedMps: speed,
      active: false,
      resolved: false,
      nearMissAwarded: false,
    });
  });

  // 4. Instanced Cold-Gas Thruster, Spark & Molten Lava Splash Particle Pool
  const PARTICLE_CAP = 200;
  const particleGeo = trackGeo(new THREE.BoxGeometry(0.14, 0.08, 0.95));
  const particleMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const particleMesh = new THREE.InstancedMesh(particleGeo, particleMat, PARTICLE_CAP);
  particleMesh.frustumCulled = false;
  particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(particleMesh);

  const particles: ParticleItem[] = Array.from({ length: PARTICLE_CAP }, () => ({
    active: false,
    x: 0,
    y: -100,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    life: 0,
    maxLife: 0.4,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    isCore: false,
    isSpark: false,
    isLava: false,
  }));

  for (let i = 0; i < PARTICLE_CAP; i++) {
    _dummy.position.set(0, -500, 0);
    _dummy.scale.set(0, 0, 0);
    _dummy.updateMatrix();
    particleMesh.setMatrixAt(i, _dummy.matrix);
    particleMesh.setColorAt(i, _color.setHex(0xffffff));
  }
  particleMesh.instanceMatrix.needsUpdate = true;
  if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;

  // 5. Instanced 3D Rain Streak System (for dynamic rainy weather)
  const RAIN_COUNT = 420;
  const rainGeo = trackGeo(new THREE.BoxGeometry(0.024, 1.35, 0.024));
  const rainMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xa5f3fc,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const rainMesh = new THREE.InstancedMesh(rainGeo, rainMat, RAIN_COUNT);
  rainMesh.frustumCulled = false;
  rainMesh.visible = false;
  group.add(rainMesh);

  const rainDrops = Array.from({ length: RAIN_COUNT }, () => ({
    x: (Math.random() - 0.5) * 34,
    y: Math.random() * 20,
    z: 10 - Math.random() * 88,
    speed: 24 + Math.random() * 14,
  }));

  let rainOpacity = 0;
  let sprayAccum = 0;
  let nextSpawnDistanceM = 58;
  let lastWasCollapsed = false;
  let particleCursor = 0;
  let particleEmitAccum = 0;

  const applySegmentCollapseVisuals = (seg: RoadSegment, side: CollapseSide) => {
    seg.collapseSide = side;
    seg.lavaClearedAwarded = false;
    seg.leftDeckGroup.visible = side !== 'left';
    seg.rightDeckGroup.visible = side !== 'right';
    seg.leftBrokenGroup.visible = side === 'left';
    seg.rightBrokenGroup.visible = side === 'right';
    seg.gantryGroup.visible = side === 'none' && Math.random() < 0.55;
  };

  const getGroundStateAt = (xPos: number, zPos: number): 'solid' | 'lava' => {
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const half = SEGMENT_LENGTH * 0.5;
      if (zPos <= seg.zCenter + half && zPos >= seg.zCenter - half) {
        if (seg.collapseSide === 'left' && xPos < -0.25) return 'lava';
        if (seg.collapseSide === 'right' && xPos > 0.25) return 'lava';
        return 'solid';
      }
    }
    return 'solid';
  };

  const spawnSegmentContent = (seg: RoadSegment, distanceM: number) => {
    // Partial side-collapsed road into molten lava (never full-width broken gap!)
    const collapseChance = distanceM < 140 ? 0 : Math.min(0.32, 0.14 + (distanceM - 140) / 6500);
    let side: CollapseSide = 'none';
    if (!lastWasCollapsed && Math.random() < collapseChance) {
      side = Math.random() < 0.5 ? 'left' : 'right';
    }
    lastWasCollapsed = side !== 'none';
    applySegmentCollapseVisuals(seg, side);

    // Update approach warning strip on preceding segment
    const segIdx = segments.indexOf(seg);
    const prevIdx = (segIdx - 1 + segments.length) % segments.length;
    segments[prevIdx].leftWarnBar.visible =
      side === 'left' && segments[prevIdx].collapseSide !== 'left';
    segments[prevIdx].rightWarnBar.visible =
      side === 'right' && segments[prevIdx].collapseSide !== 'right';
    seg.leftWarnBar.visible = false;
    seg.rightWarnBar.visible = false;
  };

  const spawnObstacleWave = (spawnZ: number, distanceM: number) => {
    // Pick only lanes that are solid ground (never float obstacles/traffic over molten lava!)
    const solidLanes = LANE_X.filter(
      (lx) =>
        getGroundStateAt(lx, spawnZ) === 'solid' &&
        getGroundStateAt(lx, spawnZ - 10) === 'solid',
    );
    if (solidLanes.length === 0) return;

    const difficulty = Math.min(1, distanceM / 2000);
    const roll = Math.random();
    const lanes = [...solidLanes].sort(() => Math.random() - 0.5);

    if (roll < 0.24) {
      const maxCount = Math.min(lanes.length, Math.random() < 0.45 + difficulty * 0.3 ? 2 : 1);
      for (let i = 0; i < maxCount; i++) {
        const obs = obstacles.find((o) => !o.active && o.kind === 'barrier');
        if (obs) {
          obs.active = true;
          obs.resolved = false;
          obs.nearMissAwarded = false;
          obs.x = lanes[i];
          obs.z = spawnZ;
          obs.mesh.position.set(obs.x, 0, obs.z);
          obs.mesh.visible = true;
        }
      }
      if (lanes.length >= 3 && Math.random() < 0.55) {
        const pad = obstacles.find((o) => !o.active && o.kind === 'pad');
        if (pad) {
          pad.active = true;
          pad.resolved = false;
          pad.nearMissAwarded = false;
          pad.x = lanes[2];
          pad.z = spawnZ - 5;
          pad.mesh.position.set(pad.x, 0, pad.z);
          pad.mesh.visible = true;
        }
      }
    } else if (roll < 0.86) {
      // Leave at least 1 solid lane open when possible
      const maxCars = Math.max(
        1,
        Math.min(lanes.length - (lanes.length > 1 ? 1 : 0), Math.random() < 0.4 + difficulty * 0.35 ? 3 : 2),
      );
      for (let i = 0; i < maxCars; i++) {
        const typeRoll = Math.random();
        const wantKind: ObstacleEntity['kind'] =
          typeRoll < 0.24 ? 'truck' : typeRoll < 0.56 ? 'suv' : 'sedan';
        const obs =
          obstacles.find((o) => !o.active && o.kind === wantKind) ||
          obstacles.find((o) => !o.active && o.kind === 'sedan');
        if (obs) {
          obs.active = true;
          obs.resolved = false;
          obs.nearMissAwarded = false;
          obs.x = lanes[i];
          obs.z = spawnZ - i * (9 + Math.random() * 8);
          obs.mesh.position.set(obs.x, 0, obs.z);
          obs.mesh.visible = true;
        }
      }
    } else {
      const pad = obstacles.find((o) => !o.active && o.kind === 'pad');
      if (pad) {
        pad.active = true;
        pad.resolved = false;
        pad.nearMissAwarded = false;
        pad.x = lanes[0];
        pad.z = spawnZ;
        pad.mesh.position.set(pad.x, 0, pad.z);
        pad.mesh.visible = true;
      }
      if (lanes.length >= 2) {
        const car = obstacles.find((o) => !o.active && o.kind === 'sedan');
        if (car) {
          car.active = true;
          car.resolved = false;
          car.nearMissAwarded = false;
          car.x = lanes[1];
          car.z = spawnZ - 12;
          car.mesh.position.set(car.x, 0, car.z);
          car.mesh.visible = true;
        }
      }
    }
  };

  const resetSegmentsLayout = () => {
    lastWasCollapsed = false;
    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const seg = segments[i];
      seg.zCenter = 48 - i * SEGMENT_LENGTH;
      seg.group.position.z = seg.zCenter;
      applySegmentCollapseVisuals(seg, 'none');
      seg.leftWarnBar.visible = false;
      seg.rightWarnBar.visible = false;
      seg.gantryGroup.visible = i % 2 === 0;
    }
    obstacles.forEach((o) => {
      o.active = false;
      o.resolved = false;
      o.nearMissAwarded = false;
      o.mesh.visible = false;
      o.z = -500;
    });
    nextSpawnDistanceM = 58;
  };

  const resetForShowroom = () => {
    resetSegmentsLayout();
    const lobbyTraffic: Array<{ kind: ObstacleEntity['kind']; lane: number; z: number }> = [
      { kind: 'sedan', lane: 0, z: -72 },
      { kind: 'suv', lane: 3, z: -135 },
      { kind: 'sedan', lane: 1, z: -210 },
    ];
    lobbyTraffic.forEach((item) => {
      const obs = obstacles.find((o) => !o.active && o.kind === item.kind);
      if (obs) {
        obs.active = true;
        obs.resolved = false;
        obs.x = LANE_X[item.lane];
        obs.z = item.z;
        obs.mesh.position.set(obs.x, 0, obs.z);
        obs.mesh.visible = true;
      }
    });
  };

  const resetForPlay = () => {
    resetSegmentsLayout();
    // Seed an early showcase broken-lava side section at z = -176 (index 7) so player sees it right away too!
    const earlyLavaSeg = segments[7];
    if (earlyLavaSeg) {
      applySegmentCollapseVisuals(earlyLavaSeg, 'left');
      segments[6].leftWarnBar.visible = true;
    }

    spawnObstacleWave(-90, 60);
    spawnObstacleWave(-140, 120);
    spawnObstacleWave(-225, 200);
    spawnObstacleWave(-295, 270);
  };

  const getPassedLavaSegment = (zPos: number): RoadSegment | null => {
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (seg.collapseSide === 'none') continue;
      if (zPos > seg.zCenter + SEGMENT_LENGTH * 0.5 && !seg.lavaClearedAwarded) {
        return seg;
      }
    }
    return null;
  };

  const scrollSegmentsAndCity = (dz: number, distanceM: number, allowCollapse: boolean) => {
    const minZThreshold = 48 + SEGMENT_LENGTH;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      seg.zCenter += dz;
      if (seg.zCenter > minZThreshold) {
        let minZ = Infinity;
        for (let j = 0; j < segments.length; j++) {
          if (segments[j].zCenter < minZ) minZ = segments[j].zCenter;
        }
        seg.zCenter = minZ - SEGMENT_LENGTH;
        if (allowCollapse) {
          spawnSegmentContent(seg, distanceM);
        } else {
          applySegmentCollapseVisuals(seg, 'none');
          seg.leftWarnBar.visible = false;
          seg.rightWarnBar.visible = false;
          seg.gantryGroup.visible = i % 2 === 0;
        }
      }
      seg.group.position.z = seg.zCenter;
    }

    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      b.z += dz * 0.92;
      if (b.z > 68) {
        b.z -= 435;
      }
      b.group.position.z = b.z;
    }
  };

  const updateLobbyCruise = (dt: number, cruiseSpeedMps: number) => {
    const dz = cruiseSpeedMps * dt;
    scrollSegmentsAndCity(dz, 0, false);
    textures.lavaTexture.offset.y = (textures.lavaTexture.offset.y + dt * 0.18) % 1;

    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (!obs.active) continue;
      const rel = cruiseSpeedMps - obs.forwardSpeedMps * 0.85;
      obs.z += rel * dt;
      if (obs.z > 42) {
        obs.z = -240 - Math.random() * 60;
        obs.x = Math.random() < 0.5 ? LANE_X[0] : LANE_X[3];
        obs.mesh.position.x = obs.x;
      }
      obs.mesh.position.z = obs.z;
    }
  };

  const updateWorld = (
    dt: number,
    playerSpeedMps: number,
    distanceM: number,
    playing: boolean,
  ) => {
    if (!playing) return;

    const dz = playerSpeedMps * dt;
    scrollSegmentsAndCity(dz, distanceM, true);
    textures.lavaTexture.offset.y = (textures.lavaTexture.offset.y + dt * 0.35) % 1;

    if (distanceM >= nextSpawnDistanceM) {
      spawnObstacleWave(-330, distanceM);
      const spacing = Math.max(40, 64 - Math.min(22, distanceM / 110));
      nextSpawnDistanceM = distanceM + spacing + Math.random() * 18;
    }

    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (!obs.active) continue;
      const relSpeed = playerSpeedMps - obs.forwardSpeedMps;
      obs.z += relSpeed * dt;
      obs.mesh.position.z = obs.z;

      if (obs.z > 32) {
        obs.active = false;
        obs.mesh.visible = false;
      } else if (getGroundStateAt(obs.x, obs.z) === 'lava') {
        obs.active = false;
        obs.mesh.visible = false;
      }
    }
  };

  const spawnThrusterParticles = (
    carX: number,
    carY: number,
    carZ: number,
    pitch: number,
    intensity: number,
    _thrusterKey: ThrusterColorKey,
    dt: number,
  ) => {
    particleEmitAccum += dt * (intensity > 1 ? 160 : 115);
    const count = Math.floor(particleEmitAccum);
    if (count <= 0) return;
    particleEmitAccum -= count;

    for (let i = 0; i < count; i++) {
      const p = particles[particleCursor];
      particleCursor = (particleCursor + 1) % PARTICLE_CAP;

      const nozzleSide = i % 2 === 0 ? -0.46 : 0.46;
      const isCore = Math.random() < 0.42;

      p.active = true;
      p.isCore = isCore;
      p.isSpark = false;
      p.isLava = false;
      p.x = carX + nozzleSide + (Math.random() - 0.5) * 0.18;
      p.y = carY + 0.38 - Math.sin(pitch) * 1.4 + (Math.random() - 0.5) * 0.14;
      p.z = carZ + 2.32 + Math.random() * 0.35;
      p.vx = (Math.random() - 0.5) * 1.4;
      p.vy = -0.35 + (Math.random() - 0.5) * 1.1;
      p.vz = 14 + Math.random() * 14 * intensity;
      p.maxLife = 0.22 + Math.random() * 0.18;
      p.life = p.maxLife;
      p.scaleX = isCore ? 0.95 : 1.35 + Math.random() * 0.7;
      p.scaleY = isCore ? 0.9 : 1.2;
      p.scaleZ = 1.2 + Math.random() * 1.8 * intensity;
    }
  };

  const spawnImpactSparks = (x: number, y: number, z: number) => {
    for (let i = 0; i < 28; i++) {
      const p = particles[particleCursor];
      particleCursor = (particleCursor + 1) % PARTICLE_CAP;

      p.active = true;
      p.isCore = false;
      p.isSpark = true;
      p.isLava = false;
      p.x = x + (Math.random() - 0.5) * 1.1;
      p.y = y + 0.5 + Math.random() * 0.6;
      p.z = z + (Math.random() - 0.5) * 1.2;
      p.vx = (Math.random() - 0.5) * 18;
      p.vy = 4 + Math.random() * 11;
      p.vz = (Math.random() - 0.5) * 14 + 8;
      p.maxLife = 0.38 + Math.random() * 0.25;
      p.life = p.maxLife;
      p.scaleX = 0.85;
      p.scaleY = 0.85;
      p.scaleZ = 0.7;
    }
  };

  const spawnLavaSplash = (x: number, y: number, z: number) => {
    for (let i = 0; i < 36; i++) {
      const p = particles[particleCursor];
      particleCursor = (particleCursor + 1) % PARTICLE_CAP;

      p.active = true;
      p.isCore = false;
      p.isSpark = false;
      p.isLava = true;
      p.x = x + (Math.random() - 0.5) * 1.8;
      p.y = y + Math.random() * 0.5;
      p.z = z + (Math.random() - 0.5) * 2.0;
      p.vx = (Math.random() - 0.5) * 16;
      p.vy = 7 + Math.random() * 14;
      p.vz = (Math.random() - 0.5) * 10 + 4;
      p.maxLife = 0.48 + Math.random() * 0.32;
      p.life = p.maxLife;
      p.scaleX = 1.6;
      p.scaleY = 2.2;
      p.scaleZ = 0.7;
    }
  };

  const spawnTireSpray = (carX: number, speedMps: number, dt: number) => {
    sprayAccum += dt * Math.min(85, speedMps * 0.9);
    const count = Math.floor(sprayAccum);
    if (count <= 0) return;
    sprayAccum -= count;

    for (let i = 0; i < count; i++) {
      const p = particles[particleCursor];
      particleCursor = (particleCursor + 1) % PARTICLE_CAP;

      const side = i % 2 === 0 ? -0.96 : 0.96;
      p.active = true;
      p.isCore = true;
      p.isSpark = false;
      p.isLava = false;
      p.x = carX + side + (Math.random() - 0.5) * 0.2;
      p.y = 0.14 + Math.random() * 0.22;
      p.z = 1.68 + Math.random() * 0.35;
      p.vx = (side > 0 ? 1 : -1) * (0.6 + Math.random() * 1.4);
      p.vy = 1.2 + Math.random() * 2.2;
      p.vz = 7 + Math.random() * 8;
      p.maxLife = 0.2 + Math.random() * 0.14;
      p.life = p.maxLife;
      p.scaleX = 0.7;
      p.scaleY = 0.9;
      p.scaleZ = 0.85;
    }
  };

  const updateWeatherVisuals = (
    weather: WeatherCondition,
    speedMps: number,
    dt: number,
  ) => {
    const targetRoughness = weather === 'rainy' ? 0.08 : weather === 'foggy' ? 0.22 : 0.3;
    const targetMetalness = weather === 'rainy' ? 0.48 : weather === 'foggy' ? 0.3 : 0.25;
    const targetEnv = weather === 'rainy' ? 2.1 : weather === 'foggy' ? 1.05 : 1.2;

    roadMat.roughness = THREE.MathUtils.damp(roadMat.roughness, targetRoughness, 3.2, dt);
    roadMat.metalness = THREE.MathUtils.damp(roadMat.metalness, targetMetalness, 3.2, dt);
    roadMat.envMapIntensity = THREE.MathUtils.damp(roadMat.envMapIntensity, targetEnv, 3.2, dt);

    const targetRainAlpha = weather === 'rainy' ? 0.42 : 0;
    rainOpacity = THREE.MathUtils.damp(rainOpacity, targetRainAlpha, 4.5, dt);
    rainMat.opacity = rainOpacity;
    rainMesh.visible = rainOpacity > 0.01;

    if (rainMesh.visible) {
      const slantX = Math.min(0.45, speedMps * 0.0045);
      for (let i = 0; i < RAIN_COUNT; i++) {
        const r = rainDrops[i];
        r.y -= r.speed * dt;
        r.z += speedMps * 0.72 * dt;
        if (r.y < 0) {
          r.y = 18 + Math.random() * 5;
          r.x = (Math.random() - 0.5) * 34;
          r.z = 10 - Math.random() * 88;
        }
        if (r.z > 14) {
          r.z -= 88;
        }
        _dummy.position.set(r.x, r.y, r.z);
        _dummy.rotation.set(slantX, 0, -0.06);
        _dummy.scale.set(1, 0.85 + speedMps * 0.006, 1);
        _dummy.updateMatrix();
        rainMesh.setMatrixAt(i, _dummy.matrix);
      }
      _dummy.rotation.set(0, 0, 0);
      rainMesh.instanceMatrix.needsUpdate = true;
    }
  };

  const updateParticles = (
    dt: number,
    worldScrollSpeedMps: number,
    thrusterKey: ThrusterColorKey,
  ) => {
    const theme = THRUSTER_THEMES[thrusterKey];

    for (let i = 0; i < PARTICLE_CAP; i++) {
      const p = particles[i];
      if (!p.active) {
        _dummy.position.set(0, -500, 0);
        _dummy.scale.set(0, 0, 0);
        _dummy.updateMatrix();
        particleMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _dummy.position.set(0, -500, 0);
        _dummy.scale.set(0, 0, 0);
        _dummy.updateMatrix();
        particleMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }

      if (p.isSpark || p.isLava) {
        p.vy -= 26 * dt;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += (p.vz + worldScrollSpeedMps * 0.25) * dt;
      if (p.y < 0.06 && !p.isSpark && !p.isLava) p.y = 0.06;

      const t = p.life / p.maxLife;
      _dummy.position.set(p.x, p.y, p.z);
      _dummy.scale.set(
        p.scaleX * (0.4 + t * 0.8),
        p.scaleY * (0.4 + t * 0.8),
        p.scaleZ * (0.6 + t * 0.7),
      );
      _dummy.updateMatrix();
      particleMesh.setMatrixAt(i, _dummy.matrix);

      if (p.isLava) {
        _color.copy(_lavaCoreColor).lerp(_lavaEdgeColor, 1 - t);
      } else if (p.isSpark) {
        _color.copy(_sparkStartColor).lerp(_sparkEndColor, 1 - t);
      } else if (p.isCore) {
        _color.set(theme.coreHex);
      } else {
        _color.set(theme.hex);
      }
      particleMesh.setColorAt(i, _color);
    }

    particleMesh.instanceMatrix.needsUpdate = true;
    if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
  };

  const dispose = () => {
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
  };

  return {
    group,
    segments,
    obstacles,
    resetForShowroom,
    resetForPlay,
    updateLobbyCruise,
    updateWorld,
    getGroundStateAt,
    getPassedLavaSegment,
    spawnThrusterParticles,
    spawnImpactSparks,
    spawnLavaSplash,
    spawnTireSpray,
    updateWeatherVisuals,
    updateParticles,
    dispose,
  };
}
