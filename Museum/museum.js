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
    RenderPass,
    OutlineEffect,
} from "postprocessing";

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

import { bgShaderMaterial } from './scripts/background.js'
import { CameraControls } from './scripts/camera.js'
import { loadPointsFromJson, loadDict } from './scripts/json_loader.js'

// Utils -------
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
const wrap  = (v, low, high) => low + ((((v - low) % (high - low)) + (high - low)) % (high - low));
const sign  = x => (x > 0) - (x < 0);

function playAudio(audioSrc, legendText) {
  const audio = new Audio(audioSrc);
  const legend = document.getElementById("legend");
  legend.textContent = legendText;
  legend.style.animation = 'none';
  void legend.offsetWidth; // Force reflow to restart animation
  legend.style.animation = 'fadeIn 0.5s ease-in-out forwards';

  audio.play();
  audio.onended = () => {
    // Trigger the fade-out animation when the audio ends
    legend.style.animation = 'fadeOut 0.5s ease-in-out forwards';
  };
}
//-------------

// Controls audio plays
let progression  = parseInt(localStorage.getItem("progression")) || 0;
let billy_audios = null;

// Scene variables
let clock, scene, camera, renderer, composer, controls, museum;
const mouse         = new THREE.Vector2();
let outlinePass;
const loadingScreen = document.getElementById("loading-screen");

// Persist only the camera yaw (rotation about Y-axis), if nothing is stored, default to 0.
let savedCameraYaw = parseFloat(localStorage.getItem("cameraYaw")) || 0;

// Background variables
let bgShaderMat = bgShaderMaterial; // alias if you wish
let bgMesh, bgRenderTarget;
let bgCamera, bgScene;

// Movement
let tour_path    = null;
let path_pos     = JSON.parse(localStorage.getItem("pathPos")) || 0.0;
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
  scene  = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
  
  // Create Euler angles with pitch and roll set to zero.
  //const yawEuler = new THREE.Euler(0, savedCameraYaw, 0, 'YXZ');
  //camera.quaternion.setFromEuler(yawEuler);
  
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

  loader.load("../assets/museum/model.glb", (gltf) => {
    museum = gltf.scene;
    scene.add(museum);
    loadingScreen.classList.add("hide");
    if(progression == 0){
      loadingScreen.addEventListener("transitionend", function handler() {
          loadingScreen.style.display = "none";
          playAudio("../assets/billy_audios/welcome.mp3", billy_audios["welcome"]);
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

  composer.addPass( new OutlineEffect(scene, camera, {
    edgeStrength: 10.5,
    pulseSpeed: 0.2,
    visibleEdgeColor: 0xffffff,
    hiddenEdgeColor: 0x22090a,
    blur: false,
	}));

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
  //composer.addPass(new EffectPass(camera, new ChromaticAberrationEffect({
  //  offset: new THREE.Vector2(0.0025, 0.0025),
  //  radialModulation: true,
  //  modulationOffset: 0.5,
  //})));
}

async function initBilly(){
  billy_audios = await loadDict("../assets/billy_audios/legends.json");
}

async function initTourSpline(){
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
  bgPass.clear = true;
  composer.addPass(bgPass);

  const scenePass = new RenderPass(scene, camera);
  scenePass.clear = false;
  composer.addPass(scenePass);

  initPostProcessing();
  initTourSpline();
  window.addEventListener("resize", onWindowResize);
  window.addEventListener('mousemove', onMouseMove);

  animate();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event){
  // Convert mouse coordinates to normalized device coordinates (-1 to 1)
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  const raycaster = new THREE.Raycaster(); 
  raycaster.setFromCamera(mouse, camera);

  // Check if mouse hover over some painting and indicate to user
  const models = [museum];
  try{
    const intersections = raycaster.intersectObjects(models);
    if (intersections.length > 0) {
      const object = intersections[0].object // first intersected object
      // check if a painting has hovered
      const pattern = /Painting_.+/;
      if(pattern.test(object.name)){
        outlinePass.selectedObjects = [object]; 
      }
    }
    //outlinePass.selectedObjects = []; 
  } catch {}

}

function onMouseClick(event){
  // Convert mouse coordinates to normalized device coordinates (-1 to 1)
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  const raycaster = new THREE.Raycaster(); 
  raycaster.setFromCamera(mouse, camera);

 
  // Check if mouse hover over some painting and indicate to user
}

function handleScroll(event) {
  path_vel -= sign(event.deltaY) * 0.5 * path_acc;
}

function animate() {
  const dt = clock.getDelta();
  requestAnimationFrame(animate);

  // Update background shader uniforms.
  const elapsedTime = clock.getElapsedTime();
  bgShaderMat.uniforms.uTime.value = elapsedTime;
  bgShaderMat.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);

  // Compute the inverse rotation matrix from the camera's quaternion.
  const camMatrix = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(camera.quaternion));
  camMatrix.invert(); // Invert so that the stars become fixed relative to world space.
  bgShaderMat.uniforms.uCameraRotation.value.set(
    camMatrix.elements[0], camMatrix.elements[1], camMatrix.elements[2],
    camMatrix.elements[3], camMatrix.elements[4], camMatrix.elements[5],
    camMatrix.elements[6], camMatrix.elements[7], camMatrix.elements[8]
  );


  // Update tour path variables.
  path_pos += path_vel * dt;
  path_vel *= (1 - path_fricc);
  path_vel  = clamp(path_vel, -path_terminal_vel, path_terminal_vel);
  path_pos  = wrap(path_pos, 0, 1);

  // If a tour path is defined, update the camera's position.
  if (tour_path) {
    const p = tour_path.getPoint(path_pos);
    camera.position.set(p.x, p.y, p.z);
  }

  composer.render();
}

function cleanUpMuseumScene() {
  // Persist the camera's yaw rotation.
  const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
  localStorage.setItem("cameraYaw", euler.y);
  localStorage.setItem("pathPos", JSON.stringify(path_pos));
  localStorage.setItem("progression", progression);

  if (museum) {
    scene.remove(museum);
    museum.traverse((child) => {
      if(child.isMesh) {
        child.geometry.dispose();
        if(child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
    });
  }
  if (renderer) {
    renderer.dispose();
  }
}

window.onload = initMuseum;
window.addEventListener("beforeunload", cleanUpMuseumScene);
window.addEventListener('wheel', handleScroll);
