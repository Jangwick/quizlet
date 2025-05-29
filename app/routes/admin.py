from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from functools import wraps
from app import db
from app.models.user import User
from app.models.flashcard import FlashcardSet, Flashcard
from app.models.progress import StudySession, UserProgress
from sqlalchemy import func
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash

admin = Blueprint('admin', __name__)

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or current_user.role != 'admin':
            flash('You need administrator privileges to access this page.', 'error')
            return redirect(url_for('main.home'))
        return f(*args, **kwargs)
    return decorated_function

@admin.route('/')
@login_required
@admin_required
def index():
    # Get system statistics
    total_users = User.query.count()
    total_sets = FlashcardSet.query.count()
    total_cards = Flashcard.query.count()
    
    # Daily active users (users who studied today)
    today = datetime.now().date()
    daily_active_users = db.session.query(User.id).join(StudySession)\
                          .filter(func.date(StudySession.start_time) == today)\
                          .distinct().count()
    
    # Get recent users (last 5)
    recent_users = User.query.order_by(User.created_at.desc()).limit(5).all()
    
    # Get pending content for moderation (public sets created recently)
    pending_content = FlashcardSet.query.filter_by(is_public=True)\
                       .order_by(FlashcardSet.created_at.desc())\
                       .limit(5).all()
    
    return render_template('admin/index.html',
                         total_users=total_users,
                         total_sets=total_sets,
                         total_cards=total_cards,
                         daily_active_users=daily_active_users,
                         recent_users=recent_users,
                         pending_content=pending_content,
                         server_uptime='2 days, 14 hours',
                         last_backup='Never')

@admin.route('/users')
@login_required
@admin_required
def users():
    page = request.args.get('page', 1, type=int)
    per_page = 20
    
    users = User.query.paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return render_template('admin/users.html', users=users)

@admin.route('/users/add', methods=['POST'])
@login_required
@admin_required
def add_user():
    # Handle both JSON and form data
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form.to_dict()
    
    # Validate required fields
    required_fields = ['first_name', 'last_name', 'username', 'email', 'password', 'role']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'success': False, 'message': f'{field.replace("_", " ").title()} is required.'})
    
    # Check if username or email already exists
    existing_user = User.query.filter(
        (User.username == data['username']) | (User.email == data['email'])
    ).first()
    
    if existing_user:
        return jsonify({'success': False, 'message': 'Username or email already exists.'})
    
    # Create new user
    new_user = User(
        first_name=data['first_name'],
        last_name=data['last_name'],
        username=data['username'],
        email=data['email'],
        role=data['role'],
        is_active=True
    )
    new_user.set_password(data['password'])
    
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({
        'success': True, 
        'message': f'User {new_user.username} created successfully.',
        'user_id': new_user.id
    })

@admin.route('/users/<int:user_id>/update', methods=['POST'])
@login_required
@admin_required
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    
    # Handle both JSON and form data
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form.to_dict()
        # Convert form checkbox values to boolean
        if 'is_active' in data:
            data['is_active'] = data['is_active'] == 'on'
    
    # Prevent self-role change for admins
    if user.id == current_user.id and data.get('role') != 'admin':
        return jsonify({'success': False, 'message': 'Cannot change your own admin role.'})
    
    # Update user fields
    if 'role' in data:
        user.role = data['role']
    if 'is_active' in data:
        user.is_active = bool(data['is_active'])
    if 'first_name' in data:
        user.first_name = data['first_name']
    if 'last_name' in data:
        user.last_name = data['last_name']
    if 'email' in data:
        # Check if email is already taken by another user
        existing_user = User.query.filter(User.email == data['email'], User.id != user_id).first()
        if existing_user:
            return jsonify({'success': False, 'message': 'Email already exists.'})
        user.email = data['email']
    
    user.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'success': True, 
        'message': f'User {user.username} updated successfully.'
    })

@admin.route('/users/<int:user_id>/delete', methods=['POST'])
@login_required
@admin_required
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    
    # Prevent deleting admin users
    if user.role == 'admin':
        return jsonify({'success': False, 'message': 'Cannot delete admin users.'})
    
    # Prevent self-deletion
    if user.id == current_user.id:
        return jsonify({'success': False, 'message': 'Cannot delete your own account.'})
    
    username = user.username
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({
        'success': True, 
        'message': f'User {username} deleted successfully.'
    })

@admin.route('/users/<int:user_id>/toggle_status', methods=['POST'])
@login_required
@admin_required
def toggle_user_status(user_id):
    user = User.query.get_or_404(user_id)
    
    # Prevent self-deactivation
    if user.id == current_user.id:
        return jsonify({'success': False, 'message': 'Cannot deactivate your own account.'})
    
    user.is_active = not user.is_active
    db.session.commit()
    
    status = 'activated' if user.is_active else 'deactivated'
    return jsonify({'success': True, 'message': f'User {status} successfully.'})

@admin.route('/moderation')
@login_required
@admin_required
def moderation():
    sets = FlashcardSet.query.filter_by(is_public=True)\
             .order_by(FlashcardSet.created_at.desc())\
             .all()
    
    return render_template('admin/moderation.html', sets=sets)

@admin.route('/analytics')
@login_required
@admin_required
def analytics():
    return render_template('admin/analytics.html')

@admin.route('/settings', methods=['GET', 'POST'])
@login_required
@admin_required
def settings():
    if request.method == 'POST':
        flash('Settings updated successfully!', 'success')
        return redirect(url_for('admin.settings'))
    
    return render_template('admin/settings.html')

@admin.route('/content/<int:content_id>/approve', methods=['POST'])
@login_required
@admin_required
def approve_content(content_id):
    flashcard_set = FlashcardSet.query.get_or_404(content_id)
    # Content is already public, so this is just for demo
    return jsonify({'success': True, 'message': 'Content approved successfully.'})

@admin.route('/content/<int:content_id>/reject', methods=['POST'])
@login_required
@admin_required
def reject_content(content_id):
    flashcard_set = FlashcardSet.query.get_or_404(content_id)
    flashcard_set.is_public = False
    db.session.commit()
    return jsonify({'success': True, 'message': 'Content rejected and made private.'})
