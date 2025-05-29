from datetime import datetime
from app import db

class StudySession(db.Model):
    __tablename__ = 'study_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    flashcard_set_id = db.Column(db.Integer, db.ForeignKey('flashcard_sets.id'), nullable=False)
    mode = db.Column(db.String(50), nullable=False)  # flashcards, learn, test, match
    start_time = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    end_time = db.Column(db.DateTime)
    score = db.Column(db.Float)
    total_questions = db.Column(db.Integer)
    correct_answers = db.Column(db.Integer)
    
    def __repr__(self):
        return f'<StudySession {self.mode} for Set {self.flashcard_set_id}>'

class UserProgress(db.Model):
    __tablename__ = 'user_progress'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    flashcard_id = db.Column(db.Integer, db.ForeignKey('flashcards.id'), nullable=False)
    correct_count = db.Column(db.Integer, nullable=False, default=0)
    incorrect_count = db.Column(db.Integer, nullable=False, default=0)
    last_studied = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    mastery_level = db.Column(db.Integer, nullable=False, default=0)  # 0-5 scale
    
    # Composite unique constraint
    __table_args__ = (db.UniqueConstraint('user_id', 'flashcard_id', name='unique_user_flashcard'),)
    
    def __repr__(self):
        return f'<UserProgress User {self.user_id} Card {self.flashcard_id}>'
