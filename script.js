let grid = [
    [0, 0, 0, 1],
    [0, -0.5, 0, -1],
    ['S', 0, 0, 0]
];
let values = [];
let policy = [];
let gamma = 0.9;
let iterations = 0;
let isRunning = false;
let transitionProb = 0.8;
let iterationHistory = [];
let selectedCell = null;
let rows = 3;
let cols = 4;

const gridElement = document.getElementById('grid');
const startStopButton = document.getElementById('start-stop');
const resetValuesButton = document.getElementById('reset-values');
const discountFactorSlider = document.getElementById('discount-factor');
const discountFactorValue = document.getElementById('discount-factor-value');
const transitionProbSlider = document.getElementById('transition-prob');
const transitionProbValue = document.getElementById('transition-prob-value');
const iterationCountElement = document.getElementById('iteration-count');
const iterationHistoryTable = document.getElementById('iteration-history');
const rewardModal = document.getElementById('reward-modal');
const newRewardInput = document.getElementById('new-reward');
const updateRewardButton = document.getElementById('update-reward');

const rowsInput = document.getElementById('rows');
const colsInput = document.getElementById('cols');
const createGridButton = document.getElementById('create-grid');


function initializeValuesPolicy() {
    values = Array(rows * cols).fill(0);
    policy = Array(rows * cols).fill(null);
    iterations = 0;
    iterationHistory = [];
    updateGridValues();
    updateIterationHistory();
}

function createGrid() {
    rows = Math.max(3, Math.min(10, parseInt(rowsInput.value) || 3));
    cols = Math.max(3, Math.min(10, parseInt(colsInput.value) || 4));

    grid = Array.from({ length: rows }, () => Array(cols).fill(0));
    grid[rows - 1][0] = 'S'; 
    /*Example grid :)*/
    // grid[0][cols-1] = 1;  
    // grid[1][cols-1] = -1;
    // grid[1][1] = -0.5; 


    values = Array(rows * cols).fill(0);
    policy = Array(rows * cols).fill(null);
    iterations = 0;
    iterationHistory = [];
    
    initializeGrid();
    updateGridValues();
    updateIterationHistory();
}




createGridButton.onclick = () => {
    createGrid();
};


function initializeGrid() {
    gridElement.innerHTML = '';
    gridElement.style.gridTemplateColumns = `repeat(${cols}, 100px)`;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.style.backgroundColor = getCellColor(grid[y][x]);
            cell.onclick = () => openRewardModal(x, y);

            const content = document.createElement('div');
            content.className = 'cell-content';
            content.textContent = grid[y][x] === 'S' ? 'START' : grid[y][x] !== 0 ? grid[y][x] : '';

            const value = document.createElement('div');
            value.className = 'cell-value';

            const arrow = document.createElement('div');
            arrow.className = 'cell-arrow';

            cell.appendChild(content);
            cell.appendChild(value);
            cell.appendChild(arrow);
            gridElement.appendChild(cell);
        }
    }
    updateGridValues();
}

function getCellColor(value) {
    if (value === 'S') return 'black'; 

    if (typeof value === 'number') {
        if (value > 0) return 'blue';    
        if (value < 0) return 'red';     
        if (value === 0) return 'green'; 
    }

    return 'green';
}

function getNextState(x, y, action) {
    let newX = x;
    let newY = y;

    switch (action) {
        case 'right': newX = Math.min(x + 1, cols - 1); break;
        case 'left': newX = Math.max(x - 1, 0); break;
        case 'up': newY = Math.max(y - 1, 0); break;
        case 'down': newY = Math.min(y + 1, rows - 1); break;
    }

    if (!isValidState(newX, newY) || grid[newY][newX] === -0.5) {
        return { x, y };
    }

    return { x: newX, y: newY };
}


