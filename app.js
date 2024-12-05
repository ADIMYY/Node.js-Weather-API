import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, 'config.env') });

const app = express();
const apiKey = process.env.API_KEY;

app.use(express.json());


const convertTemperature = (temp, unit = 'F') => {
    switch(unit.toUpperCase()) {
        case 'C':
            return ((temp - 32) * 5/9).toFixed(1);
        case 'K':
            return ((temp - 32) * 5/9 + 273.15).toFixed(1);
        case 'F':
        default:
            return temp.toFixed(1);
    }
};


app.get('/', async (req, res) => {
    const {city, unit = 'C' } = req.body;
    const url = process.env.URL.replace('<CITY>', city).replace('<APIKEY>', apiKey);

    try {
        const response = await axios.get(url);
        const weather = response.data;


        const temp = convertTemperature(weather.main.temp, unit);
        const weatherText = `It's ${temp}° ${unit} in ${weather.name}!`;
        
        res.status(200).json({ 
            temp: temp, 
            unit: unit,
            city: weather.name,
            fullResponse: weatherText 
        });
    } catch (error) {
        console.log('Weather API Error', error);
        res.status(500).json({ msg: 'Provide a valide city name' });
    }
});

app.listen(4000, () => {
    console.log('listening on port 4000!');
});