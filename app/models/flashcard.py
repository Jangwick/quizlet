from datetime import datetime
from app import db

class FlashcardSet(db.Model):
    __tablename__ = 'flashcard_sets'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    is_public = db.Column(db.Boolean, nullable=False, default=False)
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    flashcards = db.relationship('Flashcard', backref='flashcard_set', lazy=True, cascade='all, delete-orphan', order_by='Flashcard.order')
    study_sessions = db.relationship('StudySession', backref='flashcard_set', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<FlashcardSet {self.title}>'

class Flashcard(db.Model):
    __tablename__ = 'flashcards'
    
    id = db.Column(db.Integer, primary_key=True)
    term = db.Column(db.Text, nullable=False)
    definition = db.Column(db.Text, nullable=False)
    order = db.Column(db.Integer, nullable=False, default=0)
    flashcard_set_id = db.Column(db.Integer, db.ForeignKey('flashcard_sets.id'), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    progress = db.relationship('UserProgress', backref='flashcard', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Flashcard {self.term}>'

class Tag(db.Model):
    __tablename__ = 'tags'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    
    def __repr__(self):
        return f'<Tag {self.name}>'

# Association table for many-to-many relationship
flashcard_set_tags = db.Table('flashcard_set_tags',
    db.Column('set_id', db.Integer, db.ForeignKey('flashcard_sets.id'), primary_key=True),
    db.Column('tag_id', db.Integer, db.ForeignKey('tags.id'), primary_key=True)
)
