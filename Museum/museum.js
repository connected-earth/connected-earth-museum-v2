// ==============================
// Imports & External Libraries
// ==============================
import * as THREE from 'three';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/postprocessing/OutlinePass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/shaders/RGBShiftShader.js';
import { FilmShader } from 'https://cdn.jsdelivr.net/npm/three@0.150.1/examples/jsm/shaders/FilmShader.js';

import { bgShaderMaterial } from './scripts/background.js';
import { CameraControls } from './scripts/camera.js';
import { loadPointsFromJson, loadDict } from './scripts/json_loader.js';

// ==============================
// Constants & Configuration
// ==============================
const TOLERANCE = 1e-3;

const CAMERA_FOV = 75;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 100;
const CAMERA_FOCUS_DISTANCE = 10;

const PATH_ACCELERATION = 0.025;
const PATH_FRICTION = 0.065;
const PATH_TERMINAL_VELOCITY = 0.10;
const SCROLL_MULTIPLIER = 0.5;

const FILM_SHADER_N_INTENSITY = 0.3;
const FILM_SHADER_S_INTENSITY = 0.1;
const FILM_SHADER_S_COUNT = 4096;
const FILM_SHADER_GRAYSCALE = 0;

const CHROMA_SHADER_AMOUNT = 0.0008;

const OUTLINE_EDGE_STRENGTH = 25.0;
const OUTLINE_EDGE_GLOW = 2.0;
const OUTLINE_EDGE_THICKNESS = 8.0;
const OUTLINE_PULSE_PERIOD = 0.5;
const OUTLINE_VISIBLE_EDGE_COLOR = '#fe5000';
const OUTLINE_HIDDEN_EDGE_COLOR = '#190aff';

const BLOOM_INTENSITY = 0.6;
const BLOOM_THRESHOLD = 0.25;
const BLOOM_RADIUS = 0.9;

const GSAP_DURATION = 2;

const PAINTING_HOVER_DISTANCE = 40;
const PAINTING_NORMAL_OFFSET = 5.0;

const TOUR_STOPS_DEFAULT = [0.001, 0.0936, 0.1470, 0.2777, 0.3355, 0.4434, 0.6308, 0.6563];

const PaintingsInfo = [
  { name: "Painting_1", audioID: "globe",   audioUrl: "../assets/billy_audios/globe.mp3",   distance: PAINTING_NORMAL_OFFSET },
  { name: "Painting_2", audioID: "slide1",  audioUrl: "../assets/billy_audios/slide1.mp3",  distance: PAINTING_NORMAL_OFFSET },
  { name: "Painting_3", audioID: "firemap",  audioUrl: "../assets/billy_audios/firemap.mp3",  distance: PAINTING_NORMAL_OFFSET },
  { name: "Painting_5", audioID: "popmap", audioUrl: "../assets/billy_audios/popmap.mp3", distance: PAINTING_NORMAL_OFFSET },
  { name: "Painting_6", audioID: "game",    audioUrl: "../assets/billy_audios/game.mp3",    distance: PAINTING_NORMAL_OFFSET },
  { name: "Painting_7", audioID: "slides",  audioUrl: "../assets/billy_audios/slides.mp3",  distance: PAINTING_NORMAL_OFFSET },
  { name: "Painting_8", audioID: "slides",  audioUrl: "../assets/billy_audios/slides.mp3",  distance: PAINTING_NORMAL_OFFSET },
];

// ==============================
// Utility Functions
// ==============================
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
const wrap  = (v, low, high) =>
  low + ((((v - low) % (high - low)) + (high - low)) % (high - low));
const sign  = x => (x > 0) - (x < 0);

function isClose(a, b, tol = TOLERANCE) {
  return Math.abs(a - b) < tol;
}

// ==============================
// Audio Handling Functions
// ==============================
function playAudio(audioSrc, legendText) {
  if (currentAudio) {
    currentAudio.pause(); // Stop the previous audio
    currentAudio.currentTime = 0; // Reset audio playback position
  }

  const audio = new Audio(audioSrc);
  currentAudio = audio; // Update the current audio reference

  const legend = document.getElementById("legend");
  legend.textContent = legendText;
  legend.style.animation = 'none';
  void legend.offsetWidth; // Force reflow to restart animation
  legend.style.animation = 'fadeIn 0.5s ease-in-out forwards';

  audio.play();
  audio.onended = () => {
    // Fade out legend when audio ends
    legend.style.animation = 'fadeOut 0.5s ease-in-out forwards';
    currentAudio = null; // Clear reference when audio ends
  };
}

