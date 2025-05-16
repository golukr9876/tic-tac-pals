document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    let playerSymbol = null;
    let currentTurn = null;
    let gameActive = false;
    
    // DOM elements
    const statusMessage = document.getElementById('status-message');
    const gameContainer = document.getElementById('game-container');
    const starterSelection = document.getElementById('starter-selection');
    const chooseBlueBtn = document.getElementById('choose-blue');
    const chooseGreenBtn = document.getElementById('choose-green');
    const cells = document.querySelectorAll('.cell');
    const resultMessage = document.getElementById('result-message');
    const resultText = document.getElementById('result-text');
    const playAgainBtn = document.getElementById('play-again');
    const roomFull = document.getElementById('room-full');
    
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');

    // Socket event listeners
    socket.on('chatMessage', (data) => {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message');
    messageElement.classList.add(data.player === '💙' ? 'message-blue' : 'message-green');
    messageElement.textContent = data.text;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});


    socket.on('connect', () => {
        console.log('Connected to server');
    });
    
    socket.on('roomFull', () => {
        gameContainer.classList.add('hidden');
        starterSelection.classList.add('hidden');
        roomFull.classList.remove('hidden');
        statusMessage.textContent = "Room is full with two players already";
    });
    
    socket.on('waitingForPlayer', () => {
        statusMessage.textContent = "Waiting for your friend...";
        starterSelection.classList.add('hidden');
        gameContainer.classList.add('hidden');
    });
    
    socket.on('gameStarting', () => {
        statusMessage.textContent = "Choose who starts first!";
        starterSelection.classList.remove('hidden');
    });
    
    socket.on('assignSymbol', (symbol) => {
        playerSymbol = symbol;
        statusMessage.textContent = `You are ${symbol}`;
    });
    
    socket.on('gameStarted', (starter) => {
        currentTurn = starter;
        gameActive = true;
        starterSelection.classList.add('hidden');
        gameContainer.classList.remove('hidden');
        resultMessage.classList.add('hidden');
        updateStatusMessage();
        clearBoard();
    });
    
    socket.on('updateBoard', (board) => {
        updateBoardUI(board);
    });
    
    socket.on('playerMove', (data) => {
        currentTurn = data.nextTurn;
        updateStatusMessage();
    });
    
    socket.on('gameOver', (result) => {
        gameActive = false;
        resultMessage.classList.remove('hidden');
        
        if (result.winner) {
            resultText.textContent = `${result.winner} wins! 🎉`;
            
            // Highlight winning cells
            if (result.winningCells) {
                result.winningCells.forEach(index => {
                    cells[index].classList.add('winner');
                });
            }
        } else {
            resultText.textContent = "It's a draw! 😅";
        }
    });
    
    socket.on('playerDisconnected', () => {
        gameActive = false;
        statusMessage.textContent = "Your friend left the game 😢";
        resultMessage.classList.add('hidden');
    });
    
    socket.on('restartGame', () => {
        statusMessage.textContent = "Choose who starts first!";
        starterSelection.classList.remove('hidden');
        gameContainer.classList.add('hidden');
        resultMessage.classList.add('hidden');
        clearBoard();
    });
    
    // Event listeners for UI elements
    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    chooseBlueBtn.addEventListener('click', () => {
        socket.emit('chooseStarter', '💙');
    });
    
    chooseGreenBtn.addEventListener('click', () => {
        socket.emit('chooseStarter', '💚');
    });
    
    cells.forEach(cell => {
        cell.addEventListener('click', () => {
            if (!gameActive || currentTurn !== playerSymbol) return;
            
            const cellIndex = parseInt(cell.getAttribute('data-index'));
            socket.emit('playerMove', cellIndex);
        });
    });
    
    playAgainBtn.addEventListener('click', () => {
        socket.emit('requestRestart');
    });
    
    // Helper functions
    function sendMessage() {
    const message = chatInput.value.trim();
    if (message && playerSymbol) {
        socket.emit('chatMessage', {
            text: message,
            player: playerSymbol
        });
        chatInput.value = '';
    }
}

    function updateStatusMessage() {
        if (currentTurn === playerSymbol) {
            statusMessage.textContent = "Your turn!";
        } else {
            statusMessage.textContent = "Waiting for friend...";
        }
    }
    
    function updateBoardUI(board) {
        board.forEach((cell, index) => {
            if (cell) {
                cells[index].textContent = cell;
                cells[index].setAttribute('data-player', cell === '💙' ? 'blue' : 'green');
                cells[index].classList.remove('winner');
            } else {
                cells[index].textContent = '';
                cells[index].removeAttribute('data-player');
                cells[index].classList.remove('winner');
            }
        });
    }
    
    function clearBoard() {
        cells.forEach(cell => {
            cell.textContent = '';
            cell.removeAttribute('data-player');
            cell.classList.remove('winner');
        });
    }
});