import string
import random
from datetime import datetime
from flask import Flask, g, jsonify, request, redirect, url_for
from functools import wraps
import sqlite3

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

def get_db():
    db = getattr(g, '_database', None)

    if db is None:
        db = g._database = sqlite3.connect('db/watchparty.sqlite3')
        db.row_factory = sqlite3.Row
        setattr(g, '_database', db)
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def query_db(query, args=(), one=False):
    db = get_db()
    cursor = db.execute(query, args)
    rows = cursor.fetchall()
    db.commit()
    cursor.close()
    if rows:
        if one: 
            return rows[0]
        return rows
    return None

def new_user():
    name = "User #" + ''.join(random.choices(string.digits, k=6))
    password = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
    api_key = ''.join(random.choices(string.ascii_lowercase + string.digits, k=40))
    u = query_db('insert into users (name, password, api_key) ' + 
        'values (?, ?, ?) returning id, name, password, api_key',
        (name, password, api_key),
        one=True)
    return u

# TODO: If your app sends users to any other routes, include them here.
#       (This should not be necessary).
@app.route('/')
@app.route('/profile')
@app.route('/login')
@app.route('/room')
@app.route('/room/<chat_id>')
def index(chat_id=None):
    return app.send_static_file('index.html')

@app.errorhandler(404)
def page_not_found(e):
    return app.send_static_file('404.html'), 404

@app.route('/rooms/new', methods=['POST'])
def create_room():
    name = "Unnamed Room " + ''.join(random.choices(string.digits, k=6))
    room = query_db('insert into rooms (name) values (?) returning id, name', [name], one=True)            
    if room:
        print("newroom:", room)
        return jsonify({'id': room['id'], 'name': room['name']})
    return jsonify({'error': 'Could not create room'}), 500


# -------------------------------- API ROUTES ----------------------------------

@app.route('/api/rooms', methods=['GET'])
def get_rooms():
    rooms = query_db('select * from rooms')
    if rooms:
        rooms_list = [dict(row) for row in rooms]
        return jsonify(rooms_list)
    return jsonify([])

# POST to change the name of a room
@app.route('/api/roomname', methods=['POST'])
def update_roomname():
    data=request.get_json()
    room_id = data.get('roomID')
    new_name = data.get('updatedName')
    try:
        query = "UPDATE rooms SET name=? Where id=?"
        cursor = get_db().cursor()
        cursor.execute(query, (new_name,room_id))
        get_db().commit()
    except Exception as e:
        return jsonify({'error': 'Database error'}),500
    return jsonify({'message': 'Room name updated'}), 200


# get all messages in that room
@app.route('/api/allmessages', methods=['GET'])
def get_room_messages():
    room_id=request.args.get('roomID')
    print("this is room id from all messages: ",room_id)
    messages = query_db('SELECT * FROM messages WHERE room_id = ? ',[room_id],one=False)
    if messages:
        return jsonify([dict(msg) for msg in messages])
    return [],200

# POST to post a new message to a room
@app.route('/api/newmessage', methods=['POST'])
def add_message():
    data = request.get_json()
    room_id = data.get('roomID')
    user_id = request.headers.get('X-User-ID')
    msg = data.get('message')
    
    if not room_id or not user_id or not msg:
        return jsonify({'error': 'Missing data'}), 400

    try:
        query = 'INSERT INTO messages (user_id, room_id, body) VALUES (?, ?, ?);'
        query_db(query, [user_id, room_id, msg])
        return jsonify({'message': 'Message added successfully'}), 200
    except Exception as e:
        return jsonify({'error': 'Database error'}), 500

@app.route('/api/signup', methods=['GET'])
def signup():
    user = new_user()
    if user:
        return jsonify({'name': user['name'], 'password': user['password'], 'api_key': user['api_key']})
    return jsonify({'error': 'Could not create user'}), 500

@app.route('/api/update_user', methods=['PUT'])
def update_user():
    api_key=request.headers.get('X-API-Key')
    user_id=request.headers.get('X-User-ID')
    print(user_id, api_key)
    if user_id and api_key:
        confirm=query_db('SELECT * FROM users WHERE name = ? AND api_key = ?', [user_id, api_key], one=True)
        if not confirm:
            return jsonify({'error': 'Unauthorized'}),401
    data = request.get_json()
    print(data)
    username = data.get('username')
    password = data.get('password')
    try:
        if username:
            query_db('UPDATE users SET name = ? WHERE api_key = ?', [username, api_key])
        if password:
            query_db('UPDATE users SET password = ? WHERE api_key = ?', [password, api_key])
        return jsonify({'message': 'User updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': 'Database error', 'details': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if username and password:
        user = query_db('SELECT * FROM users WHERE name = ? AND password = ?', [username, password], one=True)
        if user:
            return jsonify({'id': user['id'], 'name': user['name'], 'api_key': user['api_key']})
    return jsonify({'error': 'Invalid username or password'}), 401