// ==============================
// Global Variables & State
// ==============================
let progression  = parseInt(localStorage.getItem("progression")) || 0;
let billy_audios_legends = null;

let clock, scene, camera, renderer, composer, controls, museum;
let outlinePass; 
let currentAudio;

const mouse         = new THREE.Vector2();
const loadingScreen = document.getElementById("loading-screen");

let savedCameraYaw = parseFloat(localStorage.getItem("cameraYaw")) || 0;

// Background Variables
let bgShaderMat = bgShaderMaterial;
let bgMesh, bgRenderTarget;
let bgCamera, bgScene;

// Tour / Movement Variables
let tour_path = null;
let tour_stops = TOUR_STOPS_DEFAULT.slice();
let auto_tour_start  = null;
let tour_target      = 0.0;
let moving_to_painting = false;
let moveToNext = false;
let moveToPrev = false;

let path_pos = JSON.parse(localStorage.getItem("pathPos")) || 0.0;
let path_vel = 0.0;

// ==============================
// Navigation Helpers
// ==============================
function getNextTarget(P, stops) {
  for (let i = 0; i < stops.length; i++) {
    if (isClose(P, stops[i])) {
      return stops[(i + 1) % stops.length];
    }
  }
  for (let i = 0; i < stops.length; i++) {
    if (stops[i] > P + TOLERANCE) return stops[i];
  }
  return stops[0];
}

function getPrevTarget(P, stops) {
  for (let i = 0; i < stops.length; i++) {
    if (isClose(P, stops[i])) {
      return stops[(i - 1 + stops.length) % stops.length];
    }
  }
  for (let i = stops.length - 1; i >= 0; i--) {
    if (stops[i] < P - TOLERANCE) return stops[i];
  }
  return stops[stops.length - 1];
}

// ==============================
// Initialization Functions
// ==============================
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
  scene  = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    CAMERA_FOV, 
    window.innerWidth / window.innerHeight, 
    CAMERA_NEAR, 
    CAMERA_FAR
  );  
  scene.add(camera);
}

function initLights() {
  scene.add(new THREE.AmbientLight(0xf0f0f0, 0.1));
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

  loader.load("../assets/museum/model.glb", (gltf) => {
    museum = gltf.scene;
    scene.add(museum);
    loadingScreen.classList.add("hide");
    if (progression === 0) {
      loadingScreen.addEventListener("transitionend", function handler() {
          loadingScreen.style.display = "none";
          playAudio("../assets/billy_audios/welcome.mp3", billy_audios_legends["welcome"]);
          loadingScreen.removeEventListener("transitionend", handler);
      });
      progression += 1;
    }
  });
}

function initControls() {
  controls = new CameraControls(camera, renderer);
}

function initBackgroundShader() {
  bgScene = new THREE.Scene();
  bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  
  const quadGeometry = new THREE.PlaneGeometry(2, 2);
  bgMesh = new THREE.Mesh(quadGeometry, bgShaderMat);
  bgMesh.frustumCulled = false;
  bgScene.add(bgMesh);
}

function initPostProcessing() {
  // Film Pass for noise and scanlines
  const filmPass = new ShaderPass(FilmShader);
  filmPass.uniforms['nIntensity'].value = FILM_SHADER_N_INTENSITY;
  filmPass.uniforms['sIntensity'].value = FILM_SHADER_S_INTENSITY;
  filmPass.uniforms['sCount'].value = FILM_SHADER_S_COUNT;
  filmPass.uniforms['grayscale'].value = FILM_SHADER_GRAYSCALE;
  composer.addPass(filmPass);

  // Chromatic Aberration Pass for subtle color fringing
  const chromaPass = new ShaderPass(RGBShiftShader);
  chromaPass.uniforms['amount'].value = CHROMA_SHADER_AMOUNT;
  composer.addPass(chromaPass);

  // Outline Pass for paintings highlighting
  outlinePass = new OutlinePass(
    new THREE.Vector2(window.innerWidth, window.innerHeight), 
    scene, 
    camera
  );
  outlinePass.edgeStrength = OUTLINE_EDGE_STRENGTH;
  outlinePass.edgeGlow = OUTLINE_EDGE_GLOW;       
  outlinePass.edgeThickness = OUTLINE_EDGE_THICKNESS;     
  outlinePass.pulsePeriod = OUTLINE_PULSE_PERIOD;
  outlinePass.visibleEdgeColor.set(OUTLINE_VISIBLE_EDGE_COLOR);
  outlinePass.hiddenEdgeColor.set(OUTLINE_HIDDEN_EDGE_COLOR);
  composer.addPass(outlinePass);
  if (outlinePass.clear !== undefined) {
    outlinePass.clear = false;
  }
  outlinePass.renderToScreen = false;
  composer.addPass(outlinePass);

  // Bloom Pass for subtle glow
  composer.addPass(new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    BLOOM_INTENSITY,
    BLOOM_THRESHOLD,
    BLOOM_RADIUS
  ));
}

