const socket = io();
let currentVolume = 5;

// === ЗВУКИ ===
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

// === ЭКОНОМИКА И ДАННЫЕ ===
let playerCoins = 0;
let ownedPacks = [0]; 
let lastMainScreen = 'login';
let returnToOptions = false; 
let currentTimerEnd = 0;
let allPlayers = []; 

function updateCoinDisplay() {
    document.getElementById('coin-count').innerText = playerCoins;
    document.getElementById('top-bar').style.display = 'flex'; 
}

function addCoins(amount) {
    // Визуальное обновление (реальное происходит через сокеты)
    playerCoins += amount;
    updateCoinDisplay();
    playSound('coins');
}

// === ХЕЛПЕР: ПОЛУЧИТЬ НАЗВАНИЕ ПАКА ПО КАРТИНКЕ ===
function getPackLabel(imgSrc) {
    if (!imgSrc || imgSrc.startsWith('text:')) return 'ТЕКСТ';
    
    // Извлекаем номер из "/memes/12.png" -> 12
    const match = imgSrc.match(/\/(\d+)\.png/);
    if (match) {
        const imgNum = parseInt(match[1]);
        // 1-10 -> Pack 1, 11-20 -> Pack 2...
        const packNum = Math.ceil(imgNum / 10);
        return `ПАК #${packNum}`;
    }
    return 'MEME';
}

// === СОКЕТЫ ДЛЯ СИНХРОНИЗАЦИИ ДАННЫХ ===
socket.on('updateUserData', (data) => {
    playerCoins = data.coins;
    ownedPacks = data.ownedPacks;
    
    // Сохраняем в localStorage на всякий случай
    localStorage.setItem('memeCoins', playerCoins);
    localStorage.setItem('ownedPacks', JSON.stringify(ownedPacks));
    
    updateCoinDisplay();
    
    // Если открыт магазин, обновляем его (чтобы загорелось "КУПЛЕНО")
    if (document.getElementById('shop-screen').classList.contains('active')) {
        renderShop();
    }
});

// === МАГАЗИН ===
function openShop() {
    const lobby = document.getElementById('lobby-screen');
    if (lobby.classList.contains('active')) lastMainScreen = 'lobby';
    
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
        const price = 100;
        const packNum = i + 1; 
        const packDiv = document.createElement('div');
        packDiv.className = `shop-pack ${isOwned ? 'owned' : ''}`;
        packDiv.onclick = () => buyPack(i, price);
        packDiv.innerHTML = `
            <div class="pack-title">ПАК #${packNum}</div>
            <div style="font-size:2rem;">📦</div>
            ${isOwned ? '' : `<div class="pack-price">${price} 🪙</div>`}
        `;
        container.appendChild(packDiv);
    }
    updateCoinDisplay();
}

// Покупка теперь через сервер
function buyPack(packIndex, price) {
    if (ownedPacks.includes(packIndex)) return;
    
    const username = document.getElementById('username').value;
    // Отправляем запрос на сервер
    socket.emit('buyPack', { username, packIndex, cost: price });
}

// Ответ сервера: Успех
socket.on('purchaseSuccess', ({ packIndex, newCoins }) => {
    // Запускаем анимацию
    startPackOpening(packIndex);
});

// Ответ сервера: Ошибка
socket.on('purchaseFailed', ({ reason }) => {
    showPopup(reason);
});

