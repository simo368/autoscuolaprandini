import * as THREE from "three";

/**
 * Genera texture PBR procedurali ad alta definizione per asfalto, pietra chiara,
 * coppi in terracotta emiliana e segnaletica stradale italiana leggibile.
 */

export function createAsphaltTextures(isMobile = false): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = isMobile ? 256 : 512;

  const albedoCanvas = document.createElement("canvas");
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const aCtx = albedoCanvas.getContext("2d");

  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext("2d");

  if (aCtx && rCtx) {
    // Base asfalto italiano naturale (ardesia/grigio caldo, mai nero piatto)
    aCtx.fillStyle = "#3D454D";
    aCtx.fillRect(0, 0, size, size);

    rCtx.fillStyle = "#C8C8C8";
    rCtx.fillRect(0, 0, size, size);

    let seed = 104729;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    // Aggregato minerale fine e grana varia (scalato per risoluzione mobile/desktop)
    const speckleCount = isMobile ? 7500 : 28000;
    for (let i = 0; i < speckleCount; i++) {
      const x = Math.floor(rand() * size);
      const y = Math.floor(rand() * size);
      const sz = rand() > 0.85 ? 2 : 1;
      const v = Math.floor(46 + rand() * 38);
      aCtx.fillStyle = `rgb(${v}, ${v + 4}, ${v + 7})`;
      aCtx.fillRect(x, y, sz, sz);

      const rv = Math.floor(155 + rand() * 85);
      rCtx.fillStyle = `rgb(${rv}, ${rv}, ${rv})`;
      rCtx.fillRect(x, y, sz, sz);
    }

    // Leggera lucidatura longitudinale nelle tracce pneumatici
    const wearGrad = aCtx.createLinearGradient(0, 0, size, 0);
    wearGrad.addColorStop(0, "rgba(25,31,36,0.18)");
    wearGrad.addColorStop(0.24, "rgba(215,220,224,0.06)");
    wearGrad.addColorStop(0.5, "rgba(25,31,36,0.08)");
    wearGrad.addColorStop(0.76, "rgba(215,220,224,0.06)");
    wearGrad.addColorStop(1, "rgba(25,31,36,0.18)");
    aCtx.fillStyle = wearGrad;
    aCtx.fillRect(0, 0, size, size);

    const roughWear = rCtx.createLinearGradient(0, 0, size, 0);
    roughWear.addColorStop(0, "rgba(255,255,255,0.15)");
    roughWear.addColorStop(0.26, "rgba(95,95,95,0.22)");
    roughWear.addColorStop(0.5, "rgba(210,210,210,0.08)");
    roughWear.addColorStop(0.74, "rgba(95,95,95,0.22)");
    roughWear.addColorStop(1, "rgba(255,255,255,0.15)");
    rCtx.fillStyle = roughWear;
    rCtx.fillRect(0, 0, size, size);
  }

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1, 140);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = isMobile ? 2 : 8;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(1, 140);
  roughnessMap.anisotropy = isMobile ? 1 : 4;

  const bumpMap = new THREE.CanvasTexture(roughCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(1, 140);

  return { map, roughnessMap, bumpMap };
}

export function createStoneTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.fillStyle = "#E9E4D8";
    ctx.fillRect(0, 0, size, size);

    let seed = 4099;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let i = 0; i < 6000; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const tone = Math.floor(215 + rand() * 32);
      ctx.fillStyle = `rgba(${tone}, ${tone - 5}, ${tone - 14}, 0.45)`;
      ctx.fillRect(x, y, 3, 2);
    }

    // Venature sottili travertino/pietra chiara
    ctx.strokeStyle = "rgba(175, 166, 150, 0.24)";
    ctx.lineWidth = 1;
    for (let y = 0; y < size; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createRoadSignTexture(options: {
  bg: string;
  fg: string;
  border: string;
  kicker: string;
  title: string;
  subtitle?: string;
}): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.fillStyle = options.bg;
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = options.border;
    ctx.lineWidth = 10;
    ctx.strokeRect(14, 14, 484, 228);

    ctx.fillStyle = options.fg;
    ctx.font = "600 22px monospace";
    ctx.fillText(options.kicker, 42, 74);

    ctx.font = "700 46px sans-serif";
    ctx.fillText(options.title, 42, 142);

    if (options.subtitle) {
      ctx.globalAlpha = 0.85;
      ctx.font = "500 26px sans-serif";
      ctx.fillText(options.subtitle, 42, 198);
      ctx.globalAlpha = 1;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function createRoundaboutSignTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.fillStyle = "#1D5E9A";
    ctx.beginPath();
    ctx.arc(128, 128, 122, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#FAFAF7";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(128, 128, 114, 0, Math.PI * 2);
    ctx.stroke();

    // Frecce circolari rotatoria
    ctx.strokeStyle = "#FAFAF7";
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      const start = (i * Math.PI * 2) / 3 + 0.15;
      const end = start + 1.35;
      ctx.beginPath();
      ctx.arc(128, 128, 56, start, end);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

