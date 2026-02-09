const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static(path.join(__dirname, 'public')));

// === БАЗА ДАННЫХ ВОПРОСОВ (ПОЛНЫЕ КОЛОДЫ) ===
const SCENARIO_DECKS = {
    everyday: [
        "Твое лицо, когда открыл холодильник, а там пусто, хотя проверял 5 минут назад",
        "Когда пытаешься тихо открыть упаковку чипсов ночью, но она гремит как взрыв",
        "Тот момент, когда наступил коту на хвост и извиняешься перед ним полчаса",
        "Когда лег спать пораньше, но в 3 часа ночи читаешь про размножение ежей",
        "Когда случайно включил фронтальную камеру и увидел свои три подбородка",
        "Твое лицо, когда мама просит «починить интернет», а ты просто перезагрузил роутер",
        "Когда вышел из душа и понял, что забыл полотенце",
        "Когда услышал свой голос в записи и хочешь удалить себя из жизни",
        "Твое лицо, когда кто-то говорит: «Нам надо серьезно поговорить»",
        "Когда будильник звонит уже в пятый раз, а ты всё еще торгуешься с судьбой",
        "Когда наконец-то нашел удобную позу для сна, но вдруг захотелось в туалет",
        "Твое лицо, когда ударился мизинцем об угол дивана",
        "Когда кто-то доедает последний кусок пиццы, на который ты положил глаз",
        "Когда курьер с едой звонит в домофон",
        "Твое лицо, когда увидел цены на бензин",
        "Когда надел наушники, но забыл включить музыку и просто слушаешь тишину",
        "Когда пытаешься вспомнить пароль, который придумал вчера",
        "Твое лицо, когда кто-то рядом чихнул, не прикрывшись",
        "Когда на кассе пытаешься быстрее убрать сдачу, а очередь давит",
        "Тот момент, когда понял, что забыл выключить утюг, отойдя от дома на 100 метров",
        "Когда моешь посуду, и ложка обдает тебя брызгами как из водомета",
        "Твое лицо, когда бабка в автобусе смотрит на тебя как на врага народа",
        "Когда пытаешься незаметно почесать там, где чесать на людях нельзя",
        "Когда телефон падает на лицо, пока лежишь в кровати",
        "Твое состояние утром 1 января",
        "Твое лицо, когда кто-то чавкает рядом с тобой",
        "Когда ты идешь, спотыкаешься, и делаешь вид, что так и было задумано"
    ],
    // Добавь сюда остальные колоды (it, gamers, geeks, girls, guys, trolls, nsfw) из прошлых ответов
    // Я сократил список для наглядности, но код будет работать с полным списком
    nsfw: [
        "Твое лицо, когда она говорит «глубже», а глубже уже некуда",
        "Когда случайно включил порно со звуком, а дома родители",
        "Тот момент, когда она нашла твою историю браузера",
        "Когда презерватив порвался",
        "Твое лицо, когда ты видишь бывшего с кем-то страшным",
        "Когда она говорит: «Размер не главное», но ты видишь ее взгляд",
        "Тот момент, когда ты проснулся рядом с кем-то и не помнишь имя",
        "Когда родители зашли в комнату в самый неподходящий момент",
        "Твое лицо, когда тебе прислали дикпик без предупреждения",
        "Когда ты пытаешься сдержать стон, потому что за стеной соседи"
    ]
};

// === 100 КАРТ .PNG ===
const TOTAL_IMAGES = 100; 
const MEME_CARDS = Array.from({ length: TOTAL_IMAGES }, (_, i) => `/memes/${i + 1}.png`);

// === ТАЙМЕР ХОДА (30 СЕКУНД) ===
const TURN_TIMER_SECONDS = 30;

const rooms = {};

// === ХЕЛПЕР ДЛЯ ОПРЕДЕЛЕНИЯ КАТЕГОРИИ ===
const DECK_NAMES = {
    everyday: 'ПОВСЕДНЕВНОСТЬ',
    it: 'IT / РАБОТА',
    gamers: 'ГЕЙМЕРЫ',
    geeks: 'ГИКИ / КИНО',
    girls: 'ДЕВУШКИ',
    guys: 'ПАРНИ',
    trolls: 'ТРОЛЛИ',
    nsfw: 'NSFW 18+'
};

