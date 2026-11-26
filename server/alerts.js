const ALERT_TYPES = {
  frost: 'geada',
  heavyRain: 'chuva_forte',
  drought: 'seca',
  wind_gusts_10m_max: 'ventos_fortes',
};

/**
 * Gera alertas a partir do objeto `daily` devolvido pela Open-Meteo.
 * Um null/valor ausente nunca gera alerta e interrompe qualquer sequência de seca.
 */
export function generateAlerts(daily = {}) {
  daily = daily ?? {};
  const dates = Array.isArray(daily.time) ? daily.time : [];
  const minimums = Array.isArray(daily.temperature_2m_min)
    ? daily.temperature_2m_min
    : [];
  const precipitation = Array.isArray(daily.precipitation_sum)
    ? daily.precipitation_sum
    : [];
    // Rajadas máximas de vento em km/h
  const windGusts = Array.isArray(daily.wind_gusts_10m_max)
    ? daily.wind_gusts_10m_max
    : [];

  const alerts = [];
  let dryStart = null;
  let dryEnd = null;
  let dryDays = 0;

  const closeDryPeriod = () => {
    if (dryDays >= 5) {
      alerts.push({
        type: ALERT_TYPES.drought,
        date: dryStart,
        startDate: dryStart,
        endDate: dryEnd,
        days: dryDays,
        message: `Período de seca: ${dryDays} dias seguidos com menos de 1 mm de precipitação.`
      });
    }
    dryStart = null;
    dryEnd = null;
    dryDays = 0;
  };

  dates.forEach((date, index) => {
    const min = minimums[index];
    const rain = precipitation[index];

    if (typeof min === 'number' && Number.isFinite(min) && min <= 0) {
      alerts.push({
        type: ALERT_TYPES.frost,
        date,
        value: min,
        message: `Geada prevista: temperatura mínima de ${min} °C.`
      });
    }

    if (typeof rain === 'number' && Number.isFinite(rain)) {
      if (rain >= 20) {
        alerts.push({
          type: ALERT_TYPES.heavyRain,
          date,
          value: rain,
          message: `Chuva forte prevista: ${rain} mm de precipitação.`
        });
      }

      if (rain < 1) {
        if (dryDays === 0) dryStart = date;
        dryEnd = date;
        dryDays += 1;
      } else {
        closeDryPeriod();
      }
    } else {
      // Dados em falta quebram a sequência de dias secos.
      closeDryPeriod();
    }
  });

  closeDryPeriod();
  
  // Ventos fortes
    if (
      typeof wind === 'number' &&
      Number.isFinite(wind) &&
      wind >= 70
    ) {
      alerts.push({
        type: ALERT_TYPES.wind_gusts_10m_max,
        date,
        value: wind,
        message: `Ventos fortes previstos: rajadas máximas de ${wind} km/h.`
      });

  return alerts;
    }
}
