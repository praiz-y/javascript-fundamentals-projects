# Weather App

 [View the Live Demo](https://praiz-y.github.io/javascript-fundamentals-projects/Weather-App/)

A weather lookup app built with **HTML, CSS, and Vanilla JavaScript** that fetches live current-conditions and a 5-day forecast from the OpenWeatherMap API.

## Features

- Search weather by city name, with Enter-key support
- "Use my location" button via the browser Geolocation API
- 5-day forecast strip with icons and daily highs
- Instant °C / °F unit toggle — no refetch, just client-side conversion of the stored metric data
- Recent searches saved to `localStorage` as clickable chips (last 5)
- Background and color theme change dynamically based on the current condition (clear, clouds, rain, snow, thunderstorm, mist) and switch to a night palette after sunset
- Local time, sunrise, and sunset shown in the searched city's own timezone (not the visitor's)
- Loading and error states for empty input, unknown cities, and network failures
- API key kept out of source control: real key lives in a gitignored `config.js`, with `config.example.js` committed as the template

## Technologies Used

- HTML5
- CSS3
- Vanilla JavaScript (ES6, `async`/`await`, `fetch`, Geolocation API, `localStorage`)
- OpenWeatherMap Current Weather & 5-Day Forecast APIs

## Getting Started

1. Copy `config.example.js` to `config.js` and add your own [OpenWeatherMap API key](https://openweathermap.org/api)
2. Open the project folder
3. Open `index.html` in your browser (or serve it with any static server)
4. Search a city, tap the location pin, or click a recent-search chip
