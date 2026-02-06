const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Раздаем файлы из папки public
app.use(express.static(path.join(__dirname, 'public')));

// === КОНТЕНТ ИГРЫ ===

// 1. Сценарии (Текстовые карточки)
const SCENARIOS = [
    "Твое лицо, когда случайно лайкнул фото бывшей 2015 года",
    "Когда начальник шутит, а ты очень хочешь повышения",
    "Я, когда пытаюсь вспомнить пароль, который 'точно запомню'",
    "Когда в зуме забыл выключить микрофон и начал обсуждать коллегу",
    "Тот самый друг, который 'знает короткую дорогу'",
    "Мое состояние после 5 минут работы в понедельник",
    "Когда кто-то говорит 'нам надо серьезно поговорить'",
    "Я смотрю на свой код, который написал неделю назад",
    "Когда курьер с едой звонит в дверь",
    "Твое лицо, когда банкомат съел карту, а за тобой очередь",
    "Когда случайно открыл фронтальную камеру с похмелья",
    "Я: 'Ложусь спать пораньше'. Я в 3 часа ночи:",
    "Когда увидел цены на такси в дождь",
    "Тот момент, когда зарплата пришла и сразу ушла на кредиты",
    "Когда бабушка спрашивает, когда уже будут внуки",
    "Я, объясняющий маме, как отправить фото в Ватсапе",
    "Когда друг говорит 'я уже подхожу', а сам только вышел из душа",
    "Лицо кота, когда ты чихнул слишком громко",
    "Когда удалил важное сообщение не у себя, а у обоих",
    "Попытка выглядеть трезвым перед фейс-контролем",
    "Когда тебе 25, но спина болит как у деда",
    "Я, когда увидел свой голос на видеозаписи"
];

// 2. Генерация колоды картинок
// В папке public/memes должны лежать файлы 1.jpg, 2.jpg ... 30.jpg
const TOTAL_IMAGES = 30; 
const MEME_CARDS = Array.from({ length: TOTAL_IMAGES }, (_, i) => `/memes/${i + 1}.jpg`);

// === ЛОГИКА ИГРЫ ===

const rooms = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('joinRoom', ({ username, roomId }) => {
        socket.join(roomId);
        
        if (!rooms[roomId]) {
            rooms[roomId] = {
                players: [],
                gameState: 'lobby',
                currentJudgeIndex: 0,
                currentScenario: '',
                submissions: [],
                deck: [...MEME_CARDS].sort(() => Math.random() - 0.5)
            };
        }

        const room = rooms[roomId];
        const player = {
            id: socket.id,
            username,
            score: 0,
            hand: dealCards(room.deck, 5)
        };
        room.players.push(player);

        io.to(roomId).emit('updatePlayers', room.players);
        
        if (room.gameState !== 'lobby') {
            socket.emit('gameState', room);
        }
    });

    socket.on('startGame', (roomId) => {
        const room = rooms[roomId];
        if (room && room.players.length >= 3) {
            startRound(roomId);
        }
    });

    socket.on('submitCard', ({ roomId, card }) => {
        const room = rooms[roomId];
        if (!room || room.gameState !== 'selection') return;

        const judgeId = room.players[room.currentJudgeIndex].id;
        if (socket.id === judgeId) return;

        if (room.submissions.find(s => s.playerId === socket.id)) return;

        room.submissions.push({
            playerId: socket.id,
            card: card,
            username: room.players.find(p => p.id === socket.id).username
        });

        // Выдаем новую карту
        const player = room.players.find(p => p.id === socket.id);
        player.hand = player.hand.filter(c => c !== card);
        player.hand.push(dealCards(room.deck, 1)[0]);

        if (room.submissions.length === room.players.length - 1) {
            room.gameState = 'judging';
            io.to(roomId).emit('gameState', {
                state: 'judging',
                scenario: room.currentScenario,
                submissions: room.submissions,
                judge: room.players[room.currentJudgeIndex].username
            });
        } else {
            io.to(roomId).emit('updateSubmissionsCount', room.submissions.length);
        }
    });

    socket.on('chooseWinner', ({ roomId, winnerSocketId }) => {
        const room = rooms[roomId];
        const judgeId = room.players[room.currentJudgeIndex].id;
        if (socket.id !== judgeId || room.gameState !== 'judging') return;

        const winner = room.players.find(p => p.id === winnerSocketId);
        if (winner) winner.score += 1;

        room.gameState = 'result';
        io.to(roomId).emit('roundResult', {
            winnerName: winner ? winner.username : 'Никто',
            winningCard: room.submissions.find(s => s.playerId === winnerSocketId)?.card,
            players: room.players
        });

        setTimeout(() => {
            room.currentJudgeIndex = (room.currentJudgeIndex + 1) % room.players.length;
            startRound(roomId);
        }, 6000);
    });

    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            const room = rooms[roomId];
            const index = room.players.findIndex(p => p.id === socket.id);
            if (index !== -1) {
                room.players.splice(index, 1);
                io.to(roomId).emit('updatePlayers', room.players);
                if (room.players.length === 0) delete rooms[roomId];
            }
        }
    });
});

function startRound(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    room.gameState = 'selection';
    room.submissions = [];
    room.currentScenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
    
    if (room.deck.length < room.players.length) {
        room.deck = [...MEME_CARDS].sort(() => Math.random() - 0.5);
    }

    const judge = room.players[room.currentJudgeIndex];

    io.to(roomId).emit('newRound', {
        judgeId: judge.id,
        judgeName: judge.username,
        scenario: room.currentScenario,
        hands: room.players.map(p => ({ id: p.id, hand: p.hand }))
    });
}

function dealCards(deck, count) {
    const cards = [];
    for (let i = 0; i < count; i++) {
        if (deck.length > 0) cards.push(deck.pop());
        else cards.push("/memes/1.jpg"); // Заглушка, если карты кончились
    }
    return cards;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
