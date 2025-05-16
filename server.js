const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Game state
let players = [];
let gameState = {
    board: Array(9).fill(null),
    currentTurn: null,
    gameActive: false,
    playersReady: 0
};

const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6]             // diagonals
];

io.on('connection', (socket) => {
    console.log('New client connected');
    
    // Check if room is full
    if (players.length >= 2) {
        socket.emit('roomFull');
        return;
    }
    
    // Add player to the game
    players.push(socket);
    console.log(`Players connected: ${players.length}`);
    
    // Notify first player to wait
    if (players.length === 1) {
        socket.emit('waitingForPlayer');
    }
    
    // When second player connects
    if (players.length === 2) {
        io.emit('gameStarting');
    }
    
    // Handle starter selection
// Existing code ke bad yeh changes karein:

// Game starting event ko update karein
socket.on('chooseStarter', (starter) => {
    if (gameState.playersReady < 2) {
        gameState.playersReady++;
        
        // Assign symbols
        const player1Symbol = starter === '💙' ? '💙' : '💚';
        const player2Symbol = starter === '💙' ? '💚' : '💙';
        
        players[0].emit('assignSymbol', player1Symbol);
        players[1].emit('assignSymbol', player2Symbol);
        
        if (gameState.playersReady === 2) {
            gameState.currentTurn = starter;
            gameState.gameActive = true;
            gameState.board = Array(9).fill(null);
            
            // Clear any previous game state
            io.emit('clearBoard');
            
            // Send game started event with starter info
            io.emit('gameStarted', { 
                starter: starter,
                board: gameState.board 
            });
            
            // Force send first turn update
            io.emit('playerMove', { 
                nextTurn: starter,
                board: gameState.board 
            });
        }
    }
});
    
    socket.on('chatMessage', (data) => {
    // Broadcast the message to both players
    io.emit('chatMessage', data);
    });

    // Handle player moves
    socket.on('playerMove', (cellIndex) => {
        if (!gameState.gameActive) return;
        
        // Validate move
        if (gameState.board[cellIndex] !== null) return;
        
        // Determine player symbol
        const playerSymbol = players[0] === socket ? '💙' : '💚';
        if (playerSymbol !== gameState.currentTurn) return;
        
        // Update board
        gameState.board[cellIndex] = playerSymbol;
        io.emit('updateBoard', gameState.board);
        
        // Check for winner
        const winner = checkWinner(gameState.board);
        if (winner) {
            gameState.gameActive = false;
            io.emit('gameOver', { winner: winner.symbol, winningCells: winner.cells });
            return;
        }
        
        // Check for draw
        if (!gameState.board.includes(null)) {
            gameState.gameActive = false;
            io.emit('gameOver', { winner: null });
            return;
        }
        
        // Switch turns
        gameState.currentTurn = gameState.currentTurn === '💙' ? '💚' : '💙';
        io.emit('playerMove', { nextTurn: gameState.currentTurn });
    });
    
    // Handle restart request
    socket.on('requestRestart', () => {
        gameState.playersReady = 0;
        gameState.gameActive = false;
        io.emit('restartGame');
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected');
        
        // Remove player from the list
        const index = players.indexOf(socket);
        if (index !== -1) {
            players.splice(index, 1);
        }
        
        // Notify remaining player
        if (players.length === 1) {
            players[0].emit('playerDisconnected');
        }
        
        // Reset game state if both players disconnect
        if (players.length === 0) {
            gameState = {
                board: Array(9).fill(null),
                currentTurn: null,
                gameActive: false,
                playersReady: 0
            };
        }
    });
});

function checkWinner(board) {
    for (const combination of winningCombinations) {
        const [a, b, c] = combination;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return {
                symbol: board[a],
                cells: combination
            };
        }
    }
    return null;
}

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});