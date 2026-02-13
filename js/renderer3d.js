/**
 * Three.js 3D renderer — spheres, boxes, particles.
 * Maps 2D game coords (800×600) to 3D: x->x, y->z. Center (400,300)->(0,0).
 */

import * as THREE from 'three';

const SCALE = 100;
const CENTER_X = 400;
const CENTER_Y = 300;

function to3D(x, y) {
  return [(x - CENTER_X) / SCALE, (y - CENTER_Y) / SCALE];
}

let scene, camera, renderer, groundMesh;
let playerMesh, particleMeshes = [];
let obstacleMeshes = new Set();
let collectibleMeshes = new Set();
let powerupMeshes = new Set();
let portalMeshes = new Set();
const playerGeometry = new THREE.SphereGeometry(0.2, 32, 32);
const playerMaterial = new THREE.MeshStandardMaterial({
  color: 0x5EFF5E,
  emissive: 0x22DD22,
  emissiveIntensity: 0.15,
  metalness: 0.3,
  roughness: 0.4,
});
const particleGeometry = new THREE.SphereGeometry(0.05, 12, 12);
const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xE53935, transparent: true });
// Torus (ring) — clearly distinct from player sphere and obstacle boxes
const collectibleGeometry = new THREE.TorusGeometry(0.2, 0.08, 12, 16);

function createStarGeometry(outerRadius = 0.2, innerRadius = 0.1, points = 5, depth = 0.15) {
  const shape = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
  });
}

export function init(canvas, width, height) {
  if (scene) return;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
  camera.position.set(0, 4, 3.5);
  camera.lookAt(0, 0, 0);

  groundMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 14),
    new THREE.MeshStandardMaterial({ color: 0x1a1a2e })
  );
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = -0.01;
  scene.add(groundMesh);

  const ambient = new THREE.AmbientLight(0x505070);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 0.7);
  dir.position.set(3, 10, 5);
  scene.add(dir);

  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(dpr);
  renderer.setSize(width, height);

  playerMesh = new THREE.Mesh(playerGeometry, playerMaterial.clone());
  scene.add(playerMesh);
}

export function renderBackground() {
  if (!scene || !camera || !renderer) return;
  renderer.render(scene, camera);
}

const NORMAL_BG = 0x1a1a2e;
const BOSS_BG_DARK = 0x2a1414;
const BOSS_BG_LIGHT = 0x3a1e1e;
const PORTAL_BG = 0x1a0a2e;

