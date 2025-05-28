// Game data
const questions = [
    {
        title: 'Where does most of the population live today?',
        route: {
            text: 'for information about this subject check this link',
            path: '/connected-earth-museum/slides/slide_1'
        },
        options: [
            {
                text: 'Farms',
                correct: false
            },
            {
                text: 'Forests',
                correct: false
            },
            {
                text: 'Cities',
                correct: true
            },
            {
                text: 'Seas',
                correct: false
            }
        ]
    },
    {
        title: 'What causes orange / red sunsets?',
        route: {
            text: 'for information about this subject check this link',
            path: '/connected-earth-museum/slides/slide_1'
        },
        options: [
            {
                text: 'The light reflection on the oceans',
                correct: false
            },
            {
                text: 'Scattering of particles in the air',
                correct: true
            },
            {
                text: 'The sun is closer to the Earth during sunsets',
                correct: false
            },
            {
                text: 'The sun is physically changing color.',
                correct: false
            }
        ]
    },
    {
        title: 'What is the problem with rising temperatures?',
        route: {
            text: 'for information about this subject check this link',
            path: '/connected-earth-museum/slides/slide_1'
        },
        options: [
            {
                text: 'Warmer weather is always better',
                correct: false
            },
            {
                text: 'Rising temperatures will benefit everyone equally.',
                correct: false
            },
            {
                text: 'The Earth has never been this hot',
                correct: false
            },
            {
                text: 'Because of the alarming rate that is increasing',
                correct: true
            }
        ]
    },
    {
        title: 'How to identify wild fires by satellites',
        route: {
            text: 'for information about this subject check this link',
            path: '/connected-earth-museum/slides/slide_2'
        },
        options: [
            {
                text: 'By looking at temperature changes in the surroundings',
                correct: true
            },
            {
                text: 'Satellites use infrared cameras to detect heat signatures.',
                correct: false
            },
            {
                text: 'Satellites cannot detect wildfires at night.',
                correct: false
            },
            {
                text: 'Satellites cannot detect wildfires',
                correct: false
            }
        ]
    },
    {
        title: 'What can we do to combat global warming?',
        route: {
            text: 'for information about this subject check this link',
            path: '/connected-earth-museum/slides/slide_3'
        },
        options: [
            {
                text: 'There is nothing we can do',
                correct: false
            },
            {
                text: 'by reducing our carbon footprint',
                correct: true
            },
            {
                text: 'Deforestation',
                correct: false
            },
            {
                text: 'Increase meat consumption.',
                correct: false
            }
        ]
    }
];

// Game constants
const FULL_LIFE = 3;
const PROJECTILE_SPEED = 5;
const PROJECTILE_RADIUS = 5;

// Game state
let life = FULL_LIFE;
let activeQuestion = 0;
let answers = [];
let shakeScreen = false;
let animationId;
let centralBallImage, orbitingBallImage, orbitingBallImage2;

// DOM elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const lifeContainer = document.getElementById('lifeContainer');
const questionsContainer = document.getElementById('questionsContainer');

// Initialize canvas dimensions
const canvasSize = Math.min(window.innerHeight * 0.8, window.innerWidth * 0.8, 500);
const isMobile = window.innerWidth < 768;
const WIDTH = canvasSize;
const HEIGHT = canvasSize;
canvas.width = WIDTH;
canvas.height = HEIGHT;

// Game objects
const centralBall = {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    radius: 30,
    color: 'blue',
};

const orbitingBall = {
    angle: 0,
    angularSpeed: 0.01,
    radius: 15,
    color: 'red',
    x: isMobile ? centralBall.x + 75 * Math.cos(0) : centralBall.x + 100 * Math.cos(0),
    y: isMobile ? centralBall.y + 75 * Math.sin(0) : centralBall.y + 100 * Math.sin(0),
};

const orbitingBall2 = {
    angle: 0,
    angularSpeed: 0.01,
    radius: 15,
    color: 'red',
    x: isMobile ? centralBall.x + 125 * Math.cos(0) : centralBall.x + 175 * Math.cos(0),
    y: isMobile ? centralBall.y + 125 * Math.sin(0) : centralBall.y + 175 * Math.sin(0),
};

