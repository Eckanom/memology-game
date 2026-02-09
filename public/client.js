const socket = io();
let currentVolume = 5;

const audio = {
    click: new Audio('/sounds/click.mp3'),
    card: new Audio('/sounds/card.mp3'),
    draw: new Audio('/sounds/draw.mp3'),
    rip: new Audio('/sounds/rip.mp3'),
    coins: new Audio('/sounds/coins.mp3')
};

const winSounds = [];
for (let i = 1; i <= 15; i++) winSounds.push(new Audio(`/sounds/win${i}.mp3`));
const finishSounds = [];
for (let i = 1; i <= 5; i++) finishSounds.push(new Audio(`/sounds/finish${i}.mp3`));
let availableWinIndices = Array.from({ length: 15 }, (_, i) => i);

function playSound(name) {
    let soundToPlay;
    if (name === 'win') {
        if (availableWinIndices.length === 0) availableWinIndices = Array.from({ length: 15 }, (_, i) => i);
        const randomIndex = Math.floor(Math.random() * availableWinIndices.length);
        soundToPlay = winSounds[availableWinIndices[randomIndex]];
        availableWinIndices.splice(randomIndex, 1);
    } else if (name === 'finish') {
        soundToPlay = finishSounds[Math.floor(Math.random() * finishSounds.length)];
    } else {
        soundToPlay = audio[name];
    }
    if (soundToPlay) { 
        soundToPlay.currentTime = 0; 
        soundToPlay.volume = currentVolume / 10;
        soundToPlay.play().catch(()=>{}); 
    }
}

function showPopup(text, onYes = null, showNo = false) {
    const modal = document.getElementById('custom-modal');
    const textEl = document.getElementById('modal-text');
    const btnYes = document.getElementById('modal-yes');
    const btnNo = document.getElementById('modal-no');
    textEl.innerText = text;
    modal.style.display = 'flex';
    playSound('click');
    btnYes.onclick = () => {
        playSound('click');
        modal.style.display = 'none';
        if (onYes) onYes();
    };
    if (showNo) {
        btnNo.style.display = 'block';
        btnNo.onclick = () => {
            playSound('click');
            modal.style.display = 'none';
        };
    } else {
        btnNo.style.display = 'none';
    }
}

let playerCoins = parseInt(localStorage.getItem('memeCoins')) || 0;
let ownedPacks = JSON.parse(localStorage.getItem('ownedPacks')) || [0]; 
let lastMainScreen = 'login';
let returnToOptions = false; 
let currentTimerEnd = 0;
let allPlayers = []; 

function updateCoinDisplay() {
    document.getElementById('coin-count').innerText = playerCoins;
    document.getElementById('top-bar').style.display = 'flex'; 
}

function addCoins(amount) {
    playerCoins += amount;
    localStorage.setItem('memeCoins', playerCoins);
    updateCoinDisplay();
    playSound('coins');
}

function openShop() {
    const optionsModal = document.getElementById('settings-modal');
    if (optionsModal.style.display === 'flex') {
        returnToOptions = true;
        closeSettings();
    } else {
        returnToOptions = false;
    }
    playSound('click');
    showScreen('shop');
    renderShop();
}

function backFromShop() {
    playSound('click');
    showScreen(lastMainScreen);
    if (returnToOptions) {
        openSettings();
        returnToOptions = false;
    }
}

