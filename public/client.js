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

socket.on('updatePlayers', (players) => {
    const list = document.getElementById('player-list');
    list.innerHTML = players.map(p => 
        `<div class="player-item">
            <div style="font-size:1.5rem">👤</div>
            <div>${p.username}</div>
            <div style="color:#94a3b8">${p.score} pts</div>
        </div>`
    ).join('');

    const startBtn = document.getElementById('start-btn');
    // Показываем кнопку, если игроков >= 3
    if (players.length >= 3) {
        startBtn.style.display = 'block';
        document.querySelector('.lobby-status p').innerText = "Готовы к старту!";
    } else {
        startBtn.style.display = 'none';
        document.querySelector('.lobby-status p').innerText = `Ждем игроков (нужно еще ${3 - players.length})...`;
    }
});

function startGame() {
    socket.emit('startGame', currentRoomId);
}

socket.on('newRound', ({ judgeId, judgeName, scenario, hands }) => {
    showScreen('game');
    myId = socket.id;
    isJudge = (myId === judgeId);

    const badge = document.getElementById('role-badge');
    if (isJudge) {
        badge.innerText = "⚖️ ТЫ СУДЬЯ";
        badge.style.background = "var(--accent)";
        badge.style.color = "white";
    } else {
        badge.innerText = "🃏 ТЫ ИГРОК";
        badge.style.background = "#334155";
        badge.style.color = "#94a3b8";
    }

    document.getElementById('scenario-text').innerText = scenario;
    
    const statusText = document.getElementById('status-text');
    statusText.innerText = isJudge ? "Ждем, пока игроки выберут карты..." : "Выбери карту снизу!";
    statusText.className = isJudge ? "status-message pulse" : "status-message";

    document.getElementById('submissions-container').innerHTML = '';

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
        // Вставляем текст, можно добавить иконки
        card.innerHTML = `<div style="font-size:0.8rem">${cardText}</div>`;
        card.onclick = () => submitCard(cardText);
        container.appendChild(card);
    });
}

function submitCard(cardText) {
    if (isJudge) return;
    
    document.getElementById('my-hand').innerHTML = 
        '<div style="text-align:center; color:#94a3b8; width:100%">Карта отправлена... ⏳</div>';
    
    socket.emit('submitCard', { roomId: currentRoomId, card: cardText });
}

socket.on('updateSubmissionsCount', (count) => {
    if (isJudge) {
        document.getElementById('status-text').innerText = `Сдано карт: ${count}`;
    }
});

socket.on('gameState', (state) => {
    if (state.state === 'judging') {
        const container = document.getElementById('submissions-container');
        container.innerHTML = '';
        
        document.getElementById('status-text').innerText = isJudge 
            ? "ВЫБЕРИ ПОБЕДИТЕЛЯ (Нажми на карту)" 
            : `Судья ${state.judge} выбирает лучший мем...`;

        state.submissions.forEach(sub => {
            const card = document.createElement('div');
            card.className = 'card submission-card';
            card.innerText = sub.card;
            
            if (isJudge) {
                card.style.cursor = 'pointer';
                card.onclick = () => {
                    if(confirm("Выбрать эту карту победителем?")) {
                        socket.emit('chooseWinner', { roomId: currentRoomId, winnerSocketId: sub.playerId });
                    }
                };
            }
            container.appendChild(card);
        });
    }
});

socket.on('roundResult', ({ winnerName, winningCard, players }) => {
    const status = document.getElementById('status-text');
    status.innerHTML = `<span style="color:var(--primary)">🏆 ${winnerName} победил!</span><br><small>${winningCard}</small>`;
    
    // Обновляем очки
    const sb = document.getElementById('score-board');
    // Показываем топ-3 лидеров
    const leaders = players.sort((a,b) => b.score - a.score).slice(0,3);
    sb.innerHTML = leaders.map(p => `${p.username}: ${p.score}`).join(' | ');
});
