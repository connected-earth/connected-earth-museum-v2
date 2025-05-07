let poplayer = null;
let co2layer = null;
let aqlayer = null;
let popmap = null;
const AQICN_API_KEY = '373e5a508f92508086306dcbe5da75cb7e878df7';

async function loadGeoTIFF(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return parseGeoraster(arrayBuffer);
}

function createMap() {
    const map = L.map('popmap', {
        zoomControl: false,
        minZoom: 3,
        maxZoom: 10
    }).setView([51.505, -0.09], 3);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);
    
    return map;
}

async function addGeoRasterLayer(map, url, scale, minThreshold, attribution) {
    const georaster = await loadGeoTIFF(url);
    
    return new GeoRasterLayer({
        attribution,
        georaster,
        opacity: 0.75,
        resolution: 64,
        pixelValuesToColorFn: values => {
            const value = values[0];
            if (value === -200 || value < minThreshold) return;
            return scale(value).hex();
        }
    }).addTo(map);
}

function addAirQualityLayer(map) {
    return L.tileLayer(
        `https://tiles.waqi.info/tiles/usepa-aqi/{z}/{x}/{y}.png?token=${AQICN_API_KEY}`,
        { attribution: 'Air Quality Tiles &copy; <a href="http://waqi.info">waqi.info</a>' }
    ).addTo(map);
}

async function initMap() {
    document.getElementById("loading-screen").style.display = "flex";

    popmap = createMap();
    
    const populationScale = chroma.scale(['white', 'yellow', 'orange', 'red']).domain([0, 50, 500, 10000]);
    const co2Scale = chroma.scale(['white', 'lightblue', 'blue', 'darkblue']).domain([0, 50, 500, 10000]);
  
  
    let loadedLayers = 0;
    const totalLayers = 3;
    function checkLoading() {
      loadedLayers++;
      if (loadedLayers === totalLayers) {
        document.getElementById("loading-screen").style.display = "none";
      }
    }

    poplayer = await addGeoRasterLayer(popmap, '../../assets/maps/pop2.tif', populationScale, 20, "European Commission");
    poplayer.on("load", checkLoading);

    co2layer = await addGeoRasterLayer(popmap, '../../assets/maps/co2_small.tif', co2Scale, 10, "European Commission");
    co2layer.on("load", checkLoading);

    aqlayer = addAirQualityLayer(popmap);
    aqlayer.on("load", checkLoading);
}

document.addEventListener('DOMContentLoaded', initMap);
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("togglePopulation").addEventListener("change", (e) => {
      if (e.target.checked) {
          poplayer.addTo(popmap);
      } else {
          popmap.removeLayer(poplayer);
      }
  });
  
  document.getElementById("toggleCO2").addEventListener("change", (e) => {
      if (e.target.checked) {
          co2layer.addTo(popmap);
      } else {
          popmap.removeLayer(co2layer);
      }
  });
  
  document.getElementById("toggleAQ").addEventListener("change", (e) => {
      if (e.target.checked) {
          aqlayer.addTo(popmap);
      } else {
          popmap.removeLayer(aqlayer);
      }
  });
});
