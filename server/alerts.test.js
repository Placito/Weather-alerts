import test from 'node:test';
import assert from 'node:assert/strict';
import { generateAlerts } from './alerts.js';

// Creates a daily weather object using the provided minimum temperatures, precipitation, and wind gusts.
const makeDaily = (minimums, rain, windGusts = []) => ({
  time: minimums.map((_, index) => `2026-01-${String(index + 1).padStart(2, '0')}`),
  temperature_2m_min: minimums,
  precipitation_sum: rain,
  wind_gusts_10m_max: windGusts
});

// Tests whether a frost alert is generated when the minimum temperature is 0 °C or lower.
test('gera geada quando a temperatura mínima é igual ou inferior a 0 °C', () => {
  const alerts = generateAlerts(makeDaily([0, -0.1, 0.1], [4, 4, 4]));
  assert.deepEqual(alerts.filter((item) => item.type === 'geada').map((item) => item.value), [0, -0.1]);
});

// Tests whether a heavy rain alert is generated at 20 mm or more, including exactly 20 mm.
test('gera chuva forte a partir de 20 mm, incluindo exatamente 20 mm', () => {
  const alerts = generateAlerts(makeDaily([5, 5, 5], [19.9, 20, 35]));
  assert.deepEqual(alerts.filter((item) => item.type === 'chuva_forte').map((item) => item.value), [20, 35]);
});

// Tests whether a drought alert is generated for each period of at least five consecutive days with less than 1 mm of rain.
test('gera um alerta de seca para cada período com pelo menos cinco dias seguidos abaixo de 1 mm', () => {
  const alerts = generateAlerts(makeDaily(
    [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
    [0, 0.2, 0, 0.9, 1, 2, 0, 0, 0, 0, 0]
  ));
  const droughts = alerts.filter((item) => item.type === 'seca');
  assert.equal(droughts.length, 1);
  assert.equal(droughts[0].startDate, '2026-01-07');
  assert.equal(droughts[0].endDate, '2026-01-11');
  assert.equal(droughts[0].days, 5);
});

// Tests whether null values do not generate alerts and interrupt a consecutive dry-day sequence.
test('null não gera alertas e interrompe uma sequência de seca', () => {
  const alerts = generateAlerts(makeDaily(
    [null, -2, 4, 4, 4, 4, 4, 4],
    [0, 0, 0, null, 0, 0, 0, 0]
  ));
  assert.equal(alerts.filter((item) => item.type === 'geada').length, 1);
  assert.equal(alerts.filter((item) => item.type === 'seca').length, 0);
  assert.equal(alerts.filter((item) => item.type === 'chuva_forte').length, 0);
});

// Tests whether missing daily data is handled without throwing exceptions.
test('aceita dados diários em falta sem lançar exceções', () => {
  assert.deepEqual(generateAlerts({ time: ['2026-01-01'] }), []);
  assert.deepEqual(generateAlerts(null), []);

  
});

// Tests whether a strong wind alert is generated when maximum wind gusts reach 70 km/h or higher.
test('gera alerta de ventos fortes a partir de 70 km/h, incluindo exatamente 70 km/h', () => {
  const alerts = generateAlerts(
    makeDaily(
      [5, 5, 5, 5],
      [4, 4, 4, 4],
      [69.9, 70, 75, 85]
    )
  );

  const windAlerts = alerts.filter((item) => item.type === 'ventos_fortes');

  assert.deepEqual(
    windAlerts.map((item) => item.value),
    [70, 75, 85]
  );
});
