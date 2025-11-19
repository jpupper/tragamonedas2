// Configuration
const CONFIG = {
    images: [
        '1.png', '2.png', '3.png', '4.png', 
        '5.png', '6.png', '7.png', '8.png', 
        '9.png', '10.png', '11.png', '12.png'
    ],
    imagePath: 'assets/fotos/',
    forcedWinEvery: 5,
    spinSpeed: 80, // ms per step
    spinSpeedWin: 120, // Slower speed for wins
    stopDecelerationSteps: 8 // How many steps to slow down
};

// State
let state = {
    screen: 'welcome',
    playsCount: 0,
    results: [0, 0, 0],
    reelsStopped: 0,
    reelsFinished: 0,
    isWinRound: false
};

// Carousel Class based on User's Logic
class VerticalCarousel {
    constructor(containerId, trackId, items, onUpdate, onStop) {
        this.container = document.getElementById(containerId);
        this.track = document.getElementById(trackId);
        this.images = items; // Array of image filenames
        this.onUpdate = onUpdate;
        this.onStop = onStop;
        
        this.currentIndex = Math.floor(Math.random() * this.images.length);
        this.isSpinning = false;
        this.spinInterval = null;
        this.stopped = true; // Initially stopped
        
        this.init();
    }
    
    init() {
        this.renderCarousel();
        // Initial update
        this.updateCarousel();
    }
    
    renderCarousel() {
        this.track.innerHTML = '';
        
        this.images.forEach((imgName, index) => {
            const item = document.createElement('div');
            item.className = 'carousel-item hidden'; // Start hidden
            item.dataset.index = index;
            
            // Image is background to fit in frame or as child?
            // User requested cuadradofoto as container (handled in CSS).
            // Here we add the image inside.
            const img = document.createElement('img');
            img.src = `${CONFIG.imagePath}${imgName}`;
            img.alt = `Item ${index}`;
            
            item.appendChild(img);
            this.track.appendChild(item);
        });
        
        // Click listener for stopping handled by main script on container
    }
    
    updateCarousel() {
        const items = this.track.querySelectorAll('.carousel-item');
        const totalImages = this.images.length;
        
        items.forEach((item, index) => {
            // Clear inline styles that might have been set by animations
            item.style.zIndex = '';
            item.style.transform = '';

            // Calculate relative position with wrap around
            let position = index - this.currentIndex;
            
            // Adjust for circularity
            if (position > totalImages / 2) {
                position -= totalImages;
            } else if (position < -totalImages / 2) {
                position += totalImages;
            }
            
            // Reset classes
            item.className = 'carousel-item';
            
            // Apply classes based on position
            if (position === 0) {
                item.classList.add('active');
            } else if (position === -1) {
                item.classList.add('prev');
            } else if (position === 1) {
                item.classList.add('next');
            } else if (position === -2) {
                item.classList.add('far-prev');
            } else if (position === 2) {
                item.classList.add('far-next');
            } else {
                item.classList.add('hidden');
            }
        });
        
        // Notify update (for Zoom view)
        if (this.onUpdate) {
            this.onUpdate(this.images[this.currentIndex]);
        }
    }
    
    startSpin(speed) {
        if (this.isSpinning) return;
        this.isSpinning = true;
        this.stopped = false;
        
        // Use provided speed or default
        const spinSpeed = speed || CONFIG.spinSpeed;
        
        // Infinite spin loop
        this.spinInterval = setInterval(() => {
            this.step(1); // Move forward
        }, spinSpeed);
    }
    
    stopSpin(targetIndex) {
        if (!this.isSpinning) return;
        
        clearInterval(this.spinInterval);
        this.isSpinning = false;
        
        // Calculate steps to target
        // We want to land on targetIndex
        // current -> target.
        // Since we are moving forward (dir 1), we need (target - current)
        let steps = targetIndex - this.currentIndex;
        if (steps <= 0) steps += this.images.length;
        
        // Add extra rotations for deceleration effect
        // e.g. 1 full rotation + steps
        const extraRotations = 1; 
        const totalSteps = steps + (this.images.length * extraRotations);
        
        this.decelerate(totalSteps);
    }
    
