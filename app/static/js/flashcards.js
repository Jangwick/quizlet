document.addEventListener('DOMContentLoaded', function() {
    // Flashcard data
    const flashcards = [
        {% for card in flashcard_set.flashcards %}
        {
            id: {{ card.id }},
            term: {{ card.term|tojson }},
            definition: {{ card.definition|tojson }}
        }{{ ',' if not loop.last }}
        {% endfor %}
    ];

    // Study mode management
    let currentMode = 'flashcards';
    let currentCardIndex = 0;
    let studyData = {
        learn: { currentIndex: 0, incorrectCards: [], completedCards: [] },
        test: { questions: [], currentIndex: 0, answers: [], startTime: null },
        match: { pairs: [], matches: 0, startTime: null, selectedTerm: null, selectedDefinition: null }
    };

    // Initialize study modes
    initializeFlashcards();
    initializeLearnMode();
    initializeTestMode();
    initializeMatchMode();

    // Tab switching
    document.querySelectorAll('[data-bs-toggle="pill"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', function(e) {
            const targetMode = e.target.getAttribute('href').replace('#', '').replace('-mode', '');
            currentMode = targetMode;
            
            // Show/hide controls based on mode
            const flashcardControls = document.getElementById('flashcard-controls');
            flashcardControls.style.display = targetMode === 'flashcards' ? 'block' : 'none';
        });
    });

    // Flashcards Mode
    function initializeFlashcards() {
        if (flashcards.length === 0) return;

        const cards = document.querySelectorAll('.flashcard');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const flipBtn = document.getElementById('flip-btn');

        function updateCard() {
            cards.forEach((card, index) => {
                card.style.display = index === currentCardIndex ? 'block' : 'none';
                card.classList.remove('flipped');
            });
            updateProgress();
            updateButtons();
        }

        function updateProgress() {
            const progress = ((currentCardIndex + 1) / flashcards.length) * 100;
            document.getElementById('main-progress').style.width = progress + '%';
        }

        function updateButtons() {
            prevBtn.disabled = currentCardIndex === 0;
            nextBtn.disabled = currentCardIndex === flashcards.length - 1;
        }

        // Enhanced position-locked flip functionality
        function flipCard() {
            const currentCard = cards[currentCardIndex];
            
            // Prevent multiple rapid flips during animation
            if (currentCard.classList.contains('flipping')) {
                return;
            }
            
            // Lock the card position absolutely before flipping
            const rect = currentCard.getBoundingClientRect();
            const container = currentCard.parentElement;
            const containerRect = container.getBoundingClientRect();
            
            // Calculate exact position relative to container
            const relativeTop = rect.top - containerRect.top;
            const relativeLeft = rect.left - containerRect.left;
            
            // Add flipping class to prevent interaction
            currentCard.classList.add('flipping');
            
            // Force position lock
            currentCard.style.position = 'relative';
            currentCard.style.top = '0px';
            currentCard.style.left = '0px';
            currentCard.style.margin = '0';
            currentCard.style.transform = 'translate3d(0, 0, 0)';
            
            // Toggle flip state
            currentCard.classList.toggle('flipped');
            
            // Remove flipping class after animation completes
            setTimeout(() => {
                currentCard.classList.remove('flipping');
                
                // Ensure position is still locked
                currentCard.style.position = 'relative';
                currentCard.style.top = '0px';
                currentCard.style.left = '0px';
                currentCard.style.margin = '0';
                currentCard.style.transform = 'translate3d(0, 0, 0)';
                
                // Verify position hasn't changed
                const newRect = currentCard.getBoundingClientRect();
                const newContainerRect = container.getBoundingClientRect();
                const newRelativeTop = newRect.top - newContainerRect.top;
                const newRelativeLeft = newRect.left - newContainerRect.left;
                
                // Force correction if position has drifted
                if (Math.abs(newRelativeTop - relativeTop) > 2 || Math.abs(newRelativeLeft - relativeLeft) > 2) {
                    console.log('Position drift detected, correcting...');
                    currentCard.style.position = 'relative';
                    currentCard.style.top = '0px';
                    currentCard.style.left = '0px';
                    currentCard.style.margin = '0';
                    currentCard.style.transform = 'translate3d(0, 0, 0)';
                }
            }, 600); // Match the CSS transition duration
        }

        prevBtn.addEventListener('click', () => {
            if (currentCardIndex > 0) {
                currentCardIndex--;
                updateCard();
            }
        });

        nextBtn.addEventListener('click', () => {
            if (currentCardIndex < flashcards.length - 1) {
                currentCardIndex++;
                updateCard();
            }
        });

        flipBtn.addEventListener('click', flipCard);

        // Card click to flip
        cards.forEach(card => card.addEventListener('click', flipCard));

        // Keyboard navigation
        document.addEventListener('keydown', function(e) {
            if (currentMode !== 'flashcards') return;
            
            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    prevBtn.click();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    nextBtn.click();
                    break;
                case ' ':
                    e.preventDefault();
                    flipCard();
                    break;
            }
        });

        updateCard();
    }

    // Learn Mode
    function initializeLearnMode() {
        const startBtn = document.getElementById('start-learn');
        const container = document.getElementById('learn-container');
        const startScreen = document.getElementById('learn-start');

        startBtn.addEventListener('click', () => {
            startScreen.style.display = 'none';
            container.style.display = 'block';
            startLearnSession();
        });
    }

    function startLearnSession() {
        studyData.learn = { currentIndex: 0, incorrectCards: [], completedCards: [] };
        showLearnQuestion();
    }

    function showLearnQuestion() {
        const data = studyData.learn;
        if (data.currentIndex >= flashcards.length) {
            showResults('learn');
            return;
        }

        const card = flashcards[data.currentIndex];
        const questionEl = document.getElementById('learn-question');
        const optionsEl = document.getElementById('learn-options');
        const progressEl = document.getElementById('learn-progress');

        questionEl.textContent = card.term;
        progressEl.textContent = `${data.currentIndex + 1} of ${flashcards.length}`;

        // Generate options (correct answer + 3 random wrong answers)
        const options = [card.definition];
        const wrongOptions = flashcards
            .filter(c => c.id !== card.id)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3)
            .map(c => c.definition);
        
        options.push(...wrongOptions);
        options.sort(() => Math.random() - 0.5);

        optionsEl.innerHTML = options.map(option => 
            `<div class="learn-option" data-answer="${option}">${option}</div>`
        ).join('');

        // Add click handlers
        optionsEl.querySelectorAll('.learn-option').forEach(option => {
            option.addEventListener('click', (e) => handleLearnAnswer(e, card.definition));
        });

        updateProgress();
    }

    function handleLearnAnswer(e, correctAnswer) {
        const selectedOption = e.target;
        const isCorrect = selectedOption.dataset.answer === correctAnswer;
        
        // Visual feedback
        selectedOption.classList.add(isCorrect ? 'correct' : 'incorrect');
        
        if (!isCorrect) {
            // Show correct answer
            document.querySelectorAll('.learn-option').forEach(opt => {
                if (opt.dataset.answer === correctAnswer) {
                    opt.classList.add('correct');
                }
            });
            studyData.learn.incorrectCards.push(flashcards[studyData.learn.currentIndex]);
        } else {
            studyData.learn.completedCards.push(flashcards[studyData.learn.currentIndex]);
        }

        // Move to next question after delay
        setTimeout(() => {
            studyData.learn.currentIndex++;
            showLearnQuestion();
        }, 1500);
    }

    // Test Mode
    function initializeTestMode() {
        const startBtn = document.getElementById('start-test');
        const container = document.getElementById('test-container');
        const startScreen = document.getElementById('test-start');

        startBtn.addEventListener('click', () => {
            const questionCount = parseInt(document.getElementById('test-question-count').value);
            startScreen.style.display = 'none';
            container.style.display = 'block';
            startTestSession(questionCount);
        });
    }

    function startTestSession(questionCount) {
        const shuffledCards = [...flashcards].sort(() => Math.random() - 0.5);
        studyData.test = {
            questions: shuffledCards.slice(0, questionCount),
            currentIndex: 0,
            answers: [],
            startTime: Date.now()
        };
        showTestQuestion();
    }

    function showTestQuestion() {
        const data = studyData.test;
        if (data.currentIndex >= data.questions.length) {
            showResults('test');
            return;
        }

        const card = data.questions[data.currentIndex];
        const questionEl = document.getElementById('test-question');
        const optionsEl = document.getElementById('test-options');
        const currentEl = document.getElementById('test-current');
        const totalEl = document.getElementById('test-total');

        questionEl.textContent = card.term;
        currentEl.textContent = data.currentIndex + 1;
        totalEl.textContent = data.questions.length;

        // Generate options
        const options = [card.definition];
        const wrongOptions = flashcards
            .filter(c => c.id !== card.id)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3)
            .map(c => c.definition);
        
        options.push(...wrongOptions);
        options.sort(() => Math.random() - 0.5);

        optionsEl.innerHTML = options.map(option => 
            `<div class="test-option" data-answer="${option}">${option}</div>`
        ).join('');

        // Add click handlers
        optionsEl.querySelectorAll('.test-option').forEach option => {
            option.addEventListener('click', handleTestOptionClick);
        });

        document.getElementById('test-submit').disabled = true;
        updateProgress();
    }

    function handleTestOptionClick(e) {
        // Remove previous selections
        document.querySelectorAll('.test-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // Select current option
        e.target.classList.add('selected');
        document.getElementById('test-submit').disabled = false;

        document.getElementById('test-submit').onclick = () => {
            const card = studyData.test.questions[studyData.test.currentIndex];
            const selectedAnswer = e.target.dataset.answer;
            const isCorrect = selectedAnswer === card.definition;

            studyData.test.answers.push({
                question: card.term,
                correct: card.definition,
                selected: selectedAnswer,
                isCorrect: isCorrect
            });

            // Show feedback
            e.target.classList.add(isCorrect ? 'correct' : 'incorrect');
            if (!isCorrect) {
                document.querySelectorAll('.test-option').forEach(opt => {
                    if (opt.dataset.answer === card.definition) {
                        opt.classList.add('correct');
                    }
                });
            }

            setTimeout(() => {
                studyData.test.currentIndex++;
                showTestQuestion();
            }, 1500);
        };
    }

    // Match Mode
    function initializeMatchMode() {
        const startBtn = document.getElementById('start-match');
        const container = document.getElementById('match-container');
        const startScreen = document.getElementById('match-start');

        startBtn.addEventListener('click', () => {
            startScreen.style.display = 'none';
            container.style.display = 'block';
            startMatchSession();
        });
    }

    function startMatchSession() {
        const matchCount = Math.min(6, flashcards.length);
        const selectedCards = [...flashcards].sort(() => Math.random() - 0.5).slice(0, matchCount);
        
        studyData.match = {
            pairs: selectedCards,
            matches: 0,
            startTime: Date.now(),
            selectedTerm: null,
            selectedDefinition: null
        };

        setupMatchGrid(selectedCards);
        startMatchTimer();
        updateMatchScore();
    }

    function setupMatchGrid(cards) {
        const termsEl = document.getElementById('match-terms');
        const definitionsEl = document.getElementById('match-definitions');

        // Shuffle terms and definitions separately
        const terms = [...cards].sort(() => Math.random() - 0.5);
        const definitions = [...cards].sort(() => Math.random() - 0.5);

        termsEl.innerHTML = terms.map(card => 
            `<div class="match-item" data-type="term" data-id="${card.id}">${card.term}</div>`
        ).join('');

        definitionsEl.innerHTML = definitions.map(card => 
            `<div class="match-item" data-type="definition" data-id="${card.id}">${card.definition}</div>`
        ).join('');

        // Add click handlers
        document.querySelectorAll('.match-item').forEach(item => {
            item.addEventListener('click', handleMatchClick);
        });
    }

    function handleMatchClick(e) {
        const item = e.target;
        const type = item.dataset.type;
        const id = item.dataset.id;

        if (item.classList.contains('matched')) return;

        if (type === 'term') {
            // Deselect previous term
            document.querySelectorAll('.match-item[data-type="term"]').forEach(el => {
                el.classList.remove('selected');
            });
            item.classList.add('selected');
            studyData.match.selectedTerm = id;
        } else {
            // Deselect previous definition
            document.querySelectorAll('.match-item[data-type="definition"]').forEach(el => {
                el.classList.remove('selected');
            });
            item.classList.add('selected');
            studyData.match.selectedDefinition = id;
        }

        // Check for match
        if (studyData.match.selectedTerm && studyData.match.selectedDefinition) {
            checkMatch();
        }
    }

    function checkMatch() {
        const termId = studyData.match.selectedTerm;
        const defId = studyData.match.selectedDefinition;
        const isMatch = termId === defId;

        const termEl = document.querySelector(`.match-item[data-type="term"][data-id="${termId}"]`);
        const defEl = document.querySelector(`.match-item[data-type="definition"][data-id="${defId}"]`);

        if (isMatch) {
            termEl.classList.add('matched');
            defEl.classList.add('matched');
            studyData.match.matches++;
            updateMatchScore();

            if (studyData.match.matches === studyData.match.pairs.length) {
                setTimeout(() => showResults('match'), 1000);
            }
        } else {
            termEl.classList.add('incorrect');
            defEl.classList.add('incorrect');
            setTimeout(() => {
                termEl.classList.remove('incorrect');
                defEl.classList.remove('incorrect');
            }, 1000);
        }

        // Reset selections
        termEl.classList.remove('selected');
        defEl.classList.remove('selected');
        studyData.match.selectedTerm = null;
        studyData.match.selectedDefinition = null;
    }

    function startMatchTimer() {
        const timerEl = document.getElementById('match-timer');
        setInterval(() => {
            const elapsed = Math.floor((Date.now() - studyData.match.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    function updateMatchScore() {
        document.getElementById('match-score').textContent = studyData.match.matches;
        document.getElementById('match-total').textContent = studyData.match.pairs.length;
    }

    function updateProgress() {
        let progress = 0;
        if (currentMode === 'learn') {
            progress = (studyData.learn.currentIndex / flashcards.length) * 100;
        } else if (currentMode === 'test') {
            progress = (studyData.test.currentIndex / studyData.test.questions.length) * 100;
        } else if (currentMode === 'match') {
            progress = (studyData.match.matches / studyData.match.pairs.length) * 100;
        } else {
            progress = ((currentCardIndex + 1) / flashcards.length) * 100;
        }
        document.getElementById('main-progress').style.width = progress + '%';
    }

    function showResults(mode) {
        const modal = new bootstrap.Modal(document.getElementById('resultsModal'));
        const content = document.getElementById('results-content');
        let html = '';

        if (mode === 'learn') {
            const correct = studyData.learn.completedCards.length;
            const total = flashcards.length;
            const percentage = Math.round((correct / total) * 100);
            
            html = `
                <div class="score-circle ${getScoreClass(percentage)}">
                    ${percentage}%
                </div>
                <h4>Learning Session Complete!</h4>
                <p>You got ${correct} out of ${total} questions correct</p>
                ${studyData.learn.incorrectCards.length > 0 ? 
                    `<p class="text-muted">Review ${studyData.learn.incorrectCards.length} cards that need more practice</p>` : 
                    '<p class="text-success">Perfect! You know all the cards!</p>'
                }
            `;
        } else if (mode === 'test') {
            const correct = studyData.test.answers.filter(a => a.isCorrect).length;
            const total = studyData.test.answers.length;
            const percentage = Math.round((correct / total) * 100);
            const timeElapsed = Math.floor((Date.now() - studyData.test.startTime) / 1000);
            
            html = `
                <div class="score-circle ${getScoreClass(percentage)}">
                    ${percentage}%
                </div>
                <h4>Test Complete!</h4>
                <p>Score: ${correct} / ${total} correct</p>
                <p class="text-muted">Time: ${Math.floor(timeElapsed / 60)}:${(timeElapsed % 60).toString().padStart(2, '0')}</p>
            `;
        } else if (mode === 'match') {
            const timeElapsed = Math.floor((Date.now() - studyData.match.startTime) / 1000);
            html = `
                <div class="score-circle score-excellent">
                    ${studyData.match.pairs.length}/${studyData.match.pairs.length}
                </div>
                <h4>Matching Complete!</h4>
                <p>All pairs matched successfully!</p>
                <p class="text-muted">Time: ${Math.floor(timeElapsed / 60)}:${(timeElapsed % 60).toString().padStart(2, '0')}</p>
            `;
        }

        content.innerHTML = html;
        modal.show();
    }

    function getScoreClass(percentage) {
        if (percentage >= 90) return 'score-excellent';
        if (percentage >= 70) return 'score-good';
        if (percentage >= 50) return 'score-fair';
        return 'score-poor';
    }

    // Study again button
    document.getElementById('study-again').addEventListener('click', () => {
        location.reload();
    });
});