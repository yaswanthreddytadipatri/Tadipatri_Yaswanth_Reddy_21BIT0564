// Includind required packages
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Adding Frontend path
app.use(express.static(path.join(__dirname, '../Frontend')));

const games = new Map();

class Piece {
  constructor(player, type, name) {
    this.player = player;
    this.type = type;
    this.name = name;
  }
}

// Creating Class named Game
class Game {
  constructor(id) {
    this.id = id;
    this.board = this.initializeBoard();
    this.currentPlayer = 'A';
    this.players = { A: null, B: null };
    this.gameOver = false;
    this.winner = null;
  }

  // Initializing board 
  initializeBoard() {
    return Array(5).fill().map(() => Array(5).fill(null));
  }


  setupInitialPieces(player, pieces) {
    const row = player === 'A' ? 4 : 0;
    pieces.forEach((piece, index) => {
      this.board[row][index] = new Piece(player, piece.type, piece.name);
    });
  }

  // Validating move
  isValidMove(player, from, to) {
    const [FROMROW, FROMCOL] = from;
    const [toRow, toCol] = to;

    if (toRow < 0 || toRow > 4 || toCol < 0 || toCol > 4) {
      return false;
    }

    const piece = this.board[FROMROW][FROMCOL];

    if (!piece || piece.player !== player) {
      return false;
    }

    // Check if the destination is occupied by a friendly piece
    if (this.board[toRow][toCol] && this.board[toRow][toCol].player === player) {
      return false;
    }

    // Validate move based on piece type
    switch (piece.type) {
      case 'Pawn':
        return (toRow === FROMROW && Math.abs(toCol - FROMCOL) === 1) ||
               (toCol === FROMCOL && Math.abs(toRow - FROMROW) === 1); 
      case 'Hero1':
        return (Math.abs(toRow - FROMROW) === 2 && toCol === FROMCOL) ||
               (Math.abs(toCol - FROMCOL) === 2 && toRow === FROMROW);
      case 'Hero2':
        return Math.abs(toRow - FROMROW) === Math.abs(toCol - FROMCOL) &&
               Math.abs(toRow - FROMROW) > 0 && Math.abs(toRow - FROMROW) <= 2;
      default:
        return false;
    }
  }

  movePiece(from, to) {
    const [FROMROW, FROMCOL] = from;
    const [toRow, toCol] = to;

    const piece = this.board[FROMROW][FROMCOL];
    this.board[FROMROW][FROMCOL] = null;

    // Handle movement and captures for Hero1 and Hero2
    if (piece.type === 'Hero1' || piece.type === 'Hero2') {
      const ROWSTEP = toRow > FROMROW ? 1 : (toRow < FROMROW ? -1 : 0);
      const colStep = toCol > FROMCOL ? 1 : (toCol < FROMCOL ? -1 : 0);
      let CURRENTROW = FROMROW + ROWSTEP;
      let CURRENTCOL = FROMCOL + colStep;

      while (CURRENTROW !== toRow || CURRENTCOL !== toCol) {
        if (this.board[CURRENTROW][CURRENTCOL]) {
          this.board[CURRENTROW][CURRENTCOL] = null;
        }
        CURRENTROW += ROWSTEP;
        CURRENTCOL += colStep;
      }
    }
    this.board[toRow][toCol] = piece;
  }

  // Checking the status of the game if any player won or not
  checkGameOver() {
    const piecesA = this.board.flat().filter(piece => piece && piece.player === 'A');
    const piecesB = this.board.flat().filter(piece => piece && piece.player === 'B');

    if (piecesA.length === 0) {
      this.gameOver = true;
      this.winner = 'B';
    } else if (piecesB.length === 0) {
      this.gameOver = true;
      this.winner = 'A';
    }
  }

  switchTurn() {
    this.currentPlayer = this.currentPlayer === 'A' ? 'B' : 'A';
  }

}

// Turning on the socket connection
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('joinGame', (gameId) => {
    let game = games.get(gameId);
    if (!game) {
      game = new Game(gameId);
      games.set(gameId, game);
    }

    if (!game.players.A) {
      game.players.A = socket.id;
      socket.join(gameId);
      socket.emit('playerAssigned', 'A');
    } else if (!game.players.B) {
      game.players.B = socket.id;
      socket.join(gameId);
      socket.emit('playerAssigned', 'B');
      io.to(gameId).emit('gameStart', game);
    } else {
      socket.emit('gameFull');
    }
  });

  socket.on('setupPieces', ({ gameId, player, pieces }) => {
    const game = games.get(gameId);
    if (game && game.players[player] === socket.id) {
      game.setupInitialPieces(player, pieces);
      if (game.board[0].every(cell => cell !== null) && game.board[4].every(cell => cell !== null)) {
        io.to(gameId).emit('gameUpdate', game);
      }
    }
  });

  socket.on('move', ({ gameId, player, from, to }) => {
    const game = games.get(gameId);
    if (game && game.currentPlayer === player && game.players[player] === socket.id) {
      if (game.isValidMove(player, from, to)) {
        game.movePiece(from, to);
        game.checkGameOver();
        if (!game.gameOver) {
          game.switchTurn();
        }
        io.to(gameId).emit('gameUpdate', game);
      } else {
        socket.emit('invalidMove');
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});


// Setting localhost as 3000
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});