    decelerate(remainingSteps) {
        if (remainingSteps <= 0) {
            // Finished
            this.stopped = true;
            this.landingAnimation();
            if (this.onStop) this.onStop();
            return;
        }
        
        this.step(1);
        
        // Calculate next delay (linear or exp)
        let nextDelay = CONFIG.spinSpeed;
        
        // Slow down in last 10 steps
        if (remainingSteps < 12) {
            // Map 12..1 to delay
            // 12 -> 80ms
            // 1 -> 300ms
            // Delta = 220ms / 11 steps = 20ms per step
            const added = (12 - remainingSteps) * 30;
            nextDelay += added;
        }
        
        setTimeout(() => {
            this.decelerate(remainingSteps - 1);
        }, nextDelay);
    }
    
    step(direction) {
        this.currentIndex += direction;
        if (this.currentIndex >= this.images.length) this.currentIndex = 0;
        if (this.currentIndex < 0) this.currentIndex = this.images.length - 1;
        this.updateCarousel();
    }
    
    landingAnimation() {
        const activeItem = this.track.querySelector('.carousel-item.active');
        if (activeItem) {
            activeItem.style.transform = 'translate(-50%, -50%) scale(1.1)';
            activeItem.style.zIndex = '20';
            setTimeout(() => {
                activeItem.style.transform = 'translate(-50%, -50%) scale(1)';
                activeItem.style.zIndex = '10';
            }, 300);
        }
    }
}

// Main Logic
const carousels = [];
const screens = {
    welcome: document.getElementById('screen-welcome'),
    game: document.getElementById('screen-game'),
    end: document.getElementById('screen-end')
};
const buttons = {
    play: document.getElementById('btn-jugar'),
    stop: document.getElementById('click-area-stop'), // Not used in new logic but kept for ref
    restart: document.getElementById('btn-inicio')
};
const zoomImages = [
    document.getElementById('zoom-img-1'),
    document.getElementById('zoom-img-2'),
    document.getElementById('zoom-img-3')
];
const resultMarks = [
    document.getElementById('mark-1'),
    document.getElementById('mark-2'),
    document.getElementById('mark-3')
];

document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initGame();
});

function loadState() {
    const saved = localStorage.getItem('tsj_plays');
    if (saved) state.playsCount = parseInt(saved, 10);
}

function initGame() {
    // Init Carousels
    for (let i = 0; i < 3; i++) {
        const c = new VerticalCarousel(
            `reel-col-${i+1}`,
            `track-${i+1}`,
            CONFIG.images,
            (currentImg) => {
                // Update Zoom
                zoomImages[i].src = `${CONFIG.imagePath}${currentImg}`;
            },
            () => {
                // On Stop
                checkAllStopped();
            }
        );
        carousels.push(c);
        
        // Bind click to stop
        document.getElementById(`reel-col-${i+1}`).addEventListener('click', () => {
            if (state.screen === 'game' && carousels[i].isSpinning) {
                // Stop this reel
                // Target index determined at start of spin
                const targetIdx = state.results[i];
                carousels[i].stopSpin(targetIdx);
                state.reelsStopped++;
            }
        });
    }
    
    // Buttons
    document.getElementById('btn-jugar').addEventListener('click', startGame);
    document.getElementById('btn-inicio').addEventListener('click', resetGame);
    
    // Logo Animation
    playWelcomeAnimation();
}

function playWelcomeAnimation() {
    if (typeof createSVGDrawAnimation !== 'undefined') {
        const container = document.getElementById('flor-logo-anim');
        container.innerHTML = ''; // Clear previous
        
        createSVGDrawAnimation(
            '#flor-logo-anim',
            'assets/florlogo.svg',
            {
                strokeColor: 'white',
                strokeWidth: '2',
                fillColor: 'white',
                drawDuration: 2,
                fillDuration: 1
            }
        );
    }
}

