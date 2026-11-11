import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EMERGENCY_CONTACT_NUMBER, PROVIDER_DOMAIN } from '../utils/invitationLogic';
import sandhyaArghyaImg from '../assets/images/chhath_sandhya_arghya_1794398072426.jpg';
import ushaArghyaImg from '../assets/images/chhath_usha_arghya_1794398073709.jpg';
import soopPrasadImg from '../assets/images/chhath_soop_prasad_1794398075597.jpg';
import ajiDamFireworksImg from '../assets/images/aji_dam_festive_ghat_1794398075217.jpg';

export type CameraPreset = 'overview' | 'mobile' | 'ghat' | 'fireworks';

interface ChhathThreeSceneProps {
  guestName: string | null;
  cameraPreset: CameraPreset;
  fireworkTriggerCount: number;
  onSelectPhotoIndex?: (index: number) => void;
}

// Pre-allocated reusable math helpers outside render loop (Zero GC inside rAF)
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3(0, 1.8, 0);
const _dummyMatrix = new THREE.Matrix4();
const _dummyPos = new THREE.Vector3();
const _dummyEuler = new THREE.Euler();
const _dummyQuat = new THREE.Quaternion();
const _dummyScale = new THREE.Vector3();
const _dummyColor = new THREE.Color();

interface FireworkRocket {
  origin: THREE.Vector3;
  color: THREE.Color;
  age: number;
  maxAge: number;
  velocities: Float32Array;
  points: THREE.Points;
}

/**
 * Generates a tileable stone bump/roughness CanvasTexture for the Aji Dam Ghat steps.
 */
function createProceduralStoneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#5a4d41';
  ctx.fillRect(0, 0, 256, 256);

  // Masonry courses & organic grain
  for (let y = 0; y < 256; y += 32) {
    ctx.fillStyle = '#3d332a';
    ctx.fillRect(0, y, 256, 2);
    const offset = (y / 32) % 2 === 0 ? 0 : 32;
    for (let x = offset; x < 256; x += 64) {
      ctx.fillRect(x, y, 2, 32);
    }
  }
  for (let i = 0; i < 1200; i++) {
    const x = (i * 73) % 256;
    const y = (i * 137) % 256;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,235,205,0.07)' : 'rgba(0,0,0,0.12)';
    ctx.fillRect(x, y, 3, 3);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 2);
  return tex;
}

/**
 * Renders the live personalized Chhath Puja invitation card onto the 3D Mobile Phone's screen texture.
 */
