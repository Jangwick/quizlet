// Flashcard-specific functionality

document.addEventListener('DOMContentLoaded', function() {
    initializeFlashcardEditor();
    initializeFlashcardViewer();
});

// Add new flashcard with enhanced question/answer support
function addNewCard() {
    const cardContainer = document.getElementById('cards-container');
    const cardCount = cardContainer.children.length;
    
    const cardHtml = `
        <div class="term-definition-pair position-relative" data-card-id="new">
            <button type="button" class="delete-card-btn" onclick="deleteCard(event)">
                <i class="bi bi-x"></i>
            </button>
            
            <!-- Card Type Selector -->
            <div class="row mb-3">
                <div class="col-12">
                    <label class="form-label">Card Type</label>
                    <select class="form-select card-type-selector" onchange="toggleCardType(this)">
                        <option value="term-definition">Term & Definition</option>
                        <option value="question-answer">Question & Answer</option>
                        <option value="multiple-choice">Multiple Choice Question</option>
                    </select>
                </div>
            </div>
            
            <!-- Standard Term/Definition or Question/Answer -->
            <div class="standard-card">
                <div class="row">
                    <div class="col-md-6">
                        <label class="form-label card-front-label">Term</label>
                        <textarea class="form-control card-input" name="terms[]" rows="3" placeholder="Enter term or question"></textarea>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label card-back-label">Definition</label>
                        <textarea class="form-control card-input" name="definitions[]" rows="3" placeholder="Enter definition or answer"></textarea>
                    </div>
                </div>
            </div>
            
            <!-- Multiple Choice Options (hidden by default) -->
            <div class="multiple-choice-card" style="display: none;">
                <div class="row mb-2">
                    <div class="col-12">
                        <label class="form-label">Question</label>
                        <textarea class="form-control card-input" name="mc_questions[]" rows="2" placeholder="Enter your question"></textarea>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <label class="form-label">Option A</label>
                        <input type="text" class="form-control" name="mc_option_a[]" placeholder="First option">
                        <div class="form-check mt-1">
                            <input class="form-check-input" type="radio" name="mc_correct_${cardCount}" value="A">
                            <label class="form-check-label">Correct Answer</label>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Option B</label>
                        <input type="text" class="form-control" name="mc_option_b[]" placeholder="Second option">
                        <div class="form-check mt-1">
                            <input class="form-check-input" type="radio" name="mc_correct_${cardCount}" value="B">
                            <label class="form-check-label">Correct Answer</label>
                        </div>
                    </div>
                </div>
                <div class="row mt-2">
                    <div class="col-md-6">
                        <label class="form-label">Option C</label>
                        <input type="text" class="form-control" name="mc_option_c[]" placeholder="Third option">
                        <div class="form-check mt-1">
                            <input class="form-check-input" type="radio" name="mc_correct_${cardCount}" value="C">
                            <label class="form-check-label">Correct Answer</label>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Option D</label>
                        <input type="text" class="form-control" name="mc_option_d[]" placeholder="Fourth option">
                        <div class="form-check mt-1">
                            <input class="form-check-input" type="radio" name="mc_correct_${cardCount}" value="D">
                            <label class="form-check-label">Correct Answer</label>
                        </div>
                    </div>
                </div>
                <input type="hidden" name="mc_correct_answers[]" class="mc-correct-answer">
            </div>
            
            <!-- Additional Options -->
            <div class="row mt-2">
                <div class="col-md-6">
                    <label class="form-label">Image URL (optional)</label>
                    <input type="url" class="form-control" name="image_urls[]" placeholder="https://...">
                </div>
                <div class="col-md-6">
                    <label class="form-label">Audio URL (optional)</label>
                    <input type="url" class="form-control" name="audio_urls[]" placeholder="https://...">
                </div>
            </div>
            
            <!-- Card Settings -->
            <div class="row mt-2">
                <div class="col-md-6">
                    <label class="form-label">Difficulty Level</label>
                    <select class="form-select" name="difficulty[]">
                        <option value="easy">Easy</option>
                        <option value="medium" selected>Medium</option>
                        <option value="hard">Hard</option>
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Tags (optional)</label>
                    <input type="text" class="form-control" name="card_tags[]" placeholder="tag1, tag2, tag3">
                </div>
            </div>
            
            <!-- Card Type Hidden Input -->
            <input type="hidden" name="card_types[]" value="term-definition" class="card-type-input">
        </div>
    `;
    
    cardContainer.insertAdjacentHTML('beforeend', cardHtml);
    
    // Focus on the new term input
    const newCard = cardContainer.lastElementChild;
    newCard.querySelector('textarea[name="terms[]"]').focus();
    
    // Add slide-up animation
    newCard.classList.add('slide-up');
    
    // Initialize multiple choice radio button listeners
    initializeMultipleChoiceListeners(newCard);
}