function calculateValue(x, y, currentValues) {
    if (grid[y][x] === 'S') {
        return 0; 
    }

    if (typeof grid[y][x] === 'number' && (grid[y][x] >= 1 || grid[y][x] <= -1)) {
        return grid[y][x];
    }

    let maxValue = -Infinity;
    const actions = ['right', 'left', 'up', 'down'];

    actions.forEach(action => {
        let expectedValue = 0;

        const intended = getNextState(x, y, action);
        const intendedReward = (grid[intended.y]?.[intended.x] === 'S' || grid[intended.y]?.[intended.x] === -0.5) ? 
            0 : (grid[intended.y]?.[intended.x] || 0);
        const intendedValue = currentValues[intended.y * cols + intended.x] || 0;
        expectedValue += transitionProb * (intendedReward + gamma * intendedValue);

        const opposite = getNextState(x, y, getOppositeAction(action));
        const oppositeReward = (grid[opposite.y]?.[opposite.x] === 'S' || grid[opposite.y]?.[opposite.x] === -0.5) ? 
            0 : (grid[opposite.y]?.[opposite.x] || 0);
        const oppositeValue = currentValues[opposite.y * cols + opposite.x] || 0;
        expectedValue += (1 - transitionProb) * (oppositeReward + gamma * oppositeValue);

        expectedValue -= 0.04; 
        if (!isNaN(expectedValue)) {  
            maxValue = Math.max(maxValue, expectedValue);
        }
    });

    return maxValue === -Infinity ? 0 : maxValue;  
}


function isValidState(x, y) {
    return x >= 0 && x < cols && y >= 0 && y < rows;
}


function getOppositeAction(action) {
    switch(action) {
        case 'right': return 'left';
        case 'left': return 'right';
        case 'up': return 'down';
        case 'down': return 'up';
        default: return null;
    }
}

function valueIteration() {
    if (iterations === 0) {
        iterationHistory.push([...values]); 
    }

    const newValues = [...values];
    let maxDiff = 0;
    const CONVERGENCE_THRESHOLD = 0.001;
    const MAX_ITERATIONS = 1000;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (grid[y][x] === 'S' || grid[y][x] === -0.5) {
                continue;
            }

            const oldValue = values[y * cols + x];
            const newValue = calculateValue(x, y, values);
            newValues[y * cols + x] = newValue;
            maxDiff = Math.max(maxDiff, Math.abs(newValue - oldValue));
        }
    }

    values = newValues;
    iterations++;
    iterationHistory.push([...newValues]); 
    determineOptimalPolicy();
    updateGridValues();
    updateIterationHistory();

    if (maxDiff < CONVERGENCE_THRESHOLD || iterations >= MAX_ITERATIONS) {
        isRunning = false;
        startStopButton.textContent = 'Start Value Iteration';
        return;
    }

    if (isRunning) {
        setTimeout(valueIteration, 100);
    }
}

function updateGridValues() {
    const cells = gridElement.children;
    for (let i = 0; i < cells.length; i++) {
        const valueElement = cells[i].querySelector('.cell-value');
        const arrowElement = cells[i].querySelector('.cell-arrow');
        valueElement.textContent = values[i].toFixed(2);
        arrowElement.textContent = getArrowDirection(policy[i]);
    }
    iterationCountElement.textContent = `Values after ${iterations} iterations`;
}

function getArrowDirection(action) {
    switch (action) {
        case 'right': return '→';
        case 'left': return '←';
        case 'up': return '↑';
        case 'down': return '↓';
        default: return '';
    }
}