function renderShop() {
    const container = document.getElementById('shop-container');
    container.innerHTML = '';
    for (let i = 0; i < 10; i++) {
        const isOwned = ownedPacks.includes(i);
        const isDefault = i === 0;
        const price = 100;
        const packDiv = document.createElement('div');
        packDiv.className = `shop-pack ${isOwned ? 'owned' : ''}`;
        packDiv.onclick = () => buyPack(i, price);
        packDiv.innerHTML = `
            <div class="pack-title">${isDefault ? 'BASIC' : `PACK #${i+1}`}</div>
            <div style="font-size:2rem;">📦</div>
            ${isOwned ? '' : `<div class="pack-price">${price} 🪙</div>`}
        `;
        container.appendChild(packDiv);
    }
    updateCoinDisplay();
}

function buyPack(packIndex, price) {
    if (ownedPacks.includes(packIndex)) return;
    if (playerCoins >= price) {
        startPackOpening(packIndex, price);
    } else {
        showPopup("НЕ ХВАТАЕТ МОНЕТ!");
    }
}

let isDragging = false;
let startX = 0;

function startPackOpening(packIndex, price) {
    const overlay = document.getElementById('pack-opening-overlay');
    const pack = document.getElementById('animated-pack');
    const strip = document.getElementById('tear-strip');
    const cardsContainer = document.getElementById('revealed-cards');
    const collectBtn = document.getElementById('collect-btn');
    const closeBtn = document.querySelector('.close-pack-btn');

    overlay.style.display = 'flex';
    pack.classList.remove('pack-slide-down');
    strip.style.display = 'flex';
    strip.style.clipPath = 'inset(0 0 0 0)'; 
    cardsContainer.style.display = 'none';
    cardsContainer.innerHTML = '';
    collectBtn.style.display = 'none';
    closeBtn.style.display = 'flex'; 

    strip.onmousedown = strip.ontouchstart = (e) => {
        isDragging = true;
        startX = e.pageX || e.touches[0].pageX;
    };
    document.onmouseup = document.ontouchend = () => {
        if (!isDragging) return;
        isDragging = false;
        strip.style.transition = 'clip-path 0.3s ease-out';
        strip.style.clipPath = 'inset(0 0 0 0)';
    };
    document.onmousemove = document.ontouchmove = (e) => {
        if (!isDragging) return;
        const x = e.pageX || e.touches[0].pageX;
        const diff = x - startX;
        if (diff > 0) { 
             const percent = Math.min(100, (diff / 200) * 100);
             strip.style.transition = 'none'; 
             strip.style.clipPath = `inset(0 0 0 ${percent}%)`; 
        }
        if (diff > 200) { 
            isDragging = false;
            document.onmouseup = null;
            document.onmousemove = null;
            performRip(packIndex, price);
        }
    };
}

function performRip(packIndex, price) {
    playerCoins -= price;
    localStorage.setItem('memeCoins', playerCoins);
    updateCoinDisplay();

    document.querySelector('.close-pack-btn').style.display = 'none';
    playSound('rip');
    const strip = document.getElementById('tear-strip');
    const pack = document.getElementById('animated-pack');
    strip.style.display = 'none'; 
    
    setTimeout(() => {
        pack.classList.add('pack-slide-down');
        setTimeout(() => {
            revealCards(packIndex);
        }, 500);
    }, 200);
}

function revealCards(packIndex) {
    const container = document.getElementById('revealed-cards');
    container.style.display = 'grid';
    const startImg = packIndex * 10 + 1;
    
    for(let i=0; i<10; i++) {
        const imgNum = startImg + i;
        const card = document.createElement('div');
        card.className = 'revealed-card';
        card.innerHTML = `<img src="/memes/${imgNum}.png">`; 
        
        if (i === 9) {
            card.classList.add('rare-card'); 
            card.style.animationDelay = '3s';
            setTimeout(() => playSound('win'), 3000);
        } else {
            card.style.animationDelay = `${i * 0.1}s`;
        }
        container.appendChild(card);
    }
    playSound('coins'); 
    ownedPacks.push(packIndex);
    localStorage.setItem('ownedPacks', JSON.stringify(ownedPacks));
    setTimeout(() => {
        document.getElementById('collect-btn').style.display = 'block';
    }, 3500);
}

function closePackOpening() {
    document.getElementById('pack-opening-overlay').style.display = 'none';
    renderShop();
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
    playSound('win');
}

function leaveGame() {
    showPopup("ТОЧНО ВЫЙТИ?", () => {
        location.reload();
    }, true);
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
let isGameStarted = false; 

const screens = {
    login: document.getElementById('login-screen'),
    lobby: document.getElementById('lobby-screen'),
    game: document.getElementById('game-screen'),
    gameover: document.getElementById('gameover-screen'),
    shop: document.getElementById('shop-screen')
};

function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
    
    if (name !== 'shop') {
        lastMainScreen = name;
    }

    if (name === 'login') {
        document.getElementById('top-bar').style.display = 'none';
    } else {
        updateCoinDisplay();
    }
    
    if (name === 'game' && currentTimerEnd > Date.now()) {
        const remaining = (currentTimerEnd - Date.now()) / 1000;
        animateTimer(remaining);
    }
    
    const chatFab = document.getElementById('chat-fab');
    if (name === 'game' || name === 'lobby' || name === 'gameover') {
        chatFab.style.display = 'flex';
    } else {
        chatFab.style.display = 'none';
    }
}

function joinGame() {
    playSound('click');
    const username = document.getElementById('username').value;
    const roomId = document.getElementById('room').value;
    if (!username || !roomId) {
        showPopup("ВВЕДИ ИМЯ И КОМНАТУ!");
        return;
    }
    currentRoomId = roomId;
    socket.emit('joinRoom', { username, roomId });
    showScreen('lobby');
    document.getElementById('room-display').innerText = roomId;
}

function backFromLobby() {
    playSound('click');
    if (isGameStarted) {
        showScreen('game');
    } else {
        location.reload(); 
    }
}

socket.on('syncSettings', (settings) => {
    document.getElementById('bot-check-modal').checked = settings.withBots;
    document.querySelectorAll('.deck-check').forEach(cb => {
        cb.checked = settings.activeDecks.includes(cb.value);
    });
});

socket.on('updatePlayers', (players) => {
    allPlayers = players; 
    const onlineCountLobby = document.getElementById('online-count');
    if(onlineCountLobby) onlineCountLobby.innerText = players.length;

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
    if (players.length >= 3) {
        startBtn.style.display = 'block';
    } else {
        startBtn.style.display = 'none';
    }
});

function startGame() {
    playSound('click');
    socket.emit('startGame', currentRoomId);
}

function animateTimer(duration) {
    const bar = document.getElementById('timer-bar');
    const container = document.getElementById('timer-container');
    container.style.display = 'block';
    
    bar.style.transition = 'none';
    bar.style.width = '100%';
    void bar.offsetWidth; 
    
    bar.style.transition = `width ${duration}s linear`;
    bar.style.width = '0%';
}

socket.on('timerStart', ({ duration }) => {
    currentTimerEnd = Date.now() + (duration * 1000);
    animateTimer(duration);
});

socket.on('newRound', ({ roundNumber, totalRounds, judgeId, scenario, scenarioCategory, hands }) => {
    isGameStarted = true;
    showScreen('game');
    playSound('card');
    myId = socket.id;
    isJudge = (myId === judgeId);
    
    // [UPD] Всплывающее уведомление о раунде
    const roundNotify = document.getElementById('round-notification');
    roundNotify.innerText = `РАУНД ${roundNumber}/${totalRounds}`;
    roundNotify.style.display = 'block';
    // Простая анимация появления/исчезновения через CSS или просто таймер
    setTimeout(() => {
        roundNotify.style.display = 'none';
    }, 2000);

    const playerCount = hands.length;
    const badge = document.getElementById('role-badge');
    badge.innerText = isJudge ? `ТЫ СУДЬЯ` : `ТЫ ИГРОК`;
    badge.style.color = "black"; 
    
    document.getElementById('scenario-text').innerText = scenario;
    
    // [UPD] Обновление заголовка с категорией
    const categoryText = scenarioCategory ? scenarioCategory.toUpperCase() : 'РАНДОМ';
    document.getElementById('scenario-header').innerText = `СИТУАЦИЯ / ${categoryText}`;

    document.getElementById('submissions-container').innerHTML = '';
    document.getElementById('status-text').innerText = isJudge ? "ЖДЕМ КАРТЫ..." : "ВЫБЕРИ МЕМ!";
    document.getElementById('draw-btn').style.display = 'none';

    const modPanel = document.getElementById('modifiers-bar');
    if (isJudge) {
        modPanel.style.display = 'none';
    } else {
        modPanel.style.display = 'flex';
        const me = allPlayers.find(p => p.id === myId);
        if (me && me.modifiers) {
            document.getElementById('btn-veto').disabled = !me.modifiers.veto;
            document.getElementById('btn-second-chance').disabled = !me.modifiers.secondChance;
            document.getElementById('btn-input').disabled = false;
        }
    }

    const myHandData = hands.find(h => h.id === myId);
    if (myHandData && !isJudge) {
        renderHand(myHandData.hand);
        document.getElementById('hand-area').style.display = 'block';
    } else {
        document.getElementById('hand-area').style.display = 'none';
    }
});

socket.on('updateScenario', (data) => {
    // data теперь может приходить объектом { text, category }
    if (typeof data === 'object') {
        document.getElementById('scenario-text').innerText = data.text;
        document.getElementById('scenario-header').innerText = `СИТУАЦИЯ / ${data.category}`;
    } else {
        document.getElementById('scenario-text').innerText = data;
    }
    
    playSound('click');
    const card = document.querySelector('.scenario-card-modern');
    card.style.transform = 'rotate(5deg) scale(1.05)';
    setTimeout(() => card.style.transform = 'rotate(1deg)', 300);
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
    // Если мы реконнектимся и сервер прислал категорию
    if (state.scenarioCategory) {
        document.getElementById('scenario-header').innerText = `СИТУАЦИЯ / ${state.scenarioCategory}`;
    }

    if (state.state === 'judging') {
        const container = document.getElementById('submissions-container');
        container.innerHTML = '';
        document.getElementById('status-text').innerText = isJudge ? "ВЫБИРАЙ ЛУЧШИЙ!" : "СУДЬЯ ВЫБИРАЕТ...";
        if (isJudge) {
            const drawBtn = document.getElementById('draw-btn');
            drawBtn.style.display = 'inline-block';
            drawBtn.onclick = () => { 
                showPopup("ОБЪЯВИТЬ НИЧЬЮ?", () => {
                    socket.emit('declareDraw', { roomId: currentRoomId });
                }, true); 
            };
        }
        state.submissions.forEach(sub => {
            const card = document.createElement('div');
            card.className = 'judging-card';
            
            if (sub.card.startsWith('text:')) {
                const textContent = sub.card.substring(5); 
                card.innerHTML = `<div class="text-content">${textContent}</div>`;
            } else {
                card.innerHTML = `<img src="${sub.card}">`;
            }

            if (isJudge) {
                card.style.cursor = 'pointer';
                card.onclick = () => {
                    showPopup("ВЫБРАТЬ ЭТОТ МЕМ?", () => {
                        playSound('click');
                        socket.emit('chooseWinner', { roomId: currentRoomId, winnerSocketId: sub.playerId });
                    }, true);
                };
            }
            container.appendChild(card);
        });
    }
});

socket.on('roundResult', ({ winnerName, winningCard, players, isDraw }) => {
    if (isDraw) {
        playSound('draw'); 
    } else {
        playSound('win'); 
        try { confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#ff4500', '#00c853', '#2962ff'] }); } catch(e){}
    }
    
    const myPlayer = players.find(p => p.id === myId);
    if (myPlayer && myPlayer.username === winnerName) {
        const reward = Math.floor(Math.random() * (30 - 10 + 1)) + 10;
        addCoins(reward);
        showPopup(`ТЫ ВЫИГРАЛ!\n+${reward} МОНЕТ 🪙`);
    }

    document.getElementById('timer-container').style.display = 'none';
    document.getElementById('draw-btn').style.display = 'none';
    document.getElementById('status-text').innerHTML = isDraw ? "🤝 ДРУЖБА!" : `ПОБЕДИТЕЛЬ: ${winnerName}`;

    const container = document.getElementById('submissions-container');
    if (!isDraw && winningCard) {
        if (winningCard.startsWith('text:')) {
            container.innerHTML = `<div class="judging-card" style="transform:scale(1.2); border-color:var(--btn-green); width:90px; height:130px;"><div class="text-content">${winningCard.substring(5)}</div></div>`;
        } else {
            container.innerHTML = `<div class="judging-card" style="transform:scale(1.2); border-color:var(--btn-green); width:90px; height:130px;"><img src="${winningCard}"></div>`;
        }
    } else {
        container.innerHTML = `<div style="font-size:3rem;">🤝</div>`;
    }
});

socket.on('gameOver', (sortedPlayers) => {
    showScreen('gameover');
    isGameStarted = false; 
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

// Чат
let unreadMessages = false;
function toggleChat() {
    const overlay = document.getElementById('chat-overlay');
    const badge = document.getElementById('chat-badge');
    if (overlay.style.display === 'none') {
        overlay.style.display = 'flex';
        unreadMessages = false;
        badge.style.display = 'none';
        document.getElementById('chat-input').focus();
    } else {
        overlay.style.display = 'none';
    }
    playSound('click');
}
function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (text && currentRoomId) {
        socket.emit('chatMessage', { roomId: currentRoomId, message: text });
        input.value = '';
    }
}
document.getElementById('chat-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') sendChatMessage();
});
socket.on('chatMessage', (msg) => {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    if (msg.isSystem) {
        div.className = 'chat-system';
        div.innerText = msg.text;
    } else {
        div.className = 'chat-msg';
        div.innerHTML = `
            <img src="${msg.avatar}">
            <div style="display:flex; flex-direction:column;">
                <span style="font-size:0.7rem; color:#666;">${msg.sender}</span>
                <div class="chat-bubble">${msg.text}</div>
            </div>
        `;
    }
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    const overlay = document.getElementById('chat-overlay');
    if (overlay.style.display === 'none') {
        unreadMessages = true;
        document.getElementById('chat-badge').style.display = 'block';
    }
});

// Модификаторы
function useVeto() {
    showPopup("СМЕНИТЬ СИТУАЦИЮ? (1 раз)", () => {
        socket.emit('useVeto', { roomId: currentRoomId });
    }, true);
}
function useSecondChance() {
    showPopup("СБРОСИТЬ КАРТЫ? (1 раз)", () => {
        socket.emit('useSecondChance', { roomId: currentRoomId });
    }, true);
}
function openCustomAnswerInput() {
    document.getElementById('input-modal').style.display = 'flex';
    document.getElementById('custom-answer-text').value = '';
    document.getElementById('custom-answer-text').focus();
    playSound('click');
}
function closeCustomAnswerInput() {
    document.getElementById('input-modal').style.display = 'none';
    playSound('click');
}
function submitCustomAnswer() {
    const text = document.getElementById('custom-answer-text').value.trim();
    if (text.length > 0) {
        socket.emit('submitCard', { roomId: currentRoomId, card: 'text:' + text });
        closeCustomAnswerInput();
        document.getElementById('modifiers-bar').style.display = 'none';
        document.getElementById('hand-area').style.display = 'none';
        document.getElementById('status-text').innerText = "ЖДЕМ ОСТАЛЬНЫХ...";
    } else {
        showPopup("НАПИШИ ХОТЬ ЧТО-ТО!");
    }
}

socket.on('updateHand', (newHand) => {
    renderHand(newHand);
    playSound('draw');
});

socket.on('updateModifiers', (mods) => {
    document.getElementById('btn-veto').disabled = !mods.veto;
    document.getElementById('btn-second-chance').disabled = !mods.secondChance;
});
