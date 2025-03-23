
import * as THREE from 'three';

export async function loadPointsFromJson(filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error('Erro ao carregar o JSON');
        
        const json = await response.json();
        if (!json.path || !Array.isArray(json.path)) {
            throw new Error('O JSON não contém um array válido em "points".');
        }

        return json.path.map(p => new THREE.Vector3(p.x, p.y, p.z));
    } catch (error) {
        console.error('Erro ao carregar JSON:', error.message);
        return [];
    }
}

export async function loadPaintingsInfo(jsonPath) {
    try {
        const response = await fetch(jsonPath);
        if (!response.ok) {
            throw new Error(`Failed to load JSON: ${response.statusText}`);
        }
        const paintingsInfo = await response.json();
        console.log("Paintings loaded:", paintingsInfo);
        return paintingsInfo;
    } catch (error) {
        console.error("Error loading paintings:", error);
        return [];
    }
}

export async function loadDict(jsonPath) {
    try {
        const response = await fetch(jsonPath);
        if (!response.ok) throw new Error("Failed to load JSON");
        
        const data = await response.json();

        if (typeof data !== "object" || data === null) {
            throw new Error("Invalid JSON format: Expected an object");
        }

        return data; // Returns the dictionary as a JavaScript object
    } catch (error) {
        console.error("Error loading dictionary:", error);
        return {};
    }
}
