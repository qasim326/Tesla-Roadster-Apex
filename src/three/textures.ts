import * as THREE from 'three';

export interface ProceduralTextures {
  roadAlbedo: THREE.CanvasTexture;
  roadNormal: THREE.CanvasTexture;
  roadRoughness: THREE.CanvasTexture;
  carbonTexture: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  skyBackdrop: THREE.CanvasTexture;
  hazardStripe: THREE.CanvasTexture;
  lavaTexture: THREE.CanvasTexture;
  buildingAlbedo: THREE.CanvasTexture;
  buildingEmissive: THREE.CanvasTexture;
  rampChevron: THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextures {
  // 1. High-Res Wet Obsidian Highway Asphalt Albedo (1024x1024)
  const roadSize = 1024;
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = roadSize;
  roadCanvas.height = roadSize;
  const rCtx = roadCanvas.getContext('2d')!;

  const roadGrad = rCtx.createLinearGradient(0, 0, roadSize, 0);
  roadGrad.addColorStop(0, '#181e29');
  roadGrad.addColorStop(0.14, '#242d3d');
  roadGrad.addColorStop(0.5, '#2e384b');
  roadGrad.addColorStop(0.86, '#242d3d');
  roadGrad.addColorStop(1, '#181e29');
  rCtx.fillStyle = roadGrad;
  rCtx.fillRect(0, 0, roadSize, roadSize);

  // Subtle longitudinal tire wear & damp sheen bands across 4 lanes
  const laneCenters = [150, 390, 634, 874];
  for (const cx of laneCenters) {
    const trackGrad = rCtx.createLinearGradient(cx - 56, 0, cx + 56, 0);
    trackGrad.addColorStop(0, 'rgba(255,255,255,0)');
    trackGrad.addColorStop(0.28, 'rgba(200,220,255,0.035)');
    trackGrad.addColorStop(0.5, 'rgba(255,255,255,0.015)');
    trackGrad.addColorStop(0.72, 'rgba(200,220,255,0.035)');
    trackGrad.addColorStop(1, 'rgba(255,255,255,0)');
    rCtx.fillStyle = trackGrad;
    rCtx.fillRect(cx - 56, 0, 112, roadSize);
  }

  // Fine stone aggregate speckle
  for (let i = 0; i < 18000; i++) {
    const x = Math.random() * roadSize;
    const y = Math.random() * roadSize;
    const v = 30 + Math.floor(Math.random() * 44);
    const sz = Math.random() < 0.7 ? 2 : 3;
    rCtx.fillStyle = `rgba(${v},${v + 5},${v + 14},0.22)`;
    rCtx.fillRect(x, y, sz, sz);
  }

  // Transverse viaduct expansion joints
  for (let y = 0; y < roadSize; y += 256) {
    rCtx.fillStyle = 'rgba(10, 14, 22, 0.55)';
    rCtx.fillRect(0, y, roadSize, 3);
    rCtx.fillStyle = 'rgba(148, 163, 184, 0.1)';
    rCtx.fillRect(0, y + 3, roadSize, 2);
  }

  // Shoulder edge lines + subtle rumble notches
  rCtx.fillStyle = 'rgba(226, 232, 240, 0.52)';
  rCtx.fillRect(34, 0, 8, roadSize);
  rCtx.fillRect(roadSize - 42, 0, 8, roadSize);
  rCtx.fillStyle = 'rgba(15, 23, 42, 0.45)';
  for (let y = 0; y < roadSize; y += 32) {
    rCtx.fillRect(16, y, 12, 10);
    rCtx.fillRect(roadSize - 28, y, 12, 10);
  }

  // Double center divider lines with subtle amber/silver reflectivity
  rCtx.fillStyle = 'rgba(148, 163, 184, 0.65)';
  rCtx.fillRect(500, 0, 6, roadSize);
  rCtx.fillRect(518, 0, 6, roadSize);

  // Dashed lane lines + reflective cat's-eye road studs
  for (let y = 32; y < roadSize; y += 128) {
    rCtx.fillStyle = 'rgba(226, 232, 240, 0.62)';
    rCtx.fillRect(264, y, 7, 68);
    rCtx.fillRect(753, y, 7, 68);

    // Reflective cat's-eye stud between dashes
    rCtx.fillStyle = 'rgba(34, 211, 238, 0.72)';
    rCtx.fillRect(264, y + 88, 7, 8);
    rCtx.fillRect(753, y + 88, 7, 8);
  }

  const roadAlbedo = new THREE.CanvasTexture(roadCanvas);
  roadAlbedo.colorSpace = THREE.SRGBColorSpace;
  roadAlbedo.wrapS = THREE.ClampToEdgeWrapping;
  roadAlbedo.wrapT = THREE.RepeatWrapping;
  roadAlbedo.repeat.set(1, 3);
  roadAlbedo.anisotropy = maxAnisotropy;

  // 2. Tangent-Space Asphalt Micro-Normal Map (512x512 linear)
  const normSize = 512;
  const hMap = new Float32Array(normSize * normSize);
  for (let y = 0; y < normSize; y++) {
    const isJoint = y % 128 < 2;
    for (let x = 0; x < normSize; x++) {
      // Multi-frequency grain + slight longitudinal brushing
      const n =
        Math.sin(x * 0.41 + y * 0.13) * 0.25 +
        Math.cos(x * 0.87 - y * 0.53) * 0.25 +
        (Math.random() - 0.5) * 0.65;
      hMap[y * normSize + x] = isJoint ? -0.9 : n;
    }
  }
  const normCanvas = document.createElement('canvas');
  normCanvas.width = normSize;
  normCanvas.height = normSize;
  const nCtx = normCanvas.getContext('2d')!;
  const normImg = nCtx.createImageData(normSize, normSize);
  const strength = 2.1;
  for (let y = 0; y < normSize; y++) {
    const yPrev = (y - 1 + normSize) % normSize;
    const yNext = (y + 1) % normSize;
    for (let x = 0; x < normSize; x++) {
      const xPrev = (x - 1 + normSize) % normSize;
      const xNext = (x + 1) % normSize;
      const dx = (hMap[y * normSize + xNext] - hMap[y * normSize + xPrev]) * strength;
      const dy = (hMap[yNext * normSize + x] - hMap[yPrev * normSize + x]) * strength;
      const invLen = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const idx = (y * normSize + x) * 4;
      normImg.data[idx] = Math.round((-dx * invLen * 0.5 + 0.5) * 255);
      normImg.data[idx + 1] = Math.round((-dy * invLen * 0.5 + 0.5) * 255);
      normImg.data[idx + 2] = Math.round((invLen * 0.5 + 0.5) * 255);
      normImg.data[idx + 3] = 255;
    }
  }
  nCtx.putImageData(normImg, 0, 0);
  const roadNormal = new THREE.CanvasTexture(normCanvas);
  roadNormal.wrapS = THREE.RepeatWrapping;
  roadNormal.wrapT = THREE.RepeatWrapping;
  roadNormal.repeat.set(2, 6);
  roadNormal.anisotropy = maxAnisotropy;

  // 3. High-Res Road Roughness Map (512x512 linear)
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 512;
  roughCanvas.height = 512;
  const rgCtx = roughCanvas.getContext('2d')!;
  rgCtx.fillStyle = '#5a5a5a';
  rgCtx.fillRect(0, 0, 512, 512);
  rgCtx.fillStyle = '#2c2c2c';
  for (const cx of [75, 195, 317, 437]) {
    rgCtx.fillRect(cx - 24, 0, 48, 512);
  }
  for (let i = 0; i < 6500; i++) {
    const g = 42 + Math.floor(Math.random() * 75);
    rgCtx.fillStyle = `rgb(${g},${g},${g})`;
    rgCtx.fillRect(Math.random() * 512, Math.random() * 512, 2, 5);
  }
  const roadRoughness = new THREE.CanvasTexture(roughCanvas);
  roadRoughness.wrapS = THREE.ClampToEdgeWrapping;
  roadRoughness.wrapT = THREE.RepeatWrapping;
  roadRoughness.repeat.set(1, 3);
  roadRoughness.anisotropy = maxAnisotropy;

  // 4. High-Detail 2x2 Twill Carbon Fiber Weave Texture (128x128)
  const carbonCanvas = document.createElement('canvas');
  carbonCanvas.width = 128;
  carbonCanvas.height = 128;
  const cCtx = carbonCanvas.getContext('2d')!;
  cCtx.fillStyle = '#12151d';
  cCtx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 8) {
    for (let x = 0; x < 128; x += 8) {
      const diag = ((x + y) / 8) % 2 === 0;
      cCtx.fillStyle = diag ? '#2c3342' : '#181c26';
      cCtx.fillRect(x, y, 4, 4);
      cCtx.fillStyle = diag ? '#1a1e28' : '#353e50';
      cCtx.fillRect(x + 4, y + 4, 4, 4);
    }
  }
  const carbonTexture = new THREE.CanvasTexture(carbonCanvas);
  carbonTexture.colorSpace = THREE.SRGBColorSpace;
  carbonTexture.wrapS = THREE.RepeatWrapping;
  carbonTexture.wrapT = THREE.RepeatWrapping;
  carbonTexture.repeat.set(12, 12);
  carbonTexture.anisotropy = maxAnisotropy;