// Toggle card type between term/definition, question/answer, and multiple choice
function toggleCardType(selectElement) {
    const card = selectElement.closest('.term-definition-pair');
    const standardCard = card.querySelector('.standard-card');
    const multipleChoiceCard = card.querySelector('.multiple-choice-card');
    const cardTypeInput = card.querySelector('.card-type-input');
    const frontLabel = card.querySelector('.card-front-label');
    const backLabel = card.querySelector('.card-back-label');
    
    const selectedType = selectElement.value;
    cardTypeInput.value = selectedType;
    
    switch(selectedType) {
        case 'term-definition':
            standardCard.style.display = 'block';
            multipleChoiceCard.style.display = 'none';
            frontLabel.textContent = 'Term';
            backLabel.textContent = 'Definition';
            card.querySelector('textarea[name="terms[]"]').placeholder = 'Enter term';
            card.querySelector('textarea[name="definitions[]"]').placeholder = 'Enter definition';
            break;
            
        case 'question-answer':
            standardCard.style.display = 'block';
            multipleChoiceCard.style.display = 'none';
            frontLabel.textContent = 'Question';
            backLabel.textContent = 'Answer';
            card.querySelector('textarea[name="terms[]"]').placeholder = 'Enter question';
            card.querySelector('textarea[name="definitions[]"]').placeholder = 'Enter answer';
            break;
            
        case 'multiple-choice':
            standardCard.style.display = 'none';
            multipleChoiceCard.style.display = 'block';
            break;
    }
}

// Initialize multiple choice radio button listeners
function initializeMultipleChoiceListeners(card) {
    const radioButtons = card.querySelectorAll('input[type="radio"]');
    const hiddenInput = card.querySelector('.mc-correct-answer');
    
    radioButtons.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                hiddenInput.value = this.value;
            }
        });
    });
}

// Enhanced save functionality for different card types
async function saveFlashcardSet(event) {
    event.preventDefault();
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;
    
    try {
        // Validate multiple choice questions
        const multipleChoiceCards = document.querySelectorAll('.multiple-choice-card[style*="block"]');
        let validationErrors = [];
        
        multipleChoiceCards.forEach((mcCard, index) => {
            const question = mcCard.querySelector('textarea[name="mc_questions[]"]').value.trim();
            const options = [
                mcCard.querySelector('input[name="mc_option_a[]"]').value.trim(),
                mcCard.querySelector('input[name="mc_option_b[]"]').value.trim(),
                mcCard.querySelector('input[name="mc_option_c[]"]').value.trim(),
                mcCard.querySelector('input[name="mc_option_d[]"]').value.trim()
            ];
            const correctAnswer = mcCard.querySelector('.mc-correct-answer').value;
            
            if (!question) {
                validationErrors.push(`Question ${index + 1}: Question text is required`);
            }
            
            const filledOptions = options.filter(opt => opt.length > 0);
            if (filledOptions.length < 2) {
                validationErrors.push(`Question ${index + 1}: At least 2 options are required`);
            }
            
            if (!correctAnswer) {
                validationErrors.push(`Question ${index + 1}: Please select the correct answer`);
            }
        });
        
        if (validationErrors.length > 0) {
            alert('Please fix the following errors:\n\n' + validationErrors.join('\n'));
            return;
        }
        
        const formData = new FormData(event.target);
        const response = await fetch(event.target.action, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            window.utils.showToast('Flashcard set saved successfully!', 'success');
            
            // Redirect if it's a new set
            if (window.location.pathname.includes('/create')) {
                const result = await response.json();
                window.location.href = `/flashcards/${result.set_id}/edit`;
            }
        } else {
            throw new Error('Failed to save');
        }
    } catch (error) {
        window.utils.showToast('Error saving flashcard set', 'error');
        console.error('Save error:', error);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Flashcard editor initialization
function initializeFlashcardEditor() {
    const addCardBtn = document.getElementById('add-card-btn');
    const flashcardForm = document.getElementById('flashcard-form');
    
    if (addCardBtn) {
        addCardBtn.addEventListener('click', addNewCard);
    }
    
    if (flashcardForm) {
        flashcardForm.addEventListener('submit', saveFlashcardSet);
    }
    
    // Initialize existing card delete buttons
    document.querySelectorAll('.delete-card-btn').forEach(btn => {
        btn.addEventListener('click', deleteCard);
    });
    
    // Initialize existing multiple choice listeners
    document.querySelectorAll('.term-definition-pair').forEach(card => {
        initializeMultipleChoiceListeners(card);
        
        // Initialize card type selector if it exists
        const typeSelector = card.querySelector('.card-type-selector');
        if (typeSelector) {
            typeSelector.addEventListener('change', function() {
                toggleCardType(this);
            });
        }
    });
    
    // Auto-save functionality
    let saveTimeout;
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('card-input')) {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(autoSave, 2000);
        }
    });
}

