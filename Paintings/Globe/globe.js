






window.addEventListener("DOMContentLoaded", () => {
    // Replace these with your actual modules or functions as needed.
    // For example, you could include getStarfield and museum_map as global variables
    // or import them using script tags.
    // Here we assume they are defined elsewhere in your project.
    // Example placeholders:

    const getStarfield = ({ numStars, sprite }) => {
      // create a group of stars (this is a very basic placeholder)
      const group = new THREE.Group();
      for (let i = 0; i < numStars; i++) {
        const starGeo = new THREE.SphereGeometry(0.005, 8, 8);
        const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const star = new THREE.Mesh(starGeo, starMat);
        star.position.set(
          (Math.random() - 0.5) * 100,
          (Math.random() - 0.5) * 100,
          (Math.random() - 0.5) * 100
        );
        group.add(star);
      }
      return group;
    };
  
    const museum_map = [
      // sample entry
      { id: "sampleId", camera: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 1.6, z: 0 }, splineInterpParam: 0 },
    ];
  
    // Global variables
    let currentImage = "";
    let currentImage2 = "";
    let currentTextureArray = [];
    let currMin = 0;
    let currMax = 0;
    let currYear;
  
    // Uniforms for shaders
    const uniforms = {
      size: { value: 3.0 },
      colorTexture: { value: null },
      elevTexture: { value: null },
      alphaTexture: { value: null },
    };
  
    // Get DOM elements
    const mountElement = document.getElementById("globe-render");
    const overlayImageEl = document.getElementById("overlay-image");
    const overlayImage2El = document.getElementById("overlay-image2");
  
    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 4);
  
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountElement.appendChild(renderer.domElement);
  
    // OrbitControls
    const orbitControl = new THREE.OrbitControls(camera, renderer.domElement);
    orbitControl.enableDamping = true;
    orbitControl.autoRotate = true;
    orbitControl.autoRotateSpeed = 2.4;
    orbitControl.minDistance = 1.8;
    orbitControl.maxDistance = 40;
  
    // Texture loader
    const textureLoader = new THREE.TextureLoader();
    const starSprite = textureLoader.load("../../assets/globe/star.png");
  
    // Load textures
    const earthMap = textureLoader.load("../../assets/globe/00_earthmap1k.jpg");
    const elevMap = textureLoader.load("../../assets/globe/01_earthbump1k.jpg");
    const alphaMap = textureLoader.load("../../assets/globe/02_earthspec1k.jpg");
    const colorbarTexture = textureLoader.load('../../assets/globe/avg_temperature_land/colorbar.png');
  
    // Preload textures for timeline data
    const tempTextures = [];
    for (let i = 2000; i < 2025; i++) {
      tempTextures.push(textureLoader.load(`../../assets/globe/avg_temperature_land/${i}.png`));
    }
    const ocean_tempTextures = [];
    for (let i = 2010; i < 2025; i++) {
      ocean_tempTextures.push(textureLoader.load(`../../assets/globe/avg_temperature_ocean/${i}.jpeg`));
    }
    const vegTextures = [];
    for (let i = 2013; i < 2025; i++) {
      vegTextures.push(textureLoader.load(`../../assets/globe/vegetation/${i}.jpeg`));
    }
    const carbonTextures = [];
    for (let i = 2015; i < 2024; i++) {
      carbonTextures.push(textureLoader.load(`../../assets/globe/carbon/${i}.jpeg`));
    }
    const fireTextures = [];
    for (let i = 2015; i < 2025; i++) {
      fireTextures.push(textureLoader.load(`../../assets/globe/fire/${i}.jpeg`));
    }
  
    // Set initial uniform textures
    uniforms.colorTexture.value = earthMap;
    uniforms.elevTexture.value = elevMap;
    uniforms.alphaTexture.value = alphaMap;
  
    // Create globe group and mesh
    const globeGroup = new THREE.Group();
    const earthGeometry = new THREE.SphereGeometry(1, 20, 20);
    const earthMaterial = new THREE.MeshBasicMaterial({ color: 0x202020, wireframe: true });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    globeGroup.add(earth);
    scene.add(globeGroup);
  
    // Define shaders (using template literals for multiline strings)
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
  
    // Create points with custom shader material
    const pointsGeometry = new THREE.IcosahedronGeometry(1, 120);
    const pointsMat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
    });
    const points = new THREE.Points(pointsGeometry, pointsMat);
    scene.add(points);
  
    // Lighting and stars
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x080820, 3);
    scene.add(hemiLight);
    const stars = getStarfield({ numStars: 4500, sprite: starSprite });
    scene.add(stars);
  
    // Dummy navigate function (replace with your own logic)
    function navigate(url, state) {
      console.log("Navigating to:", url, state);
      // For example, you might use window.location.href = url;
    }
  
    // Animation loop
    let animationId;
    function animate() {
      animationId = requestAnimationFrame(animate);
      orbitControl.update();
      renderer.render(scene, camera);
    }
    animate();
  
    // Handle window resize
    function handleResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener("resize", handleResize);
  
    // Set up lil-gui
    const gui = new lil.GUI({ autoPlace: true });
    // Place the GUI inside the provided container
    const guiContainer = document.querySelector(".lil-gui");
    guiContainer.appendChild(gui.domElement);
    gui.domElement.style.top = "1.8rem";
    gui.domElement.style.borderRadius = "8px";
    gui.domElement.classList.add("lil-gui");
  
    // GUI responsiveness
    function resizeGUI() {
      const screenWidth = window.innerWidth;
      if (screenWidth < 500) {
        gui.domElement.style.height = "200px";
        gui.domElement.style.left = "0px";
        gui.domElement.style.top = "0px";
        gui.domElement.style.transform = "scale(0.9)";
      }
    }
    window.addEventListener("resize", resizeGUI);
    resizeGUI();
  
    // GUI controls
    gui.add(uniforms.size, "value", 1, 10).name("Point Size");
    const sliceObj = { slice: 2000 };
    const sliceControl = gui.add(sliceObj, "slice", 2000, 2024, 1).name("Timeline");
    const rotationObj = { rotation: true };
    gui.add(rotationObj, "rotation").name("Rotation").onChange((value) => {
      orbitControl.autoRotate = value;
    });

    sliceControl.onChange((value) => {
      const displaySlice = Math.round(value); 
      if(currentTextureArray.length > 0) {
        if(displaySlice != currYear) {
          uniforms.colorTexture.value = currentTextureArray[displaySlice - currMin]; 
          currYear = displaySlice; 
        }
      }
      sliceControl.setValue(displaySlice);
    });
    
    // Create a folder for data display and add text
    const textureFolder = gui.addFolder("Data");
    const textDisplay = document.createElement("div");
    textDisplay.classList.add("text-display");
    textDisplay.innerHTML = `<p>Welcome to Earth!</p>
    <br/>
    <p>Earth is a unique planet, covering about 71% with water, making it the only known world to support life.</p>`;
    textureFolder.domElement.appendChild(textDisplay);

    overlayImageEl.style.display = "none"; // Hide unused overlay
    overlayImage2El.style.display = "none"; // Hide unused overlay
  
    // Data selection control
    textureFolder
      .add({ Data: "Standard" }, "Data", [
        "Standard",
        "Avg Land Temperature",
        "Avg Ocean Temperature",
        "Population",
        "Vegetation",
        "Carbon Monoxide",
        "Wildfire",
      ])
      .onChange((value) => {
        let newImagePath = "";
        let newImagePath2 = "";
        overlayImageEl.style.display = "block";
        overlayImage2El.style.display = "block";
        switch (value) {
          case "Avg Land Temperature":
            newImagePath = "../../assets/globe/avg_temperature_land/colorbar.png";
            currentTextureArray = tempTextures;
            currYear = 2000;
            uniforms.colorTexture.value = textureLoader.load("../../assets/globe/avg_temperature_land/2000.png");
            gsap.to(camera.position, { x: 0, y: 0, z: 5, duration: 2, ease: "power3.inOut" });
            currMin = 2000;
            currMax = 2024;
            textDisplay.innerHTML = `<p>This data comes from <a href="https://lpdaac.usgs.gov/products/mod11c1v061/" target="_blank">MOD11C1</a>.</p>
              <br/>
              <p>The daytime land surface temperature maps are created using thermal infrared data from NASA's Terra and Aqua satellites.</p>`;
            break;
  
          case "Avg Ocean Temperature":
            newImagePath = "../../assets/globe/avg_temperature_ocean/colorbar.png";
            currentTextureArray = ocean_tempTextures;
            currYear = 2010;
            uniforms.colorTexture.value = textureLoader.load("../../assets/globe/avg_temperature_ocean/2010.jpeg");
            gsap.to(camera.position, { x: 0, y: 0, z: 5, duration: 2, ease: "power3.inOut" });
            currMin = 2010;
            currMax = 2024;
            textDisplay.innerHTML = `<p>This data comes from <a href="https://modis.gsfc.nasa.gov/" target="_blank">MODIS</a>.</p>
              <br/>
              <p>The Sea Surface Temperature product provides global ocean temperature measurements using NASA's MODIS instruments.</p>`;
            break;
  
          case "Population":
            newImagePath = "../../assets/globe/population/colorbar.png";
            newImagePath2 = "../../assets/globe/population/world_pop.png";
            uniforms.colorTexture.value = textureLoader.load("../../assets/globe/population/population.jpeg");
            currentTextureArray = [];
            gsap.to(camera.position, { x: 0, y: 0, z: 4, duration: 2, ease: "power3.inOut" });
            currYear = 2000;
            currMin = 2000;
            currMax = 2000;
            textDisplay.innerHTML = `<p>This data comes from <a href="https://sedac.ciesin.columbia.edu/data/set/gpw-v4-population-density-rev11/data-download" target="_blank">SEDAC</a>.</p>
              <br/>
              <p>Understanding population distribution is crucial for natural resource studies.</p>`;
            break;
  
          case "Vegetation":
            newImagePath = "../../assets/globe/vegetation/colorbar.png";
            currentTextureArray = vegTextures;
            uniforms.colorTexture.value = textureLoader.load("../../assets/globe/vegetation/2013.jpeg");
            gsap.to(camera.position, { x: 0, y: 0, z: 4, duration: 2, ease: "power3.inOut" });
            currYear = 2013;
            currMin = 2013;
            currMax = 2024;
            textDisplay.innerHTML = `<p>This data comes from <a href="https://modis.gsfc.nasa.gov/" target="_blank">MODIS</a>.</p>
              <br/>
              <p>Vegetation data helps monitor changes in land cover over time.</p>`;
            break;
  
          case "Carbon Monoxide":
            newImagePath = "../../assets/globe/carbon/colorbar.png";
            currentTextureArray = carbonTextures;
            uniforms.colorTexture.value = textureLoader.load("../../assets/globe/carbon/2015.jpeg");
            gsap.to(camera.position, { x: 0, y: 0, z: 5, duration: 2, ease: "power3.inOut" });
            currYear = 2015;
            currMin = 2015;
            currMax = 2022;
            textDisplay.innerHTML = `<p>This data comes from the <a href="https://www2.acom.ucar.edu/mopitt" target="_blank">MOPITT</a> dataset.</p>
              <br/>
              <p>Carbon monoxide concentrations are monitored to understand atmospheric chemistry.</p>`;
            break;
  
          case "Wildfire":
            newImagePath = "../../assets/globe/fire/colorbar.png";
            currentTextureArray = fireTextures;
            uniforms.colorTexture.value = textureLoader.load("../../assets/globe/fire/2015.jpeg");
            gsap.to(camera.position, { x: 0, y: 0, z: 4, duration: 2, ease: "power3.inOut" });
            currYear = 2015;
            currMin = 2015;
            currMax = 2022;
            textDisplay.innerHTML = `<p>This data comes from the <a href="https://lpdaac.usgs.gov/products/mod14a1v061/" target="_blank">MOD14A1</a> dataset.</p>
              <br/>
              <p>Wildfire data shows the impact of fires on the atmosphere.</p>`;
            break;
  
          case "Standard":
            uniforms.colorTexture.value = textureLoader.load("../../assets/globe/00_earthmap1k.jpg");
            currentTextureArray = [];
            currMin = 2000;
            currMax = 2024;
            currYear = 2000;
            textDisplay.innerHTML = `<p>Welcome to Earth!</p>
              <br/>
              <p>Earth is a unique planet covering about 71% with water, supporting diverse life forms.</p>`;
            break;
        }
        // Update the timeline GUI control range and value
        sliceControl.min(currMin);
        sliceControl.max(currMax);
        sliceControl.setValue(currYear);
  
        // Update overlay images if needed
        
        currentImage = newImagePath;
        currentImage2 = newImagePath2;
        if (currentImage == "") {
          overlayImageEl.style.display = "none";
        } else {
          overlayImageEl.style.display = "block";
        }
        if (currentImage2 == "") {
          overlayImage2El.style.display = "none";
        } else {
          overlayImage2El.style.display = "block";
        }
        overlayImageEl.src = currentImage;
        overlayImage2El.src = currentImage2;
      });
  });
  
