// Dashboard functionality and utilities

class DashboardManager {
    constructor() {
        this.studySession = {
            startTime: null,
            currentSet: null,
            cardsStudied: 0,
            streak: 0
        };
        
        this.notifications = [];
        this.updateInterval = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadUserPreferences();
        this.startPeriodicUpdates();
        this.initializeWidgets();
    }
    
    setupEventListeners() {
        // Study session tracking
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseStudySession();
            } else {
                this.resumeStudySession();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
        
        // Mouse tracking for engagement
        document.addEventListener('mousemove', this.debounce(() => {
            this.trackUserEngagement();
        }, 1000));
    }
    
    handleKeyboardShortcuts(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return; // Don't trigger shortcuts when typing
        }
        
        const shortcuts = {
            'KeyN': () => this.quickCreateSet(),
            'KeyS': () => this.quickStudy(),
            'KeyR': () => this.randomStudy(),
            'KeyF': () => this.focusSearch(),
            'Escape': () => this.clearSearchAndFilters()
        };
        
        if (e.ctrlKey || e.metaKey) {
            const action = shortcuts[e.code];
            if (action) {
                e.preventDefault();
                action();
            }
        }
    }
    
    quickCreateSet() {
        window.location.href = '/flashcards/create';
    }
    
    quickStudy() {
        const continueButton = document.querySelector('[data-action="continue-studying"]');
        if (continueButton) {
            continueButton.click();
        }
    }
    
    randomStudy() {
        const randomButton = document.querySelector('[data-action="random-study"]');
        if (randomButton) {
            randomButton.click();
        }
    }
    
    focusSearch() {
        const searchInput = document.getElementById('dashboard-search');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }
    
    clearSearchAndFilters() {
        const searchInput = document.getElementById('dashboard-search');
        if (searchInput && searchInput.value) {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
        }
    }
    
    startStudySession(setId, mode) {
        this.studySession = {
            startTime: Date.now(),
            currentSet: setId,
            mode: mode,
            cardsStudied: 0,
            correctAnswers: 0,
            totalAnswers: 0
        };
        
        // Track study session
        this.trackEvent('study_session_started', {
            set_id: setId,
            mode: mode,
            timestamp: new Date().toISOString()
        });
    }
    
    endStudySession(results = {}) {
        if (!this.studySession.startTime) return;
        
        const duration = Date.now() - this.studySession.startTime;
        const sessionData = {
            ...this.studySession,
            duration: duration,
            ...results,
            timestamp: new Date().toISOString()
        };
        
        // Track study session completion
        this.trackEvent('study_session_completed', sessionData);
        
        // Update daily stats
        this.updateDailyStats(sessionData);
        
        // Reset session
        this.studySession = {
            startTime: null,
            currentSet: null,
            cardsStudied: 0,
            streak: 0
        };
    }
    
    updateDailyStats(sessionData) {
        const today = new Date().toDateString();
        let dailyStats = this.getDailyStats(today);
        
        dailyStats.cardsStudied += sessionData.cardsStudied || 0;
        dailyStats.studyTime += sessionData.duration || 0;
        dailyStats.sessionsCompleted += 1;
        
        if (sessionData.totalAnswers > 0) {
            const accuracy = (sessionData.correctAnswers / sessionData.totalAnswers) * 100;
            dailyStats.totalAccuracy = (dailyStats.totalAccuracy + accuracy) / 2;
        }
        
        this.saveDailyStats(today, dailyStats);
        this.updateStatsDisplay();
    }
    
    getDailyStats(date) {
        const saved = localStorage.getItem(`dailyStats_${date}`);
        return saved ? JSON.parse(saved) : {
            cardsStudied: 0,
            studyTime: 0,
            sessionsCompleted: 0,
            totalAccuracy: 0
        };
    }
    
    saveDailyStats(date, stats) {
        localStorage.setItem(`dailyStats_${date}`, JSON.stringify(stats));
    }
    
    updateStatsDisplay() {
        const today = new Date().toDateString();
        const stats = this.getDailyStats(today);
        
        // Update cards studied today
        const cardsElement = document.getElementById('cards-studied');
        if (cardsElement) {
            this.animateStatUpdate(cardsElement, stats.cardsStudied);
        }
        
        // Update accuracy
        const accuracyElement = document.getElementById('accuracy');
        if (accuracyElement) {
            this.animateStatUpdate(accuracyElement, Math.round(stats.totalAccuracy), '%');
        }
        
        // Update study streak
        this.updateStudyStreak();
    }
    
    updateStudyStreak() {
        let streak = 0;
        const today = new Date();
        
        // Check consecutive days of study
        for (let i = 0; i < 365; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            const dateString = checkDate.toDateString();
            
            const dayStats = this.getDailyStats(dateString);
            if (dayStats.cardsStudied > 0) {
                streak++;
            } else if (i > 0) { // Allow today to be 0 if it's current day
                break;
            }
        }
        
        const streakElement = document.getElementById('study-streak');
        if (streakElement) {
            this.animateStatUpdate(streakElement, streak);
        }
    }
    
    // Enhanced quick actions implementation
    async continueStudying() {
        try {
            // Get user's study history and progress
            const studyHistory = this.getStudyHistory();
            const incompleteSets = this.getIncompleteSets();
            
            if (incompleteSets.length > 0) {
                // Find the most recently studied incomplete set
                const lastStudiedSet = incompleteSets.sort((a, b) => 
                    new Date(b.lastStudied) - new Date(a.lastStudied)
                )[0];
                
                this.showContinueStudyOptions(lastStudiedSet);
            } else if (dashboardState.recentSets.length > 0) {
                // No incomplete sets, suggest reviewing completed ones
                this.showReviewSuggestion();
            } else {
                this.showNotification('No study sets found. Create your first set to get started!', 'info', {
                    actions: [{
                        text: 'Create Set',
                        action: () => window.location.href = '{{ url_for("flashcards.create_set") }}'
                    }]
                });
            }
        } catch (error) {
            // Fallback to basic implementation
            if (dashboardState.recentSets.length > 0) {
                const randomSet = dashboardState.recentSets[0];
                this.showStudyModeSelector(randomSet.id, randomSet.title);
            } else {
                this.showNotification('Create your first study set to get started!', 'info');
            }
        }
    }
    
    getStudyHistory() {
        const history = localStorage.getItem('studyHistory');
        return history ? JSON.parse(history) : [];
    }
    
    getIncompleteSets() {
        return dashboardState.recentSets.filter(set => {
            const progress = set.progress || 0;
            return progress < 95; // Consider sets with less than 95% progress as incomplete
        });
    }
    
    showContinueStudyOptions(set) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content rounded-4">
                    <div class="modal-header border-0">
                        <h5 class="modal-title">
                            <i class="bi bi-play-circle text-success me-2"></i>Continue Studying
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="card border-0 bg-light mb-3">
                            <div class="card-body">
                                <h6 class="card-title">${set.title}</h6>
                                <div class="progress mb-2" style="height: 6px;">
                                    <div class="progress-bar bg-primary" style="width: ${set.progress}%"></div>
                                </div>
                                <small class="text-muted">${set.progress}% complete • ${set.flashcards.length} cards</small>
                            </div>
                        </div>
                        
                        <h6 class="mb-3">Choose how to continue:</h6>
                        <div class="row g-3">
                            <div class="col-6">
                                <button class="btn btn-outline-primary w-100 h-100" onclick="dashboard.continueWithMode(${set.id}, 'learn')">
                                    <i class="bi bi-lightbulb d-block fs-2 mb-2"></i>
                                    <strong>Learn Mode</strong>
                                    <small class="d-block text-muted mt-1">Focus on difficult cards</small>
                                </button>
                            </div>
                            <div class="col-6">
                                <button class="btn btn-outline-success w-100 h-100" onclick="dashboard.continueWithMode(${set.id}, 'test')">
                                    <i class="bi bi-clipboard-check d-block fs-2 mb-2"></i>
                                    <strong>Test Mode</strong>
                                    <small class="d-block text-muted mt-1">Check your progress</small>
                                </button>
                            </div>
                            <div class="col-6">
                                <button class="btn btn-outline-info w-100 h-100" onclick="dashboard.continueWithMode(${set.id}, 'flashcards')">
                                    <i class="bi bi-card-text d-block fs-2 mb-2"></i>
                                    <strong>Flashcards</strong>
                                    <small class="d-block text-muted mt-1">Review at your pace</small>
                                </button>
                            </div>
                            <div class="col-6">
                                <button class="btn btn-outline-warning w-100 h-100" onclick="dashboard.continueWithMode(${set.id}, 'match')">
                                    <i class="bi bi-puzzle d-block fs-2 mb-2"></i>
                                    <strong>Match Game</strong>
                                    <small class="d-block text-muted mt-1">Quick review game</small>
                                </button>
                            </div>
                        </div>
                        
                        <div class="mt-4 p-3 bg-info bg-opacity-10 rounded-3">
                            <h6 class="text-info mb-2">
                                <i class="bi bi-info-circle me-2"></i>Smart Recommendation
                            </h6>
                            <p class="small mb-0">
                                Based on your progress, we recommend <strong>Learn Mode</strong> to focus on cards you haven't mastered yet.
                            </p>
                        </div>
                    </div>
                    <div class="modal-footer border-0">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-success" onclick="dashboard.continueWithMode(${set.id}, 'learn')">
                            <i class="bi bi-arrow-right me-2"></i>Continue with Learn Mode
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        // Remove modal from DOM when hidden
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }
    
    continueWithMode(setId, mode) {
        // Close any open modals
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) bsModal.hide();
        });
        
        // Navigate to study mode
        window.location.href = `/study/${setId}/${mode}`;
    }
    
    showReviewSuggestion() {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content rounded-4">
                    <div class="modal-header border-0">
                        <h5 class="modal-title">
                            <i class="bi bi-trophy text-warning me-2"></i>Great Progress!
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-center">
                        <div class="mb-4">
                            <i class="bi bi-check-circle-fill fs-1 text-success mb-3 d-block"></i>
                            <h6>All your sets are complete!</h6>
                            <p class="text-muted">You've mastered all your study sets. Here are some options to keep learning:</p>
                        </div>
                        
                        <div class="d-grid gap-2">
                            <button class="btn btn-primary" onclick="dashboard.reviewAllSets()">
                                <i class="bi bi-arrow-repeat me-2"></i>Review All Sets
                            </button>
                            <button class="btn btn-outline-primary" onclick="dashboard.createNewSet()">
                                <i class="bi bi-plus-circle me-2"></i>Create New Set
                            </button>
                            <button class="btn btn-outline-secondary" onclick="dashboard.explorePublicSets()">
                                <i class="bi bi-globe me-2"></i>Explore Public Sets
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }
    
    async reviewMistakes() {
        try {
            // Get cards with low accuracy from study history
            const mistakeCards = this.getMistakeCards();
            
            if (mistakeCards.length > 0) {
                this.showMistakeReviewOptions(mistakeCards);
            } else {
                this.showNotification('Great job! No mistakes to review. Keep up the excellent work!', 'success', {
                    actions: [{
                        text: 'Continue Studying',
                        action: () => this.continueStudying()
                    }]
                });
            }
        } catch (error) {
            this.showNotification('Review mistakes feature requires study data. Start studying to track your progress!', 'info');
        }
    }
    
    getMistakeCards() {
        const studyHistory = this.getStudyHistory();
        const mistakes = [];
        
        // Analyze study history to find frequently missed cards
        studyHistory.forEach(session => {
            if (session.answers) {
                session.answers.forEach(answer => {
                    if (!answer.isCorrect) {
                        const existing = mistakes.find(m => m.cardId === answer.cardId);
                        if (existing) {
                            existing.errorCount++;
                            existing.lastMissed = session.timestamp;
                        } else {
                            mistakes.push({
                                cardId: answer.cardId,
                                setId: session.setId,
                                setTitle: answer.setTitle || 'Unknown Set',
                                question: answer.question,
                                correctAnswer: answer.correctAnswer,
                                yourAnswer: answer.selectedAnswer,
                                errorCount: 1,
                                lastMissed: session.timestamp
                            });
                        }
                    }
                });
            }
        });
        
        // Sort by error count and recency
        return mistakes.sort((a, b) => {
            if (a.errorCount !== b.errorCount) {
                return b.errorCount - a.errorCount;
            }
            return new Date(b.lastMissed) - new Date(a.lastMissed);
        }).slice(0, 20); // Top 20 mistake cards
    }
    
    showMistakeReviewOptions(mistakes) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog modal-xl">
                <div class="modal-content rounded-4">
                    <div class="modal-header border-0">
                        <h5 class="modal-title">
                            <i class="bi bi-arrow-repeat text-warning me-2"></i>Review Mistakes
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info border-0">
                            <h6 class="alert-heading">
                                <i class="bi bi-lightbulb me-2"></i>Focus on Problem Areas
                            </h6>
                            <p class="mb-0">These are cards you've had difficulty with. Reviewing them will help reinforce your learning.</p>
                        </div>
                        
                        <div class="row mb-4">
                            <div class="col-md-6">
                                <div class="card border-0 bg-light">
                                    <div class="card-body text-center">
                                        <h3 class="text-warning">${mistakes.length}</h3>
                                        <small class="text-muted">Cards to Review</small>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card border-0 bg-light">
                                    <div class="card-body text-center">
                                        <h3 class="text-info">${[...new Set(mistakes.map(m => m.setId))].length}</h3>
                                        <small class="text-muted">Study Sets Involved</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <h6 class="mb-3">Choose review method:</h6>
                        <div class="row g-3 mb-4">
                            <div class="col-md-4">
                                <button class="btn btn-outline-warning w-100 h-100" onclick="dashboard.startMistakeReview('flashcards')">
                                    <i class="bi bi-card-text d-block fs-2 mb-2"></i>
                                    <strong>Flashcard Review</strong>
                                    <small class="d-block text-muted mt-1">Study at your own pace</small>
                                </button>
                            </div>
                            <div class="col-md-4">
                                <button class="btn btn-outline-danger w-100 h-100" onclick="dashboard.startMistakeReview('test')">
                                    <i class="bi bi-clipboard-check d-block fs-2 mb-2"></i>
                                    <strong>Practice Test</strong>
                                    <small class="d-block text-muted mt-1">Test your knowledge</small>
                                </button>
                            </div>
                            <div class="col-md-4">
                                <button class="btn btn-outline-success w-100 h-100" onclick="dashboard.startMistakeReview('learn')">
                                    <i class="bi bi-lightbulb d-block fs-2 mb-2"></i>
                                    <strong>Adaptive Learning</strong>
                                    <small class="d-block text-muted mt-1">Smart review system</small>
                                </button>
                            </div>
                        </div>
                        
                        <h6 class="mb-3">Most frequently missed:</h6>
                        <div class="mistake-list" style="max-height: 300px; overflow-y: auto;">
                            ${mistakes.slice(0, 10).map(mistake => `
                                <div class="card border-0 bg-light mb-2">
                                    <div class="card-body py-2">
                                        <div class="d-flex justify-content-between align-items-start">
                                            <div class="flex-grow-1">
                                                <small class="text-muted">${mistake.setTitle}</small>
                                                <div class="fw-semibold">${mistake.question}</div>
                                                <small class="text-success">Correct: ${mistake.correctAnswer}</small>
                                            </div>
                                            <span class="badge bg-danger">${mistake.errorCount}x</span>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="modal-footer border-0">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-warning" onclick="dashboard.startMistakeReview('learn')">
                            <i class="bi bi-arrow-right me-2"></i>Start Smart Review
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        // Store mistakes for review session
        this.currentMistakes = mistakes;
        
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }
    
    startMistakeReview(mode) {
        // Close any open modals
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) bsModal.hide();
        });
        
        if (this.currentMistakes && this.currentMistakes.length > 0) {
            this.createMistakeReviewSession(this.currentMistakes, mode);
        }
    }
    
    createMistakeReviewSession(mistakes, mode) {
        // Create a temporary study session with mistake cards
        const sessionData = {
            type: 'mistake_review',
            mode: mode,
            cards: mistakes,
            timestamp: new Date().toISOString()
        };
        
        // Store session data
        localStorage.setItem('currentReviewSession', JSON.stringify(sessionData));
        
        // Navigate to review mode
        if (mistakes.length > 0) {
            const firstSetId = mistakes[0].setId;
            window.location.href = `/study/${firstSetId}/${mode}?review=mistakes`;
        }
    }
    
    async randomStudy() {
        try {
            if (dashboardState.recentSets.length === 0) {
                this.showNotification('No study sets available. Create your first set!', 'info', {
                    actions: [{
                        text: 'Create Set',
                        action: () => window.location.href = '/flashcards/create'
                    }]
                });
                return;
            }
            
            this.showRandomStudyOptions();
        } catch (error) {
            // Fallback implementation
            if (dashboardState.recentSets.length > 0) {
                const randomSet = dashboardState.recentSets[Math.floor(Math.random() * dashboardState.recentSets.length)];
                this.showStudyModeSelector(randomSet.id, randomSet.title);
            }
        }
    }
    
    showRandomStudyOptions() {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content rounded-4">
                    <div class="modal-header border-0">
                        <h5 class="modal-title">
                            <i class="bi bi-shuffle text-info me-2"></i>Random Study
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="text-center mb-4">
                            <i class="bi bi-dice-5 fs-1 text-info mb-3 d-block"></i>
                            <h6>Choose your random study adventure!</h6>
                            <p class="text-muted small">We'll randomly select content for you to study</p>
                        </div>
                        
                        <div class="d-grid gap-3">
                            <button class="btn btn-outline-primary" onclick="dashboard.randomStudyOption('single')">
                                <div class="d-flex align-items-center">
                                    <i class="bi bi-collection me-3 fs-4"></i>
                                    <div class="text-start">
                                        <div class="fw-semibold">Random Set</div>
                                        <small class="text-muted">Pick one of your sets randomly</small>
                                    </div>
                                </div>
                            </button>
                            
                            <button class="btn btn-outline-success" onclick="dashboard.randomStudyOption('mixed')">
                                <div class="d-flex align-items-center">
                                    <i class="bi bi-shuffle me-3 fs-4"></i>
                                    <div class="text-start">
                                        <div class="fw-semibold">Mixed Cards</div>
                                        <small class="text-muted">Random cards from all your sets</small>
                                    </div>
                                </div>
                            </button>
                            
                            <button class="btn btn-outline-warning" onclick="dashboard.randomStudyOption('challenge')">
                                <div class="d-flex align-items-center">
                                    <i class="bi bi-lightning me-3 fs-4"></i>
                                    <div class="text-start">
                                        <div class="fw-semibold">Quick Challenge</div>
                                        <small class="text-muted">5-minute rapid-fire session</small>
                                    </div>
                                </div>
                            </button>
                            
                            <button class="btn btn-outline-info" onclick="dashboard.randomStudyOption('weakest')">
                                <div class="d-flex align-items-center">
                                    <i class="bi bi-target me-3 fs-4"></i>
                                    <div class="text-start">
                                        <div class="fw-semibold">Focus on Weak Areas</div>
                                        <small class="text-muted">Random cards you need to practice</small>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                    <div class="modal-footer border-0">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-info" onclick="dashboard.randomStudyOption('single')">
                            <i class="bi bi-play-fill me-2"></i>Surprise Me!
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }
    
    randomStudyOption(type) {
        // Close any open modals
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) bsModal.hide();
        });
        
        this.executeRandomStudy(type);
    }
    
    executeRandomStudy(type) {
        switch (type) {
            case 'single':
                const randomSet = dashboardState.recentSets[Math.floor(Math.random() * dashboardState.recentSets.length)];
                const modes = ['flashcards', 'learn', 'test', 'match'];
                const randomMode = modes[Math.floor(Math.random() * modes.length)];
                this.showNotification(`Starting ${randomMode} mode with "${randomSet.title}"!`, 'info');
                setTimeout(() => {
                    window.location.href = `/study/${randomSet.id}/${randomMode}`;
                }, 1500);
                break;
                
            case 'mixed':
                this.createMixedStudySession();
                break;
                
            case 'challenge':
                this.createQuickChallenge();
                break;
                
            case 'weakest':
                this.focusOnWeakAreas();
                break;
        }
    }
    
    createMixedStudySession() {
        // Create a mixed session with cards from multiple sets
        const allCards = [];
        dashboardState.recentSets.forEach(set => {
            // Simulate cards from each set
            for (let i = 0; i < Math.min(5, set.flashcards.length); i++) {
                allCards.push({
                    setId: set.id,
                    setTitle: set.title,
                    cardIndex: i
                });
            }
        });
        
        // Shuffle and limit to 20 cards
        const shuffledCards = allCards.sort(() => Math.random() - 0.5).slice(0, 20);
        
        const sessionData = {
            type: 'mixed_study',
            cards: shuffledCards,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('currentMixedSession', JSON.stringify(sessionData));
        
        this.showNotification(`Mixed study session created! ${shuffledCards.length} random cards from your sets.`, 'success');
        
        // Navigate to first set with mixed mode indicator
        if (shuffledCards.length > 0) {
            setTimeout(() => {
                window.location.href = `/study/${shuffledCards[0].setId}/learn?mode=mixed`;
            }, 1500);
        }
    }
    
    createQuickChallenge() {
        const challengeData = {
            type: 'quick_challenge',
            timeLimit: 5 * 60, // 5 minutes
            maxCards: 15,
            mode: 'test',
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('currentChallenge', JSON.stringify(challengeData));
        
        if (dashboardState.recentSets.length > 0) {
            const randomSet = dashboardState.recentSets[Math.floor(Math.random() * dashboardState.recentSets.length)];
            this.showNotification('Quick Challenge started! 5 minutes to answer as many as you can!', 'warning');
            setTimeout(() => {
                window.location.href = `/study/${randomSet.id}/test?mode=challenge`;
            }, 1500);
        }
    }
    
    focusOnWeakAreas() {
        const mistakes = this.getMistakeCards();
        if (mistakes.length > 0) {
            this.showNotification('Focusing on your weak areas for targeted practice!', 'info');
            setTimeout(() => {
                this.createMistakeReviewSession(mistakes, 'learn');
            }, 1500);
        } else {
            // If no mistakes, focus on least recently studied
            const leastStudied = dashboardState.recentSets.sort((a, b) => 
                new Date(a.lastStudied || 0) - new Date(b.lastStudied || 0)
            )[0];
            
            if (leastStudied) {
                this.showNotification('No weak areas found! Reviewing your least recently studied set.', 'info');
                setTimeout(() => {
                    window.location.href = `/study/${leastStudied.id}/learn`;
                }, 1500);
            }
        }
    }
    
    reviewAllSets() {
        // Close any open modals
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) bsModal.hide();
        });
        
        this.startMixedReview();
    }
    
    createNewSet() {
        // Close any open modals
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) bsModal.hide();
        });
        
        window.location.href = '/flashcards/create';
    }
    
    explorePublicSets() {
        // Close any open modals
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) bsModal.hide();
        });
        
        window.location.href = '/explore';
    }
    
    startMixedReview() {
        // Create a review session with cards from all completed sets
        const allCards = [];
        dashboardState.recentSets.forEach(set => {
            for (let i = 0; i < Math.min(3, set.flashcards.length); i++) {
                allCards.push({
                    setId: set.id,
                    setTitle: set.title,
                    cardIndex: i
                });
            }
        });
        
        const sessionData = {
            type: 'mixed_review',
            cards: allCards.sort(() => Math.random() - 0.5).slice(0, 25),
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('currentReviewSession', JSON.stringify(sessionData));
        
        this.showNotification('Mixed review session started! Cards from all your sets.', 'success');
        
        if (sessionData.cards.length > 0) {
            setTimeout(() => {
                window.location.href = `/study/${sessionData.cards[0].setId}/flashcards?mode=review`;
            }, 1500);
        }
    }

    // Add missing utility functions
    animateStatUpdate(element, newValue, suffix = '') {
        const currentValue = parseInt(element.textContent) || 0;
        
        if (currentValue !== newValue) {
            this.animateCountUp(element, currentValue, newValue, suffix, 1000);
        }
    }
    
    animateCountUp(element, start, end, suffix, duration) {
        const startTime = Date.now();
        const range = end - start;
        
        const updateCount = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = Math.floor(start + (range * this.easeOutQuart(progress)));
            
            element.textContent = current + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(updateCount);
            }
        };
        
        updateCount();
    }
    
    easeOutQuart(t) {
        return 1 - (--t) * t * t * t;
    }

    showNotification(message, type = 'info', options = {}) {
        const notification = {
            id: Date.now(),
            message,
            type,
            timestamp: new Date(),
            ...options
        };
        
        this.notifications.push(notification);
        this.renderNotification(notification);
        
        if (!options.persistent) {
            setTimeout(() => {
                this.removeNotification(notification.id);
            }, options.duration || 5000);
        }
    }
    
    renderNotification(notification) {
        const container = this.getNotificationContainer();
        const element = document.createElement('div');
        element.className = `alert alert-${notification.type} alert-dismissible fade show notification-item`;
        element.dataset.notificationId = notification.id;
        element.style.cssText = 'margin-bottom: 10px; animation: slideInRight 0.3s ease;';
        
        let actionsHtml = '';
        if (notification.actions) {
            actionsHtml = notification.actions.map(action => `
                <button class="btn btn-sm btn-outline-${notification.type} me-2" 
                        onclick="dashboard.handleNotificationAction('${notification.id}', '${action.action}')">
                    ${action.text}
                </button>
            `).join('');
        }
        
        element.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    ${notification.message}
                    <div class="mt-2">${actionsHtml}</div>
                </div>
                <button type="button" class="btn-close" onclick="dashboard.removeNotification('${notification.id}')"></button>
            </div>
        `;
        
        container.appendChild(element);
    }
    
    getNotificationContainer() {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 1060; max-width: 400px;';
            document.body.appendChild(container);
        }
        return container;
    }
    
    removeNotification(id) {
        const element = document.querySelector(`[data-notification-id="${id}"]`);
        if (element) {
            element.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                element.remove();
            }, 300);
        }
        
        this.notifications = this.notifications.filter(n => n.id !== id);
    }

    handleNotificationAction(notificationId, actionFunction) {
        const notification = this.notifications.find(n => n.id == notificationId);
        if (notification && notification.actions) {
            const action = notification.actions.find(a => a.action.toString() === actionFunction);
            if (action && typeof action.action === 'function') {
                action.action();
            }
        }
        
        this.removeNotification(notificationId);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.dashboard = new DashboardManager();
});

