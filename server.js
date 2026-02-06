const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// === БАЗА ВОПРОСОВ (КОНТЕНТ) ===

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
    "Я, когда пришел домой и наконец-то снял неудобную обувь"
    // ... Сюда можно добавлять еще, хоть до 1000
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
    // ... Добавь сюда еще пошлых ситуаций
];

// Генерация картинок (предполагаем 30 штук)
const TOTAL_IMAGES = 30; 
const MEME_CARDS = Array.from({ length: TOTAL_IMAGES }, (_, i) => `/memes/${i + 1}.jpg`);

const rooms = {};

io.on('connection', (socket) => {
    
    // Вход в комнату + Настройка режима
    socket.on('joinRoom', ({ username, roomId, isNsfw }) => {
        socket.join(roomId);
        
        if (!rooms[roomId]) {
            // Создаем новую комнату
            rooms[roomId] = {
                players: [],
                gameState: 'lobby',
                currentJudgeIndex: 0,
                currentScenario: '',
                currentRound: 0,
                maxRounds: 9,           // <--- 9 Раундов
                isNsfw: isNsfw || false, // <--- Режим NSFW
                submissions: [],
                usedScenarios: [],       // <--- Чтобы вопросы не повторялись
                deck: [...MEME_CARDS].sort(() => Math.random() - 0.5)
            };
        }

        const room = rooms[roomId];
        
        // Если игрок уже был, не добавляем дубль (упрощено)
        if (!room.players.find(p => p.id === socket.id)) {
            room.players.push({
                id: socket.id,
                username,
                score: 0,
                hand: dealCards(room.deck, 5)
            });
        }

        io.to(roomId).emit('updatePlayers', room.players);
        
        // Отправляем инфу о режиме комнаты всем
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

        // Проверка на дубли (один игрок - одна карта)
        if (room.submissions.find(s => s.playerId === socket.id)) return;

        room.submissions.push({
            playerId: socket.id,
            card: card,
            username: room.players.find(p => p.id === socket.id).username
        });

        // Обмен карты
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
        if (room.gameState !== 'judging') return;

        const winner = room.players.find(p => p.id === winnerSocketId);
        if (winner) winner.score += 1;

        room.gameState = 'result';
        io.to(roomId).emit('roundResult', {
            winnerName: winner ? winner.username : 'Никто',
            winningCard: room.submissions.find(s => s.playerId === winnerSocketId)?.card,
            players: room.players // Отправляем обновленный счет
        });

        setTimeout(() => {
            // Проверка на конец игры
            if (room.currentRound >= room.maxRounds) {
                // Сортировка по очкам (от большего к меньшему)
                const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
                io.to(roomId).emit('gameOver', sortedPlayers);
                // Сброс игры или удаление комнаты можно делать тут
                delete rooms[roomId]; 
            } else {
                room.currentJudgeIndex = (room.currentJudgeIndex + 1) % room.players.length;
                startRound(roomId);
            }
        }, 5000);
    });
    
    socket.on('disconnect', () => {
        // Упрощенная логика очистки
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

    // === ВЫБОР УНИКАЛЬНОГО ВОПРОСА ===
    let pool = room.isNsfw 
        ? [...SCENARIOS_NORMAL, ...SCENARIOS_NSFW] // Смешиваем если NSFW
        : SCENARIOS_NORMAL; // Только обычные
    
    // Фильтруем те, что уже были
    const available = pool.filter(s => !room.usedScenarios.includes(s));
    
    if (available.length === 0) {
        // Если вопросы кончились, сбрасываем историю (или игра заканчивается)
        room.usedScenarios = [];
        room.currentScenario = pool[Math.floor(Math.random() * pool.length)];
    } else {
        room.currentScenario = available[Math.floor(Math.random() * available.length)];
    }
    
    room.usedScenarios.push(room.currentScenario);
    // ==================================

    if (room.deck.length < room.players.length) {
        room.deck = [...MEME_CARDS].sort(() => Math.random() - 0.5);
    }

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
