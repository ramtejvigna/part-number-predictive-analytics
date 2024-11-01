import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json

class DemandDataGenerator:
    def __init__(self, start_date='2023-01', num_months=12, base_demand=150):
        self.start_date = datetime.strptime(start_date, '%Y-%m')
        self.num_months = num_months
        self.base_demand = base_demand
        
    def _generate_seasonal_pattern(self):
        # Create seasonal pattern with peaks in summer and winter
        t = np.linspace(0, 2*np.pi, 12)
        seasonal = 0.2 * np.sin(t) + 0.15 * np.sin(2*t)
        return np.tile(seasonal, int(np.ceil(self.num_months/12)))[:self.num_months]
    
    def _generate_trend(self):
        # Generate linear trend with some randomness
        trend_slope = np.random.uniform(0.02, 0.05)
        trend = np.arange(self.num_months) * trend_slope
        return trend
    
    def _add_noise(self, data):
        # Add random noise to make data more realistic
        noise = np.random.normal(0, 0.05, self.num_months)
        return data * (1 + noise)
    
    def generate_data(self, part_number='PART-001'):
        # Generate date range
        dates = [(self.start_date + timedelta(days=30*i)).strftime('%Y-%m') 
                for i in range(self.num_months)]
        
        # Combine components
        seasonal = self._generate_seasonal_pattern()
        trend = self._generate_trend()
        base = np.ones(self.num_months)
        
        # Calculate final demand
        demand = self.base_demand * (base + seasonal + trend)
        demand = self._add_noise(demand)
        demand = np.round(demand).astype(int)
        
        # Create historical data in the required format
        historical_data = [
            {
                'month': month,
                'demand': int(dem),
                'prediction': None
            }
            for month, dem in zip(dates, demand)
        ]
        
        # Generate future months for predictions
        future_dates = [(self.start_date + timedelta(days=30*(self.num_months+i))).strftime('%Y-%m') 
                       for i in range(3)]
        
        predictions = [
            {
                'month': month,
                'demand': None,
                'prediction': None  # This will be filled by the ML model
            }
            for month in future_dates
        ]
        
        return {
            'partNumber': part_number,
            'historicalData': historical_data,
            'predictions': predictions
        }

def generate_multiple_parts(num_parts=3, **kwargs):
    generator = DemandDataGenerator(**kwargs)
    datasets = {}
    
    for i in range(1, num_parts + 1):
        part_number = f'PART-{str(i).zfill(3)}'
        # Vary base demand for different parts
        generator.base_demand = np.random.randint(100, 200)
        datasets[part_number] = generator.generate_data(part_number)
    
    return datasets

if __name__ == '__main__':
    # Generate sample datasets
    datasets = generate_multiple_parts(
        num_parts=10,
        start_date='2023-01',
        num_months=12,
    )
    
    # Save to JSON file
    with open('demand_datasets.json', 'w') as f:
        json.dump(datasets, f, indent=2)
    
    # Print sample statistics
    for part_number, data in datasets.items():
        historical = data['historicalData']
        demands = [d['demand'] for d in historical]
        print(f"\nStatistics for {part_number}:")
        print(f"Average Demand: {np.mean(demands):.1f}")
        print(f"Min Demand: {np.min(demands)}")
        print(f"Max Demand: {np.max(demands)}")
        print(f"Standard Deviation: {np.std(demands):.1f}")