let poplayer = null;
let co2layer = null;
let aqlayer = null;
let popmap = null;
let showAq = true;
let loading = true;
const AQICN_API_KEY = '373e5a508f92508086306dcbe5da75cb7e878df7';

document.addEventListener('DOMContentLoaded', () => {
    addPopulationDensityLayer();
    
    document.getElementById('back-to-museum-button2').addEventListener('click', () => {
        window.location.href = '/Museum/museum.html';
    });

    document.querySelectorAll('.map-menu input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', handleCheckboxChange);
    });
});

async function loadGeoTIFF(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await parseGeoraster(arrayBuffer); 
}

async function addPopulationDensityLayer() {
    popmap = L.map('popmap').setView([51.505, -0.09], 3);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(popmap);

    const scale1 = chroma.scale(['white', 'orange', 'red']).domain([0, 100, 1000]);
    const scale2 = chroma.scale(['white', 'grey', 'black']).domain([0, 100, 1000]);

    // Load population layer
    const popGeoraster = await loadGeoTIFF("../assets/data/pop2.tif");
    
    poplayer = new GeoRasterLayer({
        attribution: "European Commission: Global Human Settlement",
        georaster: popGeoraster,
        opacity: 0.75,
        resolution: 64,
        pixelValuesToColorFn: values => {
            const population = values[0];
            if (population === -200 || population < 20) return;
            return scale1(population).hex();
        }
    }).addTo(popmap);

    // Load CO2 layer
    const co2Response = await fetch('../assets/data/co2_small.tif');
    const co2Buffer = await co2Response.arrayBuffer();
    const co2Georaster = await parseGeoraster(co2Buffer);
    
    co2layer = new GeoRasterLayer({
        attribution: "European Commission: Global Human Settlement",
        georaster: co2Georaster,
        opacity: 0.75,
        resolution: 64,
        pixelValuesToColorFn: values => {
            const population = values[0];
            if (population === -200 || population < 10) return;
            return scale2(population).hex();
        }
    }).addTo(popmap);

    // Add air quality layer
    aqlayer = L.tileLayer(
        `https://tiles.waqi.info/tiles/usepa-aqi/{z}/{x}/{y}.png?token=${AQICN_API_KEY}`,
        { attribution: 'Air Quality Tiles &copy; <a href="http://waqi.info">waqi.info</a>' }
    ).addTo(popmap);

    loading = false;
    document.getElementById('loading-overlay').classList.add('hidden');
}

function handleCheckboxChange(event) {
    const { name, checked } = event.target;
    
    if (name === 'pop' && poplayer) {
        console.log('pop', checked);
        if (checked) {
            poplayer.addTo(popmap);
        } else {
            poplayer.removeFrom(popmap);
        }
    } else if (name === 'aq' && aqlayer) {
        showAq = checked;
        checked ? aqlayer.addTo(popmap) : aqlayer.removeFrom(popmap);
    } else if (name === 'co2' && co2layer) {
        checked ? co2layer.addTo(popmap) : co2layer.removeFrom(popmap);
    }
}