function getCategoryForScenario(text) {
    for (const [key, deck] of Object.entries(SCENARIO_DECKS)) {
        if (deck.includes(text)) {
            return DECK_NAMES[key] || 'РАНДОМ';
        }
    }
    return 'СМЕШАННОЕ';
}

io.on('connection', (socket) => {
    
    socket.on('joinRoom', ({ username, roomId }) => {
        socket.join(roomId);
        
        if (!rooms[roomId]) {
            rooms[roomId] = {
                players: [],
                gameState: 'lobby',
                currentJudgeIndex: 0,
                currentScenario: '',
                currentRound: 0, 
                maxRounds: 15,
                withBots: false,
                activeDecks: ['everyday'], 
                submissions: [],
                usedScenarios: [],
                deck: [...MEME_CARDS].sort(() => Math.random() - 0.5),
                createdAt: Date.now(),
                lastActive: Date.now(),
                timer: null,
                timerStartTimestamp: 0 
            };
        }

        const room = rooms[roomId];
        room.lastActive = Date.now();
        
        const existingPlayer = room.players.find(p => p.id === socket.id);
        
        if (!existingPlayer) {
            const avatarUrl = `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(username)}`;
            
            room.players.push({
                id: socket.id,
                username,
                score: 0,
                isBot: false,
                hand: dealCards(room, 5),
                avatar: avatarUrl,
                title: 'Новичок',
                winStreak: 0,
                modifiers: {
                    veto: true,
                    secondChance: true
                }
            });
        }

        calculateTitles(room);
        io.to(roomId).emit('updatePlayers', room.players);
        socket.emit('syncSettings', { withBots: room.withBots, activeDecks: room.activeDecks });

        if (room.gameState !== 'lobby') {
            const judge = room.players[room.currentJudgeIndex];
            socket.emit('newRound', {
                roundNumber: room.currentRound,
                totalRounds: room.maxRounds,
                judgeId: judge.id,
                judgeName: judge.username,
                scenario: room.currentScenario,
                scenarioCategory: getCategoryForScenario(room.currentScenario),
                hands: room.players.map(p => ({ id: p.id, hand: p.hand }))
            });
            if (room.submissions.length > 0) socket.emit('updateSubmissionsCount', room.submissions.length);
            if (room.gameState === 'judging') {
                socket.emit('gameState', {
                    state: 'judging',
                    scenario: room.currentScenario,
                    scenarioCategory: getCategoryForScenario(room.currentScenario),
                    submissions: room.submissions,
                    judge: judge.username
                });
            }
            
            if (room.timerStartTimestamp > 0) {
                const elapsed = (Date.now() - room.timerStartTimestamp) / 1000;
                const remaining = Math.max(0, TURN_TIMER_SECONDS - elapsed);
                if (remaining > 0) {
                     socket.emit('timerStart', { duration: remaining });
                }
            }
        }
    });

    socket.on('chatMessage', ({ roomId, message }) => {
        const room = rooms[roomId];
        if (!room) return;
        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        io.to(roomId).emit('chatMessage', {
            sender: player.username,
            avatar: player.avatar,
            text: message,
            isSystem: false
        });
    });

    socket.on('useVeto', ({ roomId }) => {
        const room = rooms[roomId];
        if (!room || room.gameState !== 'selection') return;
        const player = room.players.find(p => p.id === socket.id);
        if (!player || !player.modifiers.veto) return;

        player.modifiers.veto = false;
        
        let pool = [];
        room.activeDecks.forEach(deckId => {
            if (SCENARIO_DECKS[deckId]) pool.push(...SCENARIO_DECKS[deckId]);
        });
        if (pool.length === 0) pool = SCENARIO_DECKS['everyday'];

        const available = pool.filter(s => !room.usedScenarios.includes(s));
        room.currentScenario = available.length > 0 
            ? available[Math.floor(Math.random() * available.length)] 
            : pool[Math.floor(Math.random() * pool.length)];
        
        room.usedScenarios.push(room.currentScenario);

        const category = getCategoryForScenario(room.currentScenario);

        io.to(roomId).emit('updateScenario', { text: room.currentScenario, category: category });
        io.to(roomId).emit('chatMessage', {
            sender: 'СИСТЕМА',
            text: `${player.username} применил ВЕТТО! Ситуация и таймер обновлены.`,
            isSystem: true
        });
        
        io.to(roomId).emit('updatePlayers', room.players); 
        socket.emit('updateModifiers', player.modifiers);

        startRoundTimer(roomId, false);
    });

    socket.on('useSecondChance', ({ roomId }) => {
        const room = rooms[roomId];
        if (!room || room.gameState !== 'selection') return;
        const player = room.players.find(p => p.id === socket.id);
        if (!player || !player.modifiers.secondChance) return;

        player.modifiers.secondChance = false;
        
        const newHand = dealCards(room, 5);
        player.hand = newHand;

        socket.emit('updateHand', newHand);
        socket.emit('updateModifiers', player.modifiers);
        
        io.to(roomId).emit('updatePlayers', room.players);

        io.to(roomId).emit('chatMessage', {
            sender: 'СИСТЕМА',
            text: `${player.username} сбросил карты! Таймер обновлен.`,
            isSystem: true
        });

        startRoundTimer(roomId, false);
    });

    socket.on('updateSettings', ({ roomId, withBots, activeDecks }) => {
        const room = rooms[roomId];
        if (room) {
            room.withBots = withBots;
            room.activeDecks = activeDecks && activeDecks.length > 0 ? activeDecks : ['everyday'];
            if (room.withBots && room.gameState === 'lobby') {
                ensureMinimumPlayers(room);
            }
            io.to(roomId).emit('syncSettings', { withBots: room.withBots, activeDecks: room.activeDecks });
            io.to(roomId).emit('updatePlayers', room.players);
        }
    });

    socket.on('startGame', (roomId) => {
        const room = rooms[roomId];
        if (!room) return;
        room.lastActive = Date.now();

        if (room.withBots) ensureMinimumPlayers(room);

        if (room.players.length >= 3) {
            room.currentRound = 0;
            room.usedScenarios = [];
            startRound(roomId);
        }
    });

    socket.on('submitCard', ({ roomId, card }) => {
        const room = rooms[roomId];
        if (!room || room.gameState !== 'selection') return;
        room.lastActive = Date.now();
        if (room.submissions.find(s => s.playerId === socket.id)) return;

        processSubmission(room, socket.id, card);
        checkRoundEnd(roomId);
    });

    socket.on('declareDraw', ({ roomId }) => {
        const room = rooms[roomId];
        if (!room || room.gameState !== 'judging') return;
        room.lastActive = Date.now();
        
        clearTimeout(room.timer);
        room.players.forEach(p => p.winStreak = 0);

        room.submissions.forEach(sub => {
            const player = room.players.find(p => p.id === sub.playerId);
            if (player) player.score += 1;
        });

        finishRound(roomId, 'ДРУЖБА (НИЧЬЯ)', '/memes/1.png', true); 
    });

    socket.on('chooseWinner', ({ roomId, winnerSocketId }) => {
        const room = rooms[roomId];
        if (!room || room.gameState !== 'judging') return;
        room.lastActive = Date.now();
        
        clearTimeout(room.timer);
        resolveWinner(roomId, winnerSocketId);
    });

    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            const room = rooms[roomId];
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            
            if (playerIndex !== -1) {
                const leavingPlayer = room.players[playerIndex];
                
                if (room.gameState === 'lobby') {
                    room.players.splice(playerIndex, 1);
                } else {
                    const botName = `${leavingPlayer.username} (Бот)`;
                    const bot = {
                        id: `bot-replace-${Date.now()}`,
                        username: botName,
                        score: leavingPlayer.score,
                        isBot: true,
                        hand: leavingPlayer.hand,
                        avatar: leavingPlayer.avatar,
                        title: leavingPlayer.title,
                        winStreak: leavingPlayer.winStreak,
                        modifiers: { veto: false, secondChance: false }
                    };
                    room.players[playerIndex] = bot;
                    
                    if (room.currentJudgeIndex === playerIndex) {
                        setTimeout(() => checkRoundEnd(roomId), 1000); 
                    }
                }

                io.to(roomId).emit('updatePlayers', room.players);
                
                const humanCount = room.players.filter(p => !p.isBot).length;
                if (humanCount === 0) delete rooms[roomId];
            }
        }
    });
});

