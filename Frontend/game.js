// Starting socket connection
const socket = io();

// Global valriables
let player;
let gameId;
let selectedPiece = null;
let board = [];
let moveHistory = [];

// Starting game
function initGame() {
    gameId = prompt("Enter game ID:");
    socket.emit('joinGame', gameId);
}

// Assigning players
socket.on('playerAssigned', (assignedPlayer) => {
    player = assignedPlayer;
    document.getElementById('GAMEINFO').textContent = `You are Player ${player}`;
    setupInitialPieces();
});

// Checking if the game id is being used by two players
socket.on('gameFull', () => {
    alert('Game is full. Try another game ID.');
    initGame();
});

// Strating game
socket.on('gameStart', (game) => {
    board = game.board;
    renderBoard(game.board);
});

// Updating game
socket.on('gameUpdate', (game) => {
    board = game.board;
    renderBoard(game.board);
    updateGameInfo(game);
});

// Taking care of invalid moves
socket.on('invalidMove', () => {
    alert('Invalid move. Try again.');
});

// Setting up the Intitial Pieces 
function setupInitialPieces() {
    const pieces = [
        { type: 'Pawn', name: 'P1' },
        { type: 'Pawn', name: 'P2' },
        { type: 'Hero1', name: 'H1' },
        { type: 'Hero2', name: 'H2' },
        { type: 'Pawn', name: 'P3' }
    ];
    socket.emit('setupPieces', { gameId, player, pieces });
}

// Render board to create a User interface to get started with the game
function renderBoard(board) {
    const boardElement = document.getElementById('board');
    const Selected_details = document.getElementById('selected_details');
    const instructions = document.getElementById('instructions');
    boardElement.innerHTML = '';
    board.forEach((row, i) => {
        row.forEach((cell, j) => {
            const cellElement = document.createElement('div');
            cellElement.className = 'cell';
            cellElement.dataset.row = i;
            cellElement.dataset.col = j;
            if (cell) {
                cellElement.textContent = `${cell.player}-${cell.name}`;
                cellElement.style.backgroundColor = cell.player === 'A' ? 'lightblack' : 'li';
            }

            cellElement.style.transition = 'background-color 0.4s';
            
            cellElement.addEventListener('mouseover', () => {
                cellElement.style.backgroundColor = cell.player === 'A' ? 'lightblack' : 'lightblue';
                if (cell) {
                    Selected_details.textContent = `Selected: ${cell.player}-${cell.name}`;
                    if (cell.name === 'P1' || cell.name === 'P2' || cell.name === 'P3') {
                        instructions.textContent = `L  R  F  B`;
                    } else if (cell.name === 'H1') {
                        instructions.textContent = `LL  RR  FF  BB`;
                    } else if (cell.name === 'H2') {
                        instructions.textContent = `FL  FR  BL  BR`;
                    }
                }
            });

            cellElement.addEventListener('mouseover', () => {
                cellElement.style.backgroundColor = cell.player === 'B' ? 'lightblack' : 'lightblue';
                if (cell) {
                    Selected_details.textContent = `Selected: ${cell.player}-${cell.name}`;
                    if (cell.name === 'P1' || cell.name === 'P2' || cell.name === 'P3') {
                        instructions.textContent = `L  R  F  B`;
                    } else if (cell.name === 'H1') {
                        instructions.textContent = `LL  RR  FF  BB`;
                    } else if (cell.name === 'H2') {
                        instructions.textContent = `FL  FR  BL  BR`;
                    }
                }
            });
            
            cellElement.addEventListener('mouseout', () => {
                cellElement.style.backgroundColor = cell.player === 'B' ? 'lightblack' : 'black';
                Selected_details.textContent = '';
                instructions.textContent = '';
            });

            cellElement.addEventListener('mouseout', () => {
                cellElement.style.backgroundColor = cell.player === 'A' ? 'lightblack' : 'black';
                Selected_details.textContent = '';
                instructions.textContent = '';
            });

            cellElement.addEventListener('click', () => handleCellClick(i, j));

            boardElement.appendChild(cellElement);
        });
    });
}

