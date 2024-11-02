import numpy as np
from sklearn.linear_model import Ridge
from sklearn.preprocessing import PolynomialFeatures
from datetime import datetime
import joblib

class DemandForecastModel:
    def __init__(self):
        self.model = Ridge(alpha=1.0)
        self.poly = PolynomialFeatures(degree=2, include_bias=False)

    def _prepare_features(self, dates):
        # Convert dates to numeric features
        numeric_dates = np.array([
            datetime.strptime(date, '%Y-%m').timestamp() 
            for date in dates
        ]).reshape(-1, 1)

        # Create polynomial features for non-linear trends
        return self.poly.fit_transform(numeric_dates)

    def train(self, historical_data):
        dates = [data['month'] for data in historical_data]
        demands = np.array([data['demand'] for data in historical_data])
        
        X = self._prepare_features(dates)
        self.model.fit(X, demands)

    def predict(self, future_dates):
        X_future = self._prepare_features(future_dates)
        predictions = self.model.predict(X_future)
        
        # Calculate confidence based on prediction variance
        confidence = np.clip(100 - np.std(predictions) / np.mean(predictions) * 100, 60, 95)
        
        return predictions, confidence

    def save(self, path):
        joblib.dump((self.model, self.poly), path)

    def load(self, path):
        self.model, self.poly = joblib.load(path)