// === АНИМАЦИЯ ОТКРЫТИЯ (ВИЗУАЛ) ===
function startPackOpening(packIndex) {
    const overlay = document.getElementById('pack-opening-overlay');
    const pack = document.getElementById('booster-pack'); 
    const cardsWrapper = document.getElementById('pack-cards-wrapper'); 
    const collectBtn = document.getElementById('collect-btn');
    const closeBtn = document.querySelector('.close-pack-btn');

    // Сброс состояния
    overlay.style.display = 'flex';
    collectBtn.style.display = 'none';
    closeBtn.style.display = 'none'; // Не даем закрыть, пока не откроет
    pack.classList.remove('open'); 
    cardsWrapper.innerHTML = ''; 

    // Генерируем 5 карт для визуала (реальные карты для игры сервер знает сам)
    const startImg = packIndex * 10 + 1; 
    for (let i = 0; i < 5; i++) {
        const imgNum = startImg + i; 
        const imgSrc = `/memes/${imgNum}.png`;
        const cardDiv = document.createElement('div');
        cardDiv.className = 'pack-card'; // Стиль из нового CSS
        cardDiv.setAttribute('data-label', getPackLabel(imgSrc));
        cardDiv.innerHTML = `<img src="${imgSrc}">`;
        cardsWrapper.appendChild(cardDiv);
    }

    // Клик по паку -> Разрыв
    pack.onclick = function() {
        if (pack.classList.contains('open')) return;

        playSound('rip'); 
        pack.classList.add('open');

        // Раскрытие веера
        setTimeout(() => {
            const cards = document.querySelectorAll('.pack-card');
            cards.forEach((card, index) => {
                setTimeout(() => {
                    card.classList.add('spread');
                    playSound('card'); 
                }, index * 100);
            });
            
            // Финиш
            setTimeout(() => {
                playSound('win');
                playSound('coins');
                collectBtn.style.display = 'block';
            }, 1000);

        }, 600);
    };
}

function closePackOpening() {
    document.getElementById('pack-opening-overlay').style.display = 'none';
    renderShop(); 
}

// === НАСТРОЙКИ ===
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

// === НАВИГАЦИЯ (ЭКРАНЫ) ===
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
    if (name !== 'shop') lastMainScreen = name;
    if (name === 'login') document.getElementById('top-bar').style.display = 'none';
    else updateCoinDisplay();
    
    const chatFab = document.getElementById('chat-fab');
    if (name === 'game' || name === 'lobby' || name === 'gameover') chatFab.style.display = 'flex';
    else chatFab.style.display = 'none';
}

function joinGame() {
    playSound('click');
    const username = document.getElementById('username').value;
    const roomId = document.getElementById('room').value;
    if (!username || !roomId) { showPopup("ВВЕДИ ИМЯ И КОМНАТУ!"); return; }
    currentRoomId = roomId;
    socket.emit('joinRoom', { username, roomId });
    showScreen('lobby');
    document.getElementById('room-display').innerText = roomId;
}

function backFromLobby() { playSound('click'); if (isGameStarted) { showScreen('game'); } else { location.reload(); } }
function toggleReady() { playSound('click'); socket.emit('toggleReady', { roomId: currentRoomId }); }
function requestRematch() { playSound('click'); socket.emit('requestRematch', { roomId: currentRoomId }); }

// === ИГРОВАЯ ЛОГИКА (SOCKETS) ===
socket.on('returnToLobby', () => {
    isGameStarted = false;
    showScreen('lobby');
    const btn = document.getElementById('ready-btn');
    btn.innerText = "Я ГОТОВ";
    btn.classList.add('btn-green');
    btn.classList.remove('btn-red');
});

socket.on('syncSettings', (settings) => {
    document.getElementById('bot-check-modal').checked = settings.withBots;
    document.querySelectorAll('.deck-check').forEach(cb => { cb.checked = settings.activeDecks.includes(cb.value); });
});