export function render(player, obstacles, collectibles, particles, shakeX, shakeY, nearMissGlow, hideObstacles = false, invincibleBlink = false, powerups = [], hasShield = false, bossWaveActive = false, portals = [], portalMode = false) {
  if (!scene || !camera || !renderer) return;

  if (portalMode) {
    if (scene.background) scene.background.setHex(PORTAL_BG);
    if (groundMesh?.material?.color) groundMesh.material.color.setHex(PORTAL_BG);
  } else if (bossWaveActive) {
    const t = (Math.sin(Date.now() * 0.004) + 1) / 2; // 0..1 pulse
    const bossColor = new THREE.Color(BOSS_BG_DARK).lerp(new THREE.Color(BOSS_BG_LIGHT), t);
    if (scene.background) scene.background.copy(bossColor);
    if (groundMesh?.material?.color) groundMesh.material.color.copy(bossColor);
  } else {
    if (scene.background) scene.background.setHex(NORMAL_BG);
    if (groundMesh?.material?.color) groundMesh.material.color.setHex(NORMAL_BG);
  }

  const [px, pz] = to3D(player.x, player.y);
  playerMesh.position.set(px, 0.2, pz);
  playerMesh.visible = invincibleBlink ? Math.floor(Date.now() / 80) % 2 === 0 : true;
  // Near-miss: bright orange glow + scale pulse for very visible feedback
  const baseColor = new THREE.Color(0x5EFF5E);
  const nearMissColor = new THREE.Color(0xFF6600);
  playerMesh.material.color.copy(baseColor).lerp(nearMissColor, nearMissGlow);
  const baseEmissive = new THREE.Color(0x22DD22);
  const nearMissEmissive = new THREE.Color(0xFF6600);
  playerMesh.material.emissive.copy(baseEmissive).lerp(nearMissEmissive, nearMissGlow);
  playerMesh.material.emissiveIntensity = 0.15 + nearMissGlow * 0.7;
  const basePulse = 1 + Math.sin(Date.now() * 0.003) * 0.03;
  const nearMissScale = 1 + nearMissGlow * 0.25;
  playerMesh.scale.setScalar(basePulse * nearMissScale);

  if (hasShield && !playerMesh.shieldRing) {
    const ringGeo = new THREE.RingGeometry(0.28, 0.35, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x2196F3,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    playerMesh.shieldRing = new THREE.Mesh(ringGeo, ringMat);
    playerMesh.shieldRing.rotation.x = -Math.PI / 2;
    scene.add(playerMesh.shieldRing);
  }
  if (playerMesh.shieldRing) {
    playerMesh.shieldRing.visible = hasShield;
    if (hasShield) {
      playerMesh.shieldRing.position.set(px, 0.01, pz);
      playerMesh.shieldRing.rotation.z = Date.now() * 0.002;
    }
  }

  const t = Date.now() * 0.002;
  for (const c of collectibles || []) {
    if (!c.mesh) {
      const color = c.color ?? 0xFFD700;
      const emissive = new THREE.Color(color);
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive,
        emissiveIntensity: 0.25,
        metalness: 0.6,
      });
      c.mesh = new THREE.Mesh(collectibleGeometry.clone(), mat);
      c.mesh.rotation.x = Math.PI / 2;
      scene.add(c.mesh);
      collectibleMeshes.add(c.mesh);
    }
    const [cx, cz] = to3D(c.x, c.y);
    const bob = Math.sin(t) * 0.06;
    const pulse = 1 + Math.sin(t * 2) * 0.08;
    c.mesh.position.set(cx, 0.2 + bob, cz);
    c.mesh.rotation.y = t;
    c.mesh.scale.setScalar(pulse);
    c.mesh.visible = c.blinks ? Math.floor(t * 8) % 2 === 0 : true;
  }

  for (const p of powerups || []) {
    if (!p.mesh) {
      const color = p.color ?? 0x2196F3;
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.7,
        metalness: 0.3,
        roughness: 0.2,
      });
      p.mesh = new THREE.Mesh(createStarGeometry(0.2, 0.1, 5, 0.12), mat);
      p.mesh.rotation.x = Math.PI / 2;
      scene.add(p.mesh);
      powerupMeshes.add(p.mesh);
    }
    const [px3, pz3] = to3D(p.x, p.y);
    const bob = Math.sin(t) * 0.1;
    const pulse = 1 + Math.sin(t * 3) * 0.15;
    p.mesh.position.set(px3, 0.25 + bob, pz3);
    p.mesh.rotation.z = t * 1.2;
    p.mesh.scale.setScalar(pulse);
    p.mesh.visible = true;
  }

  for (const o of obstacles) {
    if (!o.mesh) {
      const color = o.color ?? 0xE53935;
      const isSuddenHard = o.suddenHard === true;
      const mat = isSuddenHard
        ? new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.5,
            metalness: 0.2,
            roughness: 0.3,
          })
        : new THREE.MeshStandardMaterial({
            color,
            emissive: new THREE.Color(color).multiplyScalar(0.12),
          });
      o.mesh = new THREE.Mesh(
        new THREE.BoxGeometry(o.w / SCALE, 0.3, o.h / SCALE, 2, 2, 2),
        mat
      );
      scene.add(o.mesh);
      obstacleMeshes.add(o.mesh);
    }
    if (o.suddenHard) {
      if (o.mesh?.material?.emissiveIntensity !== undefined) {
        o.mesh.material.emissiveIntensity = 0.4 + Math.sin(t * 4) * 0.2;
      }
      o.mesh.rotation.y = t * 1.5;
      o.mesh.rotation.x = t * 0.8;
    }
    const [ox, oz] = to3D(o.x + o.w / 2, o.y + o.h / 2);
    o.mesh.position.set(ox, 0.15, oz);
    o.mesh.visible = !hideObstacles;
  }

  for (const port of portals || []) {
    if (!port.mesh) {
      const baseColor = port.color ?? 0x9C27B0;
      const crystals = new THREE.Group();
      const count = 4;
      const radius = 0.32;
      const colors = [0x9C27B0, 0xAB47BC, 0xBA68C8, 0xE040FB];
      for (let i = 0; i < count; i++) {
        const geo = new THREE.OctahedronGeometry(0.12, 0);
        const mat = new THREE.MeshStandardMaterial({
          color: colors[i] ?? baseColor,
          emissive: colors[i] ?? baseColor,
          emissiveIntensity: 0.8,
          metalness: 0.5,
          roughness: 0.2,
        });
        const crystal = new THREE.Mesh(geo, mat);
        const angle = (i / count) * Math.PI * 2;
        crystal.position.set(Math.cos(angle) * radius, 0.25, Math.sin(angle) * radius);
        crystal.rotation.y = -angle;
        crystal.scale.set(1, 1.4, 0.7);
        crystals.add(crystal);
      }
      port.mesh = crystals;
      scene.add(port.mesh);
      portalMeshes.add(port.mesh);
    }
    const [portX, portZ] = to3D(port.x, port.y);
    port.mesh.position.set(portX, 0.15, portZ);
    port.mesh.rotation.y = t * 0.8;
    const throb = Math.sin(t * 5) * 0.5 + 0.5;
    const scale = 1 + throb * 0.08;
    const emissivePulse = 0.65 + throb * 0.2;
    port.mesh.scale.setScalar(scale);
    port.mesh.traverse((child) => {
      if (child.material?.emissiveIntensity !== undefined) {
        child.material.emissiveIntensity = emissivePulse;
      }
    });
    port.mesh.visible = true;
  }

  while (particleMeshes.length > particles.length) {
    const m = particleMeshes.pop();
    scene.remove(m);
    m.geometry.dispose();
    m.material.dispose();
  }
  particles.forEach((p, i) => {
    if (!particleMeshes[i]) {
      const m = new THREE.Mesh(particleGeometry.clone(), particleMaterial.clone());
      scene.add(m);
      particleMeshes.push(m);
    }
    const [mx, mz] = to3D(p.x, p.y);
    particleMeshes[i].position.set(mx, 0.1, mz);
    particleMeshes[i].material.opacity = p.life / p.maxLife;
    if (p.color !== undefined) {
      particleMeshes[i].material.color.setHex(p.color);
    }
    particleMeshes[i].visible = true;
  });

  let shakeOffX = (Math.random() - 0.5) * Math.abs(shakeX) / 30;
  let shakeOffZ = (Math.random() - 0.5) * Math.abs(shakeY) / 30;
  if (bossWaveActive) {
    const bossShake = 0.05;
    shakeOffX += (Math.random() - 0.5) * 2 * bossShake;
    shakeOffZ += (Math.random() - 0.5) * 2 * bossShake;
  }
  camera.position.set(shakeOffX, 4, 3.5 + shakeOffZ);
  camera.lookAt(shakeOffX, 0, shakeOffZ);

  renderer.render(scene, camera);
}

