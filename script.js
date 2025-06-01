// 1. Define Game Board
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const CELL_SIZE = 20; // For rendering
let board = Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0));

// 2. Define Tetrominoes
const tetrominoes = {
  'T': {
    shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    color: 'purple',
    id: 1
  },
  'I': {
    shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    color: 'cyan',
    id: 2
  },
  'O': {
    shape: [[1, 1], [1, 1]],
    color: 'yellow',
    id: 3
  },
  'L': {
    shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
    color: 'orange',
    id: 4
  },
  'J': {
    shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    color: 'blue',
    id: 5
  },
  'S': {
    shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    color: 'green',
    id: 6
  },
  'Z': {
    shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
    color: 'red',
    id: 7
  }
};

const EMPTY_CELL_COLOR = '#333'; // For the grid lines or empty cell background

// HTML Elements
const gameBoardElement = document.getElementById('game-board');
const scoreDisplayElement = document.getElementById('score-display');
const comboDisplayElement = document.getElementById('combo-display'); // Added for combo
// const nextBlockDisplayElement = document.getElementById('next-block-display'); // For later

// Ensure main container exists for screen shake
const mainContainerElement = document.querySelector('.main-container') || document.body;
const rewardCueElement = document.getElementById('reward-cue');
const nextBlockDisplayElement = document.getElementById('next-block-display');
const speedUpMessageElement = document.getElementById('speed-up-message'); // For Speed Up Animation


gameBoardElement.style.width = `${BOARD_WIDTH * CELL_SIZE}px`;
gameBoardElement.style.height = `${BOARD_HEIGHT * CELL_SIZE}px`;
gameBoardElement.style.position = 'relative'; // For positioning cells absolutely
gameBoardElement.style.border = '1px solid black';
gameBoardElement.style.backgroundColor = '#f0f0f0';


// 4. Initial Game State
let currentBlock;
let currentPosition;
let score = 0;
let comboCount = 0;
let nextBlock = null;
let gameLoopTimeoutId;
let isGameOver = false;

// Speed Management
let totalLinesClearedOverall = 0;
let gameSpeed = 700; // Initial game loop interval in ms
const INITIAL_GAME_SPEED = 700;
const MIN_GAME_SPEED = 100; // Fastest speed
const LINES_PER_SPEED_INCREASE = 10; // Lines to clear for next speed up
const SPEED_DECREMENT = 50; // How much to reduce interval by

// --- Helper function to get color by ID ---
function getTetrominoColorById(id) {
  for (const key in tetrominoes) {
    if (tetrominoes[key].id === id) {
      return tetrominoes[key].color;
    }
  }
  return EMPTY_CELL_COLOR; // Should not happen if IDs are correct
}

// 3. Collision Detection
function checkCollision(block, position) {
  const shape = block.shape;
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x] !== 0) {
        const boardX = position.x + x;
        const boardY = position.y + y;

        // Check boundaries
        if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) {
          return true; // Out of bounds (bottom or sides)
        }
        // Check against other blocks on the board (only if within board top boundary)
        if (boardY >= 0 && board[boardY][boardX] !== 0) {
          return true; // Collision with another block
        }
      }
    }
  }
  return false;
}

// --- Drawing Functions ---
function renderGame() {
  // Clear previous board state
  gameBoardElement.innerHTML = '';

  // Draw the main board (locked blocks)
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      const cellDiv = document.createElement('div');
      cellDiv.style.position = 'absolute';
      cellDiv.style.left = `${x * CELL_SIZE}px`;
      cellDiv.style.top = `${y * CELL_SIZE}px`;
      cellDiv.style.width = `${CELL_SIZE}px`;
      cellDiv.style.height = `${CELL_SIZE}px`;
      if (board[y][x] !== 0) {
        cellDiv.style.backgroundColor = getTetrominoColorById(board[y][x]);
        cellDiv.style.border = '1px solid #222'; // Darker border for filled cells
      } else {
        cellDiv.style.backgroundColor = EMPTY_CELL_COLOR;
        cellDiv.style.border = '1px solid #444'; // Lighter border for grid
      }
      gameBoardElement.appendChild(cellDiv);
    }
  }

  // Draw the current falling block
  if (currentBlock && !isGameOver) {
    const shape = currentBlock.shape;
    const color = currentBlock.color;
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 0) {
          const boardX = currentPosition.x + x;
          const boardY = currentPosition.y + y;
          // Only draw if it's within the visible part of the board (can be partially above)
          if (boardY < BOARD_HEIGHT) {
            const cellDiv = document.createElement('div');
            cellDiv.style.position = 'absolute';
            cellDiv.style.left = `${boardX * CELL_SIZE}px`;
            cellDiv.style.top = `${boardY * CELL_SIZE}px`;
            cellDiv.style.width = `${CELL_SIZE}px`;
            cellDiv.style.height = `${CELL_SIZE}px`;
            cellDiv.style.backgroundColor = color;
            cellDiv.style.border = '1px solid #222';
            gameBoardElement.appendChild(cellDiv);
          }
        }
      }
    }
  }
}


