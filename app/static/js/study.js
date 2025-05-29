// Study mode functionality

document.addEventListener('DOMContentLoaded', function() {
    initializeStudyMode();
    initializeMatchGame();
    initializeTestMode();
    initializeLearnMode();
});

// Study mode initialization
function initializeStudyMode() {
    const studyContainer = document.querySelector('.study-container');
    if (!studyContainer) return;
    
    const mode = studyContainer.dataset.mode;
    const setId = studyContainer.dataset.setId;
    
    if (!setId) return;
    
    // Load questions for the current mode
    loadStudyQuestions(setId, mode);
    
    // Initialize study controls
    initializeStudyControls();
    
    // Start study session tracking
    startStudySession(setId, mode);
}

// Load study questions
async function loadStudyQuestions(setId, mode) {
    try {
        const response = await fetch(`/study/api/${setId}/questions?mode=${mode}`);
        const questions = await response.json();
        
        window.studyData = {
            questions: questions,
            currentIndex: 0,
            correctAnswers: 0,
            startTime: Date.now(),
            mode: mode
        };
        
        displayCurrentQuestion();
    } catch (error) {
        console.error('Error loading questions:', error);
        window.utils.showToast('Error loading study material', 'error');
    }
}

// Display current question
function displayCurrentQuestion() {
    const { questions, currentIndex } = window.studyData;
    const question = questions[currentIndex];
    
    if (!question) {
        showStudyComplete();
        return;
    }
    
    const questionContainer = document.getElementById('question-container');
    
    switch (question.type) {
        case 'flashcard':
            displayFlashcard(question);
            break;
        case 'multiple_choice':
            displayMultipleChoice(question);
            break;
        default:
            console.error('Unknown question type:', question.type);
    }
    
    updateStudyProgress();
}

// Display flashcard
function displayFlashcard(question) {
    const container = document.getElementById('question-container');
    container.innerHTML = `
        <div class="flashcard" data-card-id="${question.id}">
            <div class="flashcard-inner">
                <div class="flashcard-front">
                    <div class="flashcard-content">${question.term}</div>
                </div>
                <div class="flashcard-back">
                    <div class="flashcard-content">${question.definition}</div>
                </div>
            </div>
        </div>
        <div class="study-feedback mt-4 text-center" style="display: none;">
            <p>How well did you know this?</p>
            <div class="btn-group" role="group">
                <button class="btn btn-danger" onclick="answerFlashcard(false)">
                    <i class="bi bi-x-circle"></i> Don't Know
                </button>
                <button class="btn btn-warning" onclick="answerFlashcard('partial')">
                    <i class="bi bi-question-circle"></i> Partially
                </button>
                <button class="btn btn-success" onclick="answerFlashcard(true)">
                    <i class="bi bi-check-circle"></i> Know Well
                </button>
            </div>
        </div>
    `;
    
    // Initialize flashcard flip
    const flashcard = container.querySelector('.flashcard');
    flashcard.addEventListener('click', () => {
        flashcard.classList.toggle('flipped');
        if (flashcard.classList.contains('flipped')) {
            document.querySelector('.study-feedback').style.display = 'block';
        }
    });
}

// Display multiple choice question
function displayMultipleChoice(question) {
    const container = document.getElementById('question-container');
    container.innerHTML = `
        <div class="question-card">
            <h4 class="mb-4">${question.question}</h4>
            <div class="choices">
                ${question.choices.map((choice, index) => `
                    <button class="choice-btn btn btn-outline-primary w-100 mb-2 text-start" 
                            data-choice="${choice}" 
                            onclick="selectChoice(this, '${choice}', '${question.correct_answer}')">
                        ${String.fromCharCode(65 + index)}. ${choice}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

// Handle flashcard answer
function answerFlashcard(isCorrect) {
    const correct = isCorrect === true;
    
    if (correct || isCorrect === 'partial') {
        window.studyData.correctAnswers++;
    }
    
    submitAnswer(window.studyData.questions[window.studyData.currentIndex].id, correct);
    nextQuestion();
}

// Handle multiple choice selection
function selectChoice(button, selectedAnswer, correctAnswer) {
    const choices = document.querySelectorAll('.choice-btn');
    choices.forEach(btn => btn.disabled = true);
    
    const isCorrect = selectedAnswer === correctAnswer;
    
    if (isCorrect) {
        button.classList.remove('btn-outline-primary');
        button.classList.add('btn-success');
        window.studyData.correctAnswers++;
    } else {
        button.classList.remove('btn-outline-primary');
        button.classList.add('btn-danger');
        
        // Show correct answer
        choices.forEach(btn => {
            if (btn.dataset.choice === correctAnswer) {
                btn.classList.remove('btn-outline-primary');
                btn.classList.add('btn-success');
            }
        });
    }
    
    submitAnswer(window.studyData.questions[window.studyData.currentIndex].id, isCorrect);
    
    setTimeout(() => {
        nextQuestion();
    }, 2000);
}

// Move to next question
function nextQuestion() {
    window.studyData.currentIndex++;
    displayCurrentQuestion();
}

// Submit answer to server
async function submitAnswer(flashcardId, isCorrect) {
    try {
        await fetch('/study/api/submit_answer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                flashcard_id: flashcardId,
                is_correct: isCorrect
            })
        });
    } catch (error) {
        console.error('Error submitting answer:', error);
    }
}

