const keyboardLayout = {
    row1: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    row2: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    row3: ['z', 'x', 'c', 'v', 'b', 'n', 'm']
};

let currentWord = '';
let currentPinyin = '';
let displayedChars = [];
let keyPressCount = {};
let animationTimer = null;
let switchTimer = null;
let isPlaying = true;
let wordDisplay = null;
let wordDisplayWrapper = null;
let searchResults = null;
let matchedWords = [];

const config = {
    typeSpeed: 300,
    deleteSpeed: 200,
    pauseBeforeDelete: 700,
    pauseBeforeNextWord: 220
};

function resetKeyboard() {
    document.querySelectorAll('.key').forEach(key => {
        key.classList.remove('active', 'twice');
    });
    keyPressCount = {};
}

function stopAnimation() {
    clearTimers();
    resetKeyboard();
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    if (searchResults) {
        searchResults.classList.remove('open');
    }
}

function togglePlayPause() {
    const btn = document.getElementById('playPauseBtn');
    const playIcon = document.getElementById('playIcon');
    const searchInput = document.getElementById('searchInput');
    
    isPlaying = !isPlaying;
    
    if (isPlaying) {
        btn.classList.add('playing');
        playIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
        wordDisplay.classList.remove('search-mode');
        wordDisplayWrapper.classList.remove('search-mode');
        if (searchResults) searchResults.classList.remove('open');
        selectRandomWord();
    } else {
        btn.classList.remove('playing');
        playIcon.innerHTML = '<polygon points="5,3 19,12 5,21"/>';
        stopAnimation();
        wordDisplay.classList.add('search-mode');
        wordDisplayWrapper.classList.add('search-mode');
        searchInput.value = '';
        searchInput.focus();
        updateInfoText();
    }
}

function updateInfoText(matchCount = null) {
    const info = document.getElementById('info');
    const totalWords = wordList.length;
    
    if (!isPlaying) {
        if (matchCount !== null) {
            if (matchCount > 0) {
                info.textContent = `找到 ${matchCount} 个匹配 · 共 ${totalWords} 词`;
            } else {
                info.textContent = `未找到匹配 · 共 ${totalWords} 词`;
            }
        } else {
            info.textContent = `输入关键词搜索单词 · 共 ${totalWords} 词`;
        }
    } else {
        const filteredWords = getFilteredWordList();
        info.textContent = `共找到 ${filteredWords.length} 个符合条件的单词`;
    }
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    resetKeyboard();
    
    if (!query) {
        updateInfoText();
        if (searchResults) searchResults.classList.remove('open');
        return;
    }
    
    for (let i = 0; i < query.length; i++) {
        const char = query[i];
        if (/[a-z]/.test(char)) {
            const keyElement = document.querySelector(`[data-key="${char}"]`);
            if (keyElement) {
                const alreadyActive = keyElement.classList.contains('active');
                keyElement.classList.add('active');
                if (alreadyActive) {
                    keyElement.classList.add('twice');
                }
            }
        }
    }
    
    matchedWords = wordList.filter(word => {
        const { display: d, pinyin: p } = parseWord(word);
        return d.toLowerCase().includes(query) || p.includes(query);
    });
    
    updateInfoText(matchedWords.length);
    renderSearchResults(matchedWords);
}

function renderSearchResults(words) {
    if (!searchResults) return;
    
    if (words.length === 0) {
        searchResults.classList.remove('open');
        return;
    }
    
    const displayCount = Math.min(words.length, 20);
    searchResults.innerHTML = words.slice(0, displayCount).map(word => {
        const { display, pinyin } = parseWord(word);
        const showPinyin = display !== pinyin;
        return `<div class="search-result-item" data-word="${word}">
            <span class="word">${display}</span>
            ${showPinyin ? `<span class="pinyin">${pinyin}</span>` : ''}
        </div>`;
    }).join('');
    
    if (words.length > displayCount) {
        searchResults.innerHTML += `<div class="search-result-item" style="justify-content: center; color: rgba(255,255,255,0.5); cursor: default;">还有 ${words.length - displayCount} 个结果...</div>`;
    }
}