// Profile dropdown menu functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeProfileDropdown();
    initializeNavigationLinks();
});

function initializeProfileDropdown() {
    // Get profile dropdown elements
    const profileDropdown = document.getElementById('profileDropdown');
    const profileMenu = document.querySelector('.dropdown-menu[aria-labelledby="profileDropdown"]');
    
    if (profileDropdown && profileMenu) {
        // Add click event to toggle dropdown
        profileDropdown.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Toggle dropdown visibility
            const isOpen = profileMenu.classList.contains('show');
            
            // Close all other dropdowns first
            document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
                menu.classList.remove('show');
            });
            
            if (!isOpen) {
                profileMenu.classList.add('show');
                profileDropdown.setAttribute('aria-expanded', 'true');
            } else {
                profileMenu.classList.remove('show');
                profileDropdown.setAttribute('aria-expanded', 'false');
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!profileDropdown.contains(e.target) && !profileMenu.contains(e.target)) {
                profileMenu.classList.remove('show');
                profileDropdown.setAttribute('aria-expanded', 'false');
            }
        });
        
        // Close dropdown when pressing Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && profileMenu.classList.contains('show')) {
                profileMenu.classList.remove('show');
                profileDropdown.setAttribute('aria-expanded', 'false');
            }
        });
    }
}

