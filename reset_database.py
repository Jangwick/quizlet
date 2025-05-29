import os
import sys

# Remove the existing database file
db_path = 'quizlet_clone.db'
if os.path.exists(db_path):
    os.remove(db_path)
    print(f"Removed existing database: {db_path}")
else:
    print("No existing database found.")

print("Database will be recreated when you run the app.")
print("Run: python run.py")
