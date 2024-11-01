from flask import Flask, request, jsonify
from flask_cors import CORS
from model import DemandForecastModel
from datetime import datetime
import dateutil.relativedelta
import json
import os

app = Flask(__name__)
CORS(app)

models = {}
DATASETS_DIR = 'datasets'
os.makedirs(DATASETS_DIR, exist_ok=True)

def generate_future_dates(last_date, num_months=3):
    last_date = datetime.strptime(last_date, '%Y-%m')
    future_dates = []
    for i in range(1, num_months + 1):
        next_date = last_date + dateutil.relativedelta.relativedelta(months=i)
        future_dates.append(next_date.strftime('%Y-%m'))
    return future_dates

def load_dataset():
    filename = os.path.join(DATASETS_DIR, 'demand_datasets.json')
    try:
        with open(filename, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return None

def save_dataset(data):
    filename = os.path.join(DATASETS_DIR, 'demand_datasets.json')
    with open(filename, 'w') as f:
        json.dump(data, f, indent=4)

def update_dataset_with_predictions(dataset, part_number, predictions, historical_data):
    """Update both historical data and predictions in the dataset"""
    if part_number in dataset:
        # Update historical data
        dataset[part_number]['historicalData'] = historical_data
        
        # Update predictions
        dataset[part_number]['predictions'] = [
            {
                'month': pred['month'],
                'demand': None,
                'prediction': pred['prediction']
            }
            for pred in predictions
        ]
    return dataset

@app.route('/api/datasets', methods=['GET', 'POST'])
def handle_datasets():
    if request.method == 'GET':
        data = load_dataset()
        if data is None:
            return jsonify({'error': 'Dataset not found'}), 404
        return jsonify(data)

    elif request.method == 'POST':
        data = request.json
        if not data:
            return jsonify({'error': 'Data is required'}), 400
        
        save_dataset(data)
        return jsonify({'message': 'Dataset saved successfully'})

@app.route('/api/train', methods=['POST'])
def train_model():
    data = request.json
    part_number = data['partNumber']
    historical_data = data['historicalData']
    
    # Train the model
    model = DemandForecastModel()
    model.train(historical_data)
    models[part_number] = model
    
    # Generate predictions
    last_date = historical_data[-1]['month']
    future_dates = generate_future_dates(last_date)
    predictions, confidence = model.predict(future_dates)
    
    # Format predictions
    prediction_data = [
        {'month': month, 'prediction': round(float(pred), 2)} 
        for month, pred in zip(future_dates, predictions)
    ]
    
    # Update dataset
    dataset = load_dataset()
    if dataset:
        dataset = update_dataset_with_predictions(dataset, part_number, prediction_data, historical_data)
        save_dataset(dataset)
    
    return jsonify({
        'predictions': prediction_data,
        'confidence': round(float(confidence), 2)
    })

@app.route('/api/predict/<part_number>', methods=['GET'])
def predict(part_number):
    dataset = load_dataset()
    if not dataset or part_number not in dataset:
        return jsonify({'error': 'Part number not found'}), 404
    
    last_date = request.args.get('lastDate')
    if not last_date:
        return jsonify({'error': 'Last date is required'}), 400
        
    # Get historical data
    historical_data = dataset[part_number]['historicalData']
    
    # Train model with updated data
    model = DemandForecastModel()
    model.train(historical_data)
    models[part_number] = model
    
    # Generate new predictions
    future_dates = generate_future_dates(last_date)
    predictions, confidence = model.predict(future_dates)
    
    # Format predictions
    prediction_data = [
        {'month': month, 'prediction': round(float(pred), 2)}
        for month, pred in zip(future_dates, predictions)
    ]
    
    # Update dataset with new predictions
    dataset = update_dataset_with_predictions(dataset, part_number, prediction_data, historical_data)
    save_dataset(dataset)
    
    return jsonify({
        'predictions': prediction_data,
        'confidence': round(float(confidence), 2)
    })

if __name__ == '__main__':
    app.run(debug=True)