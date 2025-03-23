// Global variables
let scene, camera, renderer, orbitControl, gui;
let currentImage = "";
let currentImage2 = "";
let currentTextureArray = [];
let currMin = 0;
let currMax = 0;
let currYear;
const uniforms = {
  size: { value: 3.0 },
  colorTexture: { value: null },
  elevTexture: { value: null },
  alphaTexture: { value: null },
};

let overlayImageEl, overlayImage2El;

// -----------------------
// Helper Functions
// -----------------------
const createStarfield = ({ numStars, sprite }) => {
  const starGroup = new THREE.Group();
  for (let i = 0; i < numStars; i++) {
    const starGeometry = new THREE.SphereGeometry(0.005, 8, 8);
    const starMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const starMesh = new THREE.Mesh(starGeometry, starMaterial);
    starMesh.position.set(
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 100
    );
    starGroup.add(starMesh);
  }
  return starGroup;
};

const loadTextures = (startYear, endYear, pathTemplate) => {
  const textures = [];
  for (let year = startYear; year < endYear; year++) {
    textures.push(textureLoader.load(pathTemplate.replace("{year}", year)));
  }
  return textures;
};

function navigate(url, state) {
  console.log("Navigating to:", url, state);
  // Replace with your own navigation logic, e.g. window.location.href = url;
}

// -----------------------
// Texture Loader and Textures
// -----------------------
const textureLoader = new THREE.TextureLoader();
let starSprite, earthMap, elevMap, alphaMap;
let tempTextures, oceanTempTextures, vegTextures, carbonTextures, fireTextures;

function initTextures() {
  starSprite = textureLoader.load("../../assets/globe/star.png");
  earthMap = textureLoader.load("../../assets/globe/00_earthmap1k.jpg");
  elevMap = textureLoader.load("../../assets/globe/01_earthbump1k.jpg");
  alphaMap = textureLoader.load("../../assets/globe/02_earthspec1k.jpg");

  // Preload timeline textures using helper function
  tempTextures = loadTextures(2000, 2025, "../../assets/globe/avg_temperature_land/{year}.png");
  oceanTempTextures = loadTextures(2010, 2025, "../../assets/globe/avg_temperature_ocean/{year}.jpeg");
  vegTextures = loadTextures(2013, 2025, "../../assets/globe/vegetation/{year}.jpeg");
  carbonTextures = loadTextures(2015, 2024, "../../assets/globe/carbon/{year}.jpeg");
  fireTextures = loadTextures(2015, 2025, "../../assets/globe/fire/{year}.jpeg");

  // Set initial uniform textures
  uniforms.colorTexture.value = earthMap;
  uniforms.elevTexture.value = elevMap;
  uniforms.alphaTexture.value = alphaMap;
}

// -----------------------
// Scene and Renderer Setup
// -----------------------
function initScene() {
  // Create Scene
  scene = new THREE.Scene();

  // Create Camera
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 4);

  // Create Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  const mountElement = document.getElementById("globe-render");
  mountElement.appendChild(renderer.domElement);

  // Orbit Controls
  orbitControl = new THREE.OrbitControls(camera, renderer.domElement);
  orbitControl.enableDamping = true;
  orbitControl.autoRotate = true;
  orbitControl.autoRotateSpeed = 2.4;
  orbitControl.minDistance = 1.8;
  orbitControl.maxDistance = 40;

  // Add basic globe mesh
  const globeGroup = new THREE.Group();
  const earthGeometry = new THREE.SphereGeometry(1, 20, 20);
  const earthMaterial = new THREE.MeshBasicMaterial({ color: 0x202020, wireframe: true });
  const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
  globeGroup.add(earthMesh);
  scene.add(globeGroup);

  // -----------------------
  // Shaders and Points
  // -----------------------
  const vertexShader = `
    uniform float size;
    uniform sampler2D elevTexture;
    varying vec2 vUv;
    varying float vVisible;
    void main() {
      vUv = uv;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      float elv = texture2D(elevTexture, vUv).r;
      vec3 vNormal = normalMatrix * normal;
      vVisible = step(0.0, dot(-normalize(mvPosition.xyz), normalize(vNormal)));
      mvPosition.z += 0.6 * elv;
      gl_PointSize = size;
      gl_Position = projectionMatrix * mvPosition;
    }
  `;
  const fragmentShader = `
    uniform sampler2D colorTexture;
    uniform sampler2D alphaTexture;
    uniform float paint_ocean;
    varying vec2 vUv;
    varying float vVisible;
    void main() {
      if (floor(vVisible + 0.1) == 0.0) discard;
      float alpha = texture2D(alphaTexture, vUv).r;
      vec3 color = texture2D(colorTexture, vUv).rgb;
      gl_FragColor = vec4(color.r, color.g, color.b, 1.0);
    }
  `;
  const pointsGeometry = new THREE.IcosahedronGeometry(1, 120);
  const pointsMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    transparent: true,
  });
  const pointsMesh = new THREE.Points(pointsGeometry, pointsMaterial);
  scene.add(pointsMesh);

  // -----------------------
  // Lighting and Stars
  // -----------------------
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x080820, 3);
  scene.add(hemiLight);
  const stars = createStarfield({ numStars: 4500, sprite: starSprite });
  scene.add(stars);

  // -----------------------
  // Resize Handler
  // -----------------------
  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// -----------------------
