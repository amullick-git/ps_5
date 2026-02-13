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
const BOSS_BG = 0x2a1414;

export function render(player, obstacles, collectibles, particles, shakeX, shakeY, nearMissGlow, hideObstacles = false, invincibleBlink = false, powerups = [], hasShield = false, bossWaveActive = false) {
  if (!scene || !camera || !renderer) return;

  if (scene.background) scene.background.setHex(bossWaveActive ? BOSS_BG : NORMAL_BG);
  if (groundMesh?.material?.color) groundMesh.material.color.setHex(bossWaveActive ? BOSS_BG : NORMAL_BG);

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

  const shakeOffX = (Math.random() - 0.5) * Math.abs(shakeX) / 30;
  const shakeOffZ = (Math.random() - 0.5) * Math.abs(shakeY) / 30;
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