// 1. Block Movement
function moveBlock(dx, dy) {
  if (isGameOver) return false;
  const newPosition = {
    x: currentPosition.x + dx,
    y: currentPosition.y + dy
  };
  if (!checkCollision(currentBlock, newPosition)) {
    currentPosition = newPosition;
    renderGame();
    return true; // Move was successful
  }
  // If moving down and collision, it's time to lock
  if (dy > 0 && checkCollision(currentBlock, newPosition)) {
    const linesCleared = lockBlockAndClearLines(); // Combined for efficiency and combo logic
    if (linesCleared === 0 && currentBlock) { // Block locked but no lines cleared
        comboCount = 0;
        updateComboDisplay();
    }
    spawnNewBlock();
    // updateScore is now called within lockBlockAndClearLines if lines are cleared
    if (linesCleared === 0) updateScore(0); // Still update score display for consistency
  }
  return false; // Move failed
}

// 2. Block Rotation
function rotateBlock() {
  if (isGameOver) return;
  const originalShape = currentBlock.shape;
  const N = originalShape.length;
  const newShape = Array(N).fill(null).map(() => Array(N).fill(0));

  // Transpose and reverse rows
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      newShape[x][N - 1 - y] = originalShape[y][x];
    }
  }

  const rotatedBlock = { ...currentBlock, shape: newShape };

  // Check for collision after rotation, including simple wall kicks
  let testPosition = { ...currentPosition };
  if (!checkCollision(rotatedBlock, testPosition)) {
    currentBlock.shape = newShape;
  } else {
    // Try simple wall kicks (1 unit left or right)
    testPosition.x = currentPosition.x + 1;
    if (!checkCollision(rotatedBlock, testPosition)) {
      currentBlock.shape = newShape;
      currentPosition.x = testPosition.x;
    } else {
      testPosition.x = currentPosition.x - 1;
      if (!checkCollision(rotatedBlock, testPosition)) {
        currentBlock.shape = newShape;
        currentPosition.x = testPosition.x;
      }
      // If still collision, rotation fails (do nothing or revert if shape was already changed)
    }
  }
  renderGame();
}


// 4. Locking Blocks & Line Clearing (Combined for Combo Logic)
function lockBlockAndClearLines() {
  if (!currentBlock) return 0;
  const shape = currentBlock.shape;
  const id = currentBlock.id;
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x] !== 0) {
        const boardX = currentPosition.x + x;
        const boardY = currentPosition.y + y;
        if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
          board[boardY][boardX] = id;
        }
      }
    }
  }
  currentBlock = null; // Block is now part of the board

  // Now, clear lines
  let linesCleared = 0;
  let firstClearedLineY = -1; // For score pop-up position

  for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
    if (board[y].every(cell => cell !== 0)) {
      if (firstClearedLineY < 0) firstClearedLineY = y;
      board.splice(y, 1);
      board.unshift(Array(BOARD_WIDTH).fill(0));
      linesCleared++;
      y++;
    }
  }

  if (linesCleared > 0) {
    comboCount++;
    updateComboDisplay();
    triggerScreenShake();
    triggerExplosionEffect(firstClearedLineY, linesCleared);
    triggerSparkleAndLightEffects(firstClearedLineY, linesCleared); // ADDED
    updateScore(linesCleared, firstClearedLineY);

    if (linesCleared === 4) {
      playSound('tetris-clear');
    } else {
      playSound('line-clear');
    }

    // Speed-up logic
    const previousTotalLinesCleared = totalLinesClearedOverall;
    totalLinesClearedOverall += linesCleared;
    if (Math.floor(totalLinesClearedOverall / LINES_PER_SPEED_INCREASE) > Math.floor(previousTotalLinesCleared / LINES_PER_SPEED_INCREASE)) {
      const oldSpeed = gameSpeed;
      gameSpeed = Math.max(MIN_GAME_SPEED, gameSpeed - SPEED_DECREMENT);
      if (gameSpeed !== oldSpeed) {
        console.log("SPEED UP! New speed (interval ms):", gameSpeed);
        triggerSpeedUpAnimation(); // Call animation
      }
    }

  } else if (currentBlock === null) {
    playSound('block-lock');
  }

  // Trigger reward cue based on conditions
  if (linesCleared >= 3 || comboCount >= 3) {
    triggerRewardCue();
  }

  return linesCleared;
}

