import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateAlerts } from './alerts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputPath = path.resolve(process.cwd(), process.argv[2] || path.join(__dirname, '../exemplo.json'));

try {
  const source = fs.readFileSync(inputPath, 'utf8');
  const forecast = JSON.parse(source);
  const alerts = generateAlerts(forecast.daily);

  console.log(`\nAlertas para ${inputPath}:`);
  if (alerts.length === 0) {
    console.log('Não foram encontrados alertas.');
  } else {
    for (const alert of alerts) {
      if (alert.type === 'seca') {
        console.log(`- SECA | ${alert.startDate} a ${alert.endDate} | ${alert.days} dias`);
      } else if (alert.type === 'geada') {
        console.log(`- GEADA | ${alert.date} | temperatura mínima: ${alert.value} °C`);
      } else {
        console.log(`- CHUVA FORTE | ${alert.date} | precipitação: ${alert.value} mm`);
      }
    }
  }
} catch (error) {
  console.error(`Erro ao ler o ficheiro de exemplo: ${error.message}`);
  process.exitCode = 1;
}
