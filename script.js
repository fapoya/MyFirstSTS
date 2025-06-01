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
const rewardCueElement = document.getElementById('reward-cue'); // Added for reward cue


gameBoardElement.style.width = `${BOARD_WIDTH * CELL_SIZE}px`;
gameBoardElement.style.height = `${BOARD_HEIGHT * CELL_SIZE}px`;
gameBoardElement.style.position = 'relative'; // For positioning cells absolutely
gameBoardElement.style.border = '1px solid black';
gameBoardElement.style.backgroundColor = '#f0f0f0';


// 4. Initial Game State
let currentBlock;
let currentPosition;
let score = 0;
let comboCount = 0; // Added for combo
let gameLoopTimeoutId;
let isGameOver = false;

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
    triggerExplosionEffect(firstClearedLineY, linesCleared); // ADDED
    updateScore(linesCleared, firstClearedLineY);

    if (linesCleared === 4) {
      playSound('tetris-clear'); // ADDED
    } else {
      playSound('line-clear'); // ADDED
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


function spawnNewBlock() {
  currentBlock = getRandomTetromino();
  currentPosition = {
    x: Math.floor(BOARD_WIDTH / 2) - Math.floor(currentBlock.shape[0].length / 2),
    y: 0 // Start at the top; for some shapes, may need to adjust if they are taller
  };

  // Adjust y if block starts partially "above" the visible board (e.g. I-block vertical)
  // This is tricky if the shape has empty top rows. Assuming shapes are "compact".
  // For an I-block like [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]], y=0 is fine.
  // For shapes like T: [[0,1,0],[1,1,1],[0,0,0]], y=0 is also fine.

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
      gameLoopTimeoutId = setTimeout(gameLoop, 700); // Adjust speed as needed
  }
}

// --- Initialize Game ---
function startGame() {
    board = Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0));
    score = 0;
    comboCount = 0; // Reset combo count
    isGameOver = false;
    updateScore(0);
    updateComboDisplay(); // Reset combo display
    spawnNewBlock();
    if (gameLoopTimeoutId) clearTimeout(gameLoopTimeoutId);
    gameLoop();
    renderGame(); // Initial render
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
