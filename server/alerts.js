const ALERT_TYPES = {
  frost: 'geada',
  heavyRain: 'chuva_forte',
  drought: 'seca',
  wind_gusts_10m_max: 'ventos_fortes',
};

/**
 * Generates alerts from the `daily` object returned by Open-Meteo.
 * A null or missing value never generates an alert and interrupts any drought sequence.
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

  // Maximum wind gusts in km/h.
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

    // Resets the dry period counters.
    dryStart = null;
    dryEnd = null;
    dryDays = 0;
  };

  // Iterates through each forecast date.
  dates.forEach((date, index) => {
    const min = minimums[index];
    const rain = precipitation[index];

    // Generates a frost alert when the minimum temperature is 0 °C or lower.
    if (typeof min === 'number' && Number.isFinite(min) && min <= 0) {
      alerts.push({
        type: ALERT_TYPES.frost,
        date,
        value: min,
        message: `Geada prevista: temperatura mínima de ${min} °C.`
      });
    }

    // Checks precipitation values and generates heavy rain or drought alerts.
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
      // Missing data interrupts the consecutive dry-day sequence.
      closeDryPeriod();
    }
  });

  // Closes the final dry period after processing all forecast dates.
  closeDryPeriod();

  // Generates a strong wind alert when maximum gusts reach 70 km/h or higher.
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