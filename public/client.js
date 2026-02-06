const socket = io();

// Звуки (если файлов нет, ошибок не будет)
const audio = {
    click: new Audio('/sounds/click.mp3'),
    card: new Audio('/sounds/card.mp3'),
    win: new Audio('/sounds/win.mp3')
};
function playSound(name) {
    if(audio[name]) { audio[name].currentTime=0; audio[name].play().catch(()=>{}); }
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

    if (!username || !roomId) return alert("ENTER NAME & ROOM!");

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
            <span>${p.score} PTS</span>
        </div>`
    ).join('');

    const startBtn = document.getElementById('start-btn');
    if (players.length >= 3) {
        startBtn.style.display = 'block';
        document.getElementById('lobby-status-text').innerText = "READY TO START!";
    } else {
        startBtn.style.display = 'none';
        document.getElementById('lobby-status-text').innerText = `WAITING FOR ${3 - players.length} MORE...`;
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
    document.getElementById('role-badge').innerText = isJudge ? "JUDGE ⚖️" : "PLAYER 🤡";
    document.getElementById('role-badge').style.color = isJudge ? "var(--btn-green)" : "var(--btn-blue)";
    document.getElementById('scenario-text').innerText = scenario;
    
    document.getElementById('submissions-container').innerHTML = '';
    document.getElementById('status-text').innerText = isJudge ? "WAITING FOR CARDS..." : "PICK A MEME!";

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
        // Полароидный стиль
        card.innerHTML = `<img src="${imgSrc}"><div style="text-align:center; font-size:0.6rem; margin-top:5px; font-weight:bold;">MEME</div>`;
        card.onclick = () => {
            if (isJudge) return;
            playSound('click');
            document.getElementById('hand-area').style.display = 'none';
            document.getElementById('status-text').innerText = "WAITING...";
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
        container.innerHTML += `<div class="card" style="background:black; display:flex; align-items:center; justify-content:center; color:white; font-size:2rem;">?</div>`;
    }
    if (isJudge) document.getElementById('status-text').innerText = `CARDS: ${count}`;
});

socket.on('gameState', (state) => {
    if (state.state === 'judging') {
        const container = document.getElementById('submissions-container');
        container.innerHTML = '';
        document.getElementById('status-text').innerText = isJudge ? "PICK THE WINNER!" : "JUDGE IS THINKING...";

        state.submissions.forEach(sub => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.transform = 'scale(1.1)';
            card.innerHTML = `<img src="${sub.card}">`;
            
            if (isJudge) {
                card.onclick = () => {
                    if(confirm("Confirm winner?")) {
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

    document.getElementById('status-text').innerHTML = `WINNER: ${winnerName}`;
    
    // Обновление счета
    const sb = document.getElementById('score-board');
    // Находим себя
    const myPlayer = players.find(p => p.id === myId);
    if(myPlayer) sb.innerText = `SCORE: ${myPlayer.score}`;

    const container = document.getElementById('submissions-container');
    container.innerHTML = `<div class="card" style="transform:scale(1.2); border-color:var(--btn-green);"><img src="${winningCard}"></div>`;
});

socket.on('gameOver', (sortedPlayers) => {
    showScreen('gameover');
    playSound('win');
    
    const list = document.getElementById('podium-list');
    list.innerHTML = sortedPlayers.map((p, i) => {
        let color = i===0 ? 'gold' : i===1 ? 'silver' : '#cd7f32';
        return `<div style="background:${color}; padding:10px; border:3px solid black; margin-bottom:10px;">
            #${i+1} ${p.username} - ${p.score}
        </div>`;
    }).join('');
});