// --- Reward Cue ---
let rewardCueTimeoutId; // To manage hiding the cue

function triggerRewardCue() {
  if (!rewardCueElement) return;
  if (rewardCueTimeoutId) clearTimeout(rewardCueTimeoutId); // Clear existing timer

  const cueTypes = ['coin', 'chest'];
  const chosenType = cueTypes[Math.floor(Math.random() * cueTypes.length)];

  rewardCueElement.innerHTML = chosenType === 'coin' ? '$' : '!!!'; // Simple content
  rewardCueElement.className = ''; // Clear existing classes
  rewardCueElement.classList.add(chosenType); // Add the chosen type class (applies animation)

  // The pulse-fade animation now handles fade in and out over 2.5s
  // We just need to hide it after the animation.
  rewardCueTimeoutId = setTimeout(() => {
    rewardCueElement.classList.add('hidden');
    rewardCueElement.className = 'hidden'; // Ensure only hidden is present
  }, 2500); // Duration of pulse-fade animation
}

// --- Speed Up Animation ---
function triggerSpeedUpAnimation() {
  if (!speedUpMessageElement) return;

  // If animation is already playing, don't restart it (optional, but good for rapid triggers)
  // However, for this specific message, we probably want it to always play fully.
  // So, we ensure it's hidden and not animating before starting.
  speedUpMessageElement.classList.add('hidden');
  speedUpMessageElement.classList.remove('animate');

  // Use a slight delay to ensure the class changes are applied and animation restarts if triggered rapidly
  setTimeout(() => {
    speedUpMessageElement.classList.remove('hidden');
    speedUpMessageElement.classList.add('animate');

    function animationEndHandler() {
      speedUpMessageElement.classList.add('hidden');
      speedUpMessageElement.classList.remove('animate');
      speedUpMessageElement.removeEventListener('animationend', animationEndHandler);
    }
    // Remove any previous listener before adding a new one
    speedUpMessageElement.removeEventListener('animationend', animationEndHandler);
    speedUpMessageElement.addEventListener('animationend', animationEndHandler);
  }, 20); // Small delay like 20ms
}