socket.on('updatePlayers', (players) => {
    allPlayers = players; 
    const onlineCountLobby = document.getElementById('online-count');
    if(onlineCountLobby) onlineCountLobby.innerText = players.length;

    const list = document.getElementById('player-list');
    list.innerHTML = players.map(p => {
        const readyStatus = p.isReady ? '<span style="color:#00c853; font-weight:bold;">✔ ГОТОВ</span>' : '<span style="color:#666;">⏳ ЖДЕМ</span>';
        if (p.id === socket.id) {
            const btn = document.getElementById('ready-btn');
            if (p.isReady) {
                btn.innerText = "НЕ ГОТОВ";
                btn.classList.remove('btn-green'); btn.classList.add('btn-red'); btn.style.backgroundColor = 'var(--btn-red)'; 
            } else {
                btn.innerText = "Я ГОТОВ";
                btn.classList.remove('btn-red'); btn.classList.add('btn-green'); btn.style.backgroundColor = 'var(--btn-green)';
            }
        }
        return `<div style="border-bottom:2px solid black; padding:5px; display:flex; align-items:center; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:10px;">
                <img src="${p.avatar}" class="player-avatar">
                <div style="display:flex; flex-direction:column; text-align:left;">
                    <span>${p.username} ${p.isBot ? '🤖' : ''}</span>
                    <span style="font-size:0.8rem; color:var(--btn-blue);">${p.title || ''}</span>
                </div>
            </div>
            <div style="text-align:right;">
                <div>${readyStatus}</div>
                <div style="font-size:0.8rem;">${p.score} 🏆</div>
            </div>
        </div>`;
    }).join('');
});

socket.on('lobbyCountdown', ({ seconds, text }) => {
    const notify = document.getElementById('round-notification');
    if (seconds > 0) { notify.innerText = seconds; notify.style.display = 'block'; } 
    else if (text) { notify.innerText = text; notify.style.display = 'block'; setTimeout(() => { notify.style.display = 'none'; }, 2000); } 
    else { notify.style.display = 'none'; }
});

function startGame() { playSound('click'); socket.emit('startGame', currentRoomId); }

function animateTimer(duration) {
    const bar = document.getElementById('timer-bar');
    const container = document.getElementById('timer-container');
    container.style.display = 'block';
    bar.style.transition = 'none'; bar.style.width = '100%'; void bar.offsetWidth; 
    bar.style.transition = `width ${duration}s linear`; bar.style.width = '0%';
}
socket.on('timerStart', ({ duration }) => { currentTimerEnd = Date.now() + (duration * 1000); animateTimer(duration); });

socket.on('newRound', ({ roundNumber, totalRounds, judgeId, scenario, scenarioCategory, hands }) => {
    isGameStarted = true;
    showScreen('game');
    playSound('card');
    myId = socket.id;
    isJudge = (myId === judgeId);
    
    const myHandData = hands.find(h => h.id === myId);
    const amISpectator = !myHandData; 

    const roundNotify = document.getElementById('round-notification');
    roundNotify.innerText = `РАУНД ${roundNumber}/${totalRounds}`;
    roundNotify.style.display = 'block';
    setTimeout(() => { roundNotify.style.display = 'none'; }, 2000);

    const badge = document.getElementById('role-badge');
    if (amISpectator) {
        badge.innerText = "ТЫ ЗРИТЕЛЬ 👀"; document.getElementById('status-text').innerText = "СМОТРИ ИГРУ...";
    } else {
        badge.innerText = isJudge ? `ТЫ СУДЬЯ` : `ТЫ ИГРОК`;
    }
    badge.style.color = "black"; 
    
    document.getElementById('scenario-text').innerText = scenario;
    const categoryText = scenarioCategory ? scenarioCategory.toUpperCase() : 'РАНДОМ';
    document.getElementById('scenario-header').innerText = `СИТУАЦИЯ / ${categoryText}`;

    document.getElementById('submissions-container').innerHTML = '';
    
    if (!amISpectator) { document.getElementById('status-text').innerText = isJudge ? "ЖДЕМ КАРТЫ..." : "ВЫБЕРИ МЕМ!"; }
    document.getElementById('draw-btn').style.display = 'none';

    const modPanel = document.getElementById('modifiers-bar');
    if (isJudge || amISpectator) { modPanel.style.display = 'none'; } 
    else {
        modPanel.style.display = 'flex';
        const me = allPlayers.find(p => p.id === myId);
        if (me && me.modifiers) {
            document.getElementById('btn-veto').disabled = !me.modifiers.veto;
            document.getElementById('btn-second-chance').disabled = !me.modifiers.secondChance;
            document.getElementById('btn-input').disabled = false;
        }
    }

    if (myHandData && !isJudge) {
        renderHand(myHandData.hand);
        document.getElementById('hand-area').style.display = 'block';
    } else {
        document.getElementById('hand-area').style.display = 'none';
    }
});

