from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from app import db
from app.models.flashcard import FlashcardSet, Flashcard
from datetime import datetime

flashcards = Blueprint('flashcards', __name__)

@flashcards.route('/')
@login_required
def index():
    page = request.args.get('page', 1, type=int)
    sets = FlashcardSet.query.filter_by(creator_id=current_user.id)\
               .order_by(FlashcardSet.updated_at.desc())\
               .paginate(page=page, per_page=12, error_out=False)
    
    return render_template('flashcards/index.html', sets=sets.items, pagination=sets)

@flashcards.route('/create', methods=['GET', 'POST'])
@login_required
def create_set():
    if request.method == 'POST':
        if request.is_json:
            data = request.get_json()
            
            # Create new flashcard set
            flashcard_set = FlashcardSet(
                title=data['title'],
                description=data.get('description', ''),
                is_public=data.get('is_public', False),
                creator_id=current_user.id
            )
            
            db.session.add(flashcard_set)
            db.session.flush()  # Get the ID
            
            # Add flashcards
            for card_data in data.get('cards', []):
                if card_data['term'].strip() and card_data['definition'].strip():
                    flashcard = Flashcard(
                        term=card_data['term'],
                        definition=card_data['definition'],
                        order=card_data.get('order', 0),
                        flashcard_set_id=flashcard_set.id
                    )
                    db.session.add(flashcard)
            
            db.session.commit()
            
            return jsonify({
                'success': True, 
                'message': 'Study set created successfully!',
                'set_id': flashcard_set.id
            })
        
        return jsonify({'success': False, 'message': 'JSON data expected'})
    
    return render_template('flashcards/create_set.html')

@flashcards.route('/<int:set_id>')
@login_required
def view_set(set_id):
    flashcard_set = FlashcardSet.query.get_or_404(set_id)
    
    # Check access permissions
    if not flashcard_set.is_public and flashcard_set.creator_id != current_user.id:
        flash('You do not have permission to view this study set.', 'error')
        return redirect(url_for('flashcards.index'))
    
    return render_template('flashcards/view_set.html', flashcard_set=flashcard_set)

@flashcards.route('/<int:set_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_set(set_id):
    flashcard_set = FlashcardSet.query.get_or_404(set_id)
    
    # Check if user owns this set
    if flashcard_set.creator_id != current_user.id and current_user.role != 'admin':
        flash('You can only edit your own study sets.', 'error')
        return redirect(url_for('flashcards.index'))
    
    if request.method == 'POST':
        if request.is_json:
            data = request.get_json()
            
            # Update set information
            flashcard_set.title = data.get('title', flashcard_set.title)
            flashcard_set.description = data.get('description', flashcard_set.description)
            flashcard_set.is_public = data.get('is_public', flashcard_set.is_public)
            flashcard_set.updated_at = datetime.utcnow()
            
            # Update cards
            existing_card_ids = {card.id for card in flashcard_set.flashcards}
            updated_card_ids = set()
            
            for card_data in data.get('cards', []):
                card_id = card_data.get('id')
                
                if card_id and not str(card_id).startswith('new-'):
                    # Update existing card
                    card = Flashcard.query.get(card_id)
                    if card and card.flashcard_set_id == set_id:
                        card.term = card_data['term']
                        card.definition = card_data['definition']
                        card.order = card_data.get('order', 0)
                        updated_card_ids.add(card.id)
                else:
                    # Create new card
                    new_card = Flashcard(
                        term=card_data['term'],
                        definition=card_data['definition'],
                        flashcard_set_id=set_id,
                        order=card_data.get('order', 0)
                    )
                    db.session.add(new_card)
            
            # Delete cards that were removed
            cards_to_delete = existing_card_ids - updated_card_ids
            for card_id in cards_to_delete:
                card = Flashcard.query.get(card_id)
                if card:
                    db.session.delete(card)
            
            db.session.commit()
            
            return jsonify({'success': True, 'message': 'Study set updated successfully'})
        
        return jsonify({'success': False, 'message': 'JSON data expected'})
    
    return render_template('flashcards/edit_set.html', flashcard_set=flashcard_set)

@flashcards.route('/<int:set_id>/delete', methods=['POST'])
@login_required
def delete_set(set_id):
    flashcard_set = FlashcardSet.query.get_or_404(set_id)
    
    # Check if user owns this set or is admin
    if flashcard_set.creator_id != current_user.id and current_user.role != 'admin':
        return jsonify({'success': False, 'message': 'Access denied'}), 403
    
    db.session.delete(flashcard_set)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Study set deleted successfully'})

@flashcards.route('/<int:set_id>/duplicate', methods=['POST'])
@login_required
def duplicate_set(set_id):
    original_set = FlashcardSet.query.get_or_404(set_id)
    
    # Create a duplicate set
    duplicate = FlashcardSet(
        title=f"{original_set.title} (Copy)",
        description=original_set.description,
        creator_id=current_user.id,
        is_public=False  # Duplicates are private by default
    )
    
    db.session.add(duplicate)
    db.session.flush()  # Get the ID
    
    # Duplicate all flashcards
    for card in original_set.flashcards:
        duplicate_card = Flashcard(
            term=card.term,
            definition=card.definition,
            order=card.order,
            flashcard_set_id=duplicate.id
        )
        db.session.add(duplicate_card)
    
    db.session.commit()
    
    return jsonify({
        'success': True, 
        'message': 'Study set duplicated successfully',
        'set_id': duplicate.id
    })

@flashcards.route('/toggle_visibility/<int:set_id>', methods=['POST'])
@login_required
def toggle_visibility(set_id):
    flashcard_set = FlashcardSet.query.get_or_404(set_id)
    
    # Check if user owns this set
    if flashcard_set.creator_id != current_user.id and current_user.role != 'admin':
        return jsonify({'success': False, 'message': 'Access denied'}), 403
    
    flashcard_set.is_public = not flashcard_set.is_public
    db.session.commit()
    
    status = 'public' if flashcard_set.is_public else 'private'
    return jsonify({'success': True, 'message': f'Set made {status} successfully', 'is_public': flashcard_set.is_public})

@flashcards.route('/export/<int:set_id>')
@login_required
def export_set(set_id):
    flashcard_set = FlashcardSet.query.get_or_404(set_id)
    
    # Check access permissions
    if not flashcard_set.is_public and flashcard_set.creator_id != current_user.id:
        return jsonify({'success': False, 'message': 'Access denied'}), 403
    
    # Create export data
    export_data = {
        'title': flashcard_set.title,
        'description': flashcard_set.description,
        'created_at': flashcard_set.created_at.isoformat(),
        'cards': [
            {
                'term': card.term,
                'definition': card.definition
            }
            for card in flashcard_set.flashcards
        ]
    }
    
    return jsonify(export_data)
