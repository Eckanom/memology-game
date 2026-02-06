const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// === БАЗА ДАННЫХ ВОПРОСОВ ===
const SCENARIOS_NORMAL = [
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
    "Когда ты идешь, спотыкаешься, и делаешь вид, что так и было задумано",
    "Тот момент, когда ты поздоровался с человеком, а он не тебе",
    "Когда ты придерживаешь дверь, а человек идет слишком медленно",
    "Твое лицо, когда ты видишь свои детские фотографии",
    "Когда ты пытаешься убить комара в темноте",
    "Когда ты идешь в туалет без телефона и приходится читать состав освежителя",
    "Твое лицо, когда кто-то заходит в твою комнату и не закрывает дверь",
    "Когда ты слышишь, как кто-то обсуждает тебя за спиной",
    "Тот момент, когда ты понимаешь, что завтра понедельник",
    "Когда ты пытаешься вспомнить, закрыл ли ты машину",
    "Твое лицо, когда кто-то берет твой телефон посмотреть одно фото и начинает листать",
    "Когда ты опаздываешь, и шнурки развязываются, а ключи падают",
    "Когда ты пытаешься не засмеяться в самый неподходящий момент",
    "Твое лицо, когда тебе подарили носки на День рождения",
    "Когда кто-то спрашивает: «Ты спишь?», а ты только что уснул",
    "Тот момент, когда ты понимаешь, что забыл наушники дома",
    "Когда ты пытаешься объяснить родителям, как пользоваться смартфоном",
    "Твое лицо, когда ты видишь, как кто-то ест пиццу с ананасами",
    "Когда ты на диете, и кто-то приносит торт",
    "Твое лицо, когда ты видишь паука в ванной",
    "Когда ты пытаешься втянуть живот для фото",
    "Тот момент, когда ты случайно лайкнул фото бывшей трехлетней давности",
    "Когда ты пытаешься сделать вид, что понимаешь шутку, но не понимаешь",
    "Твое лицо, когда кто-то говорит «ихний» или «вообщем»"
];

const SCENARIOS_NSFW = [
    "Твое лицо, когда увидела размер 'инструмента' и передумала",
    "Когда родители зашли в комнату без стука в 'тот самый' момент",
    "Я, когда пытаюсь удалить историю браузера быстрее скорости света",
    "Твое лицо, когда он предложил 'попробовать с заднего входа'",
    "Когда случайно отправил нюдс в рабочий чат",
    "Я, читающий описание товаров в секс-шопе",
    "Когда она сказала 'глубже', но длины уже не хватает",
    "Твое лицо, когда узнал, что бывшая стала вебкам-моделью",
    "Когда сосед за стеной слишком громко стонет",
    "Я, когда пытаюсь найти 'то самое' видео на Pornhub",
    "Когда презерватив порвался",
    "Твое лицо, когда тебе предложили тройничок, но третий — твой друг",
    "Когда она просит шлепнуть ее, а ты боишься сделать больно",
    "Я, когда увидел, что кто-то смотрит мое порно через отражение в очках",
    "Когда Tinder свидание оказалось совсем не как на фото",
    "Твое лицо, когда он кончил за 30 секунд и спросил 'Тебе понравилось?'",
    "Когда нашел игрушки у родителей в спальне",
    "Я, когда мне присылают дикпик без предупреждения",
    "Когда решил попробовать ролевые игры, но стало просто смешно",
    "Твое лицо, когда гинеколог оказался твоим бывшим одноклассником",
    "Когда утром проснулся с кем-то и не помнишь имя",
    "Я, когда мне предлагают 'дружбу с привилегиями'",
    "Когда во время секса свело ногу",
    "Твое лицо, когда тебе сказали 'мы не предохранялись, но я успел вытащить'",
    "Когда увидел татуировку с именем бывшего на пояснице",
    "Я, когда меня спрашивают про количество половых партнеров",
    "Когда случайно включил порно со звуком на всю квартиру",
    "Твое лицо, когда тебе предложили снять хоум-видео",
    "Когда она делает минет зубами",
    "Я, когда пытаюсь стянуть узкие джинсы перед сексом"
];

