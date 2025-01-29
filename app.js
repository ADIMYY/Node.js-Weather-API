import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

// Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, 'config.env') });

// Constants
const TOMORROW_API_CONFIG = {
    BASE_URL: process.env.BASE_URL,
    API_KEY: process.env.TOMORROW_API_KEY,
    LOCATION: {
        LAT: '21.422510',
        LON: '39.826168'
    }
};

const PORT = process.env.PORT || 4000;

// Utility functions
const formatters = {
    windSpeed: (speedInMS) => (speedInMS * 3.6).toFixed(1),
    percentage: (value) => parseFloat(value).toFixed(1)
};

// API client
const weatherClient = {
    headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'application/json'
    },

    async getCurrentWeather() {
        const response = await axios.get(TOMORROW_API_CONFIG.BASE_URL, {
            params: {
                location: `${TOMORROW_API_CONFIG.LOCATION.LAT},${TOMORROW_API_CONFIG.LOCATION.LON}`,
                apikey: TOMORROW_API_CONFIG.API_KEY,
                units: 'metric',
                fields: ['temperature', 'windSpeed', 'humidity', 'precipitationProbability']
            },
            headers: this.headers
        });

        const currentData = response.data.timelines.minutely[0]?.values;
        if (!currentData) {
            throw new Error('Current weather data not found in response');
        }

        return {
            temperature: currentData.temperature,
            windSpeed: formatters.windSpeed(currentData.windSpeed),
            humidity: formatters.percentage(currentData.humidity),
            rainChance: formatters.percentage(currentData.precipitationProbability)
        };
    },

    async getWeatherForecast() {
        const response = await axios.get(TOMORROW_API_CONFIG.BASE_URL, {
            params: {
                location: `${TOMORROW_API_CONFIG.LOCATION.LAT},${TOMORROW_API_CONFIG.LOCATION.LON}`,
                apikey: TOMORROW_API_CONFIG.API_KEY,
                units: 'metric',
                timesteps: '1d',
                startTime: 'now',
                endTime: 'nowPlus7d',
                fields: ['temperature', 'weatherCode']
            },
            headers: this.headers
        });

        return response.data.timelines.daily.map(day => {
            const date = new Date(day.time);
            return {
                dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
                date: date.toLocaleDateString(),
                temperature: {
                    avg: day.values.temperatureAvg,
                    max: day.values.temperatureMax,
                    min: day.values.temperatureMin
                },
                weatherCode: day.values.weatherCodeMax
            };
        });
    }
};

// Express app setup
const app = express();
app.use(express.json());

// Routes
app.get('/', async (req, res) => {
    try {
        const [current, dailyTemperatures] = await Promise.all([
            weatherClient.getCurrentWeather(),
            weatherClient.getWeatherForecast()
        ]);

        res.status(200).json({
            location: {
                lat: TOMORROW_API_CONFIG.LOCATION.LAT,
                lon: TOMORROW_API_CONFIG.LOCATION.LON
            },
            current,
            dailyTemperatures
        });
    } catch (error) {
        console.error('Weather API Error:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to fetch weather data',
            details: error.response?.data || error.message
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}!`);
});
