from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
import os

# Create extension instances
db = SQLAlchemy()
login_manager = LoginManager()

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL') or 'sqlite:///quizlet_clone.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize extensions with app
    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Please log in to access this page.'
    login_manager.login_message_category = 'info'
    
    # Import models to ensure they are registered with SQLAlchemy
    from app.models.user import User
    from app.models.flashcard import FlashcardSet, Flashcard
    from app.models.progress import StudySession, UserProgress
    
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))
    
    # Register blueprints
    from app.routes.main import main
    from app.routes.auth import auth
    from app.routes.flashcards import flashcards
    from app.routes.study import study
    from app.routes.dashboard import dashboard
    from app.routes.admin import admin
    
    app.register_blueprint(main)
    app.register_blueprint(auth, url_prefix='/auth')
    app.register_blueprint(flashcards, url_prefix='/flashcards')
    app.register_blueprint(study, url_prefix='/study')
    app.register_blueprint(dashboard, url_prefix='/dashboard')
    app.register_blueprint(admin, url_prefix='/admin')
    
    # Create database tables
    with app.app_context():
        # Drop all tables and recreate them to ensure correct schema
        db.drop_all()
        db.create_all()
        
        # Create default admin user
        admin_user = User(
            username='admin',
            email='admin@quizletclone.com',
            first_name='Admin',
            last_name='User',
            role='admin'
        )
        admin_user.set_password('admin123')
        db.session.add(admin_user)
        
        # Create a sample student user
        student_user = User(
            username='student',
            email='student@example.com',
            first_name='John',
            last_name='Student',
            role='student'
        )
        student_user.set_password('student123')
        db.session.add(student_user)
        
        # Create a sample teacher user
        teacher_user = User(
            username='teacher',
            email='teacher@example.com',
            first_name='Jane',
            last_name='Teacher',
            role='teacher'
        )
        teacher_user.set_password('teacher123')
        db.session.add(teacher_user)
        
        db.session.commit()
        print("Database initialized with default users:")
        print("Admin: admin@quizletclone.com / admin123")
        print("Student: student@example.com / student123")
        print("Teacher: teacher@example.com / teacher123")
    
    return app
