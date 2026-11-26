
import { useState } from 'react';

// Defines the visual metadata for each weather alert
const ALERT_META = {
  geada: { icon: '❄️', title: 'Geada', className: 'frost', description: 'Temperatura mínima igual ou inferior a 0 °C' },
  chuva_forte: { icon: '🌧️', title: 'Chuva forte', className: 'rain', description: 'Precipitação igual ou superior a 20 mm' },
  seca: { icon: '☀️', title: 'Seca', className: 'drought', description: 'Pelo menos 5 dias seguidos com menos de 1 mm' },
  ventos_fortes: { icon: '💨', title: 'Ventos fortes', className: 'wind', description: 'Rajadas de vento igual ou superior a 70 km/h' },
};

// Formats a date according to the Portuguese locale
function formatDate(value, options = { weekday: 'short', day: 'numeric', month: 'short' }) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-PT', options).format(new Date(`${value}T12:00:00`));
}

// Returns the value followed by its unit, or a dash if the value is invalid
function valueOrDash(value, suffix = '') {
  return typeof value === 'number' && Number.isFinite(value) ? `${value}${suffix}` : '—';
}

// Main application component
export default function App() {
  // State variables for coordinates, weather data, loading status and error messages
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationMessage, setLocationMessage] = useState('');

  // Fetches the weather forecast using the provided coordinates
  async function loadForecast(lat = latitude, lon = longitude) {
    // Convert commas to decimal points
    const latitudeValue = Number(String(lat).trim().replace(',', '.'));
    const longitudeValue = Number(String(lon).trim().replace(',', '.'));

    // Validate the latitude and longitude values
    if (
      lat === '' || lon === '' ||
      !Number.isFinite(latitudeValue) ||
      !Number.isFinite(longitudeValue) ||
      latitudeValue < -90 || latitudeValue > 90 ||
      longitudeValue < -180 || longitudeValue > 180
    ) {
      setError('Introduza coordenadas válidas.');
      return;
    }

    // Update the loading state and clear previous results and errors
    setLoading(true);
    setError('');
    setWeather(null);

    try {
      // Create the API request parameters
      const params = new URLSearchParams({
        latitude: String(latitudeValue),
        longitude: String(longitudeValue)
      });

      // Send a request to the backend weather endpoint
      const response = await fetch(`/api/weather?${params}`);

      // Read the response as text first
      const responseText = await response.text();

      // Check whether the response contains valid JSON
      let payload;

      try {
        payload = JSON.parse(responseText);
      } catch {
        throw new Error(
          'O servidor devolveu HTML em vez de JSON. Verifique a ligação ao backend Node.js.'
        );
      }

      // Check whether the API request was successful
      if (!response.ok) {
        throw new Error(payload.error || 'Não foi possível carregar a previsão.');
      }

      // Store the returned weather data
      setWeather(payload);

    } catch (err) {
      // Handle errors during the API request
      setError(err.message || 'Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      // Reset the loading state after the request finishes
      setLoading(false);
    }
  }

  // Requests the user's current location through browser geolocation
  function requestLocation() {
    setLocationMessage('');
    setError('');

    // Check whether geolocation is supported by the browser
    if (!('geolocation' in navigator)) {
      setLocationMessage('Este browser não disponibiliza geolocalização. Pode introduzir as coordenadas manualmente.');
      return;
    }

    setLocationMessage('A aguardar autorização de localização…');

    // Retrieve the user's current geographical coordinates
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const lat = coords.latitude.toFixed(4);
        const lon = coords.longitude.toFixed(4);

        // Update the coordinate fields
        setLatitude(lat);
        setLongitude(lon);

        setLocationMessage('Localização obtida com autorização do browser.');

        // Load the forecast using the retrieved coordinates
        loadForecast(lat, lon);
      },
      (geoError) => {
        // Define error messages for different geolocation failures
        const messages = {
          1: 'A autorização de localização foi recusada. Introduza as coordenadas manualmente.',
          2: 'Não foi possível determinar a localização. Introduza as coordenadas manualmente.',
          3: 'A localização demorou demasiado tempo. Pode introduzir as coordenadas manualmente.'
        };

        // Display the appropriate geolocation error message
        setLocationMessage(messages[geoError.code] || 'Não foi possível obter a localização. Introduza as coordenadas manualmente.');
      },
      // Configure geolocation accuracy, timeout and cache duration
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  // Handles the coordinate form submission
  function handleSubmit(event) {
    event.preventDefault();
    loadForecast();
  }

  // Extract daily forecast data from the weather response
  const daily = weather?.daily;

  // Organize the daily forecast into an array of objects
  const days = (daily?.time || []).map((date, index) => ({
    date,
    min: daily.temperature_2m_min?.[index],
    max: daily.temperature_2m_max?.[index],
    rain: daily.precipitation_sum?.[index]
  }));

  // Retrieve the generated weather alerts
  const alerts = weather?.alerts || [];

  // Render the application interface
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Tempo e Alertas - início">
          <span className="brand-mark">☀</span>
          <span>tempo<span className="brand-light">&alertas</span></span>
        </a>
        <span className="topbar-note"> Previsão local · próximos 10 dias</span>
      </header>

      <main id="top" className="main-content">
        <section className="hero">
          <div className="eyebrow"><span className="eyebrow-dot" /> METEOROLOGIA EM TEMPO ÚTIL</div>
          <h1>O tempo muda.<br /><br /><span>Esteja preparado.</span></h1>
          <p className="hero-copy">Consulte a previsão para a sua localização e receba alertas automáticos de geada, chuva forte e períodos de seca.</p>
        </section>

        <section className="location-panel" aria-labelledby="location-title">
          <div className="panel-heading">
            <div>
              <div className="section-kicker">A SUA LOCALIZAÇÃO</div>
              <h2 id="location-title">Onde quer consultar o tempo?</h2>
            </div>
            <span className="location-icon">⌖</span>
          </div>

          {/* Button to retrieve the user's current location */}
          <button className="geo-button" type="button" onClick={requestLocation} disabled={loading}>
            <span aria-hidden="true">◎</span> Usar a minha localização
          </button>

          {locationMessage && <p className="inline-message" role="status">{locationMessage}</p>}

          <div className="divider-label"><span /> <small>OU INTRODUZA AS COORDENADAS</small> <span /></div>

          {/* Form for manually entering geographical coordinates */}
          <form className="coordinates-form" onSubmit={handleSubmit}>
            <label>
              <span>Latitude</span>
              <input type="number" step="any" min="-90" max="90" placeholder="Ex.: 39.92" value={latitude} onChange={(event) => setLatitude(event.target.value)} required />
            </label>
            <label>
              <span>Longitude</span>
              <input type="number" step="any" min="-180" max="180" placeholder="Ex.: -8.63" value={longitude} onChange={(event) => setLongitude(event.target.value)} required />
            </label>
            <button className="submit-button" type="submit" disabled={loading}>
              {loading ? 'A consultar…' : 'Ver previsão'} <span aria-hidden="true">→</span>
            </button>
          </form>

          {/* Display an error message when something goes wrong */}
          {error && <div className="error-banner" role="alert"><span>!</span>{error}</div>}
        </section>

        {/* Display a loading indicator while fetching weather data */}
        {loading && <div className="loading-state" role="status"><span className="spinner" /> A consultar a previsão meteorológica…</div>}

        {/* Display forecast results once the data has been loaded */}
        {weather && !loading && (
          <>
            <section className="results-heading">
              <div>
                <div className="section-kicker">PREVISÃO LOCAL</div>
                <h2>Os próximos dias</h2>
                <p>Coordenadas: {Number(latitude).toFixed(4)}, {Number(longitude).toFixed(4)} · {weather.timezone || 'Hora local'}</p>
              </div>
              <div className="forecast-count"><strong>{days.length}</strong><span>dias</span></div>
            </section>

            {/* Display a warning if cached data is outdated */}
            {weather.cache?.stale && <div className="warning-banner" role="status">◷ {weather.cache.message}</div>}

            {/* Display the daily weather forecast cards */}
            <section className="forecast-grid" aria-label="Previsão dos próximos dias">
              {days.map((day, index) => (
                <article className={`day-card ${index === 0 ? 'today-card' : ''}`} key={day.date}>
                  <div className="day-date">{index === 0 ? 'HOJE' : formatDate(day.date, { weekday: 'short' }).toUpperCase()}</div>
                  <div className="day-icon" aria-hidden="true">{typeof day.rain === 'number' && day.rain >= 5 ? '🌧️' : typeof day.min === 'number' && day.min <= 0 ? '❄️' : '🌤️'}</div>
                  <div className="day-temperatures"><strong>{valueOrDash(day.max, '°')}</strong><span>{valueOrDash(day.min, '°')}</span></div>
                  <div className="day-rain"><span aria-hidden="true">💧</span> {valueOrDash(day.rain, ' mm')}</div>
                  <div className="day-full-date">{formatDate(day.date, { day: 'numeric', month: 'short' })}</div>
                </article>
              ))}
            </section>

            {/* Display the generated weather alerts */}
            <section className="alerts-section">
              <div className="alerts-heading">
                <div>
                  <div className="section-kicker">AVISOS AUTOMÁTICOS</div>
                  <h2>Alertas meteorológicos</h2>
                </div>
                <span className={`alert-total ${alerts.length ? 'has-alerts' : ''}`}>{alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'}</span>
              </div>

              {/* Display a message when no alerts are available */}
              {alerts.length === 0 ? (
                <div className="no-alerts"><span>✓</span><div><strong>Sem alertas previstos</strong><p>Não foram detetadas condições de geada, chuva forte, ventos fortes ou seca nos próximos dias.</p></div></div>
              ) : (
                <div className="alerts-list">
                  {alerts.map((alert, index) => {
                    // Get the display metadata for the current alert type
                    const meta = ALERT_META[alert.type] || { icon: '⚠️', title: 'Alerta', className: 'other' };

                    return (
                      <article className={`alert-card ${meta.className}`} key={`${alert.type}-${alert.startDate || alert.date}-${index}`}>
                        <span className="alert-icon" aria-hidden="true">{meta.icon}</span>
                        <div className="alert-content">
                          <div className="alert-title-row"><h3>{meta.title}</h3><span>{alert.type === 'seca' ? `${formatDate(alert.startDate)} — ${formatDate(alert.endDate)}` : formatDate(alert.date)}</span></div>
                          <p>{alert.message}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Display cache information */}
            <p className="cache-note">{weather.cache?.message} A cache é válida durante uma hora.</p>
          </>
        )}
      </main>

      <footer className="footer">
        <span>Dados meteorológicos: Open-Meteo.com</span>
        <span>Feito para ajudar a antecipar o tempo.</span>
      </footer>
    </div>
  );
}