// АВТО-ОЧИСТКА
const CLEANUP_INTERVAL = 60 * 60 * 1000; 
const MAX_ROOM_LIFETIME = 2 * 60 * 60 * 1000; 

setInterval(() => {
    const now = Date.now();
    for (const roomId in rooms) {
        const room = rooms[roomId];
        const lastActive = room.lastActive || 0; 
        const isInactive = (now - lastActive) > MAX_ROOM_LIFETIME;
        const humanCount = room.players.filter(p => !p.isBot).length;

        if (humanCount === 0 || isInactive) {
            if (room.timer) clearTimeout(room.timer);
            delete rooms[roomId];
        }
    }
    if (global.gc) global.gc();
}, CLEANUP_INTERVAL);

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

function calculateTitles(room) {
    if (room.players.length === 0) return;
    const maxScore = Math.max(...room.players.map(p => p.score));
    const minScore = Math.min(...room.players.map(p => p.score));
    
    room.players.forEach((p, index) => {
        p.title = ''; 
        if (index === room.currentJudgeIndex) { p.title = '⚖️ Судья'; return; }
        if (p.winStreak >= 2) { p.title = '🔥 Тащер'; return; }
        if (p.score === maxScore && p.score > 0) { p.title = '👑 Лидер'; return; }
        if (p.score === minScore && room.currentRound > 3) { p.title = '🤡 Нуб'; return; }
        if (!p.title) p.title = 'Игрок';
    });
}

