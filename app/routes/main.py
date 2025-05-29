from flask import Blueprint, render_template, request
from app.models.flashcard import FlashcardSet
from app.models.user import User

main = Blueprint('main', __name__)

@main.route('/')
def home():
    # Get featured/popular flashcard sets
    featured_sets = FlashcardSet.query.filter_by(is_public=True).limit(6).all()
    total_users = User.query.count()
    total_sets = FlashcardSet.query.count()
    
    return render_template('home.html', 
                         featured_sets=featured_sets,
                         total_users=total_users,
                         total_sets=total_sets)

@main.route('/about')
def about():
    return render_template('about.html')

@main.route('/contact')
def contact():
    return render_template('contact.html')

@main.route('/search')
def search():
    query = request.args.get('q', '')
    sets = []
    
    if query:
        sets = FlashcardSet.query.filter(
            FlashcardSet.title.contains(query),
            FlashcardSet.is_public == True
        ).all()
    
    return render_template('search.html', sets=sets, query=query)
