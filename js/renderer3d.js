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

let scene, camera, renderer;
let playerMesh, particleMeshes = [];
let obstacleMeshes = new Set();
const playerGeometry = new THREE.SphereGeometry(0.2, 16, 16);
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x4CAF50 });
const obstacleMaterial = new THREE.MeshStandardMaterial({ color: 0xE53935 });
const particleGeometry = new THREE.SphereGeometry(0.05, 8, 8);
const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xE53935, transparent: true });

export function init(canvas, width, height) {
  if (scene) return;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
  camera.position.set(0, 6, 5);
  camera.lookAt(0, 0, 0);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 14),
    new THREE.MeshStandardMaterial({ color: 0x1a1a2e })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  scene.add(ground);

  const ambient = new THREE.AmbientLight(0x505070);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 0.7);
  dir.position.set(3, 10, 5);
  scene.add(dir);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  playerMesh = new THREE.Mesh(playerGeometry, playerMaterial.clone());
  scene.add(playerMesh);
}

export function renderBackground() {
  if (!scene || !camera || !renderer) return;
  renderer.render(scene, camera);
}

export function render(player, obstacles, particles, shakeX, shakeY, nearMissGlow, hideObstacles = false) {
  if (!scene || !camera || !renderer) return;

  const [px, pz] = to3D(player.x, player.y);
  playerMesh.position.set(px, 0.2, pz);
  playerMesh.visible = true;
  playerMesh.material.emissive = new THREE.Color(0x00D9FF).multiplyScalar(nearMissGlow * 0.5);

  for (const o of obstacles) {
    if (!o.mesh) {
      o.mesh = new THREE.Mesh(
        new THREE.BoxGeometry(o.w / SCALE, 0.3, o.h / SCALE),
        obstacleMaterial.clone()
      );
      scene.add(o.mesh);
      obstacleMeshes.add(o.mesh);
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
    particleMeshes[i].visible = true;
  });

  const shakeOffX = (Math.random() - 0.5) * Math.abs(shakeX) / 30;
  const shakeOffZ = (Math.random() - 0.5) * Math.abs(shakeY) / 30;
  camera.position.set(shakeOffX, 6, 5 + shakeOffZ);
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

export function reset() {
  obstacleMeshes.clear();
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
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}
