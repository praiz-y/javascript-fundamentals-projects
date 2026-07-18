const API_KEY = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.API_KEY) || '';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const RECENT_KEY = 'weather_recent_searches';
const UNIT_KEY = 'weather_unit';
const MAX_RECENT = 5;

const DOM = {
    cityInput: document.getElementById('cityInput'),
    searchBtn: document.getElementById('searchBtn'),
    locationBtn: document.getElementById('locationBtn'),
    unitToggle: document.getElementById('unitToggle'),
    recentSearches: document.getElementById('recentSearches'),
    statusBox: document.getElementById('statusBox'),
    weatherCard: document.getElementById('weatherCard'),
    cityName: document.getElementById('cityName'),
    localTime: document.getElementById('localTime'),
    weatherIcon: document.getElementById('weatherIcon'),
    temperature: document.getElementById('temperature'),
    feelsLike: document.getElementById('feelsLike'),
    description: document.getElementById('description'),
    humidity: document.getElementById('humidity'),
    wind: document.getElementById('wind'),
    sunrise: document.getElementById('sunrise'),
    sunset: document.getElementById('sunset'),
    forecast: document.getElementById('forecast')
};

// Raw metric data from the API, kept around so unit toggling never needs a refetch.
let currentData = null;
let currentForecast = null;
let unit = localStorage.getItem(UNIT_KEY) || 'metric';

init();

function init() {
    DOM.unitToggle.textContent = unit === 'metric' ? '°C' : '°F';
    renderRecentSearches();

    DOM.searchBtn.addEventListener('click', handleSearch);
    DOM.cityInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    DOM.locationBtn.addEventListener('click', handleUseLocation);
    DOM.unitToggle.addEventListener('click', toggleUnit);

    const lastCity = getRecentSearches()[0];
    if (lastCity) loadCity(lastCity);
}

function handleSearch() {
    const city = DOM.cityInput.value.trim();
    if (!city) {
        showStatus('Please enter a city name.', 'error');
        return;
    }
    loadCity(city);
}

function handleUseLocation() {
    if (!navigator.geolocation) {
        showStatus('Geolocation is not supported by your browser.', 'error');
        return;
    }
    showStatus('Locating you...', 'loading');
    navigator.geolocation.getCurrentPosition(
        (pos) => loadCoords(pos.coords.latitude, pos.coords.longitude),
        () => showStatus('Location access denied.', 'error')
    );
}

function toggleUnit() {
    unit = unit === 'metric' ? 'imperial' : 'metric';
    localStorage.setItem(UNIT_KEY, unit);
    DOM.unitToggle.textContent = unit === 'metric' ? '°C' : '°F';
    if (currentData) {
        renderCurrent(currentData);
        renderForecast(currentForecast);
    }
}

async function loadCity(city) {
    if (!API_KEY) {
        showStatus('Missing API key. Copy config.example.js to config.js and add your OpenWeatherMap key.', 'error');
        return;
    }
    showStatus(`Loading weather for "${city}"...`, 'loading');
    try {
        const data = await fetchJSON(`${BASE_URL}/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`);
        const forecast = await fetchJSON(`${BASE_URL}/forecast?lat=${data.coord.lat}&lon=${data.coord.lon}&units=metric&appid=${API_KEY}`);
        onWeatherLoaded(data, forecast);
        saveRecentSearch(data.name);
    } catch (err) {
        handleFetchError(err);
    }
}

async function loadCoords(lat, lon) {
    if (!API_KEY) {
        showStatus('Missing API key. Copy config.example.js to config.js and add your OpenWeatherMap key.', 'error');
        return;
    }
    try {
        const data = await fetchJSON(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
        const forecast = await fetchJSON(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
        onWeatherLoaded(data, forecast);
        saveRecentSearch(data.name);
    } catch (err) {
        handleFetchError(err);
    }
}

async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) {
        if (res.status === 404) throw new Error('City not found. Check the spelling and try again.');
        throw new Error(`Weather service error (${res.status}).`);
    }
    return res.json();
}

