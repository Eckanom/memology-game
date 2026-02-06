const socket = io();

let myId = '';
let currentRoomId = '';
let isJudge = false;

// === ЗВУКИ ===
// Убедись, что файлы лежат в папке public/sounds/
const audio = {
    click: new Audio('/sounds/click.mp3'),
    card: new Audio('/sounds/card.mp3'),
    win: new Audio('/sounds/win.mp3')
};

// Функция безопасного воспроизведения
function playSound(name) {
    const sound = audio[name];
    if (sound) {
        sound.currentTime = 0; // Перемотка в начало (для быстрых кликов)
        sound.volume = 0.5;    // Громкость 50%
        sound.play().catch(err => {
            // Браузеры блокируют авто-звук, пока юзер не кликнет по странице.
            // Это нормально, просто игнорируем ошибку до первого клика.
            console.log('Звук не проигрался (нужен клик):', err);
        });
    }
}

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
    playSound('click'); // ЗВУК
    const username = document.getElementById('username').value;
    const roomId = document.getElementById('room').value;
    const isNsfw = document.getElementById('nsfw-check').checked;

    if (!username || !roomId) return alert("Введи имя и комнату!");

    currentRoomId = roomId;
    socket.emit('joinRoom', { username, roomId, isNsfw });
    showScreen('lobby');
    document.getElementById('room-display').innerText = roomId;
}

socket.on('roomSettings', (settings) => {
    document.getElementById('nsfw-badge').style.display = settings.isNsfw ? 'inline-block' : 'none';
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
        status.innerText = `Ждем еще ${3 - players.length} игроков...`;
    }
});

function startGame() {
    playSound('click'); // ЗВУК
    socket.emit('startGame', currentRoomId);
}

socket.on('newRound', ({ roundNumber, totalRounds, judgeId, scenario, hands }) => {
    showScreen('game');
    playSound('card'); // ЗВУК РАЗДАЧИ
    
    myId = socket.id;
    isJudge = (myId === judgeId);

    document.getElementById('round-display').innerText = `Раунд ${roundNumber}/${totalRounds}`;
    
    const badge = document.getElementById('role-badge');
    badge.innerHTML = isJudge 
        ? '<i class="fas fa-gavel"></i> ТЫ СУДЬЯ' 
        : '<i class="fas fa-user"></i> ТЫ ИГРОК';
    badge.style.color = isJudge ? "var(--success)" : "var(--primary-purple)";

    document.getElementById('scenario-text').innerText = scenario;
    
    document.getElementById('submissions-container').innerHTML = '';
    document.getElementById('status-text').innerText = isJudge ? "Ждем карты..." : "Выбери мем!";

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
        
        // Звук при наведении (опционально, можно убрать если бесит)
        // card.onmouseenter = () => playSound('click'); 

        card.onclick = () => {
            if (isJudge) return;
            playSound('click'); // ЗВУК
            document.getElementById('hand-area').style.display = 'none';
            document.getElementById('status-text').innerText = "Ждем остальных...";
            socket.emit('submitCard', { roomId: currentRoomId, card: imgSrc });
        };
        container.appendChild(card);
    });
}

socket.on('updateSubmissionsCount', (count) => {
    playSound('click'); // Звук хода соперника
    const container = document.getElementById('submissions-container');
    container.innerHTML = '';
    for(let i=0; i<count; i++) {
        container.innerHTML += `<div class="card submission-card">?</div>`;
    }
    if (isJudge) document.getElementById('status-text').innerText = `Сдано: ${count}`;
});

socket.on('gameState', (state) => {
    if (state.state === 'judging') {
        playSound('card'); // Звук открытия карт
        const container = document.getElementById('submissions-container');
        container.innerHTML = '';
        document.getElementById('status-text').innerText = isJudge ? "ВЫБИРАЙ ЛУЧШИЙ!" : "Судья выбирает...";

        state.submissions.forEach(sub => {
            const card = document.createElement('div');
            card.className = 'card judging-card';
            card.innerHTML = `<img src="${sub.card}">`;
            
            if (isJudge) {
                card.onclick = () => {
                    if(confirm("Выбрать этот мем?")) {
                        playSound('click'); // ЗВУК
                        socket.emit('chooseWinner', { roomId: currentRoomId, winnerSocketId: sub.playerId });
                    }
                };
            }
            container.appendChild(card);
        });
    }
});

socket.on('roundResult', ({ winnerName, winningCard, players }) => {
    playSound('win'); // ЗВУК ПОБЕДЫ
    
    // Эффект конфетти (если библиотека подключена в HTML)
    try {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#7c4dff', '#00c853', '#FFD700']
        });
    } catch(e) {}

    document.getElementById('status-text').innerHTML = `<span style="color:var(--success)">🏆 Победил ${winnerName}</span>`;
    
    const sb = document.getElementById('score-board');
    sb.innerHTML = players.sort((a,b)=>b.score-a.score).slice(0,3).map((p,i) => 
        `<div class="mini-score ${i===0?'leader':''}">${p.username}: ${p.score}</div>`
    ).join('');
    
    const container = document.getElementById('submissions-container');
    container.innerHTML = `
        <div class="card judging-card" style="width:180px; height:240px; transform:scale(1.1); border-color:var(--success); box-shadow: 0 0 20px var(--success);">
            <img src="${winningCard}">
        </div>`;
});

socket.on('gameOver', (sortedPlayers) => {
    showScreen('gameover');
    playSound('win'); // ЗВУК ФИНАЛА
    
    // Большой салют
    try {
        var duration = 3000;
        var end = Date.now() + duration;
        (function frame() {
          confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 } });
          confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 } });
          if (Date.now() < end) requestAnimationFrame(frame);
        }());
    } catch(e) {}

    const list = document.getElementById('podium-list');
    list.innerHTML = sortedPlayers.map((p, i) => {
        let cls = i===0 ? 'place-1' : i===1 ? 'place-2' : 'place-3';
        let icon = i===0 ? '👑' : i===1 ? '🥈' : '🥉';
        return `<div class="podium-place ${cls}">
            <span>${icon} #${i+1} ${p.username}</span>
            <span>${p.score}</span>
        </div>`;
    }).join('');
});
