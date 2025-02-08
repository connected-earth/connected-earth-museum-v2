
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