// Delete flashcard
function deleteCard(event) {
    const card = event.target.closest('.term-definition-pair');
    const cardId = card.dataset.cardId;
    
    if (confirm('Are you sure you want to delete this card?')) {
        if (cardId !== 'new') {
            // Mark for deletion if it's an existing card
            const deleteInput = document.createElement('input');
            deleteInput.type = 'hidden';
            deleteInput.name = 'deleted_cards[]';
            deleteInput.value = cardId;
            card.appendChild(deleteInput);
            card.style.display = 'none';
        } else {
            // Remove from DOM if it's a new card
            card.remove();
        }
        
        window.utils.showToast('Card deleted', 'info');
    }
}

// Auto-save functionality
async function autoSave() {
    const form = document.getElementById('flashcard-form');
    if (!form) return;
    
    try {
        const formData = new FormData(form);
        formData.append('auto_save', 'true');
        
        const response = await fetch(form.action, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            showAutoSaveIndicator();
        }
    } catch (error) {
        console.error('Auto-save error:', error);
    }
}

// Show auto-save indicator
function showAutoSaveIndicator() {
    let indicator = document.getElementById('auto-save-indicator');
    
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'auto-save-indicator';
        indicator.className = 'position-fixed bottom-0 start-0 m-3 badge bg-success';
        indicator.style.zIndex = '1050';
        document.body.appendChild(indicator);
    }
    
    indicator.textContent = 'Auto-saved';
    indicator.style.display = 'block';
    
    setTimeout(() => {
        indicator.style.display = 'none';
    }, 2000);
}

// Flashcard viewer initialization
function initializeFlashcardViewer() {
    const flashcards = document.querySelectorAll('.flashcard');
    
    flashcards.forEach(card => {
        card.addEventListener('click', () => {
            card.classList.toggle('flipped');
            
            // Track card flip for analytics
            const cardId = card.dataset.cardId;
            if (cardId) {
                trackCardInteraction(cardId, 'flip');
            }
        });
        
        // Keyboard navigation
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.classList.toggle('flipped');
            }
        });
        
        // Make focusable for accessibility
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', 'Click to flip flashcard');
    });
    
    // Keyboard shortcuts for navigation
    document.addEventListener('keydown', (e) => {
        if (e.target.closest('.flashcard-container')) {
            handleFlashcardNavigation(e);
        }
    });
}

// Handle flashcard navigation
function handleFlashcardNavigation(event) {
    const currentCard = document.querySelector('.flashcard.active') || document.querySelector('.flashcard');
    if (!currentCard) return;
    
    const allCards = Array.from(document.querySelectorAll('.flashcard'));
    const currentIndex = allCards.indexOf(currentCard);
    
    switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
            event.preventDefault();
            if (currentIndex > 0) {
                showCard(currentIndex - 1);
            }
            break;
            
        case 'ArrowRight':
        case 'ArrowDown':
            event.preventDefault();
            if (currentIndex < allCards.length - 1) {
                showCard(currentIndex + 1);
            }
            break;
            
        case ' ':
            event.preventDefault();
            currentCard.classList.toggle('flipped');
            break;
    }
}

// Show specific card
function showCard(index) {
    const allCards = document.querySelectorAll('.flashcard');
    
    allCards.forEach((card, i) => {
        card.classList.toggle('active', i === index);
        card.style.display = i === index ? 'block' : 'none';
    });
    
    // Update progress indicator
    updateProgressIndicator(index + 1, allCards.length);
}

// Update progress indicator
function updateProgressIndicator(current, total) {
    const progressBar = document.querySelector('.progress-bar');
    const progressText = document.querySelector('.progress-text');
    
    if (progressBar) {
        const percentage = (current / total) * 100;
        progressBar.style.width = `${percentage}%`;
        progressBar.setAttribute('aria-valuenow', percentage);
    }
    
    if (progressText) {
        progressText.textContent = `${current} of ${total}`;
    }
}

// Track card interaction for analytics
async function trackCardInteraction(cardId, action) {
    try {
        await fetch('/api/track-interaction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                card_id: cardId,
                action: action,
                timestamp: new Date().toISOString()
            })
        });
    } catch (error) {
        console.error('Tracking error:', error);
    }
}

// Export functions for use in other modules
window.flashcardUtils = {
    addNewCard,
    deleteCard,
    showCard,
    trackCardInteraction
};