// --- Sparkle and Light Effects ---
function triggerSparkleAndLightEffects(clearedLineY, numLines) {
  const sparkleColorsBase = ['#FFFFFF', '#FFD700', '#FFFFE0']; // White, Gold, LightYellow
  const gemColors = ['#00FFFF', '#FF00FF', '#00FF00', '#FF4500']; // Cyan, Magenta, Lime, OrangeRed

  let currentSparkleColors = [...sparkleColorsBase];
  if (numLines >= 2) {
    currentSparkleColors.push(...gemColors.slice(0, numLines - 1)); // Add more variety
  }

  // Sparkles
  const numSparkles = 8 + numLines * 4; // e.g. 1 line = 12, 4 lines = 24
  for (let i = 0; i < numSparkles; i++) {
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle';

    const startX = Math.random() * BOARD_WIDTH * CELL_SIZE;
    // Start sparkles around the vertical center of the cleared line(s)
    const startY = (clearedLineY + (numLines / 2) + (Math.random() - 0.5) * numLines) * CELL_SIZE;

    sparkle.style.left = `${startX}px`;
    sparkle.style.top = `${startY}px`;

    const travelX = (Math.random() - 0.5) * 100; // Horizontal travel
    const travelY = (Math.random() - 0.5) * 80;  // Vertical travel
    sparkle.style.setProperty('--tx', `${travelX}px`);
    sparkle.style.setProperty('--ty', `${travelY}px`);
    // For --tx-end, --ty-end, let's make them continue a bit further in the same direction
    sparkle.style.setProperty('--tx-end', `${travelX * 1.5}px`);
    sparkle.style.setProperty('--ty-end', `${travelY * 1.5}px`);

    sparkle.style.setProperty('--sparkle-color', currentSparkleColors[Math.floor(Math.random() * currentSparkleColors.length)]);

    gameBoardElement.appendChild(sparkle);
    sparkle.addEventListener('animationend', () => sparkle.remove());
  }

  // Light Rays
  if (numLines >= 1) { // Only show light rays if at least 1 line cleared
    const numLightRays = 3 + numLines * 2; // e.g. 1 line = 5, 4 lines = 11
    const lightRayColors = numLines >=3 ? [...sparkleColorsBase, ...gemColors] : sparkleColorsBase;

    for (let i = 0; i < numLightRays; i++) {
      const ray = document.createElement('div');
      ray.className = 'light-ray';

      // Origin point for rays: center of the cleared block of lines
      const originX = (BOARD_WIDTH / 2) * CELL_SIZE;
      const originY = (clearedLineY + numLines / 2) * CELL_SIZE;

      ray.style.left = `${originX - parseFloat(ray.style.width || 3) / 2}px`; // Center the ray's own width
      ray.style.top = `${originY}px`; // Rays originate from top-center of their own element

      const angle = (i / numLightRays) * 360 + (Math.random() - 0.5) * (360 / numLightRays / 2);
      // For light-ray-animation, --angle-start will be the main angle.
      // Let's make them static for now, but could add rotation by setting --angle-end differently.
      ray.style.setProperty('--angle-start', `${angle}deg`);
      ray.style.setProperty('--angle-end', `${angle}deg`); // No rotation during animation itself

      ray.style.setProperty('--light-color-mid', lightRayColors[Math.floor(Math.random() * lightRayColors.length)] + 'AA'); // Add alpha for softer look

      // Vary height slightly
      ray.style.height = `${80 + Math.random() * 40}px`;

      gameBoardElement.appendChild(ray);
      ray.addEventListener('animationend', () => ray.remove());
    }
  }
}


// --- Sound Effects ---
function playSound(soundId) {
  try {
    // In a real scenario, you'd have an assets/sounds/ directory
    const audio = new Audio(`assets/sounds/${soundId}.wav`); // or .mp3
    audio.play().catch(e => console.warn(`Could not play sound: ${soundId}`, e.message));
  } catch (e) {
    console.warn(`Sound playback error for ${soundId}:`, e.message);
  }
}


// Screen Shake function
function triggerScreenShake() {
  mainContainerElement.classList.add('screen-shake');
  setTimeout(() => {
    mainContainerElement.classList.remove('screen-shake');
  }, 300); // Duration of shake animation (0.3s)
}

// Score Pop-up function
function showScorePopup(points, lineY) {
  const popup = document.createElement('div');
  popup.textContent = `+${points}`;
  popup.className = 'popup-score';

  // Position pop-up: Center of board horizontally, near cleared line vertically
  popup.style.left = `${(BOARD_WIDTH * CELL_SIZE) / 2 - 30}px`; // Approx center, adjust width of popup
  const yPosition = (lineY >= 0 ? lineY : BOARD_HEIGHT / 2) * CELL_SIZE - 30; // Near line or mid
  popup.style.top = `${yPosition}px`;

  gameBoardElement.appendChild(popup);

  // Remove popup after animation finishes
  popup.addEventListener('animationend', () => {
    if (popup.parentNode) {
        popup.remove();
    }
  });
}

