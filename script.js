const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';

let debounceTimer;
let currentCityName = '';

const elements = {
    searchInput: document.getElementById('searchInput'),
    suggestionsDropdown: document.getElementById('suggestionsDropdown'),
    weatherContent: document.getElementById('weatherContent'),
    loadingState: document.getElementById('loadingState'),
    errorState: document.getElementById('errorState'),
    locationName: document.getElementById('locationName'),
    locationTime: document.getElementById('locationTime'),
    temperature: document.getElementById('temperature'),
    condition: document.getElementById('condition'),
    feelsLike: document.getElementById('feelsLike'),
    weatherIcon: document.getElementById('weatherIcon'),
    weatherDetails: document.getElementById('weatherDetails'),
    forecastGrid: document.getElementById('forecastGrid')
};

// Weather code mapping for Open-Meteo
const weatherCodes = {
    0: { icon: '☀️', description: 'Clear sky' },
    1: { icon: '🌤️', description: 'Mainly clear' },
    2: { icon: '⛅', description: 'Partly cloudy' },
    3: { icon: '☁️', description: 'Overcast' },
    45: { icon: '🌫️', description: 'Foggy' },
    48: { icon: '🌫️', description: 'Depositing rime fog' },
    51: { icon: '🌧️', description: 'Light drizzle' },
    53: { icon: '🌧️', description: 'Moderate drizzle' },
    55: { icon: '🌧️', description: 'Dense drizzle' },
    61: { icon: '🌧️', description: 'Slight rain' },
    63: { icon: '🌧️', description: 'Moderate rain' },
    65: { icon: '🌧️', description: 'Heavy rain' },
    71: { icon: '❄️', description: 'Slight snow' },
    73: { icon: '❄️', description: 'Moderate snow' },
    75: { icon: '❄️', description: 'Heavy snow' },
    77: { icon: '❄️', description: 'Snow grains' },
    80: { icon: '🌧️', description: 'Slight rain showers' },
    81: { icon: '🌧️', description: 'Moderate rain showers' },
    82: { icon: '🌧️', description: 'Violent rain showers' },
    85: { icon: '❄️', description: 'Slight snow showers' },
    86: { icon: '❄️', description: 'Heavy snow showers' },
    95: { icon: '⛈️', description: 'Thunderstorm' },
    96: { icon: '⛈️', description: 'Thunderstorm with hail' },
    99: { icon: '⛈️', description: 'Thunderstorm with hail' }
};

/**
 * Fetch city suggestions based on user input
 * @param {string} query - The search query
 */
async function fetchCitySuggestions(query) {
    if (!query || query.length < 2) {
        elements.suggestionsDropdown.classList.remove('active');
        return;
    }

    try {
        const response = await fetch(
            `${GEOCODING_API}?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
        );
        const data = await response.json();
        const cities = data.results || [];

        if (cities.length === 0) {
            elements.suggestionsDropdown.classList.remove('active');
            return;
        }

        displaySuggestions(cities);
    } catch (error) {
        console.error('Error fetching suggestions:', error);
    }
}

/**
 * Display city suggestions in dropdown
 * @param {Array} cities - Array of city objects
 */
function displaySuggestions(cities) {
    elements.suggestionsDropdown.innerHTML = '';

    cities.forEach(city => {
        const suggestion = document.createElement('div');
        suggestion.className = 'suggestion-item';
        const countryName = city.country || '';
        const adminName = city.admin1 ? `, ${city.admin1}` : '';
        suggestion.innerHTML = `
            <i class="fas fa-map-marker-alt suggestion-icon"></i>
            <div class="suggestion-text">
                <strong>${city.name}</strong>${adminName}, ${countryName}
            </div>
        `;
        suggestion.addEventListener('click', () => selectCity(city));
        elements.suggestionsDropdown.appendChild(suggestion);
    });

    elements.suggestionsDropdown.classList.add('active');
}

/**
 * Handle city selection from suggestions
 * @param {Object} city - The selected city object
 */
function selectCity(city) {
    const adminName = city.admin1 ? `, ${city.admin1}` : '';
    currentCityName = `${city.name}${adminName}, ${city.country}`;
    elements.searchInput.value = currentCityName;
    elements.suggestionsDropdown.classList.remove('active');
    fetchWeather(city.latitude, city.longitude);
}

/**
 * Fetch weather data for given coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 */
async function fetchWeather(lat, lon) {
    showLoading();

    try {
        const response = await fetch(
            `${WEATHER_API}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,visibility&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
        );
        const weatherData = await response.json();
        displayWeather(weatherData);
    } catch (error) {
        showError('Failed to fetch weather data. Please try again.');
        console.error('Error fetching weather:', error);
    }
}