function toggleSearchResults() {
    const btn = document.getElementById('searchToggleBtn');
    if (searchResults) {
        searchResults.classList.toggle('open');
        if (btn) {
            btn.classList.toggle('rotated', searchResults.classList.contains('open'));
        }
    }
}

function handleResultClick(e) {
    const item = e.target.closest('.search-result-item');
    if (!item) return;
    
    const word = item.dataset.word;
    if (!word) return;
    
    const { display, pinyin } = parseWord(word);
    const searchInput = document.getElementById('searchInput');
    searchInput.value = display;
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
}

function checkKeyboardDistribution(word) {
    const lowerWord = word.toLowerCase();
    const counts = {
        row1: 0,
        row2: 0,
        row3: 0
    };

    lowerWord.split('').forEach(char => {
        if (keyboardLayout.row1.includes(char)) counts.row1++;
        if (keyboardLayout.row2.includes(char)) counts.row2++;
        if (keyboardLayout.row3.includes(char)) counts.row3++;
    });

    return counts.row1 === 2 && counts.row2 === 2 && counts.row3 === 2;
}

function getFilteredWordList() {
    return wordList.filter(word => {
        const { pinyin } = parseWord(word);
        return pinyin.length === 6 && checkKeyboardDistribution(pinyin);
    });
}

function highlightKey(char) {
    const lowerChar = char.toLowerCase();
    const keyElement = document.querySelector(`[data-key="${lowerChar}"]`);
    
    if (keyElement) {
        const alreadyActive = keyElement.classList.contains('active');
        keyPressCount[lowerChar] = (keyPressCount[lowerChar] || 0) + 1;

        keyElement.classList.add('active');
        if (alreadyActive) {
            keyElement.classList.add('twice');
        }
    }
}

function parseWord(word) {
    if (word.includes('|')) {
        const [display, pinyin] = word.split('|');
        return { display, pinyin };
    }
    return { display: word, pinyin: word };
}

async function displayWord(word) {
    if (!isPlaying) return;
    
    resetKeyboard();
    const { display, pinyin } = parseWord(word);
    currentWord = word;
    currentPinyin = pinyin;
    displayedChars = [];
    keyPressCount = {};
    
    const wordContent = document.getElementById('wordContent');
    const info = document.getElementById('info');
    wordContent.textContent = '';
    info.textContent = '';

    await typeWord(display, pinyin);
    if (!isPlaying) return;
    
    await wait(config.pauseBeforeDelete);
    if (!isPlaying) return;
    
    await deleteWord(display);
}

function typeWord(display, pinyin) {
    return new Promise((resolve) => {
        let index = 0;
        
        function typeNext() {
            if (!isPlaying) {
                resolve();
                return;
            }
            if (index < display.length) {
                const char = display[index];
                const pinyinChar = pinyin[index];
                displayedChars.push(char);
                
                const wordContent = document.getElementById('wordContent');
                wordContent.textContent = displayedChars.join('');
                
                if (pinyinChar) {
                    highlightKey(pinyinChar);
                }
                
                index++;
                animationTimer = setTimeout(typeNext, config.typeSpeed);
            } else {
                resolve();
            }
        }

        typeNext();
    });
}