let projectiles = [];
let projectiles2 = [];

// Initialize game
function init() {
    // Load images
    centralBallImage = new Image();
    centralBallImage.src = '../../assets/images/game/earth.svg';

    orbitingBallImage = new Image();
    orbitingBallImage.src = '../../assets/images/game/tornado.svg';

    orbitingBallImage2 = new Image();
    orbitingBallImage2.src = '../../assets/images/game/industry.svg';

    // Create hearts for life display
    renderHearts();

    // Create questions
    renderQuestions();

    // Start animation when images are loaded
    Promise.all([
        new Promise(resolve => { centralBallImage.onload = resolve; }),
        new Promise(resolve => { orbitingBallImage.onload = resolve; }),
        new Promise(resolve => { orbitingBallImage2.onload = resolve; })
    ]).then(() => {
        animate();
    });
}

// Render heart icons for life display
function renderHearts() {
    lifeContainer.innerHTML = '';
    for (let i = 0; i < FULL_LIFE; i++) {
        const heart = document.createElement('div');
        heart.innerHTML = `
            <svg width="36px" height="36px" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1.24264 8.24264L8 15L14.7574 8.24264C15.553 7.44699 16 6.36786 16 5.24264V5.05234C16 2.8143 14.1857 1 11.9477 1C10.7166 1 9.55233 1.55959 8.78331 2.52086L8 3.5L7.21669 2.52086C6.44767 1.55959 5.28338 1 4.05234 1C1.8143 1 0 2.8143 0 5.05234V5.24264C0 6.36786 0.44699 7.44699 1.24264 8.24264Z" fill="${i + 1 > life ? '#000' : '#f00'}" />
            </svg>
        `;
        lifeContainer.appendChild(heart);
    }
}

// Render questions
function renderQuestions() {
    questionsContainer.innerHTML = '';
    questions.forEach((question, idx) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = `question ${activeQuestion === idx ? '' : 'hidden-question'}`;
        questionDiv.innerHTML = `
            <h2>${question.title}</h2>
            <div class="question-content">
                <img src="../../assets/images/game/astronaut.svg" alt="Astronaut" width="100">
                <div class="options">
                    ${question.options.map(option => `
                        <button data-question="${idx}" data-correct="${option.correct}">${option.text}</button>
                    `).join('')}
                </div>
            </div>
        `;
        questionsContainer.appendChild(questionDiv);
    });

    // Add event listeners to buttons
    document.querySelectorAll('.options button').forEach(button => {
        button.addEventListener('click', handleAnswer);
    });
}

// Handle answer selection
function handleAnswer(e) {
    const questionIdx = parseInt(e.target.getAttribute('data-question'));
    const isCorrect = e.target.getAttribute('data-correct') === 'true';
    const question = questions[questionIdx];
    const optionText = e.target.textContent;
    
    // Find the selected option object
    const option = question.options.find(opt => opt.text === optionText);
    
    answers.push({ question: question.title, option });
    
    if (activeQuestion + 1 <= questions.length) {
        if (!isCorrect) {
            fire(orbitingBall, projectiles, true);
            fire(orbitingBall2, projectiles2);
            handleShakeScreen();
        }
        
        activeQuestion++;
        
        if (activeQuestion < questions.length) {
            // Show next question
            document.querySelectorAll('.question').forEach((q, idx) => {
                if (idx === activeQuestion) {
                    q.classList.remove('hidden-question');
                } else {
                    q.classList.add('hidden-question');
                }
            });
        }
    }
    
    if (questionIdx + 1 === questions.length) {
        if (!isCorrect && life - 1 === 0) return;

        window.location.href = `./win.html`;
    }
}

