
import * as THREE from 'three';
import { 
    BloomEffect, 
    ToneMappingEffect, 
    SSAOEffect,
    DepthOfFieldEffect,
    NoiseEffect, 
    ChromaticAberrationEffect, 
    GodRaysEffect,
    EffectComposer, 
    EffectPass, 
    RenderPass 
} from "postprocessing";

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

import { bgShaderMaterial } from './scripts/background.js'
import { CameraControls } from './scripts/camera.js'
import { loadPointsFromJson } from './scripts/tour.js'

// Utils
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
const wrap  = (v, low, high) => low + ((((v - low) % (high - low)) + (high - low)) % (high - low));
const sign  = x => (x > 0) - (x < 0);

// Scene variables
let clock, scene, camera, renderer, composer, controls, museum;
let savedCameraPosition = JSON.parse(localStorage.getItem("cameraPosition")) || { x: 4, y: 4, z: 4 };
const loadingScreen = document.getElementById("loading-screen");

// Background variables
let bgShaderMat = bgShaderMaterial; // alias if you wish
let bgMesh, bgRenderTarget; // no longer needed if using a dedicated pass
let bgCamera, bgScene;

// Movement
let tour_path    = null;
let path_pos     = 0.0;
let path_vel     = 0.0;
const path_acc   = 0.025;
const path_fricc = 0.065;
const path_terminal_vel = 0.10;

function initRenderer() {
  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById("three-canvas"),
    antialias: true,
    stencil: true,
    depth: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.autoClear = false;
}

function initSceneAndCamera() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(savedCameraPosition.x, savedCameraPosition.y, savedCameraPosition.z);
  scene.add(camera);
}

function initLights() {
  scene.add(new THREE.AmbientLight(0xf0f0f0, 2));
}

function loadEnvironment() {
  new EXRLoader().load('../assets/exr/the_sky_is_on_fire_4k.exr', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
  });
}

function loadMuseumModel() {
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
  loader.setDRACOLoader(draco);

  loader.load("../assets/MuseumFinal.glb", (gltf) => {
    museum = gltf.scene;
    scene.add(museum);
    loadingScreen.classList.add("hide");
  });
}

function initControls() {
  controls = new CameraControls(camera, renderer);
}

// Revised: Instead of rendering the background to a render target manually,
// we initialize a separate scene with an orthographic camera and a full-screen quad.
function initBackgroundShader() {
  bgScene = new THREE.Scene();
  // Create an orthographic camera that covers the viewport.
  bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  
  const quadGeometry = new THREE.PlaneGeometry(2, 2);
  bgMesh = new THREE.Mesh(quadGeometry, bgShaderMat);
  bgMesh.frustumCulled = false; // ensure the quad is always rendered
  bgScene.add(bgMesh);
}

// If you want to add extra postprocessing effects, you can do so in this function.
function initPostProcessing() {
  // Example: add additional effect passes as needed.
  composer.addPass(new EffectPass(camera, new BloomEffect({
    intensity: 1.1,
    luminanceThreshold: 0.9,
    luminanceSmoothing: 0.15
  })));
  composer.addPass(new EffectPass(camera, new DepthOfFieldEffect(camera, {
    focusDistance: 0.98,
    focalLength: 0.05,
    bokehScale: 0.9
  })));
  composer.addPass(new EffectPass(camera, new ChromaticAberrationEffect({
    offset: new THREE.Vector2(0.006, 0.006),
    radialModulation: true,
    modulationOffset: 0.5,
  })));
  composer.addPass(new EffectPass(camera, new NoiseEffect({ 
    premultiply: true,  
    intensity: 0.05
  })));
  composer.addPass(new EffectPass(camera, new ToneMappingEffect({
    adaptive: true,
    resolution: 256,
    middleGrey: 0.7,
    maxLuminance: 16.0,
    averageLuminance: 1.0
  })));
}

async function initTourSpline(){
  const tour_path_points = await loadPointsFromJson("./tour.json"); 
  tour_path = new THREE.CatmullRomCurve3(tour_path_points);
}

function initMuseum() {
  clock = new THREE.Clock();
  initRenderer();
  initSceneAndCamera();
  initLights();
  loadEnvironment();
  loadMuseumModel();
  initControls();
  // IMPORTANT: Initialize the background shader before creating the composer!
  initBackgroundShader();

  // Create EffectComposer and add two render passes:
  // 1. The background pass using bgScene and bgCamera (this remains fixed).
  // 2. The main scene pass using scene and camera.
  composer = new EffectComposer(renderer);
  const bgPass = new RenderPass(bgScene, bgCamera);
  bgPass.clear = true; // clear before drawing the background
  composer.addPass(bgPass);

  // Create the main scene render pass and disable its clear flag.
  const scenePass = new RenderPass(scene, camera);
  scenePass.clear = false; // do not clear the color buffer, preserving the background
  composer.addPass(scenePass);

  // Optionally add additional postprocessing effects.
  initPostProcessing();
  initTourSpline();
  window.addEventListener("resize", onWindowResize);
  animate();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

function handleScroll(event) {
  path_vel -= sign(event.deltaY) * 0.5 * path_acc;
}

function animate() {
  const dt = clock.getDelta();
  requestAnimationFrame(animate);

  // Update the background shader uniforms (uTime, uResolution, etc.)
  const elapsedTime = clock.getElapsedTime();
  bgShaderMat.uniforms.uTime.value = elapsedTime;
  bgShaderMat.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);

  // Update tour path movement variables
  path_pos += path_vel * dt;
  path_vel *= (1 - path_fricc);
  path_vel  = clamp(path_vel, -path_terminal_vel, path_terminal_vel);
  path_pos  = wrap(path_pos, 0, 1);

  // If a tour path is defined, move the main camera along it
  if(tour_path){
    const p = tour_path.getPoint(path_pos);
    camera.position.set(p.x, p.y, p.z);
  }

  // Now simply render the composer.
  composer.render();
}

function cleanUpMuseumScene() {
  // Save camera position
  localStorage.setItem("cameraPosition", JSON.stringify(camera.position));

  // Remove and dispose model if present
  if(museum) {
    scene.remove(museum);
    museum.traverse((child) => {
      if(child.isMesh) {
        child.geometry.dispose();
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
    });
  }
  if(renderer) {
    renderer.dispose();
  }
}

// Call init on page load
window.onload = initMuseum;
window.addEventListener("beforeunload", cleanUpMuseumScene);
window.addEventListener('wheel', handleScroll);