function initializeNavigationLinks() {
    // Dashboard navigation
    const dashboardLinks = document.querySelectorAll('a[href*="dashboard"]');
    dashboardLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Add loading state
            showNavigationFeedback('Navigating to Dashboard...');
        });
    });
    
    // Profile navigation
    const profileLinks = document.querySelectorAll('a[href*="profile"]');
    profileLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            showNavigationFeedback('Loading Profile...');
        });
    });
    
    // Settings navigation
    const settingsLinks = document.querySelectorAll('a[href*="settings"]');
    settingsLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            showNavigationFeedback('Opening Settings...');
        });
    });
    
    // Logout functionality
    const logoutLinks = document.querySelectorAll('a[href*="logout"]');
    logoutLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            handleLogout();
        });
    });
}

function showNavigationFeedback(message) {
    // Create a temporary loading indicator
    const indicator = document.createElement('div');
    indicator.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
    indicator.style.cssText = 'background: rgba(0,0,0,0.1); z-index: 9999; backdrop-filter: blur(2px);';
    indicator.innerHTML = `
        <div class="bg-white rounded-4 p-4 shadow-lg text-center">
            <div class="spinner-border text-primary mb-3" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <div class="text-muted">${message}</div>
        </div>
    `;
    
    document.body.appendChild(indicator);
    
    // Remove after 2 seconds or when page unloads
    setTimeout(() => {
        if (indicator.parentNode) {
            indicator.remove();
        }
    }, 2000);
}

