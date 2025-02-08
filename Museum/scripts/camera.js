export class CameraControls {
  constructor(camera, renderer) {
    this.camera = camera;
    this.renderer = renderer;

    // Store yaw (rotation around Y) and pitch (rotation around X)
    this.yaw = camera.rotation.y;
    this.pitch = camera.rotation.x;
    this.rotationSpeed = 0.003;

    // Set the rotation order to avoid unwanted rotations (common for FPS controls)
    this.camera.rotation.order = 'YXZ';

    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };

    this.initEventListeners();
  }

  initEventListeners() {
    // --- Mouse Events ---
    this.renderer.domElement.addEventListener('mousedown', (event) => {
      // Only respond to the left mouse button (button 0)
      if (event.button !== 0) return;
      this.isDragging = true;
      this.previousMousePosition = { x: event.clientX, y: event.clientY };
    });

    this.renderer.domElement.addEventListener('mousemove', (event) => {
      if (!this.isDragging) return;

      const deltaMove = {
        x: -1*(event.clientX - this.previousMousePosition.x),
        y: -1*(event.clientY - this.previousMousePosition.y),
      };

      this.updateCameraRotation(deltaMove.x, deltaMove.y);
      this.previousMousePosition = { x: event.clientX, y: event.clientY };
    });

    // Listen for mouseup and only react if it's the left button being released.
    document.addEventListener('mouseup', (event) => {
      if (event.button !== 0) return;
      this.isDragging = false;
    });

    // --- Touch Events ---
    this.renderer.domElement.addEventListener('touchstart', (event) => {
      if (event.touches.length === 1) {
        this.isDragging = true;
        this.previousMousePosition = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
        };
      }
    });

    this.renderer.domElement.addEventListener('touchmove', (event) => {
      if (!this.isDragging || event.touches.length !== 1) return;

      const deltaMove = {
        x: -1*(event.touches[0].clientX - this.previousMousePosition.x),
        y: -1*(event.touches[0].clientY - this.previousMousePosition.y),
      };

      this.updateCameraRotation(deltaMove.x, deltaMove.y);
      this.previousMousePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };

      // Prevent default behavior like scrolling
      event.preventDefault();
    });

    this.renderer.domElement.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }

  updateCameraRotation(deltaX, deltaY) {
    // Update stored yaw and pitch values based on movement
    this.yaw   -= deltaX * this.rotationSpeed;
    this.pitch -= deltaY * this.rotationSpeed;

    // Clamp the pitch to avoid flipping the camera upside down
    const maxPitch = Math.PI / 2 - 0.1;
    const minPitch = -Math.PI / 2 + 0.1;
    this.pitch = Math.max(minPitch, Math.min(maxPitch, this.pitch));

    // Update the camera's rotation using the stored yaw and pitch values
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}

