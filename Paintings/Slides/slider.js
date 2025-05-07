// Configuration - set your image URLs here
const config = {
    beforeImage: {
        url: "/assets/images/slides/slider/before.jpg",
        alt: "Deforestation in Bolivia - before",
    },
    afterImage: {
        url: "/assets/images/slides/slider/after.jpg",
        alt: "Deforestation in Bolivia - after",
    }
};

class ImageSlider {
    constructor(rootElement, beforeImage, afterImage) {
        this.root = rootElement;
        this.beforeImage = beforeImage;
        this.afterImage = afterImage;
        this.isSliding = false;
        this.sliderPosition = 50; // Start at 50%
        this.containerRef = null;

        this.init();
    }

    init() {
        this.createHTML();
        this.setupEventListeners();
        this.updateSliderPosition();
    }

    createHTML() {
        const sliderHTML = `
            <div class="image-comparison" id="sliderContainer">
                <div class="img-container">
                    <img src="${this.beforeImage.url}" alt="${this.beforeImage.alt}">
                </div>
                <div class="img-overlay" id="imgOverlay">
                    <img src="${this.afterImage.url}" alt="${this.afterImage.alt}">
                </div>
                <div class="slider-slides" id="sliderHandle"></div>
            </div>
        `;
        this.root.innerHTML = sliderHTML;
        this.containerRef = document.getElementById('sliderContainer');
        this.imgOverlay = document.getElementById('imgOverlay');
        this.sliderHandle = document.getElementById('sliderHandle');
    }

    setupEventListeners() {
        // Mouse events
        this.containerRef.addEventListener('mousedown', this.startSliding.bind(this));
        this.sliderHandle.addEventListener('mousedown', this.startSliding.bind(this));
        window.addEventListener('mouseup', this.stopSliding.bind(this));
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));

        // Touch events
        this.containerRef.addEventListener('touchstart', this.startSliding.bind(this));
        this.sliderHandle.addEventListener('touchstart', this.startSliding.bind(this));
        window.addEventListener('touchend', this.stopSliding.bind(this));
        window.addEventListener('touchmove', this.handleTouchMove.bind(this));
    }

    startSliding(e) {
        e.preventDefault();
        this.isSliding = true;
    }

    stopSliding() {
        this.isSliding = false;
    }

    handleSliding(xPos) {
        if (this.containerRef) {
            const containerRect = this.containerRef.getBoundingClientRect();
            if (xPos < 0) xPos = 0;
            if (xPos > containerRect.width) xPos = containerRect.width;

            const widthPercentage = (xPos / containerRect.width) * 100;
            this.sliderPosition = widthPercentage;
            this.updateSliderPosition();
        }
    }

    handleMouseMove(e) {
        if (this.isSliding) {
            const xPos = e.clientX - this.containerRef.getBoundingClientRect().left;
            this.handleSliding(xPos);
        }
    }

    handleTouchMove(e) {
        if (this.isSliding && e.touches.length > 0) {
            const xPos = e.touches[0].clientX - this.containerRef.getBoundingClientRect().left;
            this.handleSliding(xPos);
        }
    }

    updateSliderPosition() {
        this.imgOverlay.style.clipPath = `inset(0 0 0 ${this.sliderPosition}%)`;
        this.sliderHandle.style.left = `${this.sliderPosition}%`;
    }
}

// Initialize the slider when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const sliderRoot = document.getElementById('sliderRoot');
    new ImageSlider(sliderRoot, config.beforeImage, config.afterImage);
});