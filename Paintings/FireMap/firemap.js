let map, velocityLayer, preclayer;
const markers = [];
let loading = 3;

const state = {
    showWind: true,
    showprec: true,
    showFireMarkers: true
};

function toggleLoadingScreen() {
    if (--loading === 0) {
        document.getElementById("loading-screen").style.display = "none";
    }
}

function initializeMap() {
    map = L.map('firemap', { zoomControl: false, minZoom: 3, maxZoom: 10 })
        .setView([51.505, -0.09], 3);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap & CartoDB'
    }).addTo(map);

    window.markerCluster = L.markerClusterGroup();
    loadDataLayers();
}

function loadDataLayers() {
    fetchFireData().then(toggleLoadingScreen);
    fetchWindData().then(toggleLoadingScreen);
    fetchPrecipitationData().then(toggleLoadingScreen);
}

async function fetchFireData() {
    try {
        const data = await d3.csv('../../assets/maps/MODIS_C6_1_Global_7d.csv');
        data.filter(d => +d.confidence > 95).forEach(fire => {
            markers.push({
                lat: parseFloat(fire.latitude),
                lon: parseFloat(fire.longitude),
                brightness: parseFloat(fire.brightness),
                info: `Brightness: ${fire.brightness}, Confidence: ${fire.confidence}`
            });
        });
        updateFireMarkers();
    } catch (error) {
        console.error('Error loading fire data:', error);
    }
}

async function fetchWindData() {
    try {
        const response = await fetch('../../assets/maps/gfs.json');
        const data = await response.json();
        velocityLayer = L.velocityLayer({ displayValues: true, data, maxVelocity: 15 });
        if (state.showWind) velocityLayer.addTo(map);
    } catch (error) {
        console.error('Error loading wind data:', error);
    }
}

async function fetchPrecipitationData() {
    try {
        const response = await fetch('../../assets/maps/prec3.tif');
        const georaster = await parseGeoraster(await response.arrayBuffer());
        preclayer = new GeoRasterLayer({
            georaster,
            opacity: 0.75,
            resolution: 64,
            pixelValuesToColorFn: values => values[0] > 20 ? chroma.scale(['lightblue', 'blue', 'darkblue'])(values[0] / 1000).hex() : null
        });
        if (state.showprec) preclayer.addTo(map);
    } catch (error) {
        console.error('Error loading precipitation data:', error);
    }
}

function updateFireMarkers() {
    window.markerCluster.clearLayers();
    if (state.showFireMarkers) {
        markers.forEach(({ lat, lon, brightness, info }) => {
            window.markerCluster.addLayer(
                L.marker([lat, lon], { icon: L.divIcon({ className: 'custom-marker', html: `<div style="background:${getMarkerColor(brightness)}; width:10px; height:10px; border-radius:50%;"></div>` }) })
                .bindPopup(info)
            );
        });
        map.addLayer(window.markerCluster);
    }
}

function getMarkerColor(brightness) {
    return brightness > 400 ? '#ff0000' : brightness > 350 ? '#ffa500' : '#ffff00';
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("loading-screen").style.display = "flex";
    initializeMap();
    
    document.getElementById("toggleFiremarkers").addEventListener("change", e => {
        state.showFireMarkers = e.target.checked;
        updateFireMarkers();
    });
    
    document.getElementById("toggleVelocity").addEventListener("change", e => {
        e.target.checked ? velocityLayer.addTo(map) : map.removeLayer(velocityLayer);
    });
    
    document.getElementById("togglePrec").addEventListener("change", e => {
        e.target.checked ? preclayer.addTo(map) : map.removeLayer(preclayer);
    });
})

