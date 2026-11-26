
const ALERT_TYPES = {
  frost: 'geada',
  heavyRain: 'chuva_forte',
  drought: 'seca',
  wind_gusts_10m_max: 'ventos_fortes',
};

/**
 * Generates alerts from the daily object returned by Open-Meteo.
 * Missing or null values never generate alerts and interrupt drought sequences.
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
  const windGusts = Array.isArray(daily.wind_gusts_10m_max)
    ? daily.wind_gusts_10m_max
    : [];

  const alerts = [];
  let dryStart = null;
  let dryEnd = null;
  let dryDays = 0;

  // Closes the current dry period and generates a drought alert if it lasted at least 5 days.
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

  // Checks the weather conditions for each forecast day.
  dates.forEach((date, index) => {
    const min = minimums[index];
    const rain = precipitation[index];
    const wind = windGusts[index];

    // Frost alert: minimum temperature is 0 °C or lower.
    if (typeof min === 'number' && Number.isFinite(min) && min <= 0) {
      alerts.push({
        type: ALERT_TYPES.frost,
        date,
        value: min,
        message: `Geada prevista: temperatura mínima de ${min} °C.`
      });
    }

    // Heavy rain alert: precipitation is 20 mm or higher.
    if (typeof rain === 'number' && Number.isFinite(rain)) {
      if (rain >= 20) {
        alerts.push({
          type: ALERT_TYPES.heavyRain,
          date,
          value: rain,
          message: `Chuva forte prevista: ${rain} mm de precipitação.`
        });
      }

      // Tracks consecutive days with less than 1 mm of precipitation.
      if (rain < 1) {
        if (dryDays === 0) dryStart = date;
        dryEnd = date;
        dryDays += 1;
      } else {
        closeDryPeriod();
      }
    } else {
      // Missing precipitation data interrupts the drought sequence.
      closeDryPeriod();
    }

    // Strong wind alert: maximum wind gusts are 70 km/h or higher.
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
    }
  });

  // Closes the final drought period after processing all forecast days.
  closeDryPeriod();

  return alerts;
}
