from flask import Blueprint, render_template, request, jsonify
from flask_login import login_required, current_user
from app import db
from app.models.user import User
from app.models.flashcard import FlashcardSet, Flashcard
from app.models.progress import StudySession, UserProgress
from sqlalchemy import func
from datetime import datetime, timedelta

dashboard = Blueprint('dashboard', __name__)

def get_activity_icon(activity_type):
    """Helper function to get activity icons"""
    icons = {
        'study': 'bi-book',
        'create': 'bi-plus-circle',
        'achievement': 'bi-trophy',
        'share': 'bi-share',
        'edit': 'bi-pencil'
    }
    return icons.get(activity_type, 'bi-circle')

@dashboard.route('/')
@login_required
def index():
    # Get user's basic stats
    total_sets = FlashcardSet.query.filter_by(creator_id=current_user.id).count()
    
    # Calculate study streak (simplified - days with study sessions)
    study_dates = db.session.query(func.date(StudySession.start_time))\
                    .filter(StudySession.user_id == current_user.id)\
                    .distinct().count()
    study_streak = study_dates if study_dates else 0
    
    # Cards studied today (simplified)
    today = datetime.now().date()
    cards_studied_today = db.session.query(UserProgress)\
                            .filter(UserProgress.user_id == current_user.id)\
                            .filter(func.date(UserProgress.last_studied) == today)\
                            .count()
    
    # Overall accuracy (simplified)
    progress_records = UserProgress.query.filter_by(user_id=current_user.id).all()
    if progress_records:
        total_correct = sum(p.correct_count for p in progress_records)
        total_attempts = sum(p.correct_count + p.incorrect_count for p in progress_records)
        overall_accuracy = round((total_correct / total_attempts * 100) if total_attempts > 0 else 0)
    else:
        overall_accuracy = 0
    
    # Get recent sets (limit 6)
    recent_sets = FlashcardSet.query\
                    .filter_by(creator_id=current_user.id)\
                    .order_by(FlashcardSet.updated_at.desc())\
                    .limit(6).all()
    
    # Get recent activity
    recent_activity = []
    
    # Add study sessions
    recent_sessions = StudySession.query\
                        .filter_by(user_id=current_user.id)\
                        .order_by(StudySession.start_time.desc())\
                        .limit(3).all()
    
    for session in recent_sessions:
        recent_activity.append({
            'type': 'study',
            'description': f'Studied {session.flashcard_set.title}' if session.flashcard_set else 'Studied flashcards',
            'timestamp': session.start_time,
            'icon': get_activity_icon('study')
        })
    
    # Add created sets
    recent_created = FlashcardSet.query\
                       .filter_by(creator_id=current_user.id)\
                       .order_by(FlashcardSet.created_at.desc())\
                       .limit(2).all()
    
    for flashcard_set in recent_created:
        recent_activity.append({
            'type': 'create',
            'description': f'Created {flashcard_set.title}',
            'timestamp': flashcard_set.created_at,
            'icon': get_activity_icon('create')
        })
    
    # Sort activity by timestamp
    recent_activity.sort(key=lambda x: x['timestamp'], reverse=True)
    recent_activity = recent_activity[:5]  # Keep only 5 most recent
    
    return render_template('dashboard/index.html',
                         total_sets=total_sets,
                         study_streak=study_streak,
                         cards_studied_today=cards_studied_today,
                         overall_accuracy=overall_accuracy,
                         recent_sets=recent_sets,
                         recent_activity=recent_activity,
                         get_activity_icon=get_activity_icon)

# Make the function available globally to all templates
@dashboard.app_template_global()
def get_activity_icon_global(activity_type):
    return get_activity_icon(activity_type)
