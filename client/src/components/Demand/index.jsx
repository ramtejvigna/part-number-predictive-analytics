import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
    ChevronDown, 
    PlusCircle, 
    BarChart2, 
    Brain, 
    Percent, 
    TrendingUp, 
    TrendingDown,
    Database,
    Calculator,
    AlertCircle
} from "lucide-react"

const DemandForecastDashboard = () => {
    const [allData, setAllData] = useState({});
    const [historicalData, setHistoricalData] = useState([]);
    const [predictions, setPredictions] = useState([]);
    const [selectedPartNumber, setSelectedPartNumber] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [confidenceScore, setConfidenceScore] = useState(85);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // In a real application, this would be an API call
                // For now, we'll simulate loading the data
                const response = await fetch('http://localhost:5000/api/datasets');
                if (!response.ok) {
                    throw new Error('Failed to load datasets');
                }
                const datasets = await response.json();
                console.log(datasets)
                setAllData(datasets);

                // Set initial part number and data
                const initialPartNumber = Object.keys(datasets)[0];
                setSelectedPartNumber(initialPartNumber);
                setHistoricalData(datasets[initialPartNumber].historicalData);
                setPredictions(datasets[initialPartNumber].predictions);

            } catch (err) {
                setError('Failed to load initial data: ' + err.message);
            } finally {
                setIsLoading(false);
            }
        };

        loadInitialData();
    }, []);

    useEffect(() => {
        if (allData[selectedPartNumber]) {
            setHistoricalData(allData[selectedPartNumber].historicalData);
            setPredictions(allData[selectedPartNumber].predictions || []);
        }
    }, [selectedPartNumber, allData]);

    useEffect(() => {
        const trainModel = async () => {
            if (!historicalData.length) return;

            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch('http://localhost:5000/api/train', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        partNumber: selectedPartNumber,
                        historicalData: historicalData,
                    }),
                });

                if (!response.ok) {
                    throw new Error('Failed to train model');
                }

                const data = await response.json();
                setPredictions(data.predictions);
                setConfidenceScore(data.confidence);

                // Update the full dataset
                setAllData(prevData => ({
                    ...prevData,
                    [selectedPartNumber]: {
                        ...prevData[selectedPartNumber],
                        predictions: data.predictions
                    }
                }));
            } catch (err) {
                setError('Failed to train model: ' + err.message);
            } finally {
                setIsLoading(false);
            }
        };

        trainModel();
    }, [selectedPartNumber, historicalData]);

    const handlePartNumberSelect = (partNumber) => {
        setSelectedPartNumber(partNumber);
    };

    const handleAddData = async () => {
        try {
            const lastEntry = historicalData[historicalData.length - 1];
            const [year, month] = lastEntry.month.split('-');
            const nextMonth = month === '12'
                ? `${parseInt(year) + 1}-01`
                : `${year}-${String(parseInt(month) + 1).padStart(2, '0')}`;

            const newDemand = Math.floor(Math.random() * 50) + 110;

            const newHistoricalData = [
                ...historicalData,
                {
                    month: nextMonth,
                    demand: newDemand,
                    prediction: null
                }
            ];

            setHistoricalData(newHistoricalData);

            const response = await fetch(`http://localhost:5000/api/predict/${selectedPartNumber}?lastDate=${nextMonth}`);
            if (!response.ok) {
                throw new Error('Failed to get predictions');
            }

            const data = await response.json();
            setPredictions(data.predictions);
            setConfidenceScore(data.confidence);

            // Update and save the full dataset
            const updatedData = {
                ...allData,
                [selectedPartNumber]: {
                    ...allData[selectedPartNumber],
                    historicalData: newHistoricalData,
                    predictions: data.predictions
                }
            };

            setAllData(updatedData);

            // Save to backend
            await fetch('http://localhost:5000/api/datasets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedData),
            });
        } catch (err) {
            setError('Failed to update data: ' + err.message);
        }
    };

    const combinedData = [...historicalData, ...predictions];

    // Calculate trend
    const calculateTrend = () => {
        if (historicalData.length < 2) return 'Not enough data';
        const firstDemand = historicalData[0].demand;
        const lastDemand = historicalData[historicalData.length - 1].demand;
        return lastDemand > firstDemand ? 'Increasing' : 'Decreasing';
    };

    return (
        <div className="w-full max-w-6xl mx-auto py-6 space-y-6 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-600 to-blue-800 bg-clip-text text-transparent">
                        Demand Forecast Dashboard
                    </h1>
                    <p className="text-gray-500 text-lg">ML-powered demand prediction system</p>
                </div>
                <div className="flex gap-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button 
                                variant="outline" 
                                className="min-w-[180px] transition-all duration-200 hover:border-blue-500"
                            >
                                <span className="flex items-center gap-2">
                                    <Database className="w-4 h-4" />
                                    {selectedPartNumber || 'Select Part Number'}
                                    <ChevronDown className="w-4 h-4 ml-auto" />
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[180px]">
                            <DropdownMenuLabel>Part Numbers</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {Object.keys(allData).map(partNumber => (
                                <DropdownMenuItem 
                                    key={partNumber}
                                    onSelect={() => handlePartNumberSelect(partNumber)}
                                    className="cursor-pointer hover:bg-blue-50 transition-colors"
                                >
                                    {partNumber}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                        onClick={handleAddData}
                        className="group transition-all duration-200 hover:bg-blue-600"
                    >
                        <PlusCircle className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-200" />
                        Add Data
                    </Button>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <Alert variant="destructive" className="animate-in slide-in-from-top duration-500">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart */}
                <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6 pt-20">
                    <div className="mb-4">
                        <h2 className="text-xl font-semibold">Demand Trends & Predictions</h2>
                    </div>
                    <div>
                        {isLoading ? (
                            <div className="h-[400px] flex items-center justify-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={combinedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="demand"
                                        stroke="#2563eb"
                                        strokeWidth={2}
                                        dot={{ r: 6 }}
                                        activeDot={{ r: 8 }}
                                        name="Historical Demand"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="prediction"
                                        stroke="#dc2626"
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        dot={{ r: 6 }}
                                        name="Predicted Demand"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Sidebar Cards */}
                <div className="space-y-6">
                    {/* ML Model Info */}
                    <Card className="transition-all duration-300 hover:shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Brain className="w-5 h-5 text-purple-500" />
                                Model Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Type</h3>
                                <p className="mt-1 font-medium">Ridge Regression with Polynomial Features</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Features</h3>
                                <p className="mt-1 font-medium">Time-based with non-linear transformations</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Confidence Score */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-xl font-semibold mb-4">Prediction Confidence</h2>
                        <div className="relative pt-1">
                            <div className="flex mb-2 items-center justify-between">
                                <div>
                                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-100">
                                        Confidence
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-semibold inline-block text-blue-600">
                                        {confidenceScore.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                                <div
                                    style={{ width: `${confidenceScore}%` }}
                                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <Card className="transition-all duration-300 hover:shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calculator className="w-5 h-5 text-blue-500" />
                                Quick Stats
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg transition-colors hover:bg-gray-100">
                                    <span className="text-gray-600">Average Demand</span>
                                    <span className="font-semibold">
                                        {historicalData.length ? Math.round(
                                            historicalData.reduce((acc, curr) => acc + curr.demand, 0) /
                                            historicalData.length
                                        ) : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg transition-colors hover:bg-gray-100">
                                    <span className="text-gray-600">Trend</span>
                                    <span className={`flex items-center gap-2 font-semibold ${
                                        calculateTrend() === 'Increasing' ? 'text-green-500' : 'text-red-500'
                                    }`}>
                                        {calculateTrend() === 'Increasing' ? (
                                            <TrendingUp className="w-4 h-4" />
                                        ) : (
                                            <TrendingDown className="w-4 h-4" />
                                        )}
                                        {calculateTrend()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg transition-colors hover:bg-gray-100">
                                    <span className="text-gray-600">Data Points</span>
                                    <span className="font-semibold">{historicalData.length}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default DemandForecastDashboard;