function deleteWord(display) {
    return new Promise((resolve) => {
        resetKeyboard();
        let index = display.length;
        
        function deleteNext() {
            if (!isPlaying) {
                resolve();
                return;
            }
            if (index > 0) {
                displayedChars.pop();
                
                const wordContent = document.getElementById('wordContent');
                wordContent.textContent = displayedChars.join('');
                
                index--;
                animationTimer = setTimeout(deleteNext, config.deleteSpeed);
            } else {
                resolve();
            }
        }

        deleteNext();
    });
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function clearTimers() {
    if (animationTimer) {
        clearTimeout(animationTimer);
        animationTimer = null;
    }
    if (switchTimer) {
        clearTimeout(switchTimer);
        switchTimer = null;
    }
}

async function selectRandomWord() {
    if (!isPlaying) return;
    
    clearTimers();
    
    const filteredWords = getFilteredWordList();
    
    if (filteredWords.length === 0) {
        updateInfoText();
        return;
    }

    const randomIndex = Math.floor(Math.random() * filteredWords.length);
    const word = filteredWords[randomIndex];
    
    await displayWord(word);

    if (isPlaying) {
        switchTimer = setTimeout(() => {
            selectRandomWord();
        }, config.pauseBeforeNextWord);
    }
}

function bindControls() {
    const typingSpeed = document.getElementById('typingSpeed');
    const deleteSpeed = document.getElementById('deleteSpeed');
    const pauseDelay = document.getElementById('pauseDelay');
    const typingSpeedValue = document.getElementById('typingSpeedValue');
    const deleteSpeedValue = document.getElementById('deleteSpeedValue');
    const pauseDelayValue = document.getElementById('pauseDelayValue');

    if (typingSpeed) {
        typingSpeed.addEventListener('input', () => {
            config.typeSpeed = Number(typingSpeed.value);
            typingSpeedValue.textContent = `${config.typeSpeed}ms`;
        });
    }

    if (deleteSpeed) {
        deleteSpeed.addEventListener('input', () => {
            config.deleteSpeed = Number(deleteSpeed.value);
            deleteSpeedValue.textContent = `${config.deleteSpeed}ms`;
        });
    }

    if (pauseDelay) {
        pauseDelay.addEventListener('input', () => {
            config.pauseBeforeDelete = Number(pauseDelay.value);
            pauseDelayValue.textContent = `${config.pauseBeforeDelete}ms`;
        });
    }

    const toggleBtn = document.getElementById('toggleBtn');
    const sidebar = document.getElementById('controlsSidebar');
    
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }

    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', togglePlayPause);
        playPauseBtn.classList.add('playing');
    }

    wordDisplay = document.getElementById('wordDisplay');
    wordDisplayWrapper = document.querySelector('.word-display-wrapper');
    searchResults = document.getElementById('searchResults');
    
    const searchInput = document.getElementById('searchInput');
    const inputCursor = document.getElementById('inputCursor');
    
    if (searchInput) {
        // Auto-resize input based on content
        const resizeInput = () => {
            searchInput.style.width = 'auto';
            const value = searchInput.value || searchInput.placeholder || 'x';
            // Create a temporary span to measure text width
            const temp = document.createElement('span');
            temp.style.cssText = `
                position: absolute;
                visibility: hidden;
                white-space: pre;
                font-size: 3rem;
                font-weight: bold;
                font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            `;
            temp.textContent = value;
            document.body.appendChild(temp);
            const width = temp.offsetWidth;
            document.body.removeChild(temp);
            searchInput.style.width = Math.max(20, width + 2) + 'px';
        };
        
        searchInput.addEventListener('input', (e) => {
            resizeInput();
            handleSearch(e);
        });
        
        // Position cursor at end of input text
        searchInput.addEventListener('input', () => {
            // Cursor follows input via CSS, no JS needed
        });
        
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.blur();
                searchResults.classList.remove('open');
            }
        });
        
        // Initial resize
        resizeInput();
    }
    
    const searchToggleBtn = document.getElementById('searchToggleBtn');
    if (searchToggleBtn) {
        searchToggleBtn.addEventListener('click', toggleSearchResults);
    }
    
    if (searchResults) {
        searchResults.addEventListener('click', handleResultClick);
    }
}

document.addEventListener('keydown', (e) => {
    const searchInput = document.getElementById('searchInput');
    if (!isPlaying && searchInput && document.activeElement === searchInput) {
        return;
    }
    const keyElement = document.querySelector(`[data-key="${e.key.toLowerCase()}"]`);
    if (keyElement) {
        keyElement.classList.add('pressed');
    }
});

document.addEventListener('keyup', (e) => {
    const searchInput = document.getElementById('searchInput');
    if (!isPlaying && searchInput && document.activeElement === searchInput) {
        return;
    }
    const keyElement = document.querySelector(`[data-key="${e.key.toLowerCase()}"]`);
    if (keyElement) {
        keyElement.classList.remove('pressed');
    }
});

bindControls();
selectRandomWord();
