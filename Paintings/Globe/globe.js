
import * as THREE from 'three';

let scene, camera, renderer, cube;
let isMouseDown = false;

function initCube() {
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("three-canvas"), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 5;

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    let light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);

    let geometry = new THREE.BoxGeometry();
    let material = new THREE.MeshStandardMaterial({ color: 0x0077ff });
    cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    document.addEventListener("mousedown", () => isMouseDown = true);
    document.addEventListener("mouseup", () => isMouseDown = false);
    document.addEventListener("mousemove", (event) => {
        if (isMouseDown) {
            cube.rotation.y += event.movementX * 0.01;
            cube.rotation.x += event.movementY * 0.01;
        }
    });

    window.addEventListener("resize", onWindowResize);
    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

function cleanUpCube() {
    if (cube) {
        scene.remove(cube);
    }
    if (cube) {
        cube.traverse((child) => {
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

window.onload = initCube;
window.addEventListener("beforeunload", cleanUpCube);