// Fire projectiles
function fire(orbitingBall, projectilesArray, add=false) {
    // Calculate direction vector from orbiting ball to central ball
    const dx = centralBall.x - orbitingBall.x;
    const dy = centralBall.y - orbitingBall.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return;

    // Normalize the direction vector and multiply by projectile speed
    const vx = (dx / distance) * PROJECTILE_SPEED;
    const vy = (dy / distance) * PROJECTILE_SPEED;

    if (!add) return;
    // Create a new projectile
    projectilesArray.push({
        x: orbitingBall.x,
        y: orbitingBall.y,
        vx,
        vy,
    });
}

// Shake screen effect
function handleShakeScreen() {
    questionsContainer.classList.add('shake');
    setTimeout(() => {
        questionsContainer.classList.remove('shake');
    }, 900);
}

// Animation loop
function animate() {
    // Update orbiting balls' angles and positions
    orbitingBall.angle += orbitingBall.angularSpeed;
    orbitingBall.x = isMobile ? 
        centralBall.x + 75 * Math.cos(orbitingBall.angle) : 
        centralBall.x + 100 * Math.cos(orbitingBall.angle);
    orbitingBall.y = isMobile ? 
        centralBall.y + 75 * Math.sin(orbitingBall.angle) : 
        centralBall.y + 100 * Math.sin(orbitingBall.angle);

    orbitingBall2.angle += orbitingBall2.angularSpeed;
    orbitingBall2.x = isMobile ? 
        centralBall.x + 125 * Math.cos(orbitingBall2.angle) : 
        centralBall.x + 175 * Math.cos(orbitingBall2.angle);
    orbitingBall2.y = isMobile ? 
        centralBall.y + 125 * Math.sin(orbitingBall2.angle) : 
        centralBall.y + 175 * Math.sin(orbitingBall2.angle);

    // Update projectiles
    projectiles = projectiles
        .map(proj => ({
            ...proj,
            x: proj.x + proj.vx,
            y: proj.y + proj.vy,
        }))
        .filter(proj => {
            // Remove if off-screen
            if (proj.x < 0 || proj.x > WIDTH || proj.y < 0 || proj.y > HEIGHT) {
                return false;
            }

            // Check collision with central ball
            const dx = proj.x - centralBall.x;
            const dy = proj.y - centralBall.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < centralBall.radius + PROJECTILE_RADIUS) {
                life--;
                renderHearts();
                if (life === 0) {
                    localStorage.setItem('gameData', JSON.stringify(answers))
                    window.location.href = `./lose.html`;
                }
                return false;
            }
            return true;
        });

    projectiles2 = projectiles2
        .map(proj => ({
            ...proj,
            x: proj.x + proj.vx,
            y: proj.y + proj.vy,
        }))
        .filter(proj => {
            if (proj.x < 0 || proj.x > WIDTH || proj.y < 0 || proj.y > HEIGHT) {
                return false;
            }

            const dx = proj.x - centralBall.x;
            const dy = proj.y - centralBall.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < centralBall.radius + PROJECTILE_RADIUS) {
                life--;
                renderHearts();
                if (life === 0) {
                    localStorage.setItem('gameData', JSON.stringify(answers)) 

                    window.location.href = `./lose.html`;
                }
                return false;
            }
            return true;
        });

    // Clear canvas
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Draw central ball
    ctx.drawImage(centralBallImage, centralBall.x - centralBall.radius, centralBall.y - centralBall.radius, 100, 100);

    // Draw orbiting balls
    ctx.drawImage(orbitingBallImage, orbitingBall.x - orbitingBall.radius, orbitingBall.y - orbitingBall.radius, 50, 50);
    ctx.drawImage(orbitingBallImage2, orbitingBall2.x - orbitingBall2.radius, orbitingBall2.y - orbitingBall2.radius, 70, 70);

    // Draw projectiles
    projectiles.forEach(proj => {
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, PROJECTILE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.closePath();
    });

    projectiles2.forEach(proj => {
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, PROJECTILE_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFF00';
        ctx.fill();
        ctx.closePath();
    });

    animationId = requestAnimationFrame(animate);
}

// Start the game
init();

// Cleanup on window close
window.addEventListener('beforeunload', () => {
    cancelAnimationFrame(animationId);
});