/**
 * Display weather information on the page
 * @param {Object} data - Weather data from API
 */
function displayWeather(data) {
    const current = data.current;
    const daily = data.daily;

    // Location and time
    elements.locationName.textContent = currentCityName;
    elements.locationTime.textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Temperature
    const temp = Math.round(current.temperature_2m);
    elements.temperature.textContent = `${temp}°`;
    
    const weatherInfo = weatherCodes[current.weather_code] || { icon: '🌤️', description: 'Unknown' };
    elements.condition.textContent = weatherInfo.description;
    elements.feelsLike.textContent = `Feels like ${Math.round(current.apparent_temperature)}°`;

    // Weather icon
    elements.weatherIcon.textContent = weatherInfo.icon;

    // Weather details
    displayWeatherDetails(current);

    // Forecast
    displayForecast(daily);

    showWeather();
}

/**
 * Display detailed weather information
 * @param {Object} current - Current weather data
 */
function displayWeatherDetails(current) {
    const windSpeed = current.wind_speed_10m;
    const visibility = (current.visibility / 1000).toFixed(1);
    
    elements.weatherDetails.innerHTML = `
        <div class="detail-item">
            <div class="detail-label"><i class="fas fa-tint"></i> Humidity</div>
            <div class="detail-value">${current.relative_humidity_2m}%</div>
        </div>
        <div class="detail-item">
            <div class="detail-label"><i class="fas fa-wind"></i> Wind Speed</div>
            <div class="detail-value">${Math.round(windSpeed)} km/h</div>
        </div>
        <div class="detail-item">
            <div class="detail-label"><i class="fas fa-compress"></i> Temperature</div>
            <div class="detail-value">${Math.round(current.temperature_2m)}°C</div>
        </div>
        <div class="detail-item">
            <div class="detail-label"><i class="fas fa-eye"></i> Visibility</div>
            <div class="detail-value">${visibility} km</div>
        </div>
    `;
}

/**
 * Display 3-day forecast
 * @param {Object} daily - Daily forecast data
 */
function displayForecast(daily) {
    elements.forecastGrid.innerHTML = '';
    
    const times = daily.time;
    const codes = daily.weather_code;
    const maxTemps = daily.temperature_2m_max;
    const minTemps = daily.temperature_2m_min;

    for (let i = 1; i < Math.min(4, times.length); i++) {
        const date = new Date(times[i]);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        
        const weatherInfo = weatherCodes[codes[i]] || { icon: '🌤️', description: 'Unknown' };
        const high = Math.round(maxTemps[i]);
        const low = Math.round(minTemps[i]);

        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
            <div class="forecast-day">${dayName}</div>
            <div class="forecast-icon">${weatherInfo.icon}</div>
            <div class="forecast-temp">
                <span class="forecast-high">${high}°</span>
                <span class="forecast-low">${low}°</span>
            </div>
        `;
        elements.forecastGrid.appendChild(card);
    }
}

/**
 * Show weather content and hide other states
 */
function showWeather() {
    elements.weatherContent.classList.remove('hidden');
    elements.loadingState.classList.add('hidden');
    elements.errorState.classList.add('hidden');
}

/**
 * Show loading state
 */
function showLoading() {
    elements.weatherContent.classList.add('hidden');
    elements.loadingState.classList.remove('hidden');
    elements.errorState.classList.add('hidden');
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
    elements.errorState.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i> ${message}</div>`;
    elements.weatherContent.classList.add('hidden');
    elements.loadingState.classList.add('hidden');
    elements.errorState.classList.remove('hidden');
}

// Event Listeners

// Search input - fetch suggestions with debounce
elements.searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        fetchCitySuggestions(e.target.value);
    }, 300);
});

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrapper')) {
        elements.suggestionsDropdown.classList.remove('active');
    }
});

// Load default city on page load
window.addEventListener('load', () => {
    currentCityName = 'New York, United States';
    fetchWeather(40.7128, -74.0060);
    elements.searchInput.value = currentCityName;
});