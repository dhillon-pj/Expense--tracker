from flask import Flask, render_template, request, jsonify
from datetime import datetime

app = Flask(__name__)

transactions = []
transaction_id_counter = 0

def get_next_id():
    global transaction_id_counter
    transaction_id_counter += 1
    return transaction_id_counter

def transaction_to_dict(t):
    return {
        'id': t['id'],
        'description': t['description'],
        'amount': t['amount'],
        'type': t['type'],
        'category': t['category'],
        'date': t['date'].strftime('%Y-%m-%d %H:%M')
    }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    type_filter = request.args.get('type')
    category_filter = request.args.get('category')
    
    filtered = transactions
    if type_filter:
        filtered = [t for t in filtered if t['type'] == type_filter]
    if category_filter:
        filtered = [t for t in filtered if t['category'] == category_filter]
    
    filtered = sorted(filtered, key=lambda t: t['date'], reverse=True)
    return jsonify([transaction_to_dict(t) for t in filtered])

@app.route('/api/transactions', methods=['POST'])
def add_transaction():
    data = request.json
    transaction = {
        'id': get_next_id(),
        'description': data['description'],
        'amount': float(data['amount']),
        'type': data['type'],
        'category': data['category'],
        'date': datetime.utcnow()
    }
    transactions.append(transaction)
    return jsonify(transaction_to_dict(transaction)), 201

@app.route('/api/transactions/<int:id>', methods=['DELETE'])
def delete_transaction(id):
    global transactions
    transactions = [t for t in transactions if t['id'] != id]
    return '', 204

@app.route('/api/summary', methods=['GET'])
def get_summary():
    total_income = sum(t['amount'] for t in transactions if t['type'] == 'income')
    total_expense = sum(t['amount'] for t in transactions if t['type'] == 'expense')
    balance = total_income - total_expense
    
    category_data = {}
    for t in transactions:
        if t['type'] == 'expense':
            category_data[t['category']] = category_data.get(t['category'], 0) + t['amount']
    
    return jsonify({
        'total_income': total_income,
        'total_expense': total_expense,
        'balance': balance,
        'category_data': category_data
    })

if __name__ == '__main__':
    app.run(debug=True)