const socket = io();

// ГРОМКОСТЬ (0.0 - 1.0)
let currentVolume = 5; // По умолчанию 5 из 10

const audio = {
    click: new Audio('/sounds/click.mp3'),
    card: new Audio('/sounds/card.mp3'),
    win: new Audio('/sounds/win.mp3')
};

function playSound(name) {
    if(audio[name]) { 
        audio[name].currentTime = 0; 
        // Преобразуем 0-10 в 0.0-1.0
        audio[name].volume = currentVolume / 10;
        audio[name].play().catch(()=>{}); 
    }
}

// === УПРАВЛЕНИЕ НАСТРОЙКАМИ ===
function openSettings() {
    document.getElementById('settings-modal').style.display = 'flex';
    playSound('click');
}

function closeSettings() {
    document.getElementById('settings-modal').style.display = 'none';
    playSound('click');
}

function updateVolume(val) {
    currentVolume = val;
    document.getElementById('volume-value').innerText = val;
}

function testSound() {
    playSound('win');
}

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
    playSound('click');
    const username = document.getElementById('username').value;
    const roomId = document.getElementById('room').value;
    const isNsfw = document.getElementById('nsfw-check').checked;

    if (!username || !roomId) return alert("ВВЕДИ ИМЯ И КОМНАТУ!");

    currentRoomId = roomId;
    socket.emit('joinRoom', { username, roomId, isNsfw });
    showScreen('lobby');
    document.getElementById('room-display').innerText = roomId;
}

socket.on('roomSettings', (settings) => {
    document.getElementById('nsfw-badge').style.display = settings.isNsfw ? 'inline' : 'none';
});

socket.on('updatePlayers', (players) => {
    const list = document.getElementById('player-list');
    list.innerHTML = players.map(p => 
        `<div style="border-bottom:2px solid black; padding:5px; display:flex; justify-content:space-between; font-weight:bold;">
            <span>${p.username}</span>
            <span>${p.score} 🏆</span>
        </div>`
    ).join('');

    const startBtn = document.getElementById('start-btn');
    const status = document.getElementById('lobby-status-text');
    
    if (players.length >= 3) {
        startBtn.style.display = 'block';
        status.innerText = "ГОТОВЫ К СТАРТУ!";
    } else {
        startBtn.style.display = 'none';
        status.innerText = `ЖДЕМ ЕЩЕ ${3 - players.length} ИГРОКОВ...`;
    }
});

function startGame() {
    playSound('click');
    socket.emit('startGame', currentRoomId);
}

socket.on('newRound', ({ roundNumber, totalRounds, judgeId, scenario, hands }) => {
    showScreen('game');
    playSound('card');
    myId = socket.id;
    isJudge = (myId === judgeId);

    document.getElementById('round-display').innerText = `${roundNumber}/${totalRounds}`;
    document.getElementById('role-badge').innerText = isJudge ? "ТЫ СУДЬЯ ⚖️" : "ТЫ ИГРОК 🤡";
    document.getElementById('role-badge').style.color = isJudge ? "var(--btn-green)" : "var(--btn-blue)";
    document.getElementById('scenario-text').innerText = scenario;
    
    document.getElementById('submissions-container').innerHTML = '';
    document.getElementById('status-text').innerText = isJudge ? "ЖДЕМ КАРТЫ..." : "ВЫБЕРИ МЕМ!";

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
        card.innerHTML = `<img src="${imgSrc}">`;
        card.onclick = () => {
            if (isJudge) return;
            playSound('click');
            document.getElementById('hand-area').style.display = 'none';
            document.getElementById('status-text').innerText = "ЖДЕМ ОСТАЛЬНЫХ...";
            socket.emit('submitCard', { roomId: currentRoomId, card: imgSrc });
        };
        container.appendChild(card);
    });
}

socket.on('updateSubmissionsCount', (count) => {
    playSound('click');
    const container = document.getElementById('submissions-container');
    container.innerHTML = '';
    for(let i=0; i<count; i++) {
        container.innerHTML += `<div class="submission-card">?</div>`;
    }
    if (isJudge) document.getElementById('status-text').innerText = `СДАНО: ${count}`;
});

socket.on('gameState', (state) => {
    if (state.state === 'judging') {
        const container = document.getElementById('submissions-container');
        container.innerHTML = '';
        document.getElementById('status-text').innerText = isJudge ? "ВЫБИРАЙ ЛУЧШИЙ!" : "СУДЬЯ ВЫБИРАЕТ...";

        state.submissions.forEach(sub => {
            const card = document.createElement('div');
            card.className = 'judging-card';
            card.innerHTML = `<img src="${sub.card}">`;
            
            if (isJudge) {
                card.style.cursor = 'pointer';
                card.onclick = () => {
                    if(confirm("Выбрать этот мем?")) {
                        playSound('click');
                        socket.emit('chooseWinner', { roomId: currentRoomId, winnerSocketId: sub.playerId });
                    }
                };
            }
            container.appendChild(card);
        });
    }
});

socket.on('roundResult', ({ winnerName, winningCard, players }) => {
    playSound('win');
    try { confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#ff4500', '#00c853', '#2962ff'] }); } catch(e){}

    document.getElementById('status-text').innerHTML = `ПОБЕДИТЕЛЬ: ${winnerName}`;
    
    // Обновляем счет
    const myPlayer = players.find(p => p.id === myId);
    if(myPlayer) document.getElementById('score-board').innerText = `СЧЕТ: ${myPlayer.score}`;

    const container = document.getElementById('submissions-container');
    container.innerHTML = `<div class="judging-card" style="transform:scale(1.2); border-color:var(--btn-green); width:90px; height:130px;"><img src="${winningCard}"></div>`;
});

socket.on('gameOver', (sortedPlayers) => {
    showScreen('gameover');
    playSound('win');
    
    const list = document.getElementById('podium-list');
    list.innerHTML = sortedPlayers.map((p, i) => {
        let cls = i===0 ? 'place-1' : '';
        return `<div class="podium-place ${cls}">
            #${i+1} ${p.username} <span>${p.score}</span>
        </div>`;
    }).join('');
});
