# Weather alerts

A small Portuguese-language web application for weather forecasting and automatic alerts for **frost**, **heavy rain**, and **drought**. The frontend uses React + Vite, and the backend uses Node.js + Express. Only the server communicates with the public [Open-Meteo API](https://open-meteo.com/).

## Requirements

- Node.js 18 or later (uses native `fetch`).
- npm.

## Running the Application

From the project directory, run:

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Vite forwards `/api` requests to the Express server at `http://localhost:3001`. During development, both processes are started with a single command.

Browser geolocation requires localhost or a secure HTTPS context. In other contexts, enter the coordinates manually.

To run the production build: `npm run build` followed by `npm start` (open [http://localhost:3001](http://localhost:3001)).

## Automated Tests

```bash
npm test
```

The tests use the `node:test` module included in Node.js and cover rule thresholds, drought periods, `null` values, and missing data.

## Example File Command

```bash
npm run alerts:example
```

This command reads `exemplo.json` from the project root and prints the alerts in the terminal. It also accepts a different file path:

```bash
node server/cli.js path/to/file.json
```

**Note about the fixture:** The `exemplo.json` attachment mentioned in the assignment was not available among the files received during implementation. Therefore, this repository includes a demonstration example in the format of an Open-Meteo response, containing fictional values and some `null` values. It should be replaced with the original assignment file before evaluation, keeping the filename `exemplo.json`.

## Features

- Requests the user's location through the browser's Geolocation API, only after user interaction.
- If permission is denied, the location is unavailable, or a timeout occurs, the user can manually enter latitude and longitude.
- Displays a ten-day forecast with minimum temperature, maximum temperature, and precipitation.
- Displays alerts calculated by the backend and explains communication failures with the API. When a previous cached response is available, it is displayed with a warning that the data may be outdated.
- The page includes the attribution **"Weather data: Open-Meteo.com"**.

## Alert Rules

The pure function `generateAlerts` in `server/alerts.js` applies the rules to the daily arrays:

- **Frost:** one alert per day when `temperature_2m_min <= 0`.
- **Heavy rain:** one alert per day when `precipitation_sum >= 20` mm.
- **Drought:** one alert for each period of at least five consecutive days when `precipitation_sum < 1` mm. The alert includes the first and last dates of the period.
- `null`, missing values, and non-numeric values do not generate alerts. For precipitation, they also interrupt the drought sequence.

## Technical Decisions

### Caching and Location

The cache key uses latitude and longitude rounded to **two decimal places**. This means coordinates falling within approximately the same cell (around 1.1 km in latitude; longitude distance varies with latitude) are treated as the same location.

The rounded coordinates are also sent to Open-Meteo, ensuring that the cache key matches the actual request. The cache remains valid for one hour.

Simultaneous requests for the same key share the same external API call (in-flight request deduplication), preventing parallel requests from bypassing the cache.

The cache is stored in memory within the Node.js process. This requires no additional infrastructure and is sufficient for this small application. Restarting the server clears the cache; with multiple instances, each process would have its own cache.

An old response is retained even after expiration to allow fallback when Open-Meteo is unavailable, but it is always identified as outdated.

### API and Error Handling

The browser never calls Open-Meteo directly. The frontend calls `GET /api/weather`; Express validates the coordinates, queries Open-Meteo using `timezone=auto` and `forecast_days=10`, calculates the alerts, and returns a single object to the client.

A 12-second timeout is implemented. If the external service fails, the backend returns an older cached response, if available. Otherwise, it returns HTTP 503 with a message displayed to the user by the interface.

### Project Structure

- `client/`: React application and Vite configuration.
- `server/index.js`: HTTP API, validation, external API requests, and caching.
- `server/alerts.js`: business rules without external dependencies.
- `server/alerts.test.js`: automated tests for the rules.
- `server/cli.js`: command-line tool for analysing a forecast JSON file.
- `exemplo.json`: demonstration fixture.

## Use of AI

I used **ChatGPT (GPT-6)** as a programming assistant to structure the project and speed up the initial development of the React frontend, Express server, tests, CLI command, and this README. I reviewed and ran the code locally rather than accepting suggestions without validation.

A specific example of code review: the initial simplified approach to drought detection could accumulate dry days without explicitly handling missing values. I corrected the implementation so that the drought period is closed when precipitation is `null` (or non-numeric), and added an automated test to ensure that a `null` value interrupts the sequence.

I also kept the Open-Meteo API call on the server rather than in the browser, to comply with the architectural requirement.

## Future Improvements

1. Integrate the original `exemplo.json` provided for the assignment and verify the expected output.
2. Use shared Redis caching if the application needs to run across multiple instances.
3. Add location search by name and save favourite locations in a database, with optional authentication.
4. Add integration tests for the HTTP route, including timeout, API errors, and cache fallback.
5. Improve accessibility, internationalisation, and service monitoring.