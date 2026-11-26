import test from 'node:test';
import assert from 'node:assert/strict';
import { generateAlerts } from './alerts.js';

const makeDaily = (minimums, rain) => ({
  time: minimums.map((_, index) => `2026-01-${String(index + 1).padStart(2, '0')}`),
  temperature_2m_min: minimums,
  precipitation_sum: rain
});

test('gera geada quando a temperatura mínima é igual ou inferior a 0 °C', () => {
  const alerts = generateAlerts(makeDaily([0, -0.1, 0.1], [4, 4, 4]));
  assert.deepEqual(alerts.filter((item) => item.type === 'geada').map((item) => item.value), [0, -0.1]);
});

test('gera chuva forte a partir de 20 mm, incluindo exatamente 20 mm', () => {
  const alerts = generateAlerts(makeDaily([5, 5, 5], [19.9, 20, 35]));
  assert.deepEqual(alerts.filter((item) => item.type === 'chuva_forte').map((item) => item.value), [20, 35]);
});

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

test('null não gera alertas e interrompe uma sequência de seca', () => {
  const alerts = generateAlerts(makeDaily(
    [null, -2, 4, 4, 4, 4, 4, 4],
    [0, 0, 0, null, 0, 0, 0, 0]
  ));
  assert.equal(alerts.filter((item) => item.type === 'geada').length, 1);
  assert.equal(alerts.filter((item) => item.type === 'seca').length, 0);
  assert.equal(alerts.filter((item) => item.type === 'chuva_forte').length, 0);
});

test('aceita dados diários em falta sem lançar exceções', () => {
  assert.deepEqual(generateAlerts({ time: ['2026-01-01'] }), []);
  assert.deepEqual(generateAlerts(null), []);
});