socket.on('updateScenario', (data) => {
    if (typeof data === 'object') {
        document.getElementById('scenario-text').innerText = data.text;
        document.getElementById('scenario-header').innerText = `СИТУАЦИЯ / ${data.category}`;
    } else { document.getElementById('scenario-text').innerText = data; }
    playSound('click');
    const card = document.querySelector('.scenario-card-modern');
    card.style.transform = 'rotate(5deg) scale(1.05)'; setTimeout(() => card.style.transform = 'rotate(1deg)', 300);
});

function renderHand(cards) {
    const container = document.getElementById('my-hand');
    container.innerHTML = '';
    cards.forEach(imgSrc => {
        const card = document.createElement('div');
        card.className = 'card';
        // Устанавливаем номер пака в лейбл
        card.setAttribute('data-label', getPackLabel(imgSrc));
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
    for(let i=0; i<count; i++) { container.innerHTML += `<div class="submission-card">?</div>`; }
    if (isJudge) document.getElementById('status-text').innerText = `СДАНО: ${count}`;
});

socket.on('gameState', (state) => {
    if (state.scenarioCategory) { document.getElementById('scenario-header').innerText = `СИТУАЦИЯ / ${state.scenarioCategory}`; }
    if (state.state === 'judging') {
        const container = document.getElementById('submissions-container');
        container.innerHTML = '';
        if (!isJudge) document.getElementById('status-text').innerText = "СУДЬЯ ВЫБИРАЕТ...";
        else document.getElementById('status-text').innerText = "ВЫБИРАЙ ЛУЧШИЙ!";
        
        if (isJudge) {
            const drawBtn = document.getElementById('draw-btn');
            drawBtn.style.display = 'inline-block';
            drawBtn.onclick = () => { showPopup("ОБЪЯВИТЬ НИЧЬЮ?", () => { socket.emit('declareDraw', { roomId: currentRoomId }); }, true); };
        }
        state.submissions.forEach(sub => {
            const card = document.createElement('div');
            card.className = 'judging-card';
            
            if (sub.card.startsWith('text:')) {
                const textContent = sub.card.substring(5); 
                card.setAttribute('data-label', 'ТЕКСТ');
                card.innerHTML = `<div class="text-content">${textContent}</div>`;
            } else {
                card.setAttribute('data-label', getPackLabel(sub.card));
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
    if (isDraw) { playSound('draw'); } else { playSound('win'); try { confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#ff4500', '#00c853', '#2962ff'] }); } catch(e){} }
    
    // Монеты начисляются сервером, но показываем попап
    const myPlayer = players.find(p => p.id === myId);
    if (myPlayer && myPlayer.username === winnerName) {
        showPopup(`ТЫ ВЫИГРАЛ!\nБАБЛО В ПУТИ 🪙`);
    }

    document.getElementById('timer-container').style.display = 'none';
    document.getElementById('draw-btn').style.display = 'none';
    document.getElementById('status-text').innerHTML = isDraw ? "🤝 ДРУЖБА!" : `ПОБЕДИТЕЛЬ: ${winnerName}`;

    const container = document.getElementById('submissions-container');
    if (!isDraw && winningCard) {
        if (winningCard.startsWith('text:')) {
            container.innerHTML = `<div class="judging-card" style="transform:scale(1.2); border-color:var(--btn-green); width:90px; height:130px;" data-label="ТЕКСТ"><div class="text-content">${winningCard.substring(5)}</div></div>`;
        } else {
            const label = getPackLabel(winningCard);
            container.innerHTML = `<div class="judging-card" style="transform:scale(1.2); border-color:var(--btn-green); width:90px; height:130px;" data-label="${label}"><img src="${winningCard}"></div>`;
        }
    } else { container.innerHTML = `<div style="font-size:3rem;">🤝</div>`; }
});

socket.on('gameOver', (sortedPlayers) => {
    showScreen('gameover'); isGameStarted = false; playSound('finish'); 
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

// === ЧАТ (С ЧИТ-КОДОМ) ===
let unreadMessages = false;
const QUICK_REPLIES = ["АХАХА 😂", "БОЖЕ... 🤦‍♂️", "ОСУЖДАЮ 🤨", "КРИНЖ 😬", "ЖИЗА 🔥", "РИП 💀", "GG 🤝", "НУ ТАКОЕ 😐"];
function initQuickReplies() {
    const container = document.getElementById('quick-replies'); container.innerHTML = '';
    QUICK_REPLIES.forEach(text => {
        const btn = document.createElement('button'); btn.className = 'quick-reply-btn'; btn.innerText = text;
        btn.onclick = () => { if (currentRoomId) { socket.emit('chatMessage', { roomId: currentRoomId, message: text }); } };
        container.appendChild(btn);
    });
}
function toggleChat() {
    const overlay = document.getElementById('chat-overlay');
    if (overlay.style.display === 'none') {
        overlay.style.display = 'flex'; unreadMessages = false; document.getElementById('chat-badge').style.display = 'none'; initQuickReplies(); document.getElementById('chat-input').focus();
    } else { overlay.style.display = 'none'; }
    playSound('click');
}
function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    const username = document.getElementById('username').value;

    // ЧИТ-КОД ЧЕРЕЗ СЕРВЕР
    if (text.toLowerCase().includes("shut up and take my money")) {
        socket.emit('activateCheat', { username });
        showPopup("ЧИТ-КОД АКТИВИРОВАН!");
        playSound('coins'); 
        input.value = ''; 
        return; 
    }

    if (text && currentRoomId) { socket.emit('chatMessage', { roomId: currentRoomId, message: text }); input.value = ''; }
}
document.getElementById('chat-input').addEventListener('keypress', function (e) { if (e.key === 'Enter') sendChatMessage(); });
socket.on('chatMessage', (msg) => {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    if (msg.isSystem) { div.className = 'chat-system'; div.innerText = msg.text; } 
    else {
        div.className = 'chat-msg'; div.innerHTML = `<img src="${msg.avatar}"><div style="display:flex; flex-direction:column;"><span style="font-size:0.7rem; color:#666;">${msg.sender}</span><div class="chat-bubble">${msg.text}</div></div>`;
    }
    container.appendChild(div); container.scrollTop = container.scrollHeight;
    const overlay = document.getElementById('chat-overlay');
    if (overlay.style.display === 'none') { unreadMessages = true; document.getElementById('chat-badge').style.display = 'block'; }
});

function useVeto() { showPopup("СМЕНИТЬ СИТУАЦИЮ? (1 раз)", () => { socket.emit('useVeto', { roomId: currentRoomId }); }, true); }
function useSecondChance() { showPopup("СБРОСИТЬ КАРТЫ? (1 раз)", () => { socket.emit('useSecondChance', { roomId: currentRoomId }); }, true); }
function openCustomAnswerInput() { document.getElementById('input-modal').style.display = 'flex'; document.getElementById('custom-answer-text').value = ''; document.getElementById('custom-answer-text').focus(); playSound('click'); }
function closeCustomAnswerInput() { document.getElementById('input-modal').style.display = 'none'; playSound('click'); }
function submitCustomAnswer() {
    const text = document.getElementById('custom-answer-text').value.trim();
    if (text.length > 0) {
        socket.emit('submitCard', { roomId: currentRoomId, card: 'text:' + text });
        closeCustomAnswerInput(); document.getElementById('modifiers-bar').style.display = 'none'; document.getElementById('hand-area').style.display = 'none'; document.getElementById('status-text').innerText = "ЖДЕМ ОСТАЛЬНЫХ...";
    } else { showPopup("НАПИШИ ХОТЬ ЧТО-ТО!"); }
}
socket.on('updateHand', (newHand) => { renderHand(newHand); playSound('draw'); });
socket.on('updateModifiers', (mods) => { document.getElementById('btn-veto').disabled = !mods.veto; document.getElementById('btn-second-chance').disabled = !mods.secondChance; });