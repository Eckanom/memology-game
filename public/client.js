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
    if (!username || !roomId) return alert("Введи имя и номер комнаты!");

    currentRoomId = roomId;
    socket.emit('joinRoom', { username, roomId });
    showScreen('lobby');
    document.getElementById('room-display').innerText = roomId;
}

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
        status.innerHTML = '<span style="color:var(--success)">Все готовы! Жми старт.</span>';
    } else {
        startBtn.style.display = 'none';
        status.innerText = `Нужно еще ${3 - players.length} игрока...`;
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
    badge.innerText = isJudge ? "⚖️ ТЫ СУДЬЯ" : "🤡 ТЫ ИГРОК";
    badge.style.color = isJudge ? "var(--success)" : "var(--primary-purple)";

    document.getElementById('scenario-text').innerText = scenario;
    
    const statusText = document.getElementById('status-text');
    statusText.innerText = isJudge ? "Игроки выбирают мемы..." : "Выбери мем снизу!";

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
    if (isJudge) {
        document.getElementById('status-text').innerText = `Сдано карт: ${count}`;
    }
    const container = document.getElementById('submissions-container');
    container.innerHTML = '';
    for(let i=0; i<count; i++) {
        const back = document.createElement('div');
        back.className = 'card submission-card';
        back.innerText = '?';
        container.appendChild(back);
    }
});

socket.on('gameState', (state) => {
    if (state.state === 'judging') {
        const container = document.getElementById('submissions-container');
        container.innerHTML = '';
        
        document.getElementById('status-text').innerText = isJudge 
            ? "ВЫБИРАЙ ЛУЧШИЙ МЕМ!" 
            : `Судья ${state.judge} думает...`;

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
    status.innerHTML = `<span style="color:var(--success); font-size: 1.2rem">🏆 Победил ${winnerName}!</span>`;
    
    const container = document.getElementById('submissions-container');
    container.innerHTML = `
        <div class="card judging-card" style="width:150px; height:200px; transform:scale(1.1); border-color:var(--success)">
            <img src="${winningCard}">
        </div>`;

    const myPlayer = players.find(p => p.id === myId);
    if (myPlayer) document.getElementById('score-board').innerText = `Очки: ${myPlayer.score}`;
});