function drawMobileScreenCanvas(
  canvas: HTMLCanvasElement,
  guestName: string | null,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;

  // Deep festive twilight & saffron-gold gradient background
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#1A0B1E');
  grad.addColorStop(0.45, '#3B1219');
  grad.addColorStop(1, '#120817');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Ornate golden double border
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 6;
  ctx.strokeRect(22, 22, w - 44, h - 44);
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(34, 34, w - 68, h - 68);

  // Glowing Rising Sun (Surya Dev) emblem at top
  const sunGrad = ctx.createRadialGradient(w / 2, 165, 10, w / 2, 165, 85);
  sunGrad.addColorStop(0, '#FFFBEB');
  sunGrad.addColorStop(0.4, '#F59E0B');
  sunGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(w / 2, 165, 85, 0, Math.PI * 2);
  ctx.fill();

  // Header badge
  ctx.fillStyle = '#FDE68A';
  ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CHHATH PUJA MAHAPARV · 3D INVITE', w / 2, 290);

  // Personalized Guest Greeting
  const displayGuest = guestName && guestName.trim() ? guestName.trim() : 'Your Family & Friends';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 34px "Cinzel", Georgia, serif';
  ctx.fillText('Hey, Welcome', w / 2, 355);

  ctx.fillStyle = '#FBBF24';
  ctx.font = '700 38px "Cinzel", Georgia, serif';
  const clippedName = displayGuest.length > 20 ? displayGuest.slice(0, 19) + '…' : displayGuest;
  ctx.fillText(`${clippedName}!`, w / 2, 408);

  // Divider line
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, 442);
  ctx.lineTo(w - 80, 442);
  ctx.stroke();

  // Venue Box: Aji Dam, Rajkot (Exact Pin)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.fillRect(54, 468, w - 108, 185);
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(54, 468, w - 108, 185);

  ctx.fillStyle = '#FDBA74';
  ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('EXACT PIN · 22°16\'28.2"N 70°50\'28.8"E', w / 2, 502);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 28px "Cinzel", Georgia, serif';
  ctx.fillText('Aji Dam, Rajkot', w / 2, 540);

  ctx.fillStyle = '#E2E8F0';
  ctx.font = '500 17px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('15 Nov · Evening near 4:00 PM (Sandhya)', w / 2, 576);
  ctx.fillStyle = '#FDE047';
  ctx.fillText('16 Nov · Morning near 4:00 AM (Usha)', w / 2, 608);
  ctx.fillStyle = '#93C5FD';
  ctx.font = '600 15px "JetBrains Mono", monospace';
  ctx.fillText('maps.app.goo.gl/Q4TCMoh9ziCaPK7VA', w / 2, 638);

  // Emergency Contact & Safe Weekend Badge
  ctx.fillStyle = 'rgba(16, 185, 129, 0.16)';
  ctx.fillRect(54, 675, w - 108, 92);
  ctx.strokeStyle = '#34D399';
  ctx.lineWidth = 2;
  ctx.strokeRect(54, 675, w - 108, 92);

  ctx.fillStyle = '#6EE7B7';
  ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('SAFE WEEKEND EMERGENCY HELPLINE', w / 2, 710);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 25px "JetBrains Mono", monospace';
  ctx.fillText(EMERGENCY_CONTACT_NUMBER, w / 2, 748);

  // Provider attribution at bottom of 3D mobile screen
  ctx.fillStyle = '#FBBF24';
  ctx.font = '600 19px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Provided by ${PROVIDER_DOMAIN}`, w / 2, 825);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Interactive 3D Mobile · Drag to Orbit', w / 2, 860);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export const ChhathThreeScene: React.FC<ChhathThreeSceneProps> = ({
  guestName,
  cameraPreset,
  fireworkTriggerCount,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const guestNameRef = useRef<string | null>(guestName);
  const cameraPresetRef = useRef<CameraPreset>(cameraPreset);
  const screenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenTexRef = useRef<THREE.CanvasTexture | null>(null);
  const maxAnisoRef = useRef<number>(1);
  const spawnFireworkRef = useRef<(() => void) | null>(null);
  const userInteractingRef = useRef<boolean>(false);

  // Update 3D Mobile Phone screen texture dynamically whenever guestName changes
  useEffect(() => {
    guestNameRef.current = guestName;
    if (screenCanvasRef.current && screenTexRef.current) {
      drawMobileScreenCanvas(screenCanvasRef.current, guestName, maxAnisoRef.current);
      screenTexRef.current.needsUpdate = true;
    }
  }, [guestName]);

  // Update camera target preset smoothly
  useEffect(() => {
    cameraPresetRef.current = cameraPreset;
    userInteractingRef.current = false;
  }, [cameraPreset]);

  // Trigger extra fireworks burst when user clicks Launch Crackers / Share / Next
  useEffect(() => {
    if (fireworkTriggerCount > 0 && spawnFireworkRef.current) {
      spawnFireworkRef.current();
      spawnFireworkRef.current();
    }
  }, [fireworkTriggerCount]);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // 1. Software-WebGL guard per threejs & ultra-mode skill
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    maxAnisoRef.current = maxAnisotropy;

    const scene = new THREE.Scene();
    const horizonColor = new THREE.Color(0x0B0914);
    scene.background = horizonColor;
    scene.fog = new THREE.FogExp2(0x0B0914, 0.006);

    // Mandatory Studio PBR Environment Map (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 160);
    camera.position.set(-0.9, 3.3, 8.8);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 3.2;
    controls.maxDistance = 26;
    controls.target.set(-0.9, 2.2, 0.6);

    controls.addEventListener('start', () => {
      userInteractingRef.current = true;
    });

    // 2. Balanced 3-Point Studio + Sunset Ghat Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xfde68a, 0x3b1219, 1.65);
    scene.add(hemiLight);

    // Warm Golden Arghya Key Light
    const sunKeyLight = new THREE.DirectionalLight(0xffa94d, 2.8);
    sunKeyLight.position.set(8, 12, -14);
    sunKeyLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      sunKeyLight.shadow.mapSize.width = 1024;
      sunKeyLight.shadow.mapSize.height = 1024;
      sunKeyLight.shadow.camera.near = 1;
      sunKeyLight.shadow.camera.far = 45;
      const d = 14;
      sunKeyLight.shadow.camera.left = -d;
      sunKeyLight.shadow.camera.right = d;
      sunKeyLight.shadow.camera.top = d;
      sunKeyLight.shadow.camera.bottom = -d;
      sunKeyLight.shadow.bias = -0.0005;
      sunKeyLight.shadow.normalBias = 0.02;
    }
    scene.add(sunKeyLight);

    // Warm Diya Fill Light near water
    const diyaFillLight = new THREE.PointLight(0xff8c1a, 2.8, 18);
    diyaFillLight.position.set(0, 1.5, 2.5);
    scene.add(diyaFillLight);

    // Cool Rim Light for 3D Mobile Phone separation
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.1);
    rimLight.position.set(-9, 6, 8);
    scene.add(rimLight);

    // 3. Sacred Rising/Setting Surya Orb on the Aji Dam Horizon
    const sunGroup = new THREE.Group();
    sunGroup.position.set(0, 5.2, -26);
    const sunOrbGeo = new THREE.SphereGeometry(3.4, 32, 32);
    const sunOrbMat = new THREE.MeshBasicMaterial({ color: 0xffb703 });
    const sunOrb = new THREE.Mesh(sunOrbGeo, sunOrbMat);
    sunGroup.add(sunOrb);

    const sunHaloGeo = new THREE.RingGeometry(3.6, 5.4, 48);
    const sunHaloMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });
    const sunHalo = new THREE.Mesh(sunHaloGeo, sunHaloMat);
    sunGroup.add(sunHalo);
    scene.add(sunGroup);

    // 4. Aji Dam Reservoir Water & Surrounding Dam Hills (Natural Outdoor Perimeter)
    const waterGeo = new THREE.PlaneGeometry(90, 90, 28, 28);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.14,
      metalness: 0.82,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = 0;
    waterMesh.receiveShadow = !isSoftwareGl;
    scene.add(waterMesh);

    // Earthen Aji Dam Embankment & Saurashtra Hills on Horizon
    const hillMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b2e,
      roughness: 0.88,
      metalness: 0.08,
    });
    const damWallGeo = new THREE.BoxGeometry(56, 3.2, 4.5);
    const damWall = new THREE.Mesh(damWallGeo, hillMat);
    damWall.position.set(0, 1.4, -24);
    scene.add(damWall);

    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue;
      const hillGeo = new THREE.ConeGeometry(7 + Math.abs(i) * 1.5, 5.5, 7);
      const hill = new THREE.Mesh(hillGeo, hillMat);
      hill.position.set(i * 11, 2.5, -26 - Math.abs(i) * 2);
      scene.add(hill);
    }

    // 5. Composite Model #1: Aji Dam Chhath Puja Ghat & Ceremonial Mandap (10-part THREE.Group)
    const ghatGroup = new THREE.Group();
    ghatGroup.position.set(0, 0, 0);
    const stoneTex = createProceduralStoneTexture();
    stoneTex.anisotropy = maxAnisotropy;

    const ghatStoneMat = new THREE.MeshStandardMaterial({
      color: 0x8c735b,
      roughness: 0.78,
      metalness: 0.1,
      bumpMap: stoneTex,
      bumpScale: 0.04,
    });
    const sandstoneTrimMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.48,
      metalness: 0.25,
    });
    const goldOrnamentMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.2,
      metalness: 0.9,
    });

    // Stepped stone ghat tiers descending toward the water (+Z is viewer, water is all around)
    for (let step = 0; step < 4; step++) {
      const stepWidth = 15 - step * 1.1;
      const stepDepth = 6.5 - step * 1.1;
      const stepHeight = 0.28;
      const stepGeo = new THREE.BoxGeometry(stepWidth, stepHeight, stepDepth);
      const stepMesh = new THREE.Mesh(stepGeo, ghatStoneMat);
      stepMesh.position.set(0, 0.14 + step * 0.26, -1.2 - step * 0.35);
      stepMesh.receiveShadow = !isSoftwareGl;
      stepMesh.castShadow = !isSoftwareGl;
      ghatGroup.add(stepMesh);
    }

    // 4 Carved Ceremonial Mandap Pillars on the Ghat
    const pillarPositions = [
      [-4.6, -2.6],
      [4.6, -2.6],
      [-4.6, 0.2],
      [4.6, 0.2],
    ];
    const pillarGeo = new THREE.CylinderGeometry(0.18, 0.24, 3.2, 16);
    const pillarBaseGeo = new THREE.BoxGeometry(0.65, 0.35, 0.65);
    const kalashDomeGeo = new THREE.SphereGeometry(0.28, 16, 12);

    pillarPositions.forEach(([px, pz]) => {
      const base = new THREE.Mesh(pillarBaseGeo, sandstoneTrimMat);
      base.position.set(px, 1.15, pz);
      ghatGroup.add(base);

      const col = new THREE.Mesh(pillarGeo, ghatStoneMat);
      col.position.set(px, 2.8, pz);
      col.castShadow = !isSoftwareGl;
      ghatGroup.add(col);

      const finial = new THREE.Mesh(kalashDomeGeo, goldOrnamentMat);
      finial.position.set(px, 4.55, pz);
      ghatGroup.add(finial);
    });

    // Marigold Toran Garland Swag connecting front pillars (TubeGeometry)
    const toranCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4.6, 4.2, 0.2),
      new THREE.Vector3(-2.3, 3.65, 0.25),
      new THREE.Vector3(0, 4.1, 0.3),
      new THREE.Vector3(2.3, 3.65, 0.25),
      new THREE.Vector3(4.6, 4.2, 0.2),
    ]);
    const toranGeo = new THREE.TubeGeometry(toranCurve, 28, 0.09, 10, false);
    const toranMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0x9a3412,
      emissiveIntensity: 0.35,
      roughness: 0.6,
    });
    const toranMesh = new THREE.Mesh(toranGeo, toranMat);
    ghatGroup.add(toranMesh);

    // Sacred Sugarcane (Ikh) Clusters flanking the Ghat Steps
    const caneGeo = new THREE.CylinderGeometry(0.04, 0.05, 2.8, 8);
    const caneMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.55 });
    [
      [-5.4, 0.9, 0.6],
      [-5.2, 0.9, 0.7],
      [5.4, 0.9, 0.6],
      [5.2, 0.9, 0.7],
    ].forEach(([cx, cy, cz], idx) => {
      const cane = new THREE.Mesh(caneGeo, caneMat);
      cane.position.set(cx, cy + 1.1, cz);
      cane.rotation.z = (idx % 2 === 0 ? 1 : -1) * 0.14;
      ghatGroup.add(cane);
    });

    scene.add(ghatGroup);

    // 6. Composite Model #2: 3D Interactive Mobile Phone Showcase (9-part THREE.Group)
    const mobileGroup = new THREE.Group();
    mobileGroup.position.set(0, 2.75, 1.35);

    // Soft radial contact shadow on the ghat beneath the floating 3D Mobile Phone
    const contactShadowGeo = new THREE.CircleGeometry(1.15, 32);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0, 0.96, 1.35);
    scene.add(contactShadow);

    // Part 1: Rounded Brushed-Gold Metallic Chassis (ExtrudeGeometry with bevel)
    const phoneW = 1.65;
    const phoneH = 3.25;
    const radius = 0.22;
    const shape = new THREE.Shape();
    const hw = phoneW / 2 - radius;
    const hh = phoneH / 2 - radius;
    shape.moveTo(-hw, -phoneH / 2);
    shape.lineTo(hw, -phoneH / 2);
    shape.absarc(hw, -hh, radius, -Math.PI / 2, 0, false);
    shape.lineTo(phoneW / 2, hh);
    shape.absarc(hw, hh, radius, 0, Math.PI / 2, false);
    shape.lineTo(-hw, phoneH / 2);
    shape.absarc(-hw, hh, radius, Math.PI / 2, Math.PI, false);
    shape.lineTo(-phoneW / 2, -hh);
    shape.absarc(-hw, -hh, radius, Math.PI, Math.PI * 1.5, false);

    const chassisGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.035,
      bevelThickness: 0.035,
    });
    chassisGeo.center();

    const chassisMat = new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b,
      metalness: 0.92,
      roughness: 0.18,
      clearcoat: 0.6,
    });
    const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
    chassisMesh.castShadow = !isSoftwareGl;
    mobileGroup.add(chassisMesh);

    // Part 2: Obsidian Inner Bezel Frame
    const bezelGeo = new THREE.BoxGeometry(1.56, 3.14, 0.04);
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.25,
      metalness: 0.5,
    });
    const bezelMesh = new THREE.Mesh(bezelGeo, bezelMat);
    bezelMesh.position.z = 0.09;
    mobileGroup.add(bezelMesh);

    // Part 3: High-Resolution Live Personalized Invitation Display Screen
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = 512;
    screenCanvas.height = 960;
    screenCanvasRef.current = screenCanvas;
    const screenTexture = drawMobileScreenCanvas(screenCanvas, guestNameRef.current, maxAnisotropy);
    screenTexRef.current = screenTexture;

    const screenGeo = new THREE.PlaneGeometry(1.46, 2.96);
    const screenMat = new THREE.MeshBasicMaterial({
      map: screenTexture,
    });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.z = 0.115;
    mobileGroup.add(screenMesh);

    // Part 4: Dynamic Island / Front Earpiece Speaker Pill
    const speakerGeo = new THREE.BoxGeometry(0.36, 0.065, 0.01);
    const speakerMat = new THREE.MeshStandardMaterial({ color: 0x030712, roughness: 0.4 });
    const speakerMesh = new THREE.Mesh(speakerGeo, speakerMat);
    speakerMesh.position.set(0, 1.38, 0.12);
    mobileGroup.add(speakerMesh);

    // Part 5 & 6: Side Metallic Power & Volume Buttons
    const btnGeo = new THREE.BoxGeometry(0.04, 0.34, 0.06);
    const powerBtn = new THREE.Mesh(btnGeo, goldOrnamentMat);
    powerBtn.position.set(phoneW / 2 + 0.04, 0.45, 0);
    mobileGroup.add(powerBtn);

    const volUpBtn = new THREE.Mesh(btnGeo, goldOrnamentMat);
    volUpBtn.position.set(-phoneW / 2 - 0.04, 0.55, 0);
    mobileGroup.add(volUpBtn);

    const volDownBtn = new THREE.Mesh(btnGeo, goldOrnamentMat);
    volDownBtn.position.set(-phoneW / 2 - 0.04, 0.1, 0);
    mobileGroup.add(volDownBtn);

    // Part 7 & 8: Rear Pro Camera Island + Optical Lenses (visible when user orbits behind phone)
    const camIslandGeo = new THREE.BoxGeometry(0.68, 0.72, 0.05);
    const camIsland = new THREE.Mesh(camIslandGeo, bezelMat);
    camIsland.position.set(-0.34, 1.02, -0.11);
    mobileGroup.add(camIsland);

    const lensGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.06, 20);
    lensGeo.rotateX(Math.PI / 2);
    const lensMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.95,
      roughness: 0.1,
    });
    [
      [-0.48, 1.18],
      [-0.48, 0.86],
      [-0.2, 1.02],
    ].forEach(([lx, ly]) => {
      const lens = new THREE.Mesh(lensGeo, lensMat);
      lens.position.set(lx, ly, -0.13);
      mobileGroup.add(lens);
    });

    // Part 9: Floating 3D Golden Diya Emblem hovering just above the 3D Mobile Phone
    const crownDiyaGroup = new THREE.Group();
    crownDiyaGroup.position.set(0, 1.92, 0);
    const diyaBowlGeo = new THREE.LatheGeometry(
      [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.22, 0.04),
        new THREE.Vector2(0.32, 0.16),
        new THREE.Vector2(0.26, 0.22),
      ],
      20
    );
    const diyaBowlMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.35,
      metalness: 0.75,
    });
    const crownBowl = new THREE.Mesh(diyaBowlGeo, diyaBowlMat);
    crownDiyaGroup.add(crownBowl);

    const flameGeo = new THREE.ConeGeometry(0.08, 0.26, 12);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const crownFlame = new THREE.Mesh(flameGeo, flameMat);
    crownFlame.position.set(0, 0.31, 0);
    crownDiyaGroup.add(crownFlame);
    mobileGroup.add(crownDiyaGroup);

    scene.add(mobileGroup);

    // 7. 3D Framed AI Photo Monoliths flanking the Aji Dam Ghat (4 generated images)
    const photoUrls = [
      sandhyaArghyaImg,
      ushaArghyaImg,
      soopPrasadImg,
      ajiDamFireworksImg,
    ];
    const fallbackPhotoUrls = [
      '/images/chhath_sandhya_arghya.jpg',
      '/images/chhath_usha_arghya.jpg',
      '/images/chhath_soop_prasad.jpg',
      '/images/aji_dam_festive_ghat.jpg',
    ];
    const monolithTransforms = [
      { pos: [-5.6, 2.35, 2.4], rotY: 0.48 },
      { pos: [-3.1, 2.45, -1.5], rotY: 0.22 },
      { pos: [3.1, 2.45, -1.5], rotY: -0.22 },
      { pos: [5.6, 2.35, 2.4], rotY: -0.48 },
    ];
    const texLoader = new THREE.TextureLoader();
    const loadedPhotoTextures: THREE.Texture[] = [];

    const frameOuterGeo = new THREE.BoxGeometry(2.15, 1.5, 0.1);
    const framePhotoGeo = new THREE.PlaneGeometry(1.95, 1.3);

    monolithTransforms.forEach((tr, idx) => {
      const cardGroup = new THREE.Group();
      cardGroup.position.set(tr.pos[0], tr.pos[1], tr.pos[2]);
      cardGroup.rotation.y = tr.rotY;

      const outerFrame = new THREE.Mesh(frameOuterGeo, goldOrnamentMat);
      cardGroup.add(outerFrame);

      const photoMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.3,
        metalness: 0.1,
      });
      const applyTexture = (tex: THREE.Texture) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = maxAnisotropy;
        photoMat.map = tex;
        photoMat.needsUpdate = true;
        loadedPhotoTextures.push(tex);
      };
      texLoader.load(
        photoUrls[idx],
        applyTexture,
        undefined,
        () => {
          texLoader.load(
            fallbackPhotoUrls[idx],
            applyTexture,
            undefined,
            () => {
              photoMat.color.setHex(0xf59e0b);
            }
          );
        }
      );

      const photoPlane = new THREE.Mesh(framePhotoGeo, photoMat);
      photoPlane.position.z = 0.06;
      cardGroup.add(photoPlane);

      scene.add(cardGroup);
    });

    // 8. Floating Earthen Diyas on Aji Dam Reservoir Water (InstancedMesh of 36 lamps)
    const DIYA_COUNT = 36;
    const instDiyaBowlGeo = new THREE.CylinderGeometry(0.18, 0.1, 0.09, 12);
    const instDiyaBowlMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.65,
      metalness: 0.2,
    });
    const instDiyaBowls = new THREE.InstancedMesh(instDiyaBowlGeo, instDiyaBowlMat, DIYA_COUNT);

    const instFlameGeo = new THREE.ConeGeometry(0.055, 0.16, 8);
    const instFlameMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    const instFlames = new THREE.InstancedMesh(instFlameGeo, instFlameMat, DIYA_COUNT);

    const diyaSeeds: Array<{ x: number; z: number; phase: number; scale: number }> = [];
    for (let i = 0; i < DIYA_COUNT; i++) {
      const angle = (i / DIYA_COUNT) * Math.PI * 1.35 - Math.PI * 0.675;
      const radiusDist = 3.2 + (i % 5) * 1.45 + ((i * 17) % 10) * 0.12;
      const x = Math.sin(angle) * radiusDist;
      const z = Math.cos(angle) * radiusDist + 1.2;
      const scale = 0.88 + (i % 4) * 0.08;
      diyaSeeds.push({ x, z, phase: i * 0.7, scale });

      _dummyPos.set(x, 0.05, z);
      _dummyEuler.set(0, i * 0.5, 0);
      _dummyQuat.setFromEuler(_dummyEuler);
      _dummyScale.set(scale, scale, scale);
      _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
      instDiyaBowls.setMatrixAt(i, _dummyMatrix);

      _dummyPos.set(x, 0.16, z);
      _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
      instFlames.setMatrixAt(i, _dummyMatrix);

      _dummyColor.setHSL(0.08 + (i % 3) * 0.015, 0.9, 0.55);
      instDiyaBowls.setColorAt(i, _dummyColor);
    }
    instDiyaBowls.instanceMatrix.needsUpdate = true;
    instFlames.instanceMatrix.needsUpdate = true;
    if (instDiyaBowls.instanceColor) instDiyaBowls.instanceColor.needsUpdate = true;
    instDiyaBowls.computeBoundingSphere();
    instFlames.computeBoundingSphere();
    instDiyaBowls.frustumCulled = false;
    instFlames.frustumCulled = false;
    scene.add(instDiyaBowls);
    scene.add(instFlames);

    // 9. 3D Festive Fireworks & Crackers Particle System
    const fireworksGroup = new THREE.Group();
    scene.add(fireworksGroup);
    const activeFireworks: FireworkRocket[] = [];
    const fireworkPalette = [0xfbbf24, 0xf97316, 0xec4899, 0x34d399, 0x38bdf8, 0xa855f7];

    function spawnFireworkBurst() {
      const particleCount = 64;
      const positions = new Float32Array(particleCount * 3);
      const velocities = new Float32Array(particleCount * 3);

      const originX = (Math.random() - 0.5) * 14;
      const originY = 5.5 + Math.random() * 4.5;
      const originZ = -3 - Math.random() * 10;

      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = originX;
        positions[i * 3 + 1] = originY;
        positions[i * 3 + 2] = originZ;

        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const speed = 1.8 + Math.random() * 3.2;

        velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
        velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
        velocities[i * 3 + 2] = Math.cos(phi) * speed;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const colorHex = fireworkPalette[Math.floor(Math.random() * fireworkPalette.length)];
      const mat = new THREE.PointsMaterial({
        color: colorHex,
        size: 0.24,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const points = new THREE.Points(geo, mat);
      fireworksGroup.add(points);

      activeFireworks.push({
        origin: new THREE.Vector3(originX, originY, originZ),
        color: new THREE.Color(colorHex),
        age: 0,
        maxAge: 2.0,
        velocities,
        points,
      });
    }

    spawnFireworkRef.current = spawnFireworkBurst;
    // Initial celebratory firework bursts
    spawnFireworkBurst();
    spawnFireworkBurst();

    // Pre-warm shaders on GPU
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 10. Render Loop with Software-WebGL afterDraw Pacing & Exponential Damping
    let frameId = 0;
    let isDisposed = false;
    const startTimeMs = performance.now();
    let lastTimeMs = startTimeMs;
    let fireworkSpawnTimer = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (isDisposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (isDisposed) return;
      const nowMs = performance.now();
      const dt = Math.min((nowMs - lastTimeMs) / 1000, 0.1);
      lastTimeMs = nowMs;
      const elapsed = (nowMs - startTimeMs) / 1000;

      // Gentle floating & rotation of 3D Mobile Phone showcase
      mobileGroup.position.y = 2.72 + Math.sin(elapsed * 1.6) * 0.1;
      mobileGroup.rotation.y = Math.sin(elapsed * 0.55) * 0.28;
      crownFlame.scale.y = 0.9 + Math.sin(elapsed * 9.0) * 0.18;

      // Subtle floating motion of 36 earthen diyas on Aji Dam water
      for (let i = 0; i < DIYA_COUNT; i++) {
        const seed = diyaSeeds[i];
        const bobY = 0.05 + Math.sin(elapsed * 2.1 + seed.phase) * 0.025;
        const driftX = seed.x + Math.sin(elapsed * 0.4 + seed.phase) * 0.08;
        _dummyPos.set(driftX, bobY, seed.z);
        _dummyEuler.set(0, seed.phase, 0);
        _dummyQuat.setFromEuler(_dummyEuler);
        _dummyScale.set(seed.scale, seed.scale, seed.scale);
        _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
        instDiyaBowls.setMatrixAt(i, _dummyMatrix);

        const flicker = seed.scale * (0.88 + Math.sin(elapsed * 10 + seed.phase * 3) * 0.16);
        _dummyPos.set(driftX, bobY + 0.11, seed.z);
        _dummyScale.set(seed.scale, flicker, seed.scale);
        _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
        instFlames.setMatrixAt(i, _dummyQuat ? _dummyMatrix : _dummyMatrix);
      }
      instDiyaBowls.instanceMatrix.needsUpdate = true;
      instFlames.instanceMatrix.needsUpdate = true;

      // Periodic festive fireworks bursts over Aji Dam
      fireworkSpawnTimer += dt;
      if (fireworkSpawnTimer > 1.85 && activeFireworks.length < 5) {
        fireworkSpawnTimer = 0;
        spawnFireworkBurst();
      }

      for (let i = activeFireworks.length - 1; i >= 0; i--) {
        const fw = activeFireworks[i];
        fw.age += dt;
        if (fw.age >= fw.maxAge) {
          fireworksGroup.remove(fw.points);
          fw.points.geometry.dispose();
          (fw.points.material as THREE.Material).dispose();
          activeFireworks.splice(i, 1);
          continue;
        }
        const posAttr = fw.points.geometry.getAttribute('position') as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        const count = arr.length / 3;
        for (let p = 0; p < count; p++) {
          arr[p * 3] += fw.velocities[p * 3] * dt;
          arr[p * 3 + 1] += fw.velocities[p * 3 + 1] * dt - 1.2 * dt; // Gravity
          arr[p * 3 + 2] += fw.velocities[p * 3 + 2] * dt;
        }
        posAttr.needsUpdate = true;
        const mat = fw.points.material as THREE.PointsMaterial;
        mat.opacity = Math.max(0, 1 - fw.age / fw.maxAge);
      }

      // Smooth exponential camera damping when preset changes and user isn't manually dragging
      if (!userInteractingRef.current) {
        const preset = cameraPresetRef.current;
        if (preset === 'mobile') {
          _targetCamPos.set(-0.6, 2.8, 5.4);
          _targetLookAt.set(-0.6, 2.65, 1.35);
        } else if (preset === 'ghat') {
          _targetCamPos.set(4.5, 3.6, 8.2);
          _targetLookAt.set(-0.8, 1.8, -0.5);
        } else if (preset === 'fireworks') {
          _targetCamPos.set(-1.0, 3.2, 13.5);
          _targetLookAt.set(-1.0, 4.5, -6);
        } else {
          _targetCamPos.set(-1.1, 4.1, 10.6);
          _targetLookAt.set(-1.1, 2.1, 0.5);
        }
        const dampAlpha = 1 - Math.exp(-3.5 * dt);
        camera.position.lerp(_targetCamPos, dampAlpha);
        _currentLookAt.lerp(_targetLookAt, dampAlpha);
        controls.target.copy(_currentLookAt);
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    const handleResize = () => {
      if (!container || isDisposed) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      stoneTex.dispose();
      screenTexture.dispose();
      loadedPhotoTextures.forEach((t) => t.dispose());
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={canvasMountRef}
      data-testid="chhath-three-canvas"
      className="w-full h-full relative select-none"
      aria-label="Interactive 3D Chhath Puja Aji Dam Ghat and 3D Mobile Invitation Scene"
    />
  );
};
