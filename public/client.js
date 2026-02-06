const socket = io();

let myId = '';
let currentRoomId = '';
let isJudge = false;

// Элементы UI
const screens = {
    login: document.getElementById('login-screen'),
    lobby: document.getElementById('lobby-screen'),
    game: document.getElementById('game-screen')
};

// === НАВИГАЦИЯ ===
function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
}

// === ВХОД ===
function joinGame() {
    const username = document.getElementById('username').value;
    const roomId = document.getElementById('room').value;

    if (!username || !roomId) return alert("Введите имя и комнату!");

    currentRoomId = roomId;
    socket.emit('joinRoom', { username, roomId });
    showScreen('lobby');
    document.getElementById('room-display').innerText = roomId;
}

// === ЛОББИ ===
socket.on('updatePlayers', (players) => {
    const list = document.getElementById('player-list');
    list.innerHTML = players.map(p => 
        `<div class="player-item">👤 ${p.username} ${p.score} очков</div>`
    ).join('');

    // Кнопка старта только если 3+ игрока
    const startBtn = document.getElementById('start-btn');
    if (players.length >= 3) {
        startBtn.style.display = 'block';
    } else {
        startBtn.style.display = 'none';
    }
});

function startGame() {
    socket.emit('startGame', currentRoomId);
}

// === ИГРА: НАЧАЛО РАУНДА ===
socket.on('newRound', ({ judgeId, judgeName, scenario, hands }) => {
    showScreen('game');
    myId = socket.id;
    isJudge = (myId === judgeId);

    // Обновляем роль
    const badge = document.getElementById('role-badge');
    badge.innerText = isJudge ? `👨‍⚖️ ТЫ СУДЬЯ` : `🤡 ИГРОК`;
    badge.style.background = isJudge ? '#d63031' : '#0984e3';

    // Сценарий
    document.getElementById('scenario-text').innerText = scenario;
    document.getElementById('status-text').innerText = isJudge 
        ? "Жди, пока холопы выберут мемы..." 
        : "Выбери самый смешной мем!";

    // Очистка стола
    document.getElementById('submissions-container').innerHTML = '';

    // Рука игрока
    const myHandData = hands.find(h => h.id === myId);
    if (myHandData && !isJudge) {
        renderHand(myHandData.hand);
        document.getElementById('hand-area').style.display = 'block';
    } else {
        document.getElementById('hand-area').style.display = 'none';
    }
});

function renderHand(cards) {
    const container = document.getElementById('my-hand');
    container.innerHTML = '';
    cards.forEach(cardText => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerText = cardText; // В реальной игре здесь был бы <img>
        card.onclick = () => submitCard(cardText);
        container.appendChild(card);
    });
}

// === ИГРА: ХОД ИГРОКА ===
function submitCard(cardText) {
    if (isJudge) return;
    
    // Оптимистичное удаление из UI
    document.getElementById('my-hand').innerHTML = '<p>Карта отправлена! Ждем остальных...</p>';
    
    socket.emit('submitCard', { roomId: currentRoomId, card: cardText });
}

// Обновление счетчика сданных карт
socket.on('updateSubmissionsCount', (count) => {
    if (isJudge) {
        document.getElementById('status-text').innerText = `Сдано карт: ${count}`;
    }
});

// === ИГРА: СУДЕЙСТВО ===
socket.on('gameState', (state) => {
    if (state.state === 'judging') {
        const container = document.getElementById('submissions-container');
        container.innerHTML = '';
        
        document.getElementById('status-text').innerText = isJudge 
            ? "ВЫБИРАЙ ПОБЕДИТЕЛЯ!" 
            : `Судья ${state.judge} выбирает...`;

        state.submissions.forEach(sub => {
            const card = document.createElement('div');
            card.className = 'card submission-card';
            card.innerText = sub.card;
            
            // Только судья может кликать
            if (isJudge) {
                card.style.cursor = 'pointer';
                card.onclick = () => {
                    socket.emit('chooseWinner', { roomId: currentRoomId, winnerSocketId: sub.playerId });
                };
            } else {
                card.style.cursor = 'default';
            }
            container.appendChild(card);
        });
    }
});

// === РЕЗУЛЬТАТ РАУНДА ===
socket.on('roundResult', ({ winnerName, winningCard, players }) => {
    const status = document.getElementById('status-text');
    status.innerHTML = `🏆 Победил <b>${winnerName}</b> с мемом:<br>"${winningCard}"`;
    
    // Обновляем список очков в хедере
    const sb = document.getElementById('score-board');
    sb.innerHTML = players.map(p => `${p.username}: ${p.score}`).join(' | ');
});