// Particle Explosion Effect
function triggerExplosionEffect(clearedLineY, numLines) {
  const numParticles = 15 + numLines * 5; // e.g. 1-line = 20, 4-lines = 35
  const particleColors = ['#FFD700', '#FFA500', '#FF4500', '#FFFFFF']; // Gold, Orange, Red, White

  for (let i = 0; i < numParticles; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';

    // Start particles along the horizontal middle of the cleared line(s) area
    // Spread them out a bit vertically if multiple lines cleared
    const startX = (Math.random() * BOARD_WIDTH * 0.8 + BOARD_WIDTH * 0.1) * CELL_SIZE; // Avoid very edges
    const startY = (clearedLineY + (Math.random() - 0.5) * numLines) * CELL_SIZE;

    particle.style.left = `${startX}px`;
    particle.style.top = `${startY}px`;
    particle.style.backgroundColor = particleColors[Math.floor(Math.random() * particleColors.length)];

    // Random end positions for explosion effect
    const endX = (Math.random() - 0.5) * 2 * (50 + numLines * 10); // Spread further for more lines
    const endY = (Math.random() - 0.7) * 2 * (40 + numLines * 10); // Bias upwards
    particle.style.setProperty('--x-end', `${endX}px`);
    particle.style.setProperty('--y-end', `${endY}px`);

    gameBoardElement.appendChild(particle);

    particle.addEventListener('animationend', () => {
      if (particle.parentNode) {
        particle.remove();
      }
    });
  }
}

// 6. Scoring
function updateScore(linesCleared, lineY = -1) {
  const linePoints = [0, 100, 300, 500, 800]; // Points for 0, 1, 2, 3, 4 lines
  const pointsEarned = linePoints[linesCleared] || 0;

  if (pointsEarned > 0) {
    score += pointsEarned;
    showScorePopup(pointsEarned, lineY);
  }

  if (scoreDisplayElement) {
    scoreDisplayElement.textContent = `Score: ${score}`;
  }
}

// Combo Count Display
function updateComboDisplay() {
  if (comboDisplayElement) {
    comboDisplayElement.textContent = `Combo: ${comboCount}`;
  }
}

function getRandomTetromino() {
  const keys = Object.keys(tetrominoes);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  // Return a deep copy to prevent mutation of original tetrominoes
  const block = tetrominoes[randomKey];
  return {
    shape: block.shape.map(row => row.slice()),
    color: block.color,
    id: block.id
  };
}

// 8. Game Over
function gameOver() {
  isGameOver = true;
  clearTimeout(gameLoopTimeoutId);
  console.log("Game Over!");
  playSound('game-over');

  // Display Game Over message
  const gameOverDiv = document.createElement('div');
  gameOverDiv.textContent = 'GAME OVER';
  gameOverDiv.className = 'game-over-message'; // ADDED CLASS FOR STYLING
  // Styles previously set inline are now mostly handled by CSS, but keep absolute positioning.
  gameOverDiv.style.position = 'absolute';
  // Basic positioning, rest handled by CSS class '.game-over-message'
  gameOverDiv.style.top = '50%'; // Still good to keep for centering logic
  gameOverDiv.style.left = '50%';
  gameOverDiv.style.transform = 'translate(-50%, -50%)';
  // Other styles like fontSize, color, backgroundColor, padding, borderRadius
  // are now expected to be defined in style.css under .game-over-message
  gameBoardElement.appendChild(gameOverDiv);
}

