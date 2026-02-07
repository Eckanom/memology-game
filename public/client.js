// ... (Весь код до функции revealCards остается прежним) ...

function performRip(packIndex, price) {
    playerCoins -= price;
    localStorage.setItem('memeCoins', playerCoins);
    updateCoinDisplay();

    document.querySelector('.close-pack-btn').style.display = 'none';
    playSound('rip');
    const strip = document.getElementById('tear-strip');
    const pack = document.getElementById('animated-pack');
    
    strip.style.display = 'none'; 
    
    // Пак уезжает, карты появляются чуть быстрее
    setTimeout(() => {
        pack.classList.add('pack-slide-down');
        setTimeout(() => {
            revealCards(packIndex);
        }, 300); // 300мс задержка
    }, 200);
}

// === ОБНОВЛЕННАЯ ЛОГИКА ОТКРЫТИЯ (10 КАРТ) ===
function revealCards(packIndex) {
    const container = document.getElementById('revealed-cards');
    container.style.display = 'grid'; // Важно: grid, а не flex
    container.innerHTML = ''; // Очистка
    
    const startImg = packIndex * 10 + 1; // Начало пака (1, 11, 21...)
    
    // Генерируем 10 карт
    for(let i=0; i<10; i++) {
        const imgNum = startImg + i;
        const card = document.createElement('div');
        card.className = 'revealed-card';
        card.innerHTML = `<img src="/memes/${imgNum}.jpg">`;
        
        if (i === 9) {
            // === 10-я КАРТА (ФИНАЛЬНАЯ) ===
            // Задержка 2 секунды
            card.style.animationDelay = '2s'; 
            // Добавим отдельный звук для редкой карты (опционально)
            setTimeout(() => playSound('win'), 2000); 
        } else {
            // === ОБЫЧНЫЕ КАРТЫ (1-9) ===
            // Появляются быстро друг за другом
            card.style.animationDelay = `${i * 0.1}s`;
        }
        
        container.appendChild(card);
    }

    // Звук обычного высыпания монет/карт сразу
    playSound('coins'); 
    
    // Сохраняем покупку
    ownedPacks.push(packIndex);
    localStorage.setItem('ownedPacks', JSON.stringify(ownedPacks));
    
    // Кнопка "Забрать" появляется только после 10-й карты (через 2.5 сек)
    setTimeout(() => {
        document.getElementById('collect-btn').style.display = 'block';
    }, 2500);
}

function closePackOpening() {
    document.getElementById('pack-opening-overlay').style.display = 'none';
    renderShop();
}

// ... (Остальной код без изменений) ...
