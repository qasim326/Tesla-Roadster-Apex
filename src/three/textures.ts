import * as THREE from 'three';

export interface ProceduralTextures {
  roadAlbedo: THREE.CanvasTexture;
  roadRoughness: THREE.CanvasTexture;
  carbonTexture: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  skyBackdrop: THREE.CanvasTexture;
  hazardStripe: THREE.CanvasTexture;
  lavaTexture: THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextures {
  // 1. Wet Obsidian Highway Asphalt Albedo
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 512;
  roadCanvas.height = 512;
  const rCtx = roadCanvas.getContext('2d')!;

  // Base wet dark slate asphalt
  const roadGrad = rCtx.createLinearGradient(0, 0, 512, 0);
  roadGrad.addColorStop(0, '#1f2633');
  roadGrad.addColorStop(0.15, '#2b3444');
  roadGrad.addColorStop(0.5, '#343e4f');
  roadGrad.addColorStop(0.85, '#2b3444');
  roadGrad.addColorStop(1, '#1f2633');
  rCtx.fillStyle = roadGrad;
  rCtx.fillRect(0, 0, 512, 512);

  // Subtle longitudinal tire wear & sheen bands
  rCtx.fillStyle = 'rgba(255,255,255,0.025)';
  rCtx.fillRect(46, 0, 34, 512);
  rCtx.fillRect(172, 0, 34, 512);
  rCtx.fillRect(306, 0, 34, 512);
  rCtx.fillRect(432, 0, 34, 512);

  // Fine asphalt grain
  for (let i = 0; i < 4500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = 40 + Math.floor(Math.random() * 35);
    rCtx.fillStyle = `rgba(${v},${v + 4},${v + 12},0.16)`;
    rCtx.fillRect(x, y, 2, 2);
  }

  // Edge solid lines
  rCtx.fillStyle = 'rgba(226, 232, 240, 0.42)';
  rCtx.fillRect(18, 0, 4, 512);
  rCtx.fillRect(490, 0, 4, 512);

  // Double center divider lines (matching screenshot 4)
  rCtx.fillStyle = 'rgba(148, 163, 184, 0.55)';
  rCtx.fillRect(250, 0, 3, 512);
  rCtx.fillRect(259, 0, 3, 512);

  // Dashed lane lines (left & right lanes)
  rCtx.fillStyle = 'rgba(226, 232, 240, 0.52)';
  for (let y = 16; y < 512; y += 64) {
    rCtx.fillRect(132, y, 4, 34);
    rCtx.fillRect(376, y, 4, 34);
  }

  const roadAlbedo = new THREE.CanvasTexture(roadCanvas);
  roadAlbedo.colorSpace = THREE.SRGBColorSpace;
  roadAlbedo.wrapS = THREE.ClampToEdgeWrapping;
  roadAlbedo.wrapT = THREE.RepeatWrapping;
  roadAlbedo.repeat.set(1, 3);
  roadAlbedo.anisotropy = maxAnisotropy;

  // 2. Road Roughness Map (for wet specular reflections)
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 256;
  roughCanvas.height = 256;
  const rgCtx = roughCanvas.getContext('2d')!;
  rgCtx.fillStyle = '#555555';
  rgCtx.fillRect(0, 0, 256, 256);
  // Glossier tire tracks
  rgCtx.fillStyle = '#333333';
  rgCtx.fillRect(24, 0, 24, 256);
  rgCtx.fillRect(86, 0, 24, 256);
  rgCtx.fillRect(148, 0, 24, 256);
  rgCtx.fillRect(210, 0, 24, 256);
  for (let i = 0; i < 1800; i++) {
    const g = 50 + Math.floor(Math.random() * 65);
    rgCtx.fillStyle = `rgb(${g},${g},${g})`;
    rgCtx.fillRect(Math.random() * 256, Math.random() * 256, 2, 4);
  }
  const roadRoughness = new THREE.CanvasTexture(roughCanvas);
  roadRoughness.wrapS = THREE.ClampToEdgeWrapping;
  roadRoughness.wrapT = THREE.RepeatWrapping;
  roadRoughness.repeat.set(1, 3);
  roadRoughness.anisotropy = maxAnisotropy;

  // 3. Carbon Fiber Weave Texture (for front splitter, rear diffuser, aero)
  const carbonCanvas = document.createElement('canvas');
  carbonCanvas.width = 64;
  carbonCanvas.height = 64;
  const cCtx = carbonCanvas.getContext('2d')!;
  cCtx.fillStyle = '#151820';
  cCtx.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 8) {
    for (let x = 0; x < 64; x += 8) {
      cCtx.fillStyle = (x + y) % 16 === 0 ? '#272c38' : '#1b1f29';
      cCtx.fillRect(x, y, 4, 4);
      cCtx.fillStyle = (x + y) % 16 === 0 ? '#1b1f29' : '#2f3644';
      cCtx.fillRect(x + 4, y + 4, 4, 4);
    }
  }
  const carbonTexture = new THREE.CanvasTexture(carbonCanvas);
  carbonTexture.colorSpace = THREE.SRGBColorSpace;
  carbonTexture.wrapS = THREE.RepeatWrapping;
  carbonTexture.wrapT = THREE.RepeatWrapping;
  carbonTexture.repeat.set(10, 10);
  carbonTexture.anisotropy = maxAnisotropy;