// Animation Loop
// -----------------------
function animate() {
  requestAnimationFrame(animate);
  orbitControl.update();
  renderer.render(scene, camera);
}

// -----------------------
// GUI Setup
// -----------------------
function initGUI() {
  gui = new lil.GUI({ autoPlace: true });
  const guiContainer = document.querySelector(".lil-gui");
  guiContainer.appendChild(gui.domElement);
  gui.domElement.style.top = "1.8rem";
  gui.domElement.style.borderRadius = "8px";
  gui.domElement.classList.add("lil-gui");

  // Responsive GUI
  function resizeGUI() {
    if (window.innerWidth < 500) {
      gui.domElement.style.height = "200px";
      gui.domElement.style.left = "0px";
      gui.domElement.style.top = "0px";
      gui.domElement.style.transform = "scale(0.9)";
    }
  }
  window.addEventListener("resize", resizeGUI);
  resizeGUI();

  // GUI Controls
  gui.add(uniforms.size, "value", 1, 10).name("Point Size");

  const timeline = { year: 2000 };
  const sliceControl = gui.add(timeline, "year", 2000, 2024, 1).name("Timeline");
  const rotationControl = { rotation: true };
  gui.add(rotationControl, "rotation").name("Rotation").onChange((enabled) => {
    orbitControl.autoRotate = enabled;
  });

  sliceControl.onChange((selectedYear) => {
    const roundedYear = Math.round(selectedYear);
    if (currentTextureArray.length > 0 && roundedYear !== currYear) {
      uniforms.colorTexture.value = currentTextureArray[roundedYear - currMin];
      currYear = roundedYear;
    }
    sliceControl.setValue(roundedYear);
  });

  // Data Display Folder
  const dataFolder = gui.addFolder("Data");
  const textDisplay = document.createElement("div");
  textDisplay.classList.add("text-display");
  textDisplay.innerHTML = `
    <p>Welcome to Earth!</p>
    <br/>
    <p>Earth is a unique planet, covering about 71% with water and supporting diverse life forms.</p>
  `;
  dataFolder.domElement.appendChild(textDisplay);

  // Data selection handling
  dataFolder
    .add(
      { Data: "Standard" },
      "Data",
      [
        "Standard",
        "Avg Land Temperature",
        "Avg Ocean Temperature",
        "Population",
        "Vegetation",
        "Carbon Monoxide",
        "Wildfire",
      ]
    )
    .onChange((dataType) => {
      let newImagePath = "";
      let newImagePath2 = "";

      // Ensure overlay images are visible by default
      overlayImageEl.style.display = "block";
      overlayImage2El.style.display = "block";

      switch (dataType) {
        case "Avg Land Temperature":
          newImagePath = "../../assets/globe/avg_temperature_land/colorbar.png";
          currentTextureArray = tempTextures;
          currYear = 2000;
          uniforms.colorTexture.value = textureLoader.load(
            "../../assets/globe/avg_temperature_land/2000.png"
          );
          gsap.to(camera.position, { x: 0, y: 0, z: 5, duration: 2, ease: "power3.inOut" });
          currMin = 2000;
          currMax = 2024;
          textDisplay.innerHTML = `
            <p>This data comes from <a href="https://lpdaac.usgs.gov/products/mod11c1v061/" target="_blank">MOD11C1</a>.</p>
            <br/>
            <p>Daytime land surface temperature maps are created using thermal infrared data from NASA's Terra and Aqua satellites.</p>
          `;
          break;

        case "Avg Ocean Temperature":
          newImagePath = "../../assets/globe/avg_temperature_ocean/colorbar.png";
          currentTextureArray = oceanTempTextures;
          currYear = 2010;
          uniforms.colorTexture.value = textureLoader.load(
            "../../assets/globe/avg_temperature_ocean/2010.jpeg"
          );
          gsap.to(camera.position, { x: 0, y: 0, z: 5, duration: 2, ease: "power3.inOut" });
          currMin = 2010;
          currMax = 2024;
          textDisplay.innerHTML = `
            <p>This data comes from <a href="https://modis.gsfc.nasa.gov/" target="_blank">MODIS</a>.</p>
            <br/>
            <p>Global ocean temperature measurements are provided by NASA's MODIS instruments.</p>
          `;
          break;

        case "Population":
          newImagePath = "../../assets/globe/population/colorbar.png";
          newImagePath2 = "../../assets/globe/population/world_pop.png";
          uniforms.colorTexture.value = textureLoader.load(
            "../../assets/globe/population/population.jpeg"
          );
          currentTextureArray = [];
          gsap.to(camera.position, { x: 0, y: 0, z: 6, duration: 2, ease: "power3.inOut" });
          currYear = 2000;
          currMin = 2000;
          currMax = 2000;
          textDisplay.innerHTML = `
            <p>This data comes from <a href="https://sedac.ciesin.columbia.edu/data/set/gpw-v4-population-density-rev11/data-download" target="_blank">SEDAC</a>.</p>
            <br/>
            <p>Population distribution insights are key for understanding natural resource usage.</p>
          `;
          break;

        case "Vegetation":
          newImagePath = "../../assets/globe/vegetation/colorbar.png";
          currentTextureArray = vegTextures;
          uniforms.colorTexture.value = textureLoader.load(
            "../../assets/globe/vegetation/2013.jpeg"
          );
          gsap.to(camera.position, { x: 0, y: 0, z: 4, duration: 2, ease: "power3.inOut" });
          currYear = 2013;
          currMin = 2013;
          currMax = 2024;
          textDisplay.innerHTML = `
            <p>This data comes from <a href="https://modis.gsfc.nasa.gov/" target="_blank">MODIS</a>.</p>
            <br/>
            <p>Vegetation data provides insight into changes in land cover over time.</p>
          `;
          break;

        case "Carbon Monoxide":
          newImagePath = "../../assets/globe/carbon/colorbar.png";
          currentTextureArray = carbonTextures;
          uniforms.colorTexture.value = textureLoader.load(
            "../../assets/globe/carbon/2015.jpeg"
          );
          gsap.to(camera.position, { x: 0, y: 0, z: 5, duration: 2, ease: "power3.inOut" });
          currYear = 2015;
          currMin = 2015;
          currMax = 2022;
          textDisplay.innerHTML = `
            <p>This data comes from the <a href="https://www2.acom.ucar.edu/mopitt" target="_blank">MOPITT</a> dataset.</p>
            <br/>
            <p>Monitored carbon monoxide concentrations are crucial for atmospheric studies.</p>
          `;
          break;

        case "Wildfire":
          newImagePath = "../../assets/globe/fire/colorbar.png";
          currentTextureArray = fireTextures;
          uniforms.colorTexture.value = textureLoader.load(
            "../../assets/globe/fire/2015.jpeg"
          );
          gsap.to(camera.position, { x: 0, y: 0, z: 4, duration: 2, ease: "power3.inOut" });
          currYear = 2015;
          currMin = 2015;
          currMax = 2022;
          textDisplay.innerHTML = `
            <p>This data comes from the <a href="https://lpdaac.usgs.gov/products/mod14a1v061/" target="_blank">MOD14A1</a> dataset.</p>
            <br/>
            <p>Wildfire data highlights the atmospheric impact of fires.</p>
          `;
          break;

        case "Standard":
        default:
          uniforms.colorTexture.value = textureLoader.load("../../assets/globe/00_earthmap1k.jpg");
          currentTextureArray = [];
          currYear = 2000;
          currMin = 2000;
          currMax = 2024;
          textDisplay.innerHTML = `
            <p>Welcome to Earth!</p>
            <br/>
            <p>Earth is a unique planet covering about 71% water and supporting diverse life forms.</p>
          `;
          // Hide overlays when in Standard mode
          overlayImageEl.style.display = "none";
          overlayImage2El.style.display = "none";
          break;
      }

      // Update timeline GUI control range and value
      sliceControl.min(currMin);
      sliceControl.max(currMax);
      sliceControl.setValue(currYear);

      // Update overlay images if provided
      currentImage = newImagePath;
      currentImage2 = newImagePath2 || "";
      overlayImageEl.src = currentImage;
      overlayImage2El.src = currentImage2;
      overlayImageEl.style.display = currentImage ? "block" : "none";
      overlayImage2El.style.display = currentImage2 ? "block" : "none";
    });
}

// -----------------------
// Overlay Images Setup
// -----------------------
function initOverlayImages() {
  overlayImageEl = document.getElementById("overlay-image");
  overlayImage2El = document.getElementById("overlay-image2");
  // Initially hide overlay images
  overlayImageEl.style.display = "none";
  overlayImage2El.style.display = "none";
}

// -----------------------
// Main Initialization
// -----------------------
function init() {
  initTextures();
  initScene();
  initOverlayImages();
  initGUI();
  animate();
}

// Initialize when DOM is ready
window.addEventListener("DOMContentLoaded", init);