// Update study progress
function updateStudyProgress() {
    const { currentIndex, questions } = window.studyData;
    const progressBar = document.querySelector('.progress-bar');
    const progressText = document.querySelector('.progress-text');
    
    const percentage = (currentIndex / questions.length) * 100;
    
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }
    
    if (progressText) {
        progressText.textContent = `${currentIndex + 1} of ${questions.length}`;
    }
}

// Show study complete screen
function showStudyComplete() {
    const { correctAnswers, questions, startTime, mode } = window.studyData;
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    const accuracy = Math.round((correctAnswers / questions.length) * 100);
    
    const container = document.getElementById('question-container');
    container.innerHTML = `
        <div class="study-complete text-center">
            <div class="completion-icon mb-4">
                <i class="bi bi-trophy fs-1 text-warning"></i>
            </div>
            <h2 class="fw-bold mb-3">Study Session Complete!</h2>
            <div class="row justify-content-center mb-4">
                <div class="col-md-8">
                    <div class="row g-3">
                        <div class="col-md-4">
                            <div class="stat-card p-3 bg-primary text-white rounded">
                                <h3 class="mb-1">${correctAnswers}/${questions.length}</h3>
                                <small>Correct Answers</small>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="stat-card p-3 bg-success text-white rounded">
                                <h3 class="mb-1">${accuracy}%</h3>
                                <small>Accuracy</small>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="stat-card p-3 bg-info text-white rounded">
                                <h3 class="mb-1">${totalTime}s</h3>
                                <small>Time Spent</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="d-flex gap-3 justify-content-center">
                <button class="btn btn-primary" onclick="restartStudy()">
                    <i class="bi bi-arrow-clockwise me-2"></i>Study Again
                </button>
                <button class="btn btn-outline-primary" onclick="tryDifferentMode()">
                    <i class="bi bi-shuffle me-2"></i>Try Different Mode
                </button>
                <button class="btn btn-outline-secondary" onclick="goBackToSet()">
                    <i class="bi bi-house me-2"></i>Back to Set
                </button>
            </div>
        </div>
    `;
    
    // Submit session results
    submitStudySession(correctAnswers, questions.length, totalTime, accuracy);
}

// Initialize study controls
function initializeStudyControls() {
    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.target.closest('.study-container')) {
            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    previousQuestion();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    nextQuestion();
                    break;
                case ' ':
                    e.preventDefault();
                    if (window.studyData.mode === 'flashcards') {
                        flipCurrentCard();
                    }
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (window.studyData.mode === 'flashcards') {
                        flipCurrentCard();
                    }
                    break;
            }
        }
    });
}

// Start study session tracking
function startStudySession(setId, mode) {
    fetch('/study/api/start_session', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            set_id: setId,
            mode: mode,
            start_time: new Date().toISOString()
        })
    }).catch(error => {
        console.log('Demo mode: Session tracking not available');
    });
}

// Submit study session results
function submitStudySession(correct, total, timeSpent, accuracy) {
    fetch('/study/api/submit_session', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            correct_answers: correct,
            total_questions: total,
            time_spent: timeSpent,
            accuracy: accuracy,
            mode: window.studyData.mode
        })
    }).catch(error => {
        console.log('Demo mode: Results submission not available');
    });
}

// Restart study session
function restartStudy() {
    window.studyData.currentIndex = 0;
    window.studyData.correctAnswers = 0;
    window.studyData.startTime = Date.now();
    displayCurrentQuestion();
}

// Try different study mode
function tryDifferentMode() {
    const currentUrl = window.location.pathname;
    const setId = currentUrl.match(/\/study\/(\d+)/)[1];
    window.location.href = `/flashcards/${setId}`;
}

// Go back to set
function goBackToSet() {
    const currentUrl = window.location.pathname;
    const setId = currentUrl.match(/\/study\/(\d+)/)[1];
    window.location.href = `/flashcards/${setId}`;
}

// Flip current card (for flashcard mode)
function flipCurrentCard() {
    const currentCard = document.querySelector('.flashcard.active') || document.querySelector('.flashcard');
    if (currentCard) {
        currentCard.classList.toggle('flipped');
        
        const feedback = document.querySelector('.study-feedback');
        if (feedback) {
            feedback.style.display = currentCard.classList.contains('flipped') ? 'block' : 'none';
        }
    }
}

// Previous question navigation
function previousQuestion() {
    if (window.studyData.currentIndex > 0) {
        window.studyData.currentIndex--;
        displayCurrentQuestion();
    }
}

// Initialize match game
function initializeMatchGame() {
    const matchContainer = document.querySelector('.match-game-container');
    if (!matchContainer) return;
    
    // Match game logic would go here
    console.log('Match game initialized');
}

// Initialize test mode
function initializeTestMode() {
    const testContainer = document.querySelector('.test-mode-container');
    if (!testContainer) return;
    
    // Test mode logic would go here
    console.log('Test mode initialized');
}

// Initialize learn mode
function initializeLearnMode() {
    const learnContainer = document.querySelector('.learn-mode-container');
    if (!learnContainer) return;
    
    // Learn mode logic would go here
    console.log('Learn mode initialized');
}

// Export functions
window.studyUtils = {
    answerFlashcard,
    selectChoice,
    nextQuestion,
    restartStudy
};