function handleLogout() {
    // Show confirmation dialog
    const confirmLogout = confirm('Are you sure you want to log out?');
    
    if (confirmLogout) {
        // Show logout progress
        showNavigationFeedback('Logging out...');
        
        // Perform logout
        fetch('/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            }
        })
        .then(response => {
            if (response.ok) {
                // Clear local storage
                localStorage.clear();
                sessionStorage.clear();
                
                // Redirect to login page
                window.location.href = '/auth/login';
            } else {
                throw new Error('Logout failed');
            }
        })
        .catch(error => {
            console.error('Logout error:', error);
            // Fallback: redirect anyway
            window.location.href = '/auth/login';
        });
    }
}

function getCsrfToken() {
    // Get CSRF token from meta tag or cookie
    const token = document.querySelector('meta[name="csrf-token"]');
    return token ? token.getAttribute('content') : '';
}

// Enhanced dropdown menu interactions
function enhanceDropdownMenus() {
    // Add hover effects for better UX
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    
    dropdownItems.forEach(item => {
        // Add icon animations
        const icon = item.querySelector('i');
        if (icon) {
            item.addEventListener('mouseenter', function() {
                icon.style.transform = 'scale(1.1)';
                icon.style.transition = 'transform 0.2s ease';
            });
            
            item.addEventListener('mouseleave', function() {
                icon.style.transform = 'scale(1)';
            });
        }
        
        // Add click feedback
        item.addEventListener('click', function() {
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 100);
        });
    });
}