export function onObstacleRemoved(obstacle) {
  if (obstacle.mesh) {
    scene.remove(obstacle.mesh);
    obstacle.mesh.geometry.dispose();
    obstacle.mesh.material.dispose();
    obstacleMeshes.delete(obstacle.mesh);
    obstacle.mesh = null;
  }
}

export function onCollectibleRemoved(collectible) {
  if (collectible.mesh) {
    scene.remove(collectible.mesh);
    collectible.mesh.geometry.dispose();
    collectible.mesh.material.dispose();
    collectibleMeshes.delete(collectible.mesh);
    collectible.mesh = null;
  }
}

export function onPowerupRemoved(powerup) {
  if (powerup.mesh) {
    scene.remove(powerup.mesh);
    powerup.mesh.geometry.dispose();
    powerup.mesh.material.dispose();
    powerupMeshes.delete(powerup.mesh);
    powerup.mesh = null;
  }
}

export function onPortalRemoved(portal) {
  if (portal.mesh) {
    portal.mesh.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
    scene.remove(portal.mesh);
    portalMeshes.delete(portal.mesh);
    portal.mesh = null;
  }
}

export function reset() {
  obstacleMeshes.clear();
  collectibleMeshes.forEach(m => {
    if (m && m.parent) {
      scene.remove(m);
      m.geometry?.dispose();
      m.material?.dispose();
    }
  });
  collectibleMeshes.clear();
  powerupMeshes.forEach(m => {
    if (m && m.parent) {
      scene.remove(m);
      m.geometry?.dispose();
      m.material?.dispose();
    }
  });
  powerupMeshes.clear();
  portalMeshes.forEach(m => {
    if (m && m.parent) {
      m.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      scene.remove(m);
    }
  });
  portalMeshes.clear();
  if (playerMesh?.shieldRing) {
    scene.remove(playerMesh.shieldRing);
    playerMesh.shieldRing.geometry?.dispose();
    playerMesh.shieldRing.material?.dispose();
    playerMesh.shieldRing = null;
  }
  particleMeshes.forEach(m => {
    if (m && m.parent) {
      scene.remove(m);
      m.geometry?.dispose();
      m.material?.dispose();
    }
  });
  particleMeshes = [];
}

export function resize(width, height) {
  if (!camera || !renderer) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(dpr);
  renderer.setSize(width, height);
}