function ensureMinimumPlayers(room) {
    let botCounter = 1;
    while (room.players.length < 3) {
        const botName = `Бот ${botCounter}`;
        room.players.push({
            id: `bot-${Date.now()}-${botCounter}`,
            username: botName,
            score: 0,
            isBot: true,
            hand: dealCards(room, 5),
            avatar: `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${botName}`,
            title: '🤖 Бот',
            winStreak: 0,
            modifiers: { veto: false, secondChance: false }
        });
        botCounter++;
    }
}

function processSubmission(room, playerId, card) {
    const player = room.players.find(p => p.id === playerId);
    if (!player) return;

    room.submissions.push({ playerId: player.id, card: card, username: player.username });
    
    if (!card.startsWith('text:')) {
        player.hand = player.hand.filter(c => c !== card);
        const newCards = dealCards(room, 1);
        if (newCards.length > 0) player.hand.push(newCards[0]);
    }
}

function checkRoundEnd(roomId) {
    const room = rooms[roomId];
    room.lastActive = Date.now();

    if (room.submissions.length === room.players.length - 1) {
        if (room.timer) clearTimeout(room.timer);

        room.gameState = 'judging';
        const judge = room.players[room.currentJudgeIndex];
        
        io.to(roomId).emit('gameState', {
            state: 'judging',
            scenario: room.currentScenario,
            scenarioCategory: getCategoryForScenario(room.currentScenario),
            submissions: room.submissions,
            judge: judge.username
        });
        
        startRoundTimer(roomId, true);

        if (judge.isBot) {
            setTimeout(() => {
                if (room.submissions.length > 0) {
                    const randomSub = room.submissions[Math.floor(Math.random() * room.submissions.length)];
                    resolveWinner(roomId, randomSub.playerId);
                }
            }, 3000);
        }
    } else {
        io.to(roomId).emit('updateSubmissionsCount', room.submissions.length);
    }
}

function resolveWinner(roomId, winnerId) {
    const room = rooms[roomId];
    if (room.timer) clearTimeout(room.timer); 
    
    room.players.forEach(p => {
        if (p.id === winnerId) {
            p.score += 1;
            p.winStreak += 1;
        } else {
            if (room.players[room.currentJudgeIndex].id !== p.id) p.winStreak = 0;
        }
    });

    const winner = room.players.find(p => p.id === winnerId);
    const winCard = room.submissions.find(s => s.playerId === winnerId)?.card;
    finishRound(roomId, winner ? winner.username : 'Никто', winCard, false);
}

