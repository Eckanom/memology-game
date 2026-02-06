const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Раздача статики
app.use(express.static(path.join(__dirname, 'public')));

// === БАЗА ДАННЫХ ВОПРОСОВ ===

const SCENARIOS_NORMAL = [
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
    "Я, когда увидел свой голос на видеозаписи",
    "Когда официант говорит 'Приятного аппетита', а ты отвечаешь 'Тебе тоже'",
    "Когда пытаешься тихо открыть упаковку чипсов ночью",
    "Мое лицо, когда кто-то разогревает рыбу в офисной микроволновке",
    "Когда осознал, что завтра снова понедельник",
    "Я, когда друг показывает несмешной мем, но я пытаюсь быть вежливым",
    "Когда надел наушники, но забыл включить музыку и слышишь чье-то дыхание",
    "Твое лицо, когда консультант в магазине спрашивает 'Вам помочь?'",
    "Когда решил начать новую жизнь с понедельника, но сегодня среда",
    "Я, когда вижу цены на аренду квартир",
    "Когда кто-то берет твою еду без спроса",
    "Тот неловкий момент, когда помахал незнакомцу, думая, что это друг",
    "Когда переслушиваешь свое голосовое сообщение перед отправкой",
    "Я на семейном застолье, когда зашла речь о политике",
    "Когда на кассе отменили товар, и ты ждешь 'Галю'",
    "Твое лицо, когда интернет пропал в самый важный момент катки",
    "Когда увидел себя в зеркале примерочной с ужасным светом",
    "Я, пытающийся понять современный сленг",
    "Когда таксист начал рассказывать про свой бизнес",
    "Твое лицо, когда кто-то кашлянул в автобусе в 2020 году",
    "Когда учитель вызывает к доске, а ты даже не открывал учебник",
    "Я, когда пытаюсь не засмеяться в серьезной ситуации",
    "Когда тебе подарили носки на день рождения",
    "Тот момент, когда телефон падает на лицо, пока лежишь",
    "Когда кто-то говорит, что не любит пиццу",
    "Я, вычисляющий, сколько часов сна осталось, если лечь прямо сейчас",
    "Когда увидел спойлер к любимому сериалу",
    "Твое лицо, когда родители добавили тебя в друзья в соцсетях",
    "Когда пытаешься вспомнить имя человека, с которым общаешься 10 минут",
    "Я, когда кто-то трогает мой монитор пальцами",
    "Когда на вечеринке включили музыку, которая нравится только тебе",
    "Твое лицо, когда сказали, что дедлайны сдвинули на неделю вперед",
    "Когда выиграл в споре в интернете",
    "Я, когда пришел домой и наконец-то снял неудобную обувь",
    "Когда просят скинуться на подарок коллеге, которого ты не знаешь",
    "Твое лицо, когда кот смотрит в пустой угол и шипит",
    "Когда случайно наступил на лего",
    "Я, когда пытаюсь объяснить парикмахеру, что мне не нравится стрижка",
    "Когда в кинотеатре кто-то чавкает попкорном",
    "Твое лицо, когда увидел свои старые посты в соцсетях"
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
    "Я, когда пытаюсь стянуть узкие джинсы перед сексом",
    "Тот момент, когда забыл купить смазку и используешь слюну",
    "Когда тебя застали за мастурбацией",
    "Твое лицо, когда партнер предлагает БДСМ, а ты боишься боли",
    "Когда увидел, что он подписан на OnlyFans твоей сестры",
    "Я, когда пытаюсь сделать сексуальное лицо, но выгляжу как идиот"
];

// Генерация ссылок на картинки (предполагаем 30 штук в папке public/memes)
const TOTAL_IMAGES = 30; 
const MEME_CARDS = Array.from({ length: TOTAL_IMAGES }, (_, i) => `/memes/${i + 1}.jpg`);

// === ИГРОВАЯ ЛОГИКА ===

const rooms = {};

io.on('connection', (socket) => {
    
    // Вход и создание комнаты
    socket.on('joinRoom', ({ username, roomId, isNsfw }) => {
        socket.join(roomId);
        
        if (!rooms[roomId]) {
            rooms[roomId] = {
                players: [],
                gameState: 'lobby',
                currentJudgeIndex: 0,
                currentScenario: '',
                currentRound: 0, 
                maxRounds: 9,           // Максимум 9 раундов
                isNsfw: isNsfw || false, // Режим 18+
                submissions: [],
                usedScenarios: [],       // История вопросов
                deck: [...MEME_CARDS].sort(() => Math.random() - 0.5)
            };
            console.log(`[LOG] Комната ${roomId} создана. NSFW: ${isNsfw}`);
        }

        const room = rooms[roomId];
        
        // Защита от дубликатов игроков
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

    // Старт игры
    socket.on('startGame', (roomId) => {
        const room = rooms[roomId];
        if (room && room.players.length >= 3) {
            room.currentRound = 0;
            room.usedScenarios = [];
            startRound(roomId);
        }
    });

    // Игрок делает ход
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

    // Судья выбирает победителя
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

        // Задержка перед следующим раундом или концом игры
        setTimeout(() => {
            // Если раундов >= 9, заканчиваем игру
            if (room.currentRound >= room.maxRounds) {
                console.log(`[LOG] Комната ${roomId}: Игра завершена`);
                const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
                io.to(roomId).emit('gameOver', sortedPlayers);
                // Удаляем комнату, чтобы освободить память (или сбрасываем)
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

// Функция начала раунда
function startRound(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    room.currentRound++; // Увеличиваем счетчик раунда
    console.log(`[LOG] Комната ${roomId}: Раунд ${room.currentRound}/${room.maxRounds}`);

    room.gameState = 'selection';
    room.submissions = [];

    // Выбор пула вопросов
    let pool = room.isNsfw 
        ? [...SCENARIOS_NORMAL, ...SCENARIOS_NSFW] 
        : SCENARIOS_NORMAL;
    
    // Исключаем повторы
    const available = pool.filter(s => !room.usedScenarios.includes(s));
    
    if (available.length === 0) {
        // Если вопросы кончились, сбрасываем историю
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
        else cards.push("/memes/1.jpg"); // Заглушка
    }
    return cards;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