// Updating Game info
function updateGameInfo(game) {
    const GAMEINFO = document.getElementById('GAMEINFO');
    const Player_session = document.getElementById('Player_session');
    if (game.gameOver) {
        GAMEINFO.textContent = `Player ${game.winner} wins!`;
        GAMEINFO.style.color = "green";
    } else {
        Player_session.textContent = `Player ${player}`;
        GAMEINFO.textContent = `Current Player: ${game.currentPlayer}`;
    }
}

// Handling cell clicks
function handleCellClick(row, col) {
    const boardElement = document.getElementById('board');
    const heading_history = document.getElementById('Heading_history');
    const historyDiv = document.getElementById('History');
    
    if (!selectedPiece) {
        const cell = boardElement.children[row * 5 + col];
        const piece = board[row][col];
        if (piece && piece.player === player) {
            selectedPiece = [row, col];
            cell.classList.add('selected');
            showValidMoves(row, col);
        }
    } else {
        const [fromRow, fromCol] = selectedPiece;
        const piece = board[fromRow][fromCol];
        const move = getMoveDirection(selectedPiece, [row, col]);
        
        if (move) {
            socket.emit('move', { gameId, player, from: selectedPiece, to: [row, col] });
            moveHistory.push(`${piece.player}-${piece.name}:${move}`);
            displayMoveHistory();
        }
        
        clearHighlights();
        selectedPiece = null;
    }
}


// Getting the direction of the Moved cell
function getMoveDirection(from, to) {
    const [fromRow, fromCol] = from;
    const [toRow, toCol] = to;
    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;

    if (rowDiff === 0 && colDiff === 1) return 'R';
    if (rowDiff === 0 && colDiff === -1) return 'L';
    if (rowDiff === -1 && colDiff === 0) return 'F';
    if (rowDiff === 1 && colDiff === 0) return 'B';

    if (rowDiff === -1 && colDiff === 1) return 'FR';
    if (rowDiff === -1 && colDiff === -1) return 'FL';
    if (rowDiff === 1 && colDiff === 1) return 'BR';
    if (rowDiff === 1 && colDiff === -1) return 'BL';

    if (rowDiff === 0 && colDiff === 2) return 'RR';
    if (rowDiff === 0 && colDiff === -2) return 'LL';
    if (rowDiff === -2 && colDiff === 0) return 'FF';
    if (rowDiff === 2 && colDiff === 0) return 'BB';

    if (rowDiff === -2 && colDiff === 2) return 'FRFR';
    if (rowDiff === -2 && colDiff === -2) return 'FLFL';
    if (rowDiff === 2 && colDiff === 2) return 'BRBR';
    if (rowDiff === 2 && colDiff === -2) return 'BLBL';

    return null;
}

// Validating Moves performed by the player
function showValidMoves(row, col) {
    const piece = board[row][col];
    if (!piece) return;

    const validMoves = getValidMoves(piece.type, row, col);
    validMoves.forEach(([r, c]) => {
        const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
        cell.classList.add('valid-move');
    });
}

// Getting Valid moves
function getValidMoves(pieceType, row, col) {
    const moves = [];
    const directions = {
        Pawn: [[0, 1], [0, -1], [1, 0], [-1, 0]],
        Hero1: [[0, 2], [0, -2], [2, 0], [-2, 0]],
        Hero2: [ [1, 1], [1, -1], [-1, 1], [-1, -1]]
    };

    directions[pieceType].forEach(([dr, dc]) => {
        const newRow = row + dr;
        const newCol = col + dc;
        if (newRow >= 0 && newRow < 5 && newCol >= 0 && newCol < 5) {
            moves.push([newRow, newCol]);
        }
    });

    return moves;
}


// Storing the Move History in variable named moveHistory 
function displayMoveHistory() {
    const moveHistoryElement = document.getElementById('History');
    const heading_history = document.getElementById('Heading_history');
    
    moveHistoryElement.innerHTML = '';
    heading_history.textContent = "History";

    const ul = document.createElement('ul');
    moveHistory.forEach((move, index) => {
        const li = document.createElement('li');
        li.textContent = move;
        ul.appendChild(li);
    });
    
    moveHistoryElement.appendChild(ul);
}

// Clearing the Highlights 
function clearHighlights() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('selected', 'valid-move');
    });
}

// Calling the main function to start the game

initGame();