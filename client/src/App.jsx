import { useState } from 'react';

const ALERT_META = {
  geada: { icon: '❄️', title: 'Geada', className: 'frost', description: 'Temperatura mínima igual ou inferior a 0 °C' },
  chuva_forte: { icon: '🌧️', title: 'Chuva forte', className: 'rain', description: 'Precipitação igual ou superior a 20 mm' },
  seca: { icon: '☀️', title: 'Seca', className: 'drought', description: 'Pelo menos 5 dias seguidos com menos de 1 mm' }
};

function formatDate(value, options = { weekday: 'short', day: 'numeric', month: 'short' }) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-PT', options).format(new Date(`${value}T12:00:00`));
}

function valueOrDash(value, suffix = '') {
  return typeof value === 'number' && Number.isFinite(value) ? `${value}${suffix}` : '—';
}

export default function App() {
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationMessage, setLocationMessage] = useState('');

async function loadForecast(lat = latitude, lon = longitude) {
    // Convert commas to decimal points
    const latitudeValue = Number(String(lat).trim().replace(',', '.'));
    const longitudeValue = Number(String(lon).trim().replace(',', '.'));

    // Validate coordinates
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

    setLoading(true);
    setError('');
    setWeather(null);

    try {
        const params = new URLSearchParams({
            latitude: String(latitudeValue),
            longitude: String(longitudeValue)
        });

        const response = await fetch(`/api/weather?${params}`);

        // Read response as text first
        const responseText = await response.text();

        // Check whether the response is JSON
        let payload;

        try {
            payload = JSON.parse(responseText);
        } catch {
            throw new Error(
                'O servidor devolveu HTML em vez de JSON. Verifique a ligação ao backend Node.js.'
            );
        }

        if (!response.ok) {
            throw new Error(payload.error || 'Não foi possível carregar a previsão.');
        }

        setWeather(payload);

    } catch (err) {
        setError(err.message || 'Ocorreu um erro inesperado. Tente novamente.');
    } finally {
        setLoading(false);
    }
}

  function requestLocation() {
    setLocationMessage('');
    setError('');
    if (!('geolocation' in navigator)) {
      setLocationMessage('Este browser não disponibiliza geolocalização. Pode introduzir as coordenadas manualmente.');
      return;
    }

    setLocationMessage('A aguardar autorização de localização…');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const lat = coords.latitude.toFixed(4);
        const lon = coords.longitude.toFixed(4);
        setLatitude(lat);
        setLongitude(lon);
        setLocationMessage('Localização obtida com autorização do browser.');
        loadForecast(lat, lon);
      },
      (geoError) => {
        const messages = {
          1: 'A autorização de localização foi recusada. Introduza as coordenadas manualmente.',
          2: 'Não foi possível determinar a localização. Introduza as coordenadas manualmente.',
          3: 'A localização demorou demasiado tempo. Pode introduzir as coordenadas manualmente.'
        };
        setLocationMessage(messages[geoError.code] || 'Não foi possível obter a localização. Introduza as coordenadas manualmente.');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  function handleSubmit(event) {
    event.preventDefault();
    loadForecast();
  }

  const daily = weather?.daily;
  const days = (daily?.time || []).map((date, index) => ({
    date,
    min: daily.temperature_2m_min?.[index],
    max: daily.temperature_2m_max?.[index],
    rain: daily.precipitation_sum?.[index]
  }));
  const alerts = weather?.alerts || [];

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Tempo e Alertas - início">
          <span className="brand-mark">☀</span>
          <span>tempo<span className="brand-light">&alertas</span></span>
        </a>
        <span className="topbar-note">Previsão local · próximos 10 dias</span>
      </header>

      <main id="top" className="main-content">
        <section className="hero">
          <div className="eyebrow"><span className="eyebrow-dot" /> METEOROLOGIA EM TEMPO ÚTIL</div>
          <h1>O tempo muda.<br /><span>Esteja preparado.</span></h1>
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
          <button className="geo-button" type="button" onClick={requestLocation} disabled={loading}>
            <span aria-hidden="true">◎</span> Usar a minha localização
          </button>
          {locationMessage && <p className="inline-message" role="status">{locationMessage}</p>}
          <div className="divider-label"><span /> <small>OU INTRODUZA AS COORDENADAS</small> <span /></div>
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
          {error && <div className="error-banner" role="alert"><span>!</span>{error}</div>}
        </section>

        {loading && <div className="loading-state" role="status"><span className="spinner" /> A consultar a previsão meteorológica…</div>}

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

            {weather.cache?.stale && <div className="warning-banner" role="status">◷ {weather.cache.message}</div>}

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

            <section className="alerts-section">
              <div className="alerts-heading">
                <div>
                  <div className="section-kicker">AVISOS AUTOMÁTICOS</div>
                  <h2>Alertas meteorológicos</h2>
                </div>
                <span className={`alert-total ${alerts.length ? 'has-alerts' : ''}`}>{alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'}</span>
              </div>
              {alerts.length === 0 ? (
                <div className="no-alerts"><span>✓</span><div><strong>Sem alertas previstos</strong><p>Não foram detetadas condições de geada, chuva forte ou seca nos próximos dias.</p></div></div>
              ) : (
                <div className="alerts-list">
                  {alerts.map((alert, index) => {
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
