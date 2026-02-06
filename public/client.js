const socket = io();

let myId = '';
let currentRoomId = '';
let isJudge = false;

const screens = {
    login: document.getElementById('login-screen'),
    lobby: document.getElementById('lobby-screen'),
    game: document.getElementById('game-screen')
};

function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
}

function joinGame() {
    const username = document.getElementById('username').value;
    const roomId = document.getElementById('room').value;
    if (!username || !roomId) return alert("Введите имя и комнату!");

    currentRoomId = roomId;
    socket.emit('joinRoom', { username, roomId });
    showScreen('lobby');
    document.getElementById('room-display').innerText = roomId;
}

// === ОБНОВЛЕНИЕ ЛОББИ (Новый дизайн списка) ===
socket.on('updatePlayers', (players) => {
    const list = document.getElementById('player-list');
    list.innerHTML = players.map(p => 
        `<div class="player-item-modern">
            <span class="player-avatar">👤</span>
            <span>${p.username}</span>
            <span class="player-score">${p.score} 🏆</span>
        </div>`
    ).join('');

    const startBtn = document.getElementById('start-btn');
    const lobbyStatus = document.getElementById('lobby-status-text');
    
    if (players.length >= 3) {
        startBtn.style.display = 'block';
        lobbyStatus.innerHTML = '<span style="color: var(--success)">✅ Все готовы! Можно начинать.</span>';
    } else {
        startBtn.style.display = 'none';
        lobbyStatus.innerText = `Ждем игроков... (Нужно еще ${3 - players.length})`;
    }
});

function startGame() {
    socket.emit('startGame', currentRoomId);
}

// === НАЧАЛО РАУНДА ===
socket.on('newRound', ({ judgeId, judgeName, scenario, hands }) => {
    showScreen('game');
    myId = socket.id;
    isJudge = (myId === judgeId);

    const badge = document.getElementById('role-badge');
    if (isJudge) {
        badge.innerHTML = '<i class="fas fa-gavel icon-purple"></i> ТЫ СУДЬЯ';
    } else {
        badge.innerHTML = '<i class="fas fa-user"></i> ТЫ ИГРОК';
    }

    document.getElementById('scenario-text').innerText = scenario;
    
    const statusText = document.getElementById('status-text');
    statusText.innerText = isJudge ? `Ждем, пока игроки выберут карты...` : "Выбери самую смешную карту снизу!";

    document.getElementById('submissions-container').innerHTML = '';

    const myHandData = hands.find(h => h.id === myId);
    const handArea = document.getElementById('hand-area');
    
    if (myHandData && !isJudge) {
        renderHand(myHandData.hand);
        handArea.style.display = 'block';
    } else {
        handArea.style.display = 'none';
    }
});

function renderHand(cards) {
    const container = document.getElementById('my-hand');
    container.innerHTML = '';
    cards.forEach(cardText => {
        const card = document.createElement('div');
        card.className = 'card';
        // В реальности здесь был бы <img>. Сейчас текст.
        card.innerText = cardText; 
        card.onclick = () => submitCard(cardText);
        container.appendChild(card);
    });
}

function submitCard(cardText) {
    if (isJudge) return;
    // Скрываем руку после хода
    document.getElementById('hand-area').style.display = 'none';
    document.getElementById('status-text').innerText = "Карта отправлена! Ждем остальных...";
    
    socket.emit('submitCard', { roomId: currentRoomId, card: cardText });
}

socket.on('updateSubmissionsCount', (count) => {
    if (isJudge) {
        document.getElementById('status-text').innerText = `Игроки делают выбор... (Сдано: ${count})`;
    }
    // Визуальное отображение закрытых карт на столе
    const container = document.getElementById('submissions-container');
    container.innerHTML = '';
    for(let i=0; i < count; i++) {
        const hiddenCard = document.createElement('div');
        hiddenCard.className = 'card submission-card';
        hiddenCard.innerHTML = '<i class="fas fa-question"></i>';
        container.appendChild(hiddenCard);
    }
});

// === СУДЕЙСТВО (Открытие карт) ===
socket.on('gameState', (state) => {
    if (state.state === 'judging') {
        const container = document.getElementById('submissions-container');
        container.innerHTML = '';
        
        document.getElementById('status-text').innerText = isJudge 
            ? "ВЫБЕРИ ПОБЕДИТЕЛЯ (Нажми на карту)" 
            : `Судья ${state.judge} выбирает лучший мем...`;

        state.submissions.forEach(sub => {
            const card = document.createElement('div');
            // Добавляем класс judging-card для белого фона
            card.className = 'card judging-card'; 
            card.innerText = sub.card;
            
            if (isJudge) {
                card.onclick = () => {
                    if(confirm("Выбрать эту карту победителем?")) {
                        socket.emit('chooseWinner', { roomId: currentRoomId, winnerSocketId: sub.playerId });
                    }
                };
            } else {
                card.style.cursor = 'default';
            }
            container.appendChild(card);
        });
    }
});

// === РЕЗУЛЬТАТЫ ===
socket.on('roundResult', ({ winnerName, winningCard, players }) => {
    const status = document.getElementById('status-text');
    status.innerHTML = `<span style="color:var(--success); font-weight:bold">🎉 ${winnerName} победил!</span>`;
    
    // Показываем выигравшую карту крупно (упрощенно)
    const container = document.getElementById('submissions-container');
    container.innerHTML = `<div class="card judging-card" style="transform: scale(1.1); border-color: var(--success);">${winningCard}</div>`;

    // Обновляем очки в хедере
    const myPlayer = players.find(p => p.id === myId);
    if (myPlayer) {
        document.getElementById('score-board').innerText = `Мои очки: ${myPlayer.score}`;
    }
});