// УВЕЛИЧИЛИ ДО 50
const TOTAL_IMAGES = 50; 
const MEME_CARDS = Array.from({ length: TOTAL_IMAGES }, (_, i) => `/memes/${i + 1}.jpg`);

const rooms = {};

io.on('connection', (socket) => {
    socket.on('joinRoom', ({ username, roomId, isNsfw }) => {
        socket.join(roomId);
        if (!rooms[roomId]) {
            rooms[roomId] = {
                players: [],
                gameState: 'lobby',
                currentJudgeIndex: 0,
                currentScenario: '',
                currentRound: 0, 
                maxRounds: 9,
                isNsfw: isNsfw || false,
                submissions: [],
                usedScenarios: [],
                deck: [...MEME_CARDS].sort(() => Math.random() - 0.5)
            };
            console.log(`Room ${roomId} created. NSFW: ${isNsfw}`);
        }
        const room = rooms[roomId];
        const existingPlayer = room.players.find(p => p.id === socket.id);
        if (!existingPlayer) {
            room.players.push({
                id: socket.id,
                username,
                score: 0,
                hand: dealCards(room.deck, 5)
            });
        }
        io.to(roomId).emit('updatePlayers', room.players);
        io.to(roomId).emit('roomSettings', { isNsfw: room.isNsfw });
    });

    socket.on('startGame', (roomId) => {
        const room = rooms[roomId];
        if (room && room.players.length >= 3) {
            room.currentRound = 0;
            room.usedScenarios = [];
            startRound(roomId);
        }
    });

    socket.on('submitCard', ({ roomId, card }) => {
        const room = rooms[roomId];
        if (!room || room.gameState !== 'selection') return;
        if (room.submissions.find(s => s.playerId === socket.id)) return;

        room.submissions.push({
            playerId: socket.id,
            card: card,
            username: room.players.find(p => p.id === socket.id).username
        });
        const player = room.players.find(p => p.id === socket.id);
        player.hand = player.hand.filter(c => c !== card);
        const newCard = dealCards(room.deck, 1)[0];
        if (newCard) player.hand.push(newCard);

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
        if (!room || room.gameState !== 'judging') return;
        const winner = room.players.find(p => p.id === winnerSocketId);
        if (winner) winner.score += 1;

        room.gameState = 'result';
        io.to(roomId).emit('roundResult', {
            winnerName: winner ? winner.username : 'Никто',
            winningCard: room.submissions.find(s => s.playerId === winnerSocketId)?.card,
            players: room.players
        });

        setTimeout(() => {
            if (room.currentRound >= room.maxRounds) {
                const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
                io.to(roomId).emit('gameOver', sortedPlayers);
                delete rooms[roomId];
            } else {
                room.currentJudgeIndex = (room.currentJudgeIndex + 1) % room.players.length;
                startRound(roomId);
            }
        }, 5000);
    });

    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            const room = rooms[roomId];
            room.players = room.players.filter(p => p.id !== socket.id);
            io.to(roomId).emit('updatePlayers', room.players);
            if (room.players.length === 0) delete rooms[roomId];
        }
    });
});

function startRound(roomId) {
    const room = rooms[roomId];
    if (!room) return;
    room.currentRound++;
    room.gameState = 'selection';
    room.submissions = [];
    let pool = room.isNsfw ? [...SCENARIOS_NORMAL, ...SCENARIOS_NSFW] : SCENARIOS_NORMAL;
    const available = pool.filter(s => !room.usedScenarios.includes(s));
    
    if (available.length === 0) {
        room.usedScenarios = [];
        room.currentScenario = pool[Math.floor(Math.random() * pool.length)];
    } else {
        room.currentScenario = available[Math.floor(Math.random() * available.length)];
    }
    room.usedScenarios.push(room.currentScenario);

    const judge = room.players[room.currentJudgeIndex];

    io.to(roomId).emit('newRound', {
        roundNumber: room.currentRound,
        totalRounds: room.maxRounds,
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
        else cards.push("/memes/1.jpg");
    }
    return cards;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