function startGame() {
    transitionTo('game');
    
    state.reelsStopped = 0;
    state.reelsFinished = 0;
    state.playsCount++;
    localStorage.setItem('tsj_plays', state.playsCount);
    
    // Hide marks
    resultMarks.forEach(m => m.classList.add('hidden'));
    resultMarks.forEach(m => m.classList.remove('acierto', 'error'));
    
    // Remove win animation from zoom boxes
    document.querySelectorAll('.zoom-reel-box').forEach(box => {
        box.classList.remove('win-animation');
    });
    
    // Determine Result
    determineResult();
    
    // Start all reels with appropriate speed
    const speed = state.isWinRound ? CONFIG.spinSpeedWin : CONFIG.spinSpeed;
    carousels.forEach(c => c.startSpin(speed));
}

function determineResult() {
    const shouldWin = (state.playsCount % CONFIG.forcedWinEvery === 0);
    state.isWinRound = shouldWin;
    
    if (shouldWin) {
        const winIdx = Math.floor(Math.random() * CONFIG.images.length);
        state.results = [winIdx, winIdx, winIdx];
        console.log('Result (Forced Win):', CONFIG.images[winIdx]);
    } else {
        state.results = [
            Math.floor(Math.random() * CONFIG.images.length),
            Math.floor(Math.random() * CONFIG.images.length),
            Math.floor(Math.random() * CONFIG.images.length)
        ];
        console.log('Result (Random):', state.results.map(i => CONFIG.images[i]));
    }
}

function checkAllStopped() {
    state.reelsFinished++;
    if (state.reelsFinished === 3) {
        // All stopped physically
        setTimeout(showResult, 500);
    }
}

function showResult() {
    // Check Win
    const r = state.results;
    const isWin = (CONFIG.images[r[0]] === CONFIG.images[r[1]] && CONFIG.images[r[1]] === CONFIG.images[r[2]]);
    
    // Show marks
    resultMarks.forEach(m => {
        m.classList.remove('hidden');
        m.classList.add(isWin ? 'acierto' : 'error');
    });
    
    // If win, add animation to zoom boxes
    if (isWin) {
        document.querySelectorAll('.zoom-reel-box').forEach(box => {
            box.classList.add('win-animation');
        });
        spawnConfetti();
    }
    
    // Show End Screen
    setTimeout(() => {
        // Hide result marks before transitioning
        resultMarks.forEach(m => m.classList.add('hidden'));
        
        transitionTo('end');
        
        // End Animation
        const endContainer = document.getElementById('tierra-anim-container');
        endContainer.innerHTML = '';
        if (typeof createSVGDrawAnimation !== 'undefined') {
            createSVGDrawAnimation(
                '#tierra-anim-container',
                'assets/mitierraquerida.svg',
                {
                    strokeColor: 'white',
                    strokeWidth: '2',
                    fillColor: 'white',
                    drawDuration: 3,
                    fillDuration: 1.5
                }
            );
        }
    }, isWin ? 3000 : 1000); // Extended delay for wins
}

function spawnConfetti() {
    const container = document.getElementById('app-container');
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'];
    
    for (let i = 0; i < 150; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        // Random fall duration and delay
        const duration = (Math.random() * 2 + 2) + 's';
        const delay = (Math.random() * 0.5) + 's';
        
        confetti.style.animationDuration = duration;
        confetti.style.animationDelay = delay;
        
        container.appendChild(confetti);
        
        // Remove after animation
        setTimeout(() => {
            confetti.remove();
        }, 5000);
    }
}

function resetGame() {
    transitionTo('welcome');
    
    // Play animation again
    playWelcomeAnimation();
    
    // Clear confetti if any
    document.querySelectorAll('.confetti').forEach(el => el.remove());
    
    // Reset visuals
    resultMarks.forEach(mark => mark.classList.add('hidden'));
}

function transitionTo(screenName) {
    const container = document.getElementById('app-container');
    
    // If going to 'end', we add 'end-state' to hide reels, but keep 'game' active for zoom
    if (screenName === 'end') {
        document.getElementById('screen-end').classList.add('active');
        container.classList.add('end-state');
    } else {
        // Standard transition
        Object.values(screens).forEach(s => s.classList.remove('active'));
        screens[screenName].classList.add('active');
        container.classList.remove('end-state');
        
        // If going back to welcome, make sure end is hidden
        if (screenName === 'welcome') {
             document.getElementById('screen-end').classList.remove('active');
        }
    }
    
    state.screen = screenName;
}
