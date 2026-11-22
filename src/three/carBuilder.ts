import * as THREE from 'three';
import {
  AeroKit,
  CarModelId,
  CarSpec,
  HEADLIGHT_THEMES,
  THRUSTER_THEMES,
  UNDERGLOW_THEMES,
  WheelFinish,
  WheelStyle,
} from '../types/game';
import { ProceduralTextures } from './textures';

export interface RoadsterRig {
  root: THREE.Group;
  stuntGroup: THREE.Group;
  chassisGroup: THREE.Group;
  contactShadow: THREE.Mesh;
  wheelPivots: {
    fl: THREE.Group;
    fr: THREE.Group;
    rl: THREE.Group;
    rr: THREE.Group;
  };
  wheelSpinners: THREE.Group[];
  nozzleGlows: THREE.Mesh[];
  sideAccents: THREE.Mesh[];
  thrusterLight: THREE.PointLight;
  headlightGlow: THREE.PointLight;
  underglowLight: THREE.PointLight;
  applySpec: (spec: CarSpec) => void;
  setSuspension: (chassisOffsetY: number, wheelDropY: number, airHeight: number) => void;
  dispose: () => void;
}

function buildRoadsterSideShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-2.18, 0.24);
  s.lineTo(-2.12, 0.48);
  s.lineTo(-1.82, 0.66);
  s.lineTo(-0.98, 0.78);
  s.lineTo(-0.32, 1.18);
  s.lineTo(0.62, 1.2);
  s.lineTo(1.52, 0.92);
  s.lineTo(2.12, 0.86);
  s.lineTo(2.16, 0.42);
  s.lineTo(1.92, 0.24);
  s.lineTo(-2.18, 0.24);
  return s;
}

function buildCyberSideShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-2.22, 0.28);
  s.lineTo(-2.18, 0.64);
  s.lineTo(-0.22, 1.28); // Iconic razor peak
  s.lineTo(2.08, 0.96); // Long flat wedge deck
  s.lineTo(2.16, 0.44);
  s.lineTo(1.88, 0.28);
  s.lineTo(-2.22, 0.28);
  return s;
}

function buildPrototypeSideShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-2.24, 0.2);
  s.lineTo(-2.18, 0.44);
  s.lineTo(-1.68, 0.68);
  s.lineTo(-0.85, 0.64); // Low nose valley
  s.lineTo(-0.25, 1.14); // Bubble LMP canopy
  s.lineTo(0.55, 1.14);
  s.lineTo(1.28, 0.82);
  s.lineTo(2.14, 0.78);
  s.lineTo(2.18, 0.36);
  s.lineTo(1.9, 0.2);
  s.lineTo(-2.24, 0.2);
  return s;
}

function createSpokeSet(
  style: WheelStyle,
  rimMat: THREE.Material,
  darkMat: THREE.Material,
): THREE.Group {
  const g = new THREE.Group();

  const lipGeo = new THREE.TorusGeometry(0.285, 0.022, 10, 28);
  lipGeo.rotateY(Math.PI / 2);
  const lip = new THREE.Mesh(lipGeo, rimMat);
  g.add(lip);

  const hubGeo = new THREE.CylinderGeometry(0.068, 0.068, 0.06, 16);
  hubGeo.rotateZ(Math.PI / 2);
  const hub = new THREE.Mesh(hubGeo, darkMat);
  g.add(hub);

  const capGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.07, 12);
  capGeo.rotateZ(Math.PI / 2);
  const cap = new THREE.Mesh(capGeo, rimMat);
  g.add(cap);

  if (style === 'sixSpoke') {
    const spokeGeo = new THREE.BoxGeometry(0.028, 0.255, 0.024);
    for (let i = 0; i < 6; i++) {
      const baseAngle = (i / 6) * Math.PI * 2;
      for (const offset of [-0.11, 0.11]) {
        const spoke = new THREE.Mesh(spokeGeo, rimMat);
        const angle = baseAngle + offset;
        spoke.position.set(0.015, Math.cos(angle) * 0.145, Math.sin(angle) * 0.145);
        spoke.rotation.x = -angle;
        g.add(spoke);
      }
    }
  } else if (style === 'turbine') {
    const bladeGeo = new THREE.BoxGeometry(0.024, 0.24, 0.048);
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const blade = new THREE.Mesh(bladeGeo, rimMat);
      blade.position.set(0.015, Math.cos(angle) * 0.15, Math.sin(angle) * 0.15);
      blade.rotation.x = -angle + 0.35;
      blade.rotation.y = 0.22;
      g.add(blade);
    }
  } else if (style === 'mesh') {
    const spokeGeo = new THREE.BoxGeometry(0.022, 0.24, 0.018);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      for (const tilt of [-0.22, 0.22]) {
        const s = new THREE.Mesh(spokeGeo, rimMat);
        s.position.set(0.015, Math.cos(angle) * 0.15, Math.sin(angle) * 0.15);
        s.rotation.x = -(angle + tilt);
        g.add(s);
      }
    }
  } else {
    const discGeo = new THREE.CylinderGeometry(0.265, 0.27, 0.03, 24);
    discGeo.rotateZ(Math.PI / 2);
    const disc = new THREE.Mesh(discGeo, darkMat);
    disc.position.x = 0.01;
    g.add(disc);

    const slotGeo = new THREE.BoxGeometry(0.036, 0.09, 0.022);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const fin = new THREE.Mesh(slotGeo, rimMat);
      fin.position.set(0.018, Math.cos(angle) * 0.19, Math.sin(angle) * 0.19);
      fin.rotation.x = -angle;
      g.add(fin);
    }
  }

  return g;
}

