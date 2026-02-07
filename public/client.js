const socket = io();

// ГРОМКОСТЬ
let currentVolume = 5;

// === ОБЫЧНЫЕ ЗВУКИ ===
const audio = {
    click: new Audio('/sounds/click.mp3'),
    card: new Audio('/sounds/card.mp3'),
    draw: new Audio('/sounds/draw.mp3') 
};

// === МАССИВЫ СЛУЧАЙНЫХ ЗВУКОВ ===

// Звуки для победы в РАУНДЕ (win1.mp3, win2.mp3...)
const winSounds = [
    new Audio('/sounds/win1.mp3'),
    new Audio('/sounds/win2.mp3'),
    new Audio('/sounds/win3.mp3')
];

// Звуки для КОНЦА ИГРЫ (finish1.mp3, finish2.mp3...)
const finishSounds = [
    new Audio('/sounds/finish1.mp3'),
    new Audio('/sounds/finish2.mp3')
];

function playSound(name) {
    let soundToPlay;

    if (name === 'win') {
        // Случайный звук для победы в раунде
        soundToPlay = winSounds[Math.floor(Math.random() * winSounds.length)];
    } else if (name === 'finish') {
        // Случайный звук для финала игры (НОВОЕ)
        soundToPlay = finishSounds[Math.floor(Math.random() * finishSounds.length)];
    } else {
        // Обычный звук по имени
        soundToPlay = audio[name];
    }

    if (soundToPlay) { 
        soundToPlay.currentTime = 0; 
        soundToPlay.volume = currentVolume / 10;
        
        soundToPlay.play().catch((e) => {
            console.log("Звук не найден или заблокирован:", name);
        }); 
    }
}

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
    // Проверяем звук финала для теста, так интереснее
    playSound('finish'); 
}

function leaveGame() {
    if(confirm("Точно выйти?")) {
        location.reload();
    }
}

function updateGameSettings() {
    if (!currentRoomId) return; 
    
    const withBots = document.getElementById('bot-check-modal').checked;
    const deckCheckboxes = document.querySelectorAll('.deck-check:checked');
    const activeDecks = Array.from(deckCheckboxes).map(cb => cb.value);

    socket.emit('updateSettings', { roomId: currentRoomId, withBots, activeDecks });
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
    
    if (!username || !roomId) return alert("ВВЕДИ ИМЯ И КОМНАТУ!");

    currentRoomId = roomId;
    socket.emit('joinRoom', { username, roomId });
    showScreen('lobby');
    document.getElementById('room-display').innerText = roomId;
}

socket.on('syncSettings', (settings) => {
    document.getElementById('bot-check-modal').checked = settings.withBots;
    const allChecks = document.querySelectorAll('.deck-check');
    allChecks.forEach(cb => {
        cb.checked = settings.activeDecks.includes(cb.value);
    });
});

socket.on('updatePlayers', (players) => {
    const list = document.getElementById('player-list');
    list.innerHTML = players.map(p => 
        `<div style="border-bottom:2px solid black; padding:5px; display:flex; align-items:center; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:10px;">
                <img src="${p.avatar}" class="player-avatar">
                <div style="display:flex; flex-direction:column; text-align:left;">
                    <span>${p.username} ${p.isBot ? '🤖' : ''}</span>
                    <span style="font-size:0.8rem; color:var(--btn-blue);">${p.title || ''}</span>
                </div>
            </div>
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

socket.on('timerStart', ({ duration }) => {
    const container = document.getElementById('timer-container');
    const bar = document.getElementById('timer-bar');
    
    container.style.display = 'block';
    
    bar.style.transition = 'none';
    bar.style.width = '100%';
    
    void bar.offsetWidth;

    bar.style.transition = `width ${duration}s linear`;
    bar.style.width = '0%';
});


socket.on('newRound', ({ roundNumber, totalRounds, judgeId, scenario, hands }) => {
    showScreen('game');
    playSound('card');
    myId = socket.id;
    isJudge = (myId === judgeId);

    document.getElementById('round-display').innerText = `${roundNumber}/${totalRounds}`;
    
    const playerCount = hands.length;
    const badge = document.getElementById('role-badge');
    badge.innerText = isJudge 
        ? `ТЫ СУДЬЯ (${playerCount})` 
        : `ТЫ ИГРОК (${playerCount})`;
    
    badge.style.color = "black"; 

    document.getElementById('scenario-text').innerText = scenario;
    
    document.getElementById('submissions-container').innerHTML = '';
    document.getElementById('status-text').innerText = isJudge ? "ЖДЕМ КАРТЫ..." : "ВЫБЕРИ МЕМ!";
    document.getElementById('draw-btn').style.display = 'none';

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

        if (isJudge) {
            const drawBtn = document.getElementById('draw-btn');
            drawBtn.style.display = 'inline-block';
            drawBtn.onclick = () => {
                if(confirm("Объявить ничью?")) {
                    socket.emit('declareDraw', { roomId: currentRoomId });
                }
            };
        }

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

socket.on('roundResult', ({ winnerName, winningCard, players, isDraw }) => {
    
    // === ЛОГИКА ВЫБОРА ЗВУКА РАУНДА ===
    if (isDraw) {
        playSound('draw'); 
    } else {
        playSound('win'); 
        try { confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#ff4500', '#00c853', '#2962ff'] }); } catch(e){}
    }
    
    document.getElementById('timer-container').style.display = 'none';
    document.getElementById('draw-btn').style.display = 'none';
    document.getElementById('status-text').innerHTML = isDraw ? "🤝 ДРУЖБА!" : `ПОБЕДИТЕЛЬ: ${winnerName}`;
    
    const myPlayer = players.find(p => p.id === myId);
    if(myPlayer) document.getElementById('score-board').innerText = `СЧЕТ: ${myPlayer.score}`;

    const container = document.getElementById('submissions-container');
    if (!isDraw) {
        container.innerHTML = `<div class="judging-card" style="transform:scale(1.2); border-color:var(--btn-green); width:90px; height:130px;"><img src="${winningCard}"></div>`;
    } else {
        container.innerHTML = `<div style="font-size:3rem;">🤝</div>`;
    }

    const list = document.getElementById('player-list');
    if(list) {
         list.innerHTML = players.map(p => 
            `<div style="border-bottom:2px solid black; padding:5px; display:flex; align-items:center; justify-content:space-between;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${p.avatar}" class="player-avatar">
                    <div style="display:flex; flex-direction:column; text-align:left;">
                        <span>${p.username} ${p.isBot ? '🤖' : ''}</span>
                        <span style="font-size:0.8rem; color:var(--btn-blue);">${p.title || ''}</span>
                    </div>
                </div>
                <span>${p.score} 🏆</span>
            </div>`
        ).join('');
    }
});

socket.on('gameOver', (sortedPlayers) => {
    showScreen('gameover');
    
    // === ИГРАЕМ ФИНАЛЬНЫЙ ЗВУК ===
    playSound('finish'); 
    
    const list = document.getElementById('podium-list');
    list.innerHTML = sortedPlayers.map((p, i) => {
        let cls = i===0 ? 'place-1' : '';
        return `<div class="podium-place ${cls}">
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:1.5rem;">#${i+1}</span>
                <img src="${p.avatar}" class="player-avatar" style="width:40px; height:40px;">
                <div style="display:flex; flex-direction:column; text-align:left;">
                    <span>${p.username}</span>
                    <span style="font-size:0.8rem; opacity:0.7;">${p.title}</span>
                </div>
            </div>
            <span>${p.score}</span>
        </div>`;
    }).join('');
});