  // 5. Radial Contact Shadow
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 256;
  shadowCanvas.height = 256;
  const sCtx = shadowCanvas.getContext('2d')!;
  const sGrad = sCtx.createRadialGradient(128, 128, 18, 128, 128, 126);
  sGrad.addColorStop(0, 'rgba(0, 0, 0, 0.88)');
  sGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.48)');
  sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sCtx.fillStyle = sGrad;
  sCtx.fillRect(0, 0, 256, 256);
  const contactShadow = new THREE.CanvasTexture(shadowCanvas);

  // 6. Rich Split-Horizon Twilight Sky Backdrop (2048x1024)
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 2048;
  skyCanvas.height = 1024;
  const skCtx = skyCanvas.getContext('2d')!;
  const skyVert = skCtx.createLinearGradient(0, 0, 0, 1024);
  skyVert.addColorStop(0, '#02050c');
  skyVert.addColorStop(0.55, '#060c18');
  skyVert.addColorStop(0.85, '#0a1426');
  skyVert.addColorStop(1, '#0d1522');
  skCtx.fillStyle = skyVert;
  skCtx.fillRect(0, 0, 2048, 1024);

  // Crisp upper-sky stars
  for (let i = 0; i < 240; i++) {
    const sx = Math.random() * 2048;
    const sy = Math.random() * 540;
    const alpha = 0.15 + Math.random() * 0.55;
    const size = Math.random() < 0.85 ? 1.5 : 2.4;
    skCtx.fillStyle = `rgba(226, 242, 255, ${alpha})`;
    skCtx.fillRect(sx, sy, size, size);
  }

  const leftGlow = skCtx.createRadialGradient(360, 840, 40, 360, 840, 920);
  leftGlow.addColorStop(0, 'rgba(194, 98, 22, 0.4)');
  leftGlow.addColorStop(0.55, 'rgba(92, 46, 14, 0.16)');
  leftGlow.addColorStop(1, 'rgba(5, 11, 20, 0)');
  skCtx.fillStyle = leftGlow;
  skCtx.fillRect(0, 0, 2048, 1024);

  const rightGlow = skCtx.createRadialGradient(1680, 840, 40, 1680, 840, 960);
  rightGlow.addColorStop(0, 'rgba(14, 134, 168, 0.38)');
  rightGlow.addColorStop(0.55, 'rgba(8, 60, 84, 0.18)');
  rightGlow.addColorStop(1, 'rgba(5, 11, 20, 0)');
  skCtx.fillStyle = rightGlow;
  skCtx.fillRect(0, 0, 2048, 1024);

  const skyBackdrop = new THREE.CanvasTexture(skyCanvas);
  skyBackdrop.colorSpace = THREE.SRGBColorSpace;

  // 7. Hazard Stripe Texture
  const hazCanvas = document.createElement('canvas');
  hazCanvas.width = 256;
  hazCanvas.height = 256;
  const hCtx = hazCanvas.getContext('2d')!;
  hCtx.fillStyle = '#181e29';
  hCtx.fillRect(0, 0, 256, 256);
  hCtx.fillStyle = '#f59e0b';
  for (let i = -256; i < 512; i += 64) {
    hCtx.beginPath();
    hCtx.moveTo(i, 0);
    hCtx.lineTo(i + 32, 0);
    hCtx.lineTo(i - 32, 256);
    hCtx.lineTo(i - 64, 256);
    hCtx.closePath();
    hCtx.fill();
  }
  const hazardStripe = new THREE.CanvasTexture(hazCanvas);
  hazardStripe.colorSpace = THREE.SRGBColorSpace;
  hazardStripe.wrapS = THREE.RepeatWrapping;
  hazardStripe.wrapT = THREE.RepeatWrapping;
  hazardStripe.repeat.set(3, 1);
  hazardStripe.anisotropy = maxAnisotropy;

  // 8. Molten Lava River Texture
  const lavaCanvas = document.createElement('canvas');
  lavaCanvas.width = 512;
  lavaCanvas.height = 512;
  const lCtx = lavaCanvas.getContext('2d')!;
  lCtx.fillStyle = '#b91c1c';
  lCtx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 75; i++) {
    const cx = Math.random() * 512;
    const cy = Math.random() * 512;
    const r = 24 + Math.random() * 68;
    const grad = lCtx.createRadialGradient(cx, cy, 4, cx, cy, r);
    grad.addColorStop(0, 'rgba(254, 240, 138, 0.96)');
    grad.addColorStop(0.35, 'rgba(249, 115, 22, 0.88)');
    grad.addColorStop(0.75, 'rgba(185, 28, 28, 0.45)');
    grad.addColorStop(1, 'rgba(127, 29, 29, 0)');
    lCtx.fillStyle = grad;
    lCtx.beginPath();
    lCtx.arc(cx, cy, r, 0, Math.PI * 2);
    lCtx.fill();
  }

  for (let i = 0; i < 95; i++) {
    const cx = Math.random() * 512;
    const cy = Math.random() * 512;
    const rx = 10 + Math.random() * 28;
    const ry = 8 + Math.random() * 22;
    lCtx.fillStyle = 'rgba(24, 14, 12, 0.82)';
    lCtx.beginPath();
    lCtx.ellipse(cx, cy, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
    lCtx.fill();
  }

  const lavaTexture = new THREE.CanvasTexture(lavaCanvas);
  lavaTexture.colorSpace = THREE.SRGBColorSpace;
  lavaTexture.wrapS = THREE.RepeatWrapping;
  lavaTexture.wrapT = THREE.RepeatWrapping;
  lavaTexture.repeat.set(2, 6);
  lavaTexture.anisotropy = maxAnisotropy;

  // 9. Futuristic Skyscraper Glass Curtain-Wall Albedo & Lit Window Emissive (512x512)
  const bldgAlbedoCanvas = document.createElement('canvas');
  bldgAlbedoCanvas.width = 512;
  bldgAlbedoCanvas.height = 512;
  const baCtx = bldgAlbedoCanvas.getContext('2d')!;
  baCtx.fillStyle = '#121824';
  baCtx.fillRect(0, 0, 512, 512);

  const bldgEmissiveCanvas = document.createElement('canvas');
  bldgEmissiveCanvas.width = 512;
  bldgEmissiveCanvas.height = 512;
  const beCtx = bldgEmissiveCanvas.getContext('2d')!;
  beCtx.fillStyle = '#000000';
  beCtx.fillRect(0, 0, 512, 512);

  const cols = 16;
  const rows = 32;
  const cw = 512 / cols;
  const rh = 512 / rows;
  for (let r = 0; r < rows; r++) {
    const floorBandLit = Math.random() < 0.72;
    for (let c = 0; c < cols; c++) {
      const x = c * cw + 3;
      const y = r * rh + 3;
      const w = cw - 6;
      const h = rh - 6;
      baCtx.fillStyle = '#1c2638';
      baCtx.fillRect(x, y, w, h);

      if (floorBandLit && Math.random() < 0.34) {
        const isWarm = Math.random() < 0.42;
        beCtx.fillStyle = isWarm
          ? `rgba(251, 191, 36, ${0.4 + Math.random() * 0.45})`
          : `rgba(56, 189, 248, ${0.35 + Math.random() * 0.45})`;
        beCtx.fillRect(x, y, w, h);
      }
    }
  }

  const buildingAlbedo = new THREE.CanvasTexture(bldgAlbedoCanvas);
  buildingAlbedo.colorSpace = THREE.SRGBColorSpace;
  buildingAlbedo.wrapS = THREE.RepeatWrapping;
  buildingAlbedo.wrapT = THREE.RepeatWrapping;
  buildingAlbedo.repeat.set(1, 2);
  buildingAlbedo.anisotropy = maxAnisotropy;

  const buildingEmissive = new THREE.CanvasTexture(bldgEmissiveCanvas);
  buildingEmissive.colorSpace = THREE.SRGBColorSpace;
  buildingEmissive.wrapS = THREE.RepeatWrapping;
  buildingEmissive.wrapT = THREE.RepeatWrapping;
  buildingEmissive.repeat.set(1, 2);
  buildingEmissive.anisotropy = maxAnisotropy;

  // 10. SpaceX Launch Ramp Chevron Deck Texture (256x512)
  const rampCanvas = document.createElement('canvas');
  rampCanvas.width = 256;
  rampCanvas.height = 512;
  const rmCtx = rampCanvas.getContext('2d')!;
  rmCtx.fillStyle = '#141b26';
  rmCtx.fillRect(0, 0, 256, 512);

  // Side amber safety rails
  rmCtx.fillStyle = '#f59e0b';
  rmCtx.fillRect(10, 0, 12, 512);
  rmCtx.fillRect(234, 0, 12, 512);

  // Glowing cyan launch chevrons pointing up the ramp
  for (let y = 32; y < 512; y += 96) {
    rmCtx.strokeStyle = '#22d3ee';
    rmCtx.lineWidth = 14;
    rmCtx.lineCap = 'round';
    rmCtx.beginPath();
    rmCtx.moveTo(52, y + 48);
    rmCtx.lineTo(128, y);
    rmCtx.lineTo(204, y + 48);
    rmCtx.stroke();

    rmCtx.strokeStyle = '#f59e0b';
    rmCtx.lineWidth = 6;
    rmCtx.beginPath();
    rmCtx.moveTo(74, y + 66);
    rmCtx.lineTo(128, y + 32);
    rmCtx.lineTo(182, y + 66);
    rmCtx.stroke();
  }

  const rampChevron = new THREE.CanvasTexture(rampCanvas);
  rampChevron.colorSpace = THREE.SRGBColorSpace;
  rampChevron.wrapS = THREE.ClampToEdgeWrapping;
  rampChevron.wrapT = THREE.RepeatWrapping;
  rampChevron.anisotropy = maxAnisotropy;

  return {
    roadAlbedo,
    roadNormal,
    roadRoughness,
    carbonTexture,
    contactShadow,
    skyBackdrop,
    hazardStripe,
    lavaTexture,
    buildingAlbedo,
    buildingEmissive,
    rampChevron,
    dispose: () => {
      roadAlbedo.dispose();
      roadNormal.dispose();
      roadRoughness.dispose();
      carbonTexture.dispose();
      contactShadow.dispose();
      skyBackdrop.dispose();
      hazardStripe.dispose();
      lavaTexture.dispose();
      buildingAlbedo.dispose();
      buildingEmissive.dispose();
      rampChevron.dispose();
    },
  };
}