async function initBilly() {
  billy_audios_legends = await loadDict("../assets/billy_audios/legends.json");
}

async function initTour() {
  const tour_path_points = await loadPointsFromJson("../assets/museum/tour.json"); 
  tour_path = new THREE.CatmullRomCurve3(tour_path_points);
}

function initMuseum() {
  clock = new THREE.Clock();
  initBilly();
  initRenderer();
  initSceneAndCamera();
  initLights();
  loadEnvironment();
  loadMuseumModel();
  initControls();

  initBackgroundShader();
  composer = new EffectComposer(renderer);
  const bgPass = new RenderPass(bgScene, camera);
  composer.addPass(bgPass);

  const scenePass = new RenderPass(scene, camera);
  scenePass.clear = false;
  composer.addPass(scenePass);
  initPostProcessing();

  initTour();
  window.addEventListener("resize", onWindowResize);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('click', onMouseClick, false);
  animate();
}

// ==============================
// Event Handlers & Interaction
// ==============================
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

function checkMouseOverPainting(mouse) {
  const raycaster = new THREE.Raycaster(); 
  raycaster.setFromCamera(mouse, camera);

  // Check if mouse hovers over a painting
  const models = [museum];
  try {
    const intersections = raycaster.intersectObjects(models);
    if (intersections.length > 0) {
      const object = intersections[0].object;
      const paintingInfo = PaintingsInfo.find(info => info.name === object.name);
      if (paintingInfo) {
        return [true, intersections[0], paintingInfo];
      }
    }
  } catch {}

  return [false, null];
}

function onMouseMove(event) {
  // Convert mouse coordinates to normalized device coordinates (-1 to 1)
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  outlinePass.selectedObjects = [];
  const [isOverPainting, intersection, paintingInfo] = checkMouseOverPainting(mouse);
  if (isOverPainting) {
    const dist = camera.position.distanceTo(intersection.point);
    if (moveToPrev || moveToNext) return;
    if (dist >= PAINTING_HOVER_DISTANCE) return;
    outlinePass.selectedObjects = [intersection.object];
  }
}

function onMouseClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  const [isOverPainting, intersection, paintingInfo] = checkMouseOverPainting(mouse);
  if (isOverPainting) {  
    const dist = camera.position.distanceTo(intersection.point);
    if (dist >= PAINTING_HOVER_DISTANCE) return; 
    if (moveToPrev || moveToNext) return;

    // Change of modes
    moving_to_painting   = true;
    controls.isDragging  = false;
    controls.dragEnabled = false;

    // Find closest stop
    let min_dist = Infinity;
    let closest_tour_stop;
    for (let i = 0; i < tour_stops.length; i++) {
      const p = tour_path.getPoint(tour_stops[i]);
      const distance = intersection.point.distanceTo(p);
      if (distance < min_dist) {
        min_dist = distance;
        closest_tour_stop = tour_stops[i];
      }
    }

    // Compute centroid of painting mesh and normal of clicked face
    const mesh = intersection.object;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    const centroid = mesh.localToWorld(
      mesh.geometry.boundingBox.getCenter(new THREE.Vector3())
    ); 
    let painting_normal = intersection.face.normal.clone().applyMatrix3(
      new THREE.Matrix3().getNormalMatrix(intersection.object.matrixWorld)
    ).normalize();

    // Compute objective position and lookat
    const targetPosition = centroid.clone().add(painting_normal.multiplyScalar(paintingInfo.distance));
    const targetFocus = centroid;

    const currentFocus = camera.position.clone().add(
      camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(CAMERA_FOCUS_DISTANCE)
    );
    const tweenVars = {
      posX: camera.position.x,
      posY: camera.position.y,
      posZ: camera.position.z,
      focusX: currentFocus.x,
      focusY: currentFocus.y,
      focusZ: currentFocus.z,
    };

    // Interpolate *-*
    gsap.to(tweenVars, {
      posX: targetPosition.x,
      posY: targetPosition.y,
      posZ: targetPosition.z,
      focusX: targetFocus.x,
      focusY: targetFocus.y,
      focusZ: targetFocus.z,
      duration: GSAP_DURATION,
      ease: "power3.inOut",
      onUpdate: () => {
        camera.position.set(tweenVars.posX, tweenVars.posY, tweenVars.posZ);
        camera.lookAt(tweenVars.focusX, tweenVars.focusY, tweenVars.focusZ);
      },
      onComplete: () => {
        controls.dragEnabled = true;
        moving_to_painting = false;
        path_pos = closest_tour_stop; 
        controls.yaw = camera.rotation.y;
        controls.pitch = camera.rotation.x;
        playAudio(paintingInfo.audioUrl, billy_audios_legends[paintingInfo.audioID]);
      }
    });
  }
}

