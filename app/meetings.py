from flask import Blueprint, request, jsonify, redirect, url_for
from flask_login import login_required, current_user
from .models import Meeting, db
import random
import string

meetings = Blueprint('meetings', __name__)

def generate_meeting_id():
    return ''.join(random.choices(string.ascii_letters + string.digits, k=10))

@meetings.route('/create', methods=['POST'])
@login_required
def create_meeting():
    title = request.form.get('title', 'New Meeting')
    description = request.form.get('description', '')
    
    meeting = Meeting(
        meeting_id=generate_meeting_id(),
        title=title,
        description=description,
        host_id=current_user.id
    )
    
    db.session.add(meeting)
    db.session.commit()
    
    return redirect(url_for('meeting.room', meeting_id=meeting.meeting_id))

@meetings.route('/join', methods=['POST'])
@login_required
def join_meeting():
    meeting_id = request.form.get('meeting_id')
    meeting = Meeting.query.filter_by(meeting_id=meeting_id, is_active=True).first()
    
    if not meeting:
        flash('Meeting not found or has ended')
        return redirect(url_for('main.dashboard'))
    
    return redirect(url_for('meeting.room', meeting_id=meeting.meeting_id))

@meetings.route('/<meeting_id>')
@login_required
def room(meeting_id):
    meeting = Meeting.query.filter_by(meeting_id=meeting_id, is_active=True).first()
    if not meeting:
        return redirect(url_for('main.dashboard'))
    
    return render_template('meeting.html', meeting=meeting)