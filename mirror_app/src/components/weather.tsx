import { useState, useEffect } from 'react';
import './weather.css';

interface WeatherData {
  dt: number;
  temp: {
    day: number;
    min: number;
    max: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  humidity: number;
  wind_speed: number;
}

interface HourlyWeather {
  dt: number;
  temp: number;
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  humidity: number;
  wind_speed: number;
  pop: number;
}

const Weather = () => {
  const [forecastData, setForecastData] = useState<WeatherData[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyWeather[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
  const ZIP_CODE = import.meta.env.VITE_ZIP_CODE;
  const COUNTRY_CODE = import.meta.env.VITE_COUNTRY_CODE || 'US';

  useEffect(() => {
    fetchWeatherData();
    
    // Calculate time until next midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    // Set timeout to refresh at midnight
    const midnightTimeout = setTimeout(() => {
      fetchWeatherData();
      
      // Set up daily interval after first midnight refresh
      const dailyInterval = setInterval(() => {
        fetchWeatherData();
      }, 24 * 60 * 60 * 1000); // 24 hours
      
      return () => clearInterval(dailyInterval);
    }, timeUntilMidnight);
    
    return () => clearTimeout(midnightTimeout);
  }, []);

  const fetchWeatherData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch 5-day forecast directly using ZIP code (free API)
      const forecastResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?zip=${ZIP_CODE},${COUNTRY_CODE}&units=imperial&appid=${API_KEY}`
      );

      if (!forecastResponse.ok) {
        throw new Error('Failed to fetch weather data');
      }

      const forecastData = await forecastResponse.json();
      
      // Process the 3-hour forecast data into daily forecasts
      const dailyForecasts: WeatherData[] = [];
      const dailyMap = new Map<string, any[]>();
      
      // Group forecasts by day
      forecastData.list.forEach((item: any) => {
        const date = new Date(item.dt * 1000).toDateString();
        if (!dailyMap.has(date)) {
          dailyMap.set(date, []);
        }
        dailyMap.get(date)?.push(item);
      });
      
      // Convert to daily format
      Array.from(dailyMap.entries()).slice(0, 7).forEach(([date, items]) => {
        const temps = items.map(item => item.main.temp);
        const maxTemp = Math.max(...temps);
        const minTemp = Math.min(...temps);
        
        // Use midday forecast for weather icon/description
        const middayForecast = items[Math.floor(items.length / 2)];
        
        dailyForecasts.push({
          dt: items[0].dt,
          temp: {
            day: middayForecast.main.temp,
            min: minTemp,
            max: maxTemp
          },
          weather: middayForecast.weather,
          humidity: middayForecast.main.humidity,
          wind_speed: middayForecast.wind.speed
        });
      });
      
      setForecastData(dailyForecasts);
      setHourlyData(forecastData.list.map((item: any) => ({
        dt: item.dt,
        temp: item.main.temp,
        weather: item.weather,
        humidity: item.main.humidity,
        wind_speed: item.wind.speed,
        pop: item.pop || 0
      })));
      
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const handleDayClick = (index: number) => {
    if (selectedDay === index) {
      setSelectedDay(null);
    } else {
      setSelectedDay(index);
    }
  };

  const getHourlyDataForDay = (dayTimestamp: number): HourlyWeather[] => {
    const dayStart = new Date(dayTimestamp * 1000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    return hourlyData.filter(hour => {
      const hourDate = new Date(hour.dt * 1000);
      return hourDate >= dayStart && hourDate <= dayEnd;
    });
  };

  const formatDay = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatHour = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
  };

  if (loading) {
    return (
      <div className="weather-container">
        <div className="weather-loading">Loading weather data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="weather-container">
        <div className="weather-error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="weather-container">
      {selectedDay !== null && (
        <div className="hourly-detail-panel">
          <div className="hourly-header">
            <h3>{formatDay(forecastData[selectedDay].dt)} - Hourly Forecast</h3>
            <button 
              className="close-button"
              onClick={() => setSelectedDay(null)}
            >
              ✕
            </button>
          </div>
          <div className="hourly-scroll">
            {getHourlyDataForDay(forecastData[selectedDay].dt).map((hour, idx) => (
              <div key={idx} className="hourly-item">
                <div className="hourly-time">{formatHour(hour.dt)}</div>
                <img
                  src={`https://openweathermap.org/img/wn/${hour.weather[0].icon}@2x.png`}
                  alt={hour.weather[0].description}
                  className="hourly-icon"
                />
                <div className="hourly-temp">{Math.round(hour.temp)}°F</div>
                <div className="hourly-details">
                  <div className="hourly-detail-item">&#128167;	{hour.humidity}%</div>
                  <div className="hourly-detail-item">&#x1F327; {Math.round(hour.pop * 100)}%</div>
                  <div className="hourly-detail-item">&#x1F32C; {Math.round(hour.wind_speed)} mph</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="forecast-strip">
        {forecastData.map((day, index) => (
          <div
            key={index}
            className={`forecast-day ${selectedDay === index ? 'selected' : ''}`}
            onClick={() => handleDayClick(index)}
          >
            <div className="day-name">{formatDay(day.dt)}</div>
            <img
              src={`https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png`}
              alt={day.weather[0].description}
              className="weather-icon"
            />
            <div className="temp-range">
              <span className="temp-high">{Math.round(day.temp.max)}°</span>
              <span className="temp-low">{Math.round(day.temp.min)}°</span>
            </div>
            <div className="weather-description">{day.weather[0].main}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Weather;