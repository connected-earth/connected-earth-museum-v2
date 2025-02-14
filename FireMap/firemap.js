let map;
let markers = [];
let heatmapLayer = null;
let velocityLayer = null;
let preclayer = null;
let loading = 0;

// State management
const state = {
    showHeatmap: false,
    showWind: true,
    showprec: true,
    showFireMarkers: true
};

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initializeMap();
});

function initializeMap() {
    // Initialize map
    map = L.map('map').setView([20, 0], 2);
    
    // Add base layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Setup marker cluster group
    window.markerCluster = L.markerClusterGroup();
    
    // Load data layers
    fetchFireData();
    fetchWindData();
    fetchPrecipitationData();
    document.getElementById('loading-overlay').classList.add('hidden');

}

function setupEventListeners() {
    // Navigation button
    document.getElementById('back-button').addEventListener('click', () => {
        window.location.href = '/Museum/museum.html';
    });

    // Checkbox handlers
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', handleCheckboxChange);
    });
}

async function fetchFireData() {
    try {
        const data = await d3.csv('../assets/data/MODIS_C6_1_Global_7d.csv');
        const highConfidenceFires = data.filter(d => +d.confidence > 95);
        
        markers = highConfidenceFires.map(fire => ({
            lat: parseFloat(fire.latitude),
            lon: parseFloat(fire.longitude),
            brightness: parseFloat(fire.brightness),
            info: `Brightness: ${fire.brightness}, Confidence: ${fire.confidence}`
        }));

        if (window.markerCluster) {
            updateFireMarkers();
        }
    } catch (error) {
        console.error('Error loading fire data:', error);
    }
}

async function fetchWindData() {
    try {
        const response = await fetch('../assets/data/gfs.json');
        const data = await response.json();
        
        velocityLayer = L.velocityLayer({
            displayValues: true,
            data: data,
            maxVelocity: 15
        });
        
        if(state.showWind) velocityLayer.addTo(map);
    } catch (error) {
        console.error('Error loading wind data:', error);
    }
}

async function fetchPrecipitationData() {
    try {
        const response = await fetch('../assets/data/prec3.tif');
        const arrayBuffer = await response.arrayBuffer();
        const georaster = await parseGeoraster(arrayBuffer);
        
        preclayer = new GeoRasterLayer({
            georaster: georaster,
            opacity: 0.75,
            resolution: 64,
            pixelValuesToColorFn: values => {
                const val = values[0];
                return val > 20 ? chroma.scale(['white', 'lightblue', 'purple'])(val/1000).hex() : null;
            }
        });
        
        if(state.showprec) preclayer.addTo(map);
    } catch (error) {
        console.error('Error loading precipitation data:', error);
    }
}

function updateFireMarkers() {
    window.markerCluster.clearLayers();
    
    if(state.showFireMarkers) {
        markers.forEach(marker => {
            const customIcon = L.divIcon({
                className: 'custom-marker',
                html: `<div style="background:${getMarkerColor(marker.brightness)}; width:20px; height:20px; border-radius:50%;"></div>`
            });
            
            const leafletMarker = L.marker([marker.lat, marker.lon], {icon: customIcon})
                .bindPopup(marker.info);
            
            window.markerCluster.addLayer(leafletMarker);
        });
        
        map.addLayer(window.markerCluster);
    }
}

function getMarkerColor(brightness) {
    return brightness > 400 ? '#ff0000' :
           brightness > 350 ? '#ffa500' : '#ffff00';
}

function handleCheckboxChange(event) {
    const { name, checked } = event.target;
    state[name === 'heatmap' ? 'showHeatmap' : 
     name === 'wind' ? 'showWind' : 
     name === 'prec' ? 'showprec' : 'showFireMarkers'] = checked;

    switch(name) {
        case 'heatmap':
            toggleHeatmap(checked);
            break;
        case 'wind':
            toggleWind(checked);
            break;
        case 'prec':
            togglePrecipitation(checked);
            break;
        case 'fireMarkers':
            updateFireMarkers();
            break;
    }
}

function toggleHeatmap(show) {
    if(show) {
        const heatData = markers.map(m => [m.lat, m.lon, m.brightness/100]);
        heatmapLayer = L.heatLayer(heatData, {radius: 20, blur: 15});
        heatmapLayer.addTo(map);
    } else if(heatmapLayer) {
        map.removeLayer(heatmapLayer);
    }
}

function toggleWind(show) {
    show ? velocityLayer.addTo(map) : map.removeLayer(velocityLayer);
}

function togglePrecipitation(show) {
    show ? preclayer.addTo(map) : map.removeLayer(preclayer);
}