// --- Next Block Display ---
function renderNextBlock() {
  if (!nextBlockDisplayElement) return;
  nextBlockDisplayElement.innerHTML = ''; // Clear previous block

  if (!nextBlock) return;

  const shape = nextBlock.shape;
  const color = nextBlock.color;
  const NEXT_CELL_SIZE = 15; // Smaller cell size for preview

  // Calculate offsets to center the block in the preview area
  // Assuming nextBlockDisplayElement has fixed dimensions (e.g., 120x100 from CSS)
  // For a 4x4 grid of NEXT_CELL_SIZE (60x60), we need to center this.
  const displayWidth = nextBlockDisplayElement.clientWidth;
  const displayHeight = nextBlockDisplayElement.clientHeight;

  // Find actual width and height of the tetromino shape
  let minRow = shape.length, maxRow = -1, minCol = shape[0].length, maxCol = -1;
  shape.forEach((rowArr, r) => {
      rowArr.forEach((cell, c) => {
          if (cell !== 0) {
              minRow = Math.min(minRow, r);
              maxRow = Math.max(maxRow, r);
              minCol = Math.min(minCol, c);
              maxCol = Math.max(maxCol, c);
          }
      });
  });

  const blockActualWidth = (maxCol - minCol + 1) * NEXT_CELL_SIZE;
  const blockActualHeight = (maxRow - minRow + 1) * NEXT_CELL_SIZE;

  const offsetX = (displayWidth - blockActualWidth) / 2;
  const offsetY = (displayHeight - blockActualHeight) / 2;


  shape.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell !== 0) {
        const cellDiv = document.createElement('div');
        cellDiv.style.position = 'absolute';
        // Adjust x, y by minCol, minRow to only draw the filled part of the shape
        cellDiv.style.left = `${offsetX + (x - minCol) * NEXT_CELL_SIZE}px`;
        cellDiv.style.top = `${offsetY + (y - minRow) * NEXT_CELL_SIZE}px`;
        cellDiv.style.width = `${NEXT_CELL_SIZE}px`;
        cellDiv.style.height = `${NEXT_CELL_SIZE}px`;
        cellDiv.style.backgroundColor = color;
        cellDiv.style.border = '1px solid rgba(0,0,0,0.3)';
        nextBlockDisplayElement.appendChild(cellDiv);
      }
    });
  });
}


function spawnNewBlock() {
  if (nextBlock === null) { // Should only happen on the very first spawn if startGame doesn't init
    nextBlock = getRandomTetromino();
  }
  currentBlock = nextBlock;
  nextBlock = getRandomTetromino();
  renderNextBlock(); // Update the display with the new nextBlock

  currentPosition = {
    x: Math.floor(BOARD_WIDTH / 2) - Math.floor(currentBlock.shape[0].length / 2),
    y: 0
  };

  // Adjust for blocks that are not centered in their 2D array (e.g. I block)
  // This is a simple heuristic, might need refinement for perfect centering.
  let minXInShape = currentBlock.shape[0].length;
  for(let r=0; r<currentBlock.shape.length; ++r){
    for(let c=0; c<currentBlock.shape[r].length; ++c){
        if(currentBlock.shape[r][c] !== 0){
            minXInShape = Math.min(minXInShape, c);
        }
    }
  }
  currentPosition.x -= minXInShape;


  if (checkCollision(currentBlock, currentPosition)) {
    gameOver();
  } else {
    renderGame();
  }
}


// 7. Game Loop
function gameLoop() {
  if (isGameOver) return;

  if (!moveBlock(0, 1)) {
    // If moveBlock(0,1) returned false, it means it couldn't move down.
    // lockBlock, clearLines, spawnNewBlock are now called within moveBlock
    // when a downward collision is specifically detected.
  }

  if (!isGameOver) { // Check again because spawnNewBlock might trigger game over
      gameLoopTimeoutId = setTimeout(gameLoop, gameSpeed); // Use dynamic gameSpeed
  }
}

// --- Initialize Game ---
function startGame() {
    board = Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0));
    score = 0;
    comboCount = 0;
    isGameOver = false;

    // Reset speed variables
    totalLinesClearedOverall = 0;
    gameSpeed = INITIAL_GAME_SPEED;

    updateScore(0);
    updateComboDisplay();

    nextBlock = getRandomTetromino();
    renderNextBlock();
    spawnNewBlock();

    if (gameLoopTimeoutId) clearTimeout(gameLoopTimeoutId);
    gameLoop(); // Will use the reset gameSpeed
    renderGame();
}

// Event listener for keyboard input (basic controls)
document.addEventListener('keydown', (event) => {
  if (isGameOver || !currentBlock) return;

  switch (event.key.toLowerCase()) { // Use toLowerCase to handle 'W' and 'w' etc.
    case 'arrowleft':
    case 'a':
      moveBlock(-1, 0);
      break;
    case 'arrowright':
    case 'd':
      moveBlock(1, 0);
      break;
    case 'arrowdown':
    case 's':
      moveBlock(0, 1); // Soft drop
      break;
    case 'arrowup':
    case 'w':
      rotateBlock();
      break;
    // TODO: Add hard drop (space bar)
  }
});

// Restart button
const restartButton = document.getElementById('restart-button');
if (restartButton) {
    restartButton.addEventListener('click', startGame);
}

// --- Start Game ---
startGame();
console.log("Game initialized and started.");