function finishRound(roomId, winnerName, winCard, isDraw) {
    const room = rooms[roomId];
    room.gameState = 'result';
    calculateTitles(room);
    
    io.to(roomId).emit('roundResult', { winnerName, winningCard: winCard, players: room.players, isDraw });

    setTimeout(() => {
        if (room.currentRound >= room.maxRounds) {
            const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
            io.to(roomId).emit('gameOver', sortedPlayers);
        } else {
            room.currentJudgeIndex = (room.currentJudgeIndex + 1) % room.players.length;
            calculateTitles(room);
            io.to(roomId).emit('updatePlayers', room.players);
            startRound(roomId);
        }
    }, 5000);
}

function startRound(roomId) {
    const room = rooms[roomId];
    if (!room) return;
    room.lastActive = Date.now();

    room.currentRound++;
    room.gameState = 'selection';
    room.submissions = [];

    let pool = [];
    room.activeDecks.forEach(deckId => {
        if (SCENARIO_DECKS[deckId]) pool.push(...SCENARIO_DECKS[deckId]);
    });
    if (pool.length === 0) pool = SCENARIO_DECKS['everyday'];

    const available = pool.filter(s => !room.usedScenarios.includes(s));
    room.currentScenario = available.length > 0 
        ? available[Math.floor(Math.random() * available.length)] 
        : pool[Math.floor(Math.random() * pool.length)];
    
    room.usedScenarios.push(room.currentScenario);

    const judge = room.players[room.currentJudgeIndex];

    io.to(roomId).emit('newRound', {
        roundNumber: room.currentRound,
        totalRounds: room.maxRounds,
        judgeId: judge.id,
        judgeName: judge.username,
        scenario: room.currentScenario,
        scenarioCategory: getCategoryForScenario(room.currentScenario),
        hands: room.players.map(p => ({ id: p.id, hand: p.hand }))
    });

    startRoundTimer(roomId, false);

    if (room.withBots) {
        room.players.forEach(p => {
            if (p.isBot && p.id !== judge.id) {
                const delay = 2000 + Math.random() * 3000;
                setTimeout(() => {
                    if (room.gameState === 'selection') {
                        const randomCard = p.hand[Math.floor(Math.random() * p.hand.length)];
                        processSubmission(room, p.id, randomCard);
                        checkRoundEnd(roomId);
                    }
                }, delay);
            }
        });
    }
}

function startRoundTimer(roomId, isJudgingPhase = false) {
    const room = rooms[roomId];
    if (!room) return;

    if (room.timer) clearTimeout(room.timer);

    room.timerStartTimestamp = Date.now(); 
    io.to(roomId).emit('timerStart', { duration: TURN_TIMER_SECONDS });

    room.timer = setTimeout(() => {
        if (isJudgingPhase) {
            handleJudgingTimeout(roomId);
        } else {
            handleSelectionTimeout(roomId);
        }
    }, TURN_TIMER_SECONDS * 1000);
}

function handleSelectionTimeout(roomId) {
    const room = rooms[roomId];
    if (!room || room.gameState !== 'selection') return;

    const judgeId = room.players[room.currentJudgeIndex].id;
    
    room.players.forEach(player => {
        if (player.id !== judgeId && !room.submissions.find(s => s.playerId === player.id)) {
            if (player.hand.length > 0) {
                const randomCard = player.hand[Math.floor(Math.random() * player.hand.length)];
                processSubmission(room, player.id, randomCard);
            }
        }
    });
    checkRoundEnd(roomId);
}

function handleJudgingTimeout(roomId) {
    const room = rooms[roomId];
    if (!room || room.gameState !== 'judging') return;

    if (room.submissions.length > 0) {
        const randomSub = room.submissions[Math.floor(Math.random() * room.submissions.length)];
        resolveWinner(roomId, randomSub.playerId);
    } else {
        finishRound(roomId, 'Время вышло', null, true);
    }
}

function dealCards(room, count) {
    const cards = [];
    for (let i = 0; i < count; i++) {
        if (room.deck.length === 0) room.deck = [...MEME_CARDS].sort(() => Math.random() - 0.5);
        if (room.deck.length > 0) cards.push(room.deck.pop());
    }
    return cards;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
