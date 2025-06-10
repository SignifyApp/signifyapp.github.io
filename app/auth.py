from flask import Blueprint, redirect, url_for, request, flash
from flask_login import login_user, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from .models import User, db
from . import google_oauth

auth = Blueprint('auth', __name__)

@auth.route('/login', methods=['POST'])
def login():
    email = request.form.get('email')
    password = request.form.get('password')
    user = User.query.filter_by(email=email).first()
    
    if not user or not check_password_hash(user.password, password):
        flash('Invalid credentials')
        return redirect(url_for('main.index'))
    
    login_user(user)
    return redirect(url_for('main.dashboard'))

@auth.route('/google-login')
def google_login():
    return google_oauth.authorize_redirect(url_for('auth.google_callback', _external=True))

@auth.route('/google-callback')
def google_callback():
    token = google_oauth.authorize_access_token()
    user_info = google_oauth.get('https://www.googleapis.com/oauth2/v3/userinfo').json()
    
    user = User.query.filter_by(email=user_info['email']).first()
    
    if not user:
        user = User(
            email=user_info['email'],
            name=user_info.get('name'),
            avatar=user_info.get('picture'),
            provider='google'
        )
        db.session.add(user)
        db.session.commit()
    
    login_user(user)
    return redirect(url_for('main.dashboard'))

@auth.route('/signup', methods=['POST'])
def signup():
    email = request.form.get('email')
    name = request.form.get('name')
    password = request.form.get('password')
    
    if User.query.filter_by(email=email).first():
        flash('Email already exists')
        return redirect(url_for('main.index'))
    
    new_user = User(
        email=email,
        name=name,
        password=generate_password_hash(password),
        provider='email'
    )
    
    db.session.add(new_user)
    db.session.commit()
    login_user(new_user)
    return redirect(url_for('main.dashboard'))

@auth.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('main.index'))