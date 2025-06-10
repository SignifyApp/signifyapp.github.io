from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime
import uuid

db = SQLAlchemy()

class User(db.Model, UserMixin):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200))  # Nullable for OAuth users
    name = db.Column(db.String(100))
    avatar = db.Column(db.String(200))
    provider = db.Column(db.String(50))  # 'google' or 'email'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    meetings = db.relationship('Meeting', backref='host', lazy=True)

class Meeting(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    meeting_id = db.Column(db.String(50), unique=True, nullable=False)
    title = db.Column(db.String(100))
    description = db.Column(db.Text)
    host_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    start_time = db.Column(db.DateTime)
    end_time = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)