function handleScroll(event) {
  if (!moveToPrev && !moveToNext && !moving_to_painting) {
    path_vel -= sign(event.deltaY) * SCROLL_MULTIPLIER * PATH_ACCELERATION;
  }
}

// ==============================
// DOM Content & UI Listeners
// ==============================
document.addEventListener("DOMContentLoaded", function() {
  const leftButton = document.getElementById("left-button");
  const rightButton = document.getElementById("right-button");

  rightButton.addEventListener("click", function() {
    if (moving_to_painting) return;
    moveToPrev = false;
    moveToNext = true;
    tour_target = getNextTarget(path_pos, tour_stops);
  });

  leftButton.addEventListener("click", function() {
    if (moving_to_painting) return;
    moveToNext = false;
    moveToPrev = true;
    tour_target = getPrevTarget(path_pos, tour_stops);
  });

  auto_tour_start = path_pos;
});

// ==============================
// Animation Loop
// ==============================
function animate() {
  const dt = clock.getDelta();
  requestAnimationFrame(animate);
  
  // Update background shader uniforms.
  const elapsedTime = clock.getElapsedTime();
  bgShaderMat.uniforms.uTime.value = elapsedTime;
  bgShaderMat.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);

  // Update camera rotation uniform for background shader.
  const camMatrix = new THREE.Matrix3().setFromMatrix4(
    new THREE.Matrix4().makeRotationFromQuaternion(camera.quaternion)
  );
  camMatrix.invert();
  bgShaderMat.uniforms.uCameraRotation.value.set(
    camMatrix.elements[0], camMatrix.elements[1], camMatrix.elements[2],
    camMatrix.elements[3], camMatrix.elements[4], camMatrix.elements[5],
    camMatrix.elements[6], camMatrix.elements[7], camMatrix.elements[8]
  );

  if (!moving_to_painting) {
    // Update tour path velocity based on button inputs.
    if (moveToNext) { 
      path_vel = 2.0 * PATH_ACCELERATION;
    }
    if (moveToPrev) { 
      path_vel = -2.0 * PATH_ACCELERATION;
    }

    // Update tour path variables.
    path_pos += path_vel * dt;
    path_vel *= (1 - PATH_FRICTION);
    path_vel = clamp(path_vel, -PATH_TERMINAL_VELOCITY, PATH_TERMINAL_VELOCITY);
    path_pos = wrap(path_pos, 0, 1);

    if ((moveToPrev || moveToNext) && Math.abs(path_pos - tour_target) < TOLERANCE) {
      moveToNext = false;
      moveToPrev = false;
      path_vel = 0.0;
    }

    // Update camera position along the tour path.
    if (tour_path) {
      const p = tour_path.getPoint(path_pos);
      camera.position.set(p.x, p.y, p.z);
    }
  }

  composer.render();
}

// ==============================
// Cleanup & Persistence
// ==============================
function cleanUpMuseumScene() {
  // Save camera's yaw rotation and other state.
  const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
  localStorage.setItem("cameraYaw", euler.y);
  localStorage.setItem("pathPos", JSON.stringify(path_pos));
  localStorage.setItem("progression", progression);

  if (museum) {
    scene.remove(museum);
    museum.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose();
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
    });
  }
  if (renderer) {
    renderer.dispose();
  }
}

// ==============================
// Window & Page Event Listeners
// ==============================
window.onload = initMuseum;
window.addEventListener("beforeunload", cleanUpMuseumScene);
window.addEventListener('wheel', handleScroll);
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    window.location.href = "museum.html";
  }
});


