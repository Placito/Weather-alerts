import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateAlerts } from './alerts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3001;
const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map();
const inFlight = new Map();

// Coordenadas arredondadas a 2 casas (~1,1 km) definem a mesma localização.
function normalizeCoordinate(value) {
  return Number(Number(value).toFixed(2));
}

function makePayload(weather, cacheInfo) {
  return {
    latitude: weather.latitude,
    longitude: weather.longitude,
    timezone: weather.timezone,
    daily: weather.daily,
    alerts: generateAlerts(weather.daily),
    cache: cacheInfo
  };
}

async function fetchForecast(latitude, longitude) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: 'temperature_2m_min,temperature_2m_max,precipitation_sum',
    timezone: 'auto',
    forecast_days: '10'
  }).toString();

  const upstream = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!upstream.ok) {
    throw new Error(`Open-Meteo respondeu com HTTP ${upstream.status}.`);
  }

  const weather = await upstream.json();
  if (!weather || !weather.daily || !Array.isArray(weather.daily.time)) {
    throw new Error('A resposta da Open-Meteo não contém dados diários válidos.');
  }
  return weather;
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/weather', async (req, res) => {
  const latitudeInput = Number(req.query.latitude);
  const longitudeInput = Number(req.query.longitude);

  if (
    req.query.latitude === undefined ||
    req.query.longitude === undefined ||
    String(req.query.latitude).trim() === '' ||
    String(req.query.longitude).trim() === '' ||
    !Number.isFinite(latitudeInput) ||
    !Number.isFinite(longitudeInput) ||
    latitudeInput < -90 || latitudeInput > 90 ||
    longitudeInput < -180 || longitudeInput > 180
  ) {
    return res.status(400).json({
      error: 'Indique coordenadas válidas (latitude entre -90 e 90 e longitude entre -180 e 180).'
    });
  }

  const latitude = normalizeCoordinate(latitudeInput);
  const longitude = normalizeCoordinate(longitudeInput);
  const key = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  const now = Date.now();
  const cached = cache.get(key);

  if (cached && now < cached.expiresAt) {
    return res.json(makePayload(cached.weather, {
      hit: true,
      stale: false,
      cachedAt: new Date(cached.cachedAt).toISOString(),
      message: 'Previsão obtida da cache.'
    }));
  }

  // Pedidos simultâneos para a mesma célula partilham a mesma chamada externa.
  const joinedExistingRequest = inFlight.has(key);
  let request = inFlight.get(key);
  if (!request) {
    request = fetchForecast(latitude, longitude);
    inFlight.set(key, request);
  }

  try {
    const weather = await request;
    const fetchedAt = Date.now();
    cache.set(key, {
      weather,
      cachedAt: fetchedAt,
      expiresAt: fetchedAt + CACHE_TTL_MS
    });

    if (cache.size > 500) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }

    return res.json(makePayload(weather, {
      hit: joinedExistingRequest,
      stale: false,
      cachedAt: new Date(fetchedAt).toISOString(),
      message: joinedExistingRequest
        ? 'Pedido partilhado com outra consulta da mesma localização.'
        : 'Previsão atualizada da Open-Meteo.'
    }));
  } catch (error) {
    console.error('[Open-Meteo]', error.message);

    if (cached) {
      return res.json(makePayload(cached.weather, {
        hit: true,
        stale: true,
        cachedAt: new Date(cached.cachedAt).toISOString(),
        message: 'Não foi possível atualizar a previsão. A mostrar os últimos dados guardados, que podem estar desatualizados.'
      }));
    }

    return res.status(503).json({
      error: 'Não foi possível obter a previsão meteorológica neste momento. Verifique a ligação à internet e tente novamente.'
    });
  } finally {
    if (inFlight.get(key) === request) inFlight.delete(key);
  }
});

const clientDist = path.resolve(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), (error) => {
    if (error) res.status(404).send('Frontend não compilado. Execute npm run build.');
  });
});

app.listen(PORT, () => {
  console.log(`Servidor disponível em http://localhost:${PORT}`);
});