export function createRoadsterRig(
  textures: ProceduralTextures,
  isSoftwareGl: boolean,
): RoadsterRig {
  const root = new THREE.Group();
  const stuntGroup = new THREE.Group();
  stuntGroup.position.y = 0.58;
  root.add(stuntGroup);

  const chassisGroup = new THREE.Group();
  chassisGroup.position.y = -0.58;
  stuntGroup.add(chassisGroup);

  const geometriesToDispose: THREE.BufferGeometry[] = [];
  const materialsToDispose: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometriesToDispose.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materialsToDispose.push(m);
    return m;
  };

  // Materials
  const bodyPaintMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xf1f5f9,
      metalness: 0.2,
      roughness: 0.14,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.35,
    }),
  );

  const trimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1d222c,
      map: textures.carbonTexture,
      roughness: 0.36,
      metalness: 0.45,
    }),
  );

  const liveryMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x06b6d4,
      metalness: 0.35,
      roughness: 0.18,
      clearcoat: 0.9,
    }),
  );

  const darkChassisMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0f131b,
      roughness: 0.72,
      metalness: 0.25,
    }),
  );

  const glassMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x0b1018,
      metalness: 0.15,
      roughness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.6,
    }),
  );

  const silverTrimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xdbe3ee,
      metalness: 0.75,
      roughness: 0.22,
    }),
  );

  const tireMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x171a21,
      roughness: 0.82,
      metalness: 0.05,
    }),
  );

  const rimPrimaryMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd8e0eb,
      metalness: 0.85,
      roughness: 0.18,
    }),
  );

  const rimDarkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1c212b,
      metalness: 0.6,
      roughness: 0.4,
    }),
  );

  const caliperMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.32,
      metalness: 0.4,
    }),
  );

  const headlightMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfff5e0,
      emissiveIntensity: 2.3,
      roughness: 0.1,
    }),
  );

  const taillightMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xff3b1f,
      emissive: 0xff4d2e,
      emissiveIntensity: 2.4,
      roughness: 0.15,
    }),
  );

  const thrusterEmissiveMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 2.8,
      roughness: 0.15,
    }),
  );

  const underglowMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
    }),
  );

  // ===========================================================================
  // MODEL GROUPS (4 Distinct Composite Vehicle Silhouettes)
  // ===========================================================================
  const modelGroups: Record<CarModelId, THREE.Group> = {
    roadster: new THREE.Group(),
    formula: new THREE.Group(),
    cyber: new THREE.Group(),
    prototype: new THREE.Group(),
  };

  // --- MODEL 1: APEX ROADSTER ---
  {
    const g = modelGroups.roadster;
    const sideShape = buildRoadsterSideShape();
    const bodyGeo = trackGeo(
      new THREE.ExtrudeGeometry(sideShape, {
        depth: 1.84,
        bevelEnabled: true,
        bevelThickness: 0.08,
        bevelSize: 0.06,
        bevelSegments: 2,
      }),
    );
    bodyGeo.rotateY(-Math.PI / 2);
    bodyGeo.translate(0.92, 0, 0);
    const mainBody = new THREE.Mesh(bodyGeo, bodyPaintMat);
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    g.add(mainBody);

    const fenderGeo = trackGeo(new THREE.BoxGeometry(0.24, 0.32, 1.05));
    for (const side of [-1, 1]) {
      const frontFender = new THREE.Mesh(fenderGeo, bodyPaintMat);
      frontFender.position.set(side * 0.94, 0.56, -1.36);
      frontFender.rotation.z = side * -0.1;
      frontFender.castShadow = true;
      g.add(frontFender);

      const rearFender = new THREE.Mesh(fenderGeo, bodyPaintMat);
      rearFender.position.set(side * 0.96, 0.64, 1.36);
      rearFender.rotation.z = side * 0.08;
      rearFender.castShadow = true;
      g.add(rearFender);
    }

    const canopy = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.42, 0.36, 1.78)), glassMat);
    canopy.position.set(0, 1.06, 0.08);
    g.add(canopy);

    const windshield = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.38, 0.06, 0.88)), glassMat);
    windshield.position.set(0, 1.01, -0.62);
    windshield.rotation.x = 0.48;
    g.add(windshield);

    const roofCap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.36, 0.05, 0.98)), glassMat);
    roofCap.position.set(0, 1.24, 0.16);
    g.add(roofCap);

    const pillarGeo = trackGeo(new THREE.BoxGeometry(0.06, 0.055, 0.96));
    const roofRailGeo = trackGeo(new THREE.BoxGeometry(0.06, 0.05, 1.05));
    for (const side of [-1, 1]) {
      const aPillar = new THREE.Mesh(pillarGeo, silverTrimMat);
      aPillar.position.set(side * 0.69, 1.03, -0.6);
      aPillar.rotation.x = 0.48;
      aPillar.rotation.y = side * -0.05;
      g.add(aPillar);

      const roofRail = new THREE.Mesh(roofRailGeo, silverTrimMat);
      roofRail.position.set(side * 0.67, 1.245, 0.2);
      g.add(roofRail);
    }

    const headGeo = trackGeo(new THREE.BoxGeometry(0.46, 0.045, 0.08));
    for (const side of [-1, 1]) {
      const hl = new THREE.Mesh(headGeo, headlightMat);
      hl.position.set(side * 0.72, 0.56, -2.14);
      hl.rotation.y = side * -0.14;
      g.add(hl);
    }

    const taillight = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.86, 0.06, 0.06)), taillightMat);
    taillight.position.set(0, 0.72, 2.17);
    g.add(taillight);

    chassisGroup.add(g);
  }

  // --- MODEL 2: ORBITAL F1 (Open-Wheel Monoposto) ---
  {
    const g = modelGroups.formula;

    // Narrow sculpted central monocoque fuselage
    const monoGeo = trackGeo(new THREE.BoxGeometry(0.76, 0.46, 2.9));
    const mono = new THREE.Mesh(monoGeo, bodyPaintMat);
    mono.position.set(0, 0.46, -0.05);
    mono.castShadow = true;
    g.add(mono);

    // Pointed tapered nose cone
    const noseGeo = trackGeo(new THREE.BoxGeometry(0.46, 0.24, 1.35));
    const nose = new THREE.Mesh(noseGeo, bodyPaintMat);
    nose.position.set(0, 0.38, -1.72);
    nose.rotation.x = 0.14;
    nose.castShadow = true;
    g.add(nose);

    // Wide multi-element F1 front wing
    const fWingMain = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.26, 0.05, 0.46)), trimMat);
    fWingMain.position.set(0, 0.21, -2.26);
    g.add(fWingMain);

    const fWingFlap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.14, 0.04, 0.24)), bodyPaintMat);
    fWingFlap.position.set(0, 0.27, -2.18);
    fWingFlap.rotation.x = 0.22;
    g.add(fWingFlap);

    for (const side of [-1, 1]) {
      const fEnd = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.05, 0.24, 0.54)), bodyPaintMat);
      fEnd.position.set(side * 1.13, 0.29, -2.24);
      g.add(fEnd);
    }

    // Sidepods + radiator openings
    const sidepodGeo = trackGeo(new THREE.BoxGeometry(0.56, 0.4, 1.9));
    const radInletGeo = trackGeo(new THREE.BoxGeometry(0.46, 0.28, 0.08));
    for (const side of [-1, 1]) {
      const pod = new THREE.Mesh(sidepodGeo, bodyPaintMat);
      pod.position.set(side * 0.64, 0.44, 0.38);
      pod.castShadow = true;
      g.add(pod);

      const inlet = new THREE.Mesh(radInletGeo, darkChassisMat);
      inlet.position.set(side * 0.64, 0.46, -0.57);
      g.add(inlet);
    }

    // Overhead engine airbox scoop + halo cockpit + visor
    const airbox = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.44, 1.35)), bodyPaintMat);
    airbox.position.set(0, 0.88, 0.65);
    g.add(airbox);

    const visor = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.54, 0.2, 0.62)), glassMat);
    visor.position.set(0, 0.78, -0.15);
    g.add(visor);

    const haloBar = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.32, 0.032, 8, 18, Math.PI)), trimMat);
    haloBar.rotation.x = Math.PI / 2;
    haloBar.position.set(0, 0.88, -0.1);
    g.add(haloBar);

    // Exposed carbon suspension wishbones connecting monocoque to open wheels
    const armGeo = trackGeo(new THREE.BoxGeometry(0.56, 0.04, 0.08));
    for (const side of [-1, 1]) {
      for (const zPos of [-1.42, -1.28, 1.3, 1.42]) {
        const arm = new THREE.Mesh(armGeo, darkChassisMat);
        arm.position.set(side * 0.64, 0.36, zPos);
        g.add(arm);
      }
    }

    // F1 nose light + rain rear light
    const fHead = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.34, 0.05, 0.08)), headlightMat);
    fHead.position.set(0, 0.34, -2.35);
    g.add(fHead);

    const rainTail = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.14, 0.08)), taillightMat);
    rainTail.position.set(0, 0.48, 2.18);
    g.add(rainTail);

    chassisGroup.add(g);
  }

  // --- MODEL 3: CYBER WEDGE (Faceted Origami Exoskeleton) ---
  {
    const g = modelGroups.cyber;
    const cShape = buildCyberSideShape();
    const cyberGeo = trackGeo(
      new THREE.ExtrudeGeometry(cShape, {
        depth: 1.98,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.04,
        bevelSegments: 1,
      }),
    );
    cyberGeo.rotateY(-Math.PI / 2);
    cyberGeo.translate(0.99, 0, 0);
    const cyberBody = new THREE.Mesh(cyberGeo, bodyPaintMat);
    cyberBody.castShadow = true;
    cyberBody.receiveShadow = true;
    g.add(cyberBody);

    // Angular faceted glass canopy prism
    const cWindshield = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.72, 0.06, 1.35)), glassMat);
    cWindshield.position.set(0, 1.06, -0.78);
    cWindshield.rotation.x = 0.42;
    g.add(cWindshield);

    const cRoofGlass = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.68, 0.06, 1.25)), glassMat);
    cRoofGlass.position.set(0, 1.18, 0.44);
    cRoofGlass.rotation.x = -0.15;
    g.add(cRoofGlass);

    // Trapezoidal armored fender arches
    const archGeo = trackGeo(new THREE.BoxGeometry(0.24, 0.28, 1.12));
    for (const side of [-1, 1]) {
      const fArch = new THREE.Mesh(archGeo, darkChassisMat);
      fArch.position.set(side * 0.99, 0.62, -1.36);
      g.add(fArch);

      const rArch = new THREE.Mesh(archGeo, darkChassisMat);
      rArch.position.set(side * 0.99, 0.62, 1.36);
      g.add(rArch);
    }

    // Full-width laser lightbar front & rear
    const fBar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.96, 0.055, 0.08)), headlightMat);
    fBar.position.set(0, 0.62, -2.23);
    g.add(fBar);

    const rBar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.98, 0.07, 0.08)), taillightMat);
    rBar.position.set(0, 0.9, 2.15);
    g.add(rBar);

    chassisGroup.add(g);
  }

  // --- MODEL 4: LE MANS HYPER (Endurance LMP Prototype) ---
  {
    const g = modelGroups.prototype;
    const pShape = buildPrototypeSideShape();
    const protoGeo = trackGeo(
      new THREE.ExtrudeGeometry(pShape, {
        depth: 1.56,
        bevelEnabled: true,
        bevelThickness: 0.06,
        bevelSize: 0.05,
        bevelSegments: 2,
      }),
    );
    protoGeo.rotateY(-Math.PI / 2);
    protoGeo.translate(0.78, 0, 0);
    const protoHull = new THREE.Mesh(protoGeo, bodyPaintMat);
    protoHull.castShadow = true;
    g.add(protoHull);

    // Sculpted wide LMP pontoon wheel pods (left & right)
    const podGeo = trackGeo(new THREE.BoxGeometry(0.46, 0.44, 4.18));
    for (const side of [-1, 1]) {
      const pontoon = new THREE.Mesh(podGeo, bodyPaintMat);
      pontoon.position.set(side * 0.88, 0.45, -0.02);
      pontoon.castShadow = true;
      g.add(pontoon);
    }

    // Teardrop endurance cockpit dome
    const domeGeo = trackGeo(new THREE.SphereGeometry(0.72, 18, 12));
    domeGeo.scale(1.02, 0.65, 1.65);
    const dome = new THREE.Mesh(domeGeo, glassMat);
    dome.position.set(0, 0.94, -0.05);
    g.add(dome);

    // Iconic central dorsal shark-fin stabilizer
    const finGeo = trackGeo(new THREE.BoxGeometry(0.06, 0.48, 1.58));
    const sharkFin = new THREE.Mesh(finGeo, trimMat);
    sharkFin.position.set(0, 1.06, 1.18);
    sharkFin.rotation.x = -0.12;
    g.add(sharkFin);

    // Endurance twin stacked headlights & vertical rear blades
    const lmpHeadGeo = trackGeo(new THREE.BoxGeometry(0.24, 0.14, 0.08));
    for (const side of [-1, 1]) {
      const hl = new THREE.Mesh(lmpHeadGeo, headlightMat);
      hl.position.set(side * 0.88, 0.5, -2.14);
      g.add(hl);

      const tl = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.07, 0.34, 0.08)), taillightMat);
      tl.position.set(side * 0.88, 0.56, 2.12);
      g.add(tl);
    }

    chassisGroup.add(g);
  }

  // ===========================================================================
  // SHARED CUSTOMIZABLE COMPONENTS (Applied across all 4 vehicle models!)
  // ===========================================================================

  // 1. Lower Aero Package: Splitter, Side Skirts & Rear Diffuser
  const frontSplitter = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.14, 0.06, 0.48)), trimMat);
  frontSplitter.position.set(0, 0.2, -2.08);
  chassisGroup.add(frontSplitter);

  const wingletGeo = trackGeo(new THREE.BoxGeometry(0.06, 0.14, 0.38));
  for (const side of [-1, 1]) {
    const wl = new THREE.Mesh(wingletGeo, trimMat);
    wl.position.set(side * 1.06, 0.25, -2.04);
    chassisGroup.add(wl);
  }

  const skirtGeo = trackGeo(new THREE.BoxGeometry(0.16, 0.07, 2.02));
  for (const side of [-1, 1]) {
    const skirt = new THREE.Mesh(skirtGeo, trimMat);
    skirt.position.set(side * 0.98, 0.2, 0);
    chassisGroup.add(skirt);
  }

  const diffuserBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.94, 0.16, 0.36)), trimMat);
  diffuserBase.position.set(0, 0.27, 2.04);
  chassisGroup.add(diffuserBase);

  const strakeGeo = trackGeo(new THREE.BoxGeometry(0.035, 0.16, 0.32));
  for (const sx of [-0.66, -0.24, 0.24, 0.66]) {
    const strake = new THREE.Mesh(strakeGeo, darkChassisMat);
    strake.position.set(sx, 0.26, 2.12);
    chassisGroup.add(strake);
  }

  // 2. Widebody Track Kit Group (Bolted wide flares + aggressive front dive canards)
  const widebodyGroup = new THREE.Group();
  const flareGeo = trackGeo(new THREE.BoxGeometry(0.22, 0.3, 0.96));
  const canardGeo = trackGeo(new THREE.BoxGeometry(0.24, 0.04, 0.44));
  for (const side of [-1, 1]) {
    const fFlare = new THREE.Mesh(flareGeo, trimMat);
    fFlare.position.set(side * 1.11, 0.5, -1.36);
    fFlare.rotation.z = side * -0.16;
    widebodyGroup.add(fFlare);

    const rFlare = new THREE.Mesh(flareGeo, trimMat);
    rFlare.position.set(side * 1.13, 0.54, 1.36);
    rFlare.rotation.z = side * -0.14;
    widebodyGroup.add(rFlare);

    const canard = new THREE.Mesh(canardGeo, trimMat);
    canard.position.set(side * 1.14, 0.36, -1.96);
    canard.rotation.z = side * 0.18;
    widebodyGroup.add(canard);
  }
  widebodyGroup.visible = false;
  chassisGroup.add(widebodyGroup);

  // 3. Livery Racing Stripes Group
  const liveryGroup = new THREE.Group();
  const centerStripeGroup = new THREE.Group();
  const twinStripeGroup = new THREE.Group();
  const apexSideGroup = new THREE.Group();

  // Center single racing stripe
  const cHood = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.36, 0.025, 1.15)), liveryMat);
  cHood.position.set(0, 0.74, -1.5);
  cHood.rotation.x = 0.12;
  centerStripeGroup.add(cHood);

  const cRoof = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.36, 0.025, 1.05)), liveryMat);
  cRoof.position.set(0, 1.27, 0.16);
  centerStripeGroup.add(cRoof);

  const cDeck = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.36, 0.025, 0.82)), liveryMat);
  cDeck.position.set(0, 0.93, 1.65);
  cDeck.rotation.x = -0.06;
  centerStripeGroup.add(cDeck);

  // Twin parallel racing stripes
  const tStripGeo = trackGeo(new THREE.BoxGeometry(0.15, 0.025, 1.15));
  const tRoofGeo = trackGeo(new THREE.BoxGeometry(0.15, 0.025, 1.05));
  const tDeckGeo = trackGeo(new THREE.BoxGeometry(0.15, 0.025, 0.82));
  for (const sx of [-0.18, 0.18]) {
    const th = new THREE.Mesh(tStripGeo, liveryMat);
    th.position.set(sx, 0.74, -1.5);
    th.rotation.x = 0.12;
    twinStripeGroup.add(th);

    const tr = new THREE.Mesh(tRoofGeo, liveryMat);
    tr.position.set(sx, 1.27, 0.16);
    twinStripeGroup.add(tr);

    const td = new THREE.Mesh(tDeckGeo, liveryMat);
    td.position.set(sx, 0.93, 1.65);
    td.rotation.x = -0.06;
    twinStripeGroup.add(td);
  }

  // Side Apex slash livery
  const sideSlashGeo = trackGeo(new THREE.BoxGeometry(0.03, 0.18, 1.85));
  for (const side of [-1, 1]) {
    const ss = new THREE.Mesh(sideSlashGeo, liveryMat);
    ss.position.set(side * 1.01, 0.58, 0.12);
    ss.rotation.x = -0.1;
    apexSideGroup.add(ss);
  }

  liveryGroup.add(centerStripeGroup, twinStripeGroup, apexSideGroup);
  chassisGroup.add(liveryGroup);

  // 4. Side Intake Thruster Accent Badges
  const intakePocketGeo = trackGeo(new THREE.BoxGeometry(0.12, 0.3, 0.42));
  const accentStripGeo = trackGeo(new THREE.BoxGeometry(0.04, 0.24, 0.08));
  const sideAccents: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const pod = new THREE.Mesh(intakePocketGeo, darkChassisMat);
    pod.position.set(side * 0.96, 0.48, -0.58);
    chassisGroup.add(pod);

    const accent = new THREE.Mesh(accentStripGeo, thrusterEmissiveMat);
    accent.position.set(side * 1.02, 0.48, -0.44);
    chassisGroup.add(accent);
    sideAccents.push(accent);
  }

  // 5. Dual Rear SpaceX Cold-Gas Thruster Nozzles
  const nozzleOuterGeo = trackGeo(new THREE.CylinderGeometry(0.13, 0.145, 0.16, 18));
  nozzleOuterGeo.rotateX(Math.PI / 2);
  const nozzleCoreGeo = trackGeo(new THREE.CylinderGeometry(0.088, 0.088, 0.17, 16));
  nozzleCoreGeo.rotateX(Math.PI / 2);
  const nozzleGlows: THREE.Mesh[] = [];

  for (const nx of [-0.46, 0.46]) {
    const outer = new THREE.Mesh(nozzleOuterGeo, darkChassisMat);
    outer.position.set(nx, 0.41, 2.16);
    chassisGroup.add(outer);

    const core = new THREE.Mesh(nozzleCoreGeo, thrusterEmissiveMat);
    core.position.set(nx, 0.41, 2.17);
    chassisGroup.add(core);
    nozzleGlows.push(core);
  }

  // 6. Underglow Neon Bars
  const underglowGroup = new THREE.Group();
  const sideGlowGeo = trackGeo(new THREE.BoxGeometry(0.06, 0.03, 2.4));
  const endGlowGeo = trackGeo(new THREE.BoxGeometry(1.75, 0.03, 0.06));
  for (const side of [-1, 1]) {
    const bar = new THREE.Mesh(sideGlowGeo, underglowMat);
    bar.position.set(side * 0.94, 0.14, 0);
    underglowGroup.add(bar);
  }
  const fGlow = new THREE.Mesh(endGlowGeo, underglowMat);
  fGlow.position.set(0, 0.14, -1.96);
  underglowGroup.add(fGlow);
  const rGlow = new THREE.Mesh(endGlowGeo, underglowMat);
  rGlow.position.set(0, 0.14, 1.96);
  underglowGroup.add(rGlow);
  underglowGroup.visible = false;
  chassisGroup.add(underglowGroup);

  // 7. Aero Kit Groups (4 variants toggled by CarSpec.aeroKit)
  const aeroGroups: Record<AeroKit, THREE.Group> = {
    gtWing: new THREE.Group(),
    ducktail: new THREE.Group(),
    swanNeck: new THREE.Group(),
    stealth: new THREE.Group(),
  };

  {
    const g = aeroGroups.gtWing;
    const pylonGeo = trackGeo(new THREE.BoxGeometry(0.06, 0.34, 0.24));
    for (const side of [-1, 1]) {
      const p = new THREE.Mesh(pylonGeo, trimMat);
      p.position.set(side * 0.52, 1.02, 1.94);
      p.rotation.x = 0.15;
      g.add(p);
    }
    const blade = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.04, 0.055, 0.32)), bodyPaintMat);
    blade.position.set(0, 1.2, 2.02);
    blade.rotation.x = 0.08;
    blade.castShadow = true;
    g.add(blade);

    const endplateGeo = trackGeo(new THREE.BoxGeometry(0.045, 0.22, 0.4));
    for (const side of [-1, 1]) {
      const ep = new THREE.Mesh(endplateGeo, bodyPaintMat);
      ep.position.set(side * 1.02, 1.17, 2.02);
      g.add(ep);
    }
    chassisGroup.add(g);
  }

  {
    const g = aeroGroups.ducktail;
    const lip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.88, 0.12, 0.26)), trimMat);
    lip.position.set(0, 0.94, 2.08);
    lip.rotation.x = -0.36;
    g.add(lip);
    chassisGroup.add(g);
  }

  {
    const g = aeroGroups.swanNeck;
    const pylonGeo = trackGeo(new THREE.BoxGeometry(0.05, 0.42, 0.18));
    for (const side of [-1, 1]) {
      const p = new THREE.Mesh(pylonGeo, darkChassisMat);
      p.position.set(side * 0.42, 1.08, 1.95);
      p.rotation.x = 0.22;
      g.add(p);
    }
    const blade = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.24, 0.05, 0.36)), trimMat);
    blade.position.set(0, 1.24, 2.04);
    blade.rotation.x = 0.12;
    g.add(blade);

    const endplateGeo = trackGeo(new THREE.BoxGeometry(0.04, 0.26, 0.44));
    for (const side of [-1, 1]) {
      const ep = new THREE.Mesh(endplateGeo, trimMat);
      ep.position.set(side * 1.12, 1.21, 2.04);
      g.add(ep);
    }
    chassisGroup.add(g);
  }

  chassisGroup.add(aeroGroups.stealth);

  // 8. Wheels Assembly
  const wheelConfigs = [
    { key: 'fl' as const, baseX: -0.96, z: -1.36, isLeft: true },
    { key: 'fr' as const, baseX: 0.96, z: -1.36, isLeft: false },
    { key: 'rl' as const, baseX: -0.98, z: 1.36, isLeft: true },
    { key: 'rr' as const, baseX: 0.98, z: 1.36, isLeft: false },
  ];

  const wheelPivots = {
    fl: new THREE.Group(),
    fr: new THREE.Group(),
    rl: new THREE.Group(),
    rr: new THREE.Group(),
  };
  const wheelSpinners: THREE.Group[] = [];
  const wheelStyleContainers: Array<{
    container: THREE.Group;
    styleMap: Record<WheelStyle, THREE.Group>;
  }> = [];

  const tireGeo = trackGeo(new THREE.CylinderGeometry(0.38, 0.38, 0.28, 28));
  tireGeo.rotateZ(Math.PI / 2);
  const rotorGeo = trackGeo(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 20));
  rotorGeo.rotateZ(Math.PI / 2);
  const caliperGeo = trackGeo(new THREE.BoxGeometry(0.08, 0.14, 0.09));

  for (const cfg of wheelConfigs) {
    const pivot = wheelPivots[cfg.key];
    pivot.position.set(cfg.baseX, 0.38 - 0.58, cfg.z);
    stuntGroup.add(pivot);

    const spinner = new THREE.Group();
    pivot.add(spinner);
    wheelSpinners.push(spinner);

    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.castShadow = true;
    spinner.add(tire);

    const rotor = new THREE.Mesh(rotorGeo, rimDarkMat);
    spinner.add(rotor);

    const caliper = new THREE.Mesh(caliperGeo, caliperMat);
    caliper.position.set(cfg.isLeft ? -0.04 : 0.04, 0.12, 0.16);
    pivot.add(caliper);

    const spokeMount = new THREE.Group();
    spokeMount.position.x = cfg.isLeft ? -0.125 : 0.125;
    if (cfg.isLeft) {
      spokeMount.rotation.y = Math.PI;
    }
    spinner.add(spokeMount);

    const styleMap: Record<WheelStyle, THREE.Group> = {
      sixSpoke: createSpokeSet('sixSpoke', rimPrimaryMat, rimDarkMat),
      turbine: createSpokeSet('turbine', rimPrimaryMat, rimDarkMat),
      mesh: createSpokeSet('mesh', rimPrimaryMat, rimDarkMat),
      aeroDisc: createSpokeSet('aeroDisc', rimPrimaryMat, rimDarkMat),
    };

    for (const sKey of Object.keys(styleMap) as WheelStyle[]) {
      const grp = styleMap[sKey];
      grp.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          geometriesToDispose.push(obj.geometry);
        }
      });
      spokeMount.add(grp);
    }

    wheelStyleContainers.push({ container: spokeMount, styleMap });
  }

  // 9. Ground Contact Shadow
  const shadowGeo = trackGeo(new THREE.PlaneGeometry(3.5, 5.8));
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.72,
    }),
  );
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.position.set(0, 0.025, 0);
  root.add(contactShadow);

  // 10. Car Dynamic Lights
  const thrusterLight = new THREE.PointLight(0x22d3ee, isSoftwareGl ? 2.5 : 4.5, 12, 1.6);
  thrusterLight.position.set(0, 0.75, 2.9);
  chassisGroup.add(thrusterLight);

  const headlightGlow = new THREE.PointLight(0xffd599, isSoftwareGl ? 1.8 : 3.0, 14, 1.7);
  headlightGlow.position.set(0, 0.7, -2.9);
  chassisGroup.add(headlightGlow);

  const underglowLight = new THREE.PointLight(0x22d3ee, 0, 7, 1.8);
  underglowLight.position.set(0, 0.16, 0);
  chassisGroup.add(underglowLight);

  let currentStanceY = 0;

  const applySpec = (spec: CarSpec) => {
    // 1. Active Vehicle Model
    (Object.keys(modelGroups) as CarModelId[]).forEach((mId) => {
      modelGroups[mId].visible = mId === spec.carModel;
    });

    // 2. Body Paint & Coat Finish
    bodyPaintMat.color.set(spec.paintHex);
    switch (spec.coatFinish) {
      case 'gloss':
        bodyPaintMat.metalness = 0.22;
        bodyPaintMat.roughness = 0.14;
        bodyPaintMat.clearcoat = 1.0;
        bodyPaintMat.clearcoatRoughness = 0.08;
        break;
      case 'metallic':
        bodyPaintMat.metalness = 0.84;
        bodyPaintMat.roughness = 0.24;
        bodyPaintMat.clearcoat = 0.85;
        bodyPaintMat.clearcoatRoughness = 0.14;
        break;
      case 'matte':
        bodyPaintMat.metalness = 0.16;
        bodyPaintMat.roughness = 0.68;
        bodyPaintMat.clearcoat = 0.05;
        bodyPaintMat.clearcoatRoughness = 0.6;
        break;
      case 'chrome':
        bodyPaintMat.metalness = 1.0;
        bodyPaintMat.roughness = 0.06;
        bodyPaintMat.clearcoat = 1.0;
        bodyPaintMat.clearcoatRoughness = 0.03;
        break;
    }

    // 3. Trim Style
    if (spec.trimStyle === 'carbon') {
      trimMat.map = textures.carbonTexture;
      trimMat.color.setHex(0xffffff);
      trimMat.roughness = 0.36;
      trimMat.metalness = 0.45;
      trimMat.emissive.setHex(0x000000);
    } else if (spec.trimStyle === 'body') {
      trimMat.map = null;
      trimMat.color.set(spec.paintHex);
      trimMat.roughness = 0.22;
      trimMat.metalness = 0.35;
      trimMat.emissive.setHex(0x000000);
    } else if (spec.trimStyle === 'cyan') {
      trimMat.map = null;
      trimMat.color.setHex(0x06b6d4);
      trimMat.roughness = 0.25;
      trimMat.metalness = 0.5;
      trimMat.emissive.setHex(0x083344);
    } else {
      trimMat.map = null;
      trimMat.color.setHex(0xf59e0b);
      trimMat.roughness = 0.25;
      trimMat.metalness = 0.5;
      trimMat.emissive.setHex(0x451a03);
    }
    trimMat.needsUpdate = true;

    // 4. Livery Stripes
    liveryMat.color.set(spec.liveryHex || '#06B6D4');
    centerStripeGroup.visible = spec.livery === 'centerStripe';
    twinStripeGroup.visible = spec.livery === 'twinStripe';
    apexSideGroup.visible = spec.livery === 'apexSide';

    // 5. Widebody Kit & Wheel Track Stance
    const isWide = spec.widebody === 'trackWide';
    widebodyGroup.visible = isWide && spec.carModel !== 'formula';
    const wideOffset = isWide ? 0.14 : spec.carModel === 'formula' ? 0.12 : 0;
    const camberAngle = spec.stance === 'slammed' ? 0.08 : spec.stance === 'track' ? 0.025 : 0;

    for (const cfg of wheelConfigs) {
      const sign = cfg.isLeft ? -1 : 1;
      wheelPivots[cfg.key].position.x = cfg.baseX + sign * wideOffset;
      wheelPivots[cfg.key].rotation.z = sign * -camberAngle;
    }

    // 6. Stance / Ride Height
    currentStanceY = spec.stance === 'slammed' ? -0.075 : spec.stance === 'rally' ? 0.11 : 0;

    // 7. Aero Kit
    (Object.keys(aeroGroups) as AeroKit[]).forEach((k) => {
      aeroGroups[k].visible = k === spec.aeroKit;
    });

    // 8. Wheel Style & Finish
    const finishColors: Record<WheelFinish, { primary: number; rough: number; metal: number }> = {
      machined: { primary: 0xd8e0eb, rough: 0.18, metal: 0.85 },
      obsidian: { primary: 0x1e2430, rough: 0.38, metal: 0.55 },
      gold: { primary: 0xe6b85c, rough: 0.22, metal: 0.88 },
      titanium: { primary: 0x8b95a5, rough: 0.28, metal: 0.78 },
    };
    const wf = finishColors[spec.wheelFinish];
    rimPrimaryMat.color.setHex(wf.primary);
    rimPrimaryMat.roughness = wf.rough;
    rimPrimaryMat.metalness = wf.metal;

    wheelStyleContainers.forEach(({ styleMap }) => {
      (Object.keys(styleMap) as WheelStyle[]).forEach((ws) => {
        styleMap[ws].visible = ws === spec.wheelStyle;
      });
    });

    // 9. Headlight Tint
    const hTheme = HEADLIGHT_THEMES[spec.headlightTint];
    headlightMat.color.setHex(hTheme.colorHex);
    headlightMat.emissive.setHex(hTheme.emissiveHex);
    headlightGlow.color.setHex(hTheme.emissiveHex);

    // 10. Underglow Neon
    if (spec.underglow === 'off') {
      underglowGroup.visible = false;
      underglowLight.intensity = 0;
    } else {
      const uTheme = UNDERGLOW_THEMES[spec.underglow];
      underglowGroup.visible = true;
      underglowMat.color.setHex(uTheme.lightHex);
      underglowLight.color.setHex(uTheme.lightHex);
      underglowLight.intensity = isSoftwareGl ? 2.4 : 4.2;
    }

    // 11. Thruster Signature Theme
    const theme = THRUSTER_THEMES[spec.thrusterColor];
    thrusterEmissiveMat.color.set(theme.coreHex);
    thrusterEmissiveMat.emissive.set(theme.hex);
    thrusterLight.color.setHex(theme.glowHex);
  };

  const setSuspension = (chassisOffsetY: number, wheelDropY: number, airHeight: number) => {
    chassisGroup.position.y = -0.58 + currentStanceY + chassisOffsetY;
    for (const cfg of wheelConfigs) {
      wheelPivots[cfg.key].position.y = -0.2 - wheelDropY;
    }
    contactShadow.position.y = -airHeight + 0.025;
    const airFade = Math.max(0.12, 1 - airHeight / 6.5);
    shadowMat.opacity = 0.72 * airFade;
    const scaleBoost = 1 + airHeight * 0.08;
    contactShadow.scale.set(scaleBoost, 1, scaleBoost);
  };

  const dispose = () => {
    geometriesToDispose.forEach((g) => g.dispose());
    materialsToDispose.forEach((m) => m.dispose());
  };

  return {
    root,
    stuntGroup,
    chassisGroup,
    contactShadow,
    wheelPivots,
    wheelSpinners,
    nozzleGlows,
    sideAccents,
    thrusterLight,
    headlightGlow,
    underglowLight,
    applySpec,
    setSuspension,
    dispose,
  };
}