function updateIterationHistory() {
    const thead = iterationHistoryTable.querySelector('thead');
    const tbody = iterationHistoryTable.querySelector('tbody');
    thead.innerHTML = ''; 
    tbody.innerHTML = ''; 
    
    const headerRow = document.createElement('tr');
    
    const iterationHeader = document.createElement('th');
    iterationHeader.textContent = 'Iteration';
    iterationHeader.className = 'iteration-header';
    headerRow.appendChild(iterationHeader);
    
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const stateHeader = document.createElement('th');
            stateHeader.textContent = `State ${y * cols + x + 1}`;
            stateHeader.className = 'state-header';
            headerRow.appendChild(stateHeader);
        }
    }
    
    thead.appendChild(headerRow);

    iterationHistory.forEach((values, index) => {
        const row = document.createElement('tr');
        
        const iterationCell = document.createElement('td');
        iterationCell.textContent = index;
        row.appendChild(iterationCell);

        values.forEach(value => {
            const cell = document.createElement('td');
            cell.textContent = value.toFixed(2);
            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });
}

function resetValues() {
    initializeValuesPolicy();
    iterations = 0;
    const tbody = iterationHistoryTable.querySelector('tbody');
    tbody.innerHTML = '';
    iterationCountElement.textContent = `Values after ${iterations} iterations`;
}

function openRewardModal(x, y) {
    selectedCell = { x, y };
    rewardModal.style.display = 'block';
}

function updateReward() {
    const newReward = parseFloat(newRewardInput.value);
    if (!isNaN(newReward)) {
        if (grid[selectedCell.y][selectedCell.x] === 'S') {
            alert('Cannot modify the start position!');
            return;
        }
        grid[selectedCell.y][selectedCell.x] = newReward;
        initializeGrid();
        resetValues();
    } else {
        alert('Please enter a valid number');
    }
    rewardModal.style.display = 'none';
    newRewardInput.value = '';
}

startStopButton.onclick = () => {
    isRunning = !isRunning;
    startStopButton.textContent = isRunning ? 'Stop Value Iteration' : 'Start Value Iteration';
    if (isRunning) {
        valueIteration();
    }
};

resetValuesButton.onclick = resetValues;

discountFactorSlider.oninput = (e) => {
    gamma = parseFloat(e.target.value);
    discountFactorValue.textContent = gamma.toFixed(2);
};

transitionProbSlider.oninput = (e) => {
    transitionProb = parseFloat(e.target.value);
    transitionProbValue.textContent = transitionProb.toFixed(2);
};

updateRewardButton.onclick = updateReward;

window.onclick = (event) => {
    if (event.target === rewardModal) {
        rewardModal.style.display = 'none';
    }
};

createGrid();

function determineOptimalPolicy() {
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (grid[y][x] === 1 || grid[y][x] === -1 || grid[y][x] === -0.5) {
                policy[y * cols + x] = null;
                continue;
            }

            let bestAction = null;
            let maxValue = -Infinity;
            const actions = ['right', 'left', 'up', 'down'];

            actions.forEach(action => {
                let expectedValue = 0;
                
                const intended = getNextState(x, y, action);
                const intendedReward = (typeof grid[intended.y][intended.x] === 'number' && 
                                       grid[intended.y][intended.x] >= 1) ? 
                    grid[intended.y][intended.x] : 0;
                    
                expectedValue += transitionProb * (
                    intendedReward + 
                    -0.04 +
                    gamma * values[intended.y * cols + intended.x]
                );

                const opposite = getNextState(x, y, 
                    action === 'right' ? 'left' : 
                    action === 'left' ? 'right' :
                    action === 'up' ? 'down' : 'up'
                );
                const oppositeReward = (typeof grid[opposite.y][opposite.x] === 'number' && 
                                       grid[opposite.y][opposite.x] >= 1) ? 
                    grid[opposite.y][opposite.x] : 0;
                    
                expectedValue += (1 - transitionProb) * (
                    oppositeReward + 
                    -0.04 + 
                    gamma * values[opposite.y * cols + opposite.x]
                );

                if (expectedValue > maxValue) {
                    maxValue = expectedValue;
                    bestAction = action;
                }
            });

            policy[y * cols + x] = bestAction;
        }
    }
}

document.querySelector('.close-modal').onclick = () => {
    rewardModal.style.display = 'none';
};

rowsInput.addEventListener('input', function() {
    if (this.value === '') return;
    const value = parseInt(this.value);
    if (value < 3) this.value = 3;
    if (value > 10) this.value = 10;
});

colsInput.addEventListener('input', function() {
    if (this.value === '') return;
    const value = parseInt(this.value);
    if (value < 3) this.value = 3;
    if (value > 10) this.value = 10;
});