// Quick action shortcuts from dropdown
function initializeQuickActions() {
    // Add keyboard shortcuts for dropdown actions
    document.addEventListener('keydown', function(e) {
        // Alt + D for Dashboard
        if (e.altKey && e.key === 'd') {
            e.preventDefault();
            window.location.href = '/dashboard';
        }
        
        // Alt + P for Profile
        if (e.altKey && e.key === 'p') {
            e.preventDefault();
            window.location.href = '/profile';
        }
        
        // Alt + S for Settings
        if (e.altKey && e.key === 's') {
            e.preventDefault();
            window.location.href = '/settings';
        }
        
        // Alt + L for Logout
        if (e.altKey && e.key === 'l') {
            e.preventDefault();
            handleLogout();
        }
    });
}

// User preferences for dropdown behavior
function loadDropdownPreferences() {
    const preferences = localStorage.getItem('dropdownPreferences');
    if (preferences) {
        const prefs = JSON.parse(preferences);
        
        // Apply auto-close setting
        if (prefs.autoClose === false) {
            document.addEventListener('click', function(e) {
                // Don't auto-close if preference is disabled
                if (e.target.closest('.dropdown-menu')) {
                    e.stopPropagation();
                }
            });
        }
        
        // Apply hover to open setting
        if (prefs.hoverToOpen === true) {
            const profileDropdown = document.getElementById('profileDropdown');
            if (profileDropdown) {
                profileDropdown.addEventListener('mouseenter', function() {
                    const menu = document.querySelector('.dropdown-menu[aria-labelledby="profileDropdown"]');
                    if (menu) {
                        menu.classList.add('show');
                        this.setAttribute('aria-expanded', 'true');
                    }
                });
            }
        }
    }
}

// Initialize all dropdown functionality
document.addEventListener('DOMContentLoaded', function() {
    enhanceDropdownMenus();
    initializeQuickActions();
    loadDropdownPreferences();
});

// Add CSS animations for dropdown enhancements
const style = document.createElement('style');
style.textContent = `
    .dropdown-menu {
        border: none;
        box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        border-radius: 12px;
        padding: 0.5rem;
        animation: dropdownSlideIn 0.2s ease-out;
    }
    
    @keyframes dropdownSlideIn {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .dropdown-item {
        border-radius: 8px;
        margin-bottom: 2px;
        padding: 0.75rem 1rem;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }
    
    .dropdown-item:hover {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        transform: translateX(2px);
    }
    
    .dropdown-item i {
        width: 18px;
        text-align: center;
    }
    
    .dropdown-divider {
        margin: 0.5rem 0;
        opacity: 0.3;
    }
    
    .dropdown-header {
        color: #6c757d;
        font-size: 0.875rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 0.5rem 1rem;
    }
`;

document.head.appendChild(style);