  // 4. Radial Contact Shadow
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 256;
  shadowCanvas.height = 256;
  const sCtx = shadowCanvas.getContext('2d')!;
  const sGrad = sCtx.createRadialGradient(128, 128, 18, 128, 128, 126);
  sGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
  sGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.45)');
  sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sCtx.fillStyle = sGrad;
  sCtx.fillRect(0, 0, 256, 256);
  const contactShadow = new THREE.CanvasTexture(shadowCanvas);

  // 5. Split Horizon Sky Backdrop (Warm amber left horizon -> deep obsidian top -> cool cyan right horizon)
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 1024;
  skyCanvas.height = 512;
  const skCtx = skyCanvas.getContext('2d')!;
  skCtx.fillStyle = '#050b14';
  skCtx.fillRect(0, 0, 1024, 512);

  // Left amber atmospheric glow
  const leftGlow = skCtx.createRadialGradient(180, 420, 20, 180, 420, 460);
  leftGlow.addColorStop(0, 'rgba(180, 92, 20, 0.36)');
  leftGlow.addColorStop(0.55, 'rgba(92, 46, 14, 0.14)');
  leftGlow.addColorStop(1, 'rgba(5, 11, 20, 0)');
  skCtx.fillStyle = leftGlow;
  skCtx.fillRect(0, 0, 1024, 512);

  // Right cyan atmospheric glow
  const rightGlow = skCtx.createRadialGradient(840, 420, 20, 840, 420, 480);
  rightGlow.addColorStop(0, 'rgba(12, 118, 148, 0.34)');
  rightGlow.addColorStop(0.55, 'rgba(8, 60, 84, 0.15)');
  rightGlow.addColorStop(1, 'rgba(5, 11, 20, 0)');
  skCtx.fillStyle = rightGlow;
  skCtx.fillRect(0, 0, 1024, 512);

  const skyBackdrop = new THREE.CanvasTexture(skyCanvas);
  skyBackdrop.colorSpace = THREE.SRGBColorSpace;

  // 6. Hazard Stripe Texture for Road Barriers & Gap Warning Edges
  const hazCanvas = document.createElement('canvas');
  hazCanvas.width = 128;
  hazCanvas.height = 128;
  const hCtx = hazCanvas.getContext('2d')!;
  hCtx.fillStyle = '#1e2430';
  hCtx.fillRect(0, 0, 128, 128);
  hCtx.fillStyle = '#f59e0b';
  for (let i = -128; i < 256; i += 32) {
    hCtx.beginPath();
    hCtx.moveTo(i, 0);
    hCtx.lineTo(i + 16, 0);
    hCtx.lineTo(i - 16, 128);
    hCtx.lineTo(i - 32, 128);
    hCtx.closePath();
    hCtx.fill();
  }
  const hazardStripe = new THREE.CanvasTexture(hazCanvas);
  hazardStripe.colorSpace = THREE.SRGBColorSpace;
  hazardStripe.wrapS = THREE.RepeatWrapping;
  hazardStripe.wrapT = THREE.RepeatWrapping;
  hazardStripe.repeat.set(3, 1);
  hazardStripe.anisotropy = maxAnisotropy;

  // 7. Molten Lava River Texture (bright glowing magma veins + dark basalt crust)
  const lavaCanvas = document.createElement('canvas');
  lavaCanvas.width = 512;
  lavaCanvas.height = 512;
  const lCtx = lavaCanvas.getContext('2d')!;
  lCtx.fillStyle = '#b91c1c';
  lCtx.fillRect(0, 0, 512, 512);

  // Hot orange-yellow magma pools
  for (let i = 0; i < 65; i++) {
    const cx = Math.random() * 512;
    const cy = Math.random() * 512;
    const r = 24 + Math.random() * 68;
    const grad = lCtx.createRadialGradient(cx, cy, 4, cx, cy, r);
    grad.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
    grad.addColorStop(0.35, 'rgba(249, 115, 22, 0.85)');
    grad.addColorStop(0.75, 'rgba(185, 28, 28, 0.45)');
    grad.addColorStop(1, 'rgba(127, 29, 29, 0)');
    lCtx.fillStyle = grad;
    lCtx.beginPath();
    lCtx.arc(cx, cy, r, 0, Math.PI * 2);
    lCtx.fill();
  }

  // Cooled dark volcanic basalt crust patches floating on magma
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

  return {
    roadAlbedo,
    roadRoughness,
    carbonTexture,
    contactShadow,
    skyBackdrop,
    hazardStripe,
    lavaTexture,
    dispose: () => {
      roadAlbedo.dispose();
      roadRoughness.dispose();
      carbonTexture.dispose();
      contactShadow.dispose();
      skyBackdrop.dispose();
      hazardStripe.dispose();
      lavaTexture.dispose();
    },
  };
}
