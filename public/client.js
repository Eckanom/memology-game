const socket = io();

let myId = '';
let currentRoomId = '';
let isJudge = false;

const screens = {
    login: document.getElementById('login-screen'),
    lobby: document.getElementById('lobby-screen'),
    game: document.getElementById('game-screen'),
    gameover: document.getElementById('gameover-screen')
};

function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
}

function joinGame() {
    const username = document.getElementById('username').value;
    const roomId = document.getElementById('room').value;
    const isNsfw = document.getElementById('nsfw-check').checked;

    if (!username || !roomId) return alert("Введи имя и номер комнаты!");

    currentRoomId = roomId;
    socket.emit('joinRoom', { username, roomId, isNsfw });
    showScreen('lobby');
    document.getElementById('room-display').innerText = roomId;
}

// Отображение значка 18+ в лобби
socket.on('roomSettings', (settings) => {
    const badge = document.getElementById('nsfw-badge');
    if (settings.isNsfw) {
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
});

socket.on('updatePlayers', (players) => {
    const list = document.getElementById('player-list');
    list.innerHTML = players.map(p => 
        `<div class="player-item-modern">
            <span>👤 ${p.username}</span>
            <span style="color:var(--primary-purple); font-weight:bold">${p.score} 🏆</span>
        </div>`
    ).join('');

    const startBtn = document.getElementById('start-btn');
    const status = document.getElementById('lobby-status-text');
    
    if (players.length >= 3) {
        startBtn.style.display = 'block';
        status.innerHTML = '<span style="color:var(--success)">Все готовы!</span>';
    } else {
        startBtn.style.display = 'none';
        status.innerText = `Нужно еще ${3 - players.length} игрока...`;
    }
});

function startGame() {
    socket.emit('startGame', currentRoomId);
}

// === НОВЫЙ РАУНД ===
socket.on('newRound', ({ roundNumber, totalRounds, judgeId, judgeName, scenario, hands }) => {
    showScreen('game');
    myId = socket.id;
    isJudge = (myId === judgeId);

    // ОБНОВЛЕНИЕ НОМЕРА РАУНДА (Исправление бага)
    document.getElementById('round-display').innerText = `Раунд ${roundNumber} / ${totalRounds}`;

    // ОБНОВЛЕНИЕ РОЛИ
    const badge = document.getElementById('role-badge');
    badge.innerHTML = isJudge 
        ? '<i class="fas fa-gavel"></i> ТЫ СУДЬЯ' 
        : '<i class="fas fa-user"></i> ТЫ ИГРОК';
    badge.style.color = isJudge ? "var(--success)" : "var(--primary-purple)";

    // СЦЕНАРИЙ
    document.getElementById('scenario-text').innerText = scenario;
    
    // СТОЛ И СТАТУС
    document.getElementById('submissions-container').innerHTML = '';
    document.getElementById('status-text').innerText = isJudge ? "Игроки выбирают мемы..." : "Выбери мем!";

    // РУКА
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
    cards.forEach(imgSrc => {
        const card = document.createElement('div');
        card.className = 'card';
        const img = document.createElement('img');
        img.src = imgSrc;
        card.appendChild(img);
        card.onclick = () => submitCard(imgSrc);
        container.appendChild(card);
    });
}

function submitCard(imgSrc) {
    if (isJudge) return;
    document.getElementById('hand-area').style.display = 'none';
    document.getElementById('status-text').innerText = "Ждем остальных...";
    socket.emit('submitCard', { roomId: currentRoomId, card: imgSrc });
}

socket.on('updateSubmissionsCount', (count) => {
    if (isJudge) document.getElementById('status-text').innerText = `Сдано карт: ${count}`;
    const container = document.getElementById('submissions-container');
    container.innerHTML = '';
    for(let i=0; i<count; i++) {
        container.innerHTML += `<div class="card submission-card">?</div>`;
    }
});

socket.on('gameState', (state) => {
    if (state.state === 'judging') {
        const container = document.getElementById('submissions-container');
        container.innerHTML = '';
        document.getElementById('status-text').innerText = isJudge ? "ВЫБИРАЙ ЛУЧШИЙ!" : `Судья ${state.judge} думает...`;

        state.submissions.forEach(sub => {
            const card = document.createElement('div');
            card.className = 'card judging-card';
            const img = document.createElement('img');
            img.src = sub.card;
            card.appendChild(img);
            
            if (isJudge) {
                card.onclick = () => {
                    if(confirm("Выбрать этот мем?")) {
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
    status.innerHTML = `<span style="color:var(--success); font-weight:bold">🏆 ${winnerName} +1</span>`;
    
    // Обновляем Табло Лидеров
    updateScoreboard(players);

    // Показываем победивший мем
    const container = document.getElementById('submissions-container');
    container.innerHTML = `
        <div class="card judging-card" style="width:160px; height:220px; transform:scale(1.1); border-color:var(--success)">
            <img src="${winningCard}">
        </div>`;
});

function updateScoreboard(players) {
    const sorted = [...players].sort((a,b) => b.score - a.score);
    const sb = document.getElementById('score-board');
    // Показываем топ-3
    sb.innerHTML = sorted.slice(0, 3).map((p, i) => 
        `<div class="mini-score ${i===0?'leader':''}">${p.username}: ${p.score}</div>`
    ).join('');
}

// === КОНЕЦ ИГРЫ ===
socket.on('gameOver', (sortedPlayers) => {
    showScreen('gameover');
    const container = document.getElementById('podium-list');
    let html = '';
    
    sortedPlayers.forEach((p, index) => {
        let placeClass = 'place-rest';
        let icon = '';
        if (index === 0) { placeClass = 'place-1'; icon = '👑'; }
        else if (index === 1) { placeClass = 'place-2'; icon = '🥈'; }
        else if (index === 2) { placeClass = 'place-3'; icon = '🥉'; }
        
        html += `
        <div class="podium-place ${placeClass}">
            <span>${icon} ${index+1}. ${p.username}</span>
            <span>${p.score} очков</span>
        </div>`;
    });
    container.innerHTML = html;
});