function handleFetchError(err) {
    showStatus(err.message || 'Something went wrong. Please try again.', 'error');
    DOM.weatherCard.hidden = true;
}

function onWeatherLoaded(data, forecast) {
    currentData = data;
    currentForecast = forecast;
    hideStatus();
    DOM.weatherCard.hidden = false;
    DOM.cityInput.value = '';
    renderCurrent(data);
    renderForecast(forecast);
    renderRecentSearches();
}

function renderCurrent(data) {
    const isNight = isNightTime(data);
    const condition = data.weather[0].main.toLowerCase();

    document.body.className = isNight ? 'night' : condition;

    DOM.cityName.textContent = `${data.name}, ${data.sys.country}`;
    DOM.localTime.textContent = formatLocalTime(data.dt, data.timezone);
    DOM.weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    DOM.weatherIcon.alt = data.weather[0].description;
    DOM.temperature.textContent = `${convertTemp(data.main.temp)}°${unit === 'metric' ? 'C' : 'F'}`;
    DOM.feelsLike.textContent = `Feels like ${convertTemp(data.main.feels_like)}°${unit === 'metric' ? 'C' : 'F'}`;
    DOM.description.textContent = data.weather[0].description;
    DOM.humidity.textContent = data.main.humidity;
    DOM.wind.textContent = convertWind(data.wind.speed);
    DOM.sunrise.textContent = formatLocalTime(data.sys.sunrise, data.timezone, true);
    DOM.sunset.textContent = formatLocalTime(data.sys.sunset, data.timezone, true);
}

function renderForecast(forecast) {
    const daily = forecast.list.filter((item) => item.dt_txt.includes('12:00:00')).slice(0, 5);

    DOM.forecast.innerHTML = daily.map((item) => {
        const dayName = new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' });
        return `
            <div class="forecast-day">
                <div class="day-name">${dayName}</div>
                <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" alt="${item.weather[0].description}">
                <div class="day-temp">${convertTemp(item.main.temp)}°</div>
            </div>
        `;
    }).join('');
}

function isNightTime(data) {
    const nowUtcSeconds = data.dt;
    return nowUtcSeconds < data.sys.sunrise || nowUtcSeconds > data.sys.sunset;
}

function formatLocalTime(unixSeconds, tzOffsetSeconds, timeOnly = false) {
    const localMs = (unixSeconds + tzOffsetSeconds) * 1000;
    const date = new Date(localMs);
    const options = timeOnly
        ? { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }
        : { weekday: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' };
    return date.toLocaleTimeString('en-US', options);
}

function convertTemp(celsius) {
    const value = unit === 'metric' ? celsius : (celsius * 9) / 5 + 32;
    return Math.round(value);
}

function convertWind(speedMs) {
    const value = unit === 'metric' ? speedMs * 3.6 : speedMs * 2.237;
    return Math.round(value);
}

function showStatus(message, type) {
    DOM.statusBox.textContent = message;
    DOM.statusBox.className = `status ${type}`;
    DOM.statusBox.hidden = false;
}

function hideStatus() {
    DOM.statusBox.hidden = true;
}

function getRecentSearches() {
    try {
        return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
    } catch {
        return [];
    }
}

function saveRecentSearch(city) {
    const recent = getRecentSearches().filter((c) => c.toLowerCase() !== city.toLowerCase());
    recent.unshift(city);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
    renderRecentSearches();
}

function renderRecentSearches() {
    const recent = getRecentSearches();
    DOM.recentSearches.innerHTML = recent
        .map((city) => `<button class="recent-chip" data-city="${city}">${city}</button>`)
        .join('');

    DOM.recentSearches.querySelectorAll('.recent-chip').forEach((chip) => {
        chip.addEventListener('click', () => loadCity(chip.dataset.city));
    });
}
