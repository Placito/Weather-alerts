# Weather alerts

Pequena aplicação web de previsão meteorológica e alertas automáticos de **geada**, **chuva forte** e **seca**. O frontend é React + Vite e o backend é Node.js + Express. Apenas o servidor comunica com a API pública da [Open-Meteo](https://open-meteo.com/).

## Requisitos

- Node.js 18 ou superior (usa `fetch` nativo).
- npm.

## Colocar a aplicação a correr

Na pasta do projeto, executar:

```bash
npm install
npm run dev
```

Abrir <http://localhost:5173>. O Vite encaminha `/api` para o servidor Express em `http://localhost:3001`. Em desenvolvimento são iniciados os dois processos pelo mesmo comando. A geolocalização do browser requer localhost ou um contexto HTTPS; noutros contextos, use a introdução manual das coordenadas.

Para executar a versão compilada: `npm run build` e depois `npm start` (abrir <http://localhost:3001>).

## Testes automáticos

```bash
npm test
```

Os testes usam o módulo `node:test` incluído no Node.js e cobrem os limites das regras, períodos de seca, valores `null` e dados em falta.

## Comando do ficheiro de exemplo

```bash
npm run alerts:example
```

O comando lê `exemplo.json` na raiz e imprime os alertas no terminal. Também aceita outro caminho: `node server/cli.js caminho/para/ficheiro.json`.

**Nota sobre o fixture:** o anexo `exemplo.json` referido no enunciado não estava disponível nos ficheiros recebidos durante a implementação. Por isso, este repositório inclui um exemplo de demonstração, no formato da resposta da Open-Meteo, com valores fictícios e alguns `null`. Deve ser substituído pelo ficheiro original do enunciado antes da avaliação, mantendo o nome `exemplo.json`.

## Funcionalidades

- Solicita a localização através da Geolocation API do browser, apenas após ação do utilizador.
- Se a permissão for recusada, a localização não estiver disponível ou ocorrer um timeout, permite inserir latitude e longitude manualmente.
- Mostra os dez dias de temperatura mínima, temperatura máxima e precipitação.
- Mostra os alertas calculados no backend e explica falhas de comunicação com a API. Quando existe uma resposta anterior em cache, apresenta-a com um aviso de que pode estar desatualizada.
- A página inclui a atribuição **“Dados meteorológicos: Open-Meteo.com”**.

## Regras dos alertas

A função pura `generateAlerts` em `server/alerts.js` aplica as regras aos arrays diários:

- **Geada:** um alerta por dia em que `temperature_2m_min <= 0`.
- **Chuva forte:** um alerta por dia em que `precipitation_sum >= 20` mm.
- **Seca:** um alerta por cada período de, pelo menos, cinco dias consecutivos em que `precipitation_sum < 1` mm. O alerta contém a primeira e a última data do período.
- `null`, valores ausentes e valores não numéricos não geram alertas. Na precipitação, também interrompem a sequência de seca.

## Decisões técnicas

### Cache e localização

A chave da cache é a latitude e longitude arredondadas a **duas casas decimais**. Assim, coordenadas que caiam na mesma célula aproximada (cerca de 1,1 km na latitude; a dimensão longitudinal varia com a latitude) são tratadas como a mesma localização. As coordenadas arredondadas são também as enviadas à Open-Meteo, para que a chave corresponda ao pedido efetivo. A cache só é válida por uma hora. Pedidos simultâneos para a mesma chave partilham a mesma chamada externa (deduplicação de pedidos em curso), evitando que duas chamadas paralelas contornem a cache.

A cache é guardada em memória no processo Node.js: não requer infraestrutura adicional e é suficiente para esta pequena aplicação. Reiniciar o servidor limpa a cache; em múltiplas instâncias, cada processo teria a sua própria cache. Uma resposta antiga é mantida mesmo depois de expirar para permitir fallback quando a Open-Meteo falha, mas é sempre identificada como desatualizada.

### API e erros

O browser nunca chama a Open-Meteo. O frontend chama `GET /api/weather`; o Express valida as coordenadas, consulta a Open-Meteo com `timezone=auto` e `forecast_days=10`, calcula os alertas e devolve um objeto único ao cliente. Existe timeout de 12 segundos. Se o serviço externo falhar, o backend devolve uma resposta antiga em cache, quando existe; caso contrário, devolve HTTP 503 e uma mensagem que a interface apresenta ao utilizador.

### Organização

- `client/`: aplicação React e configuração Vite.
- `server/index.js`: API HTTP, validação, consulta externa e cache.
- `server/alerts.js`: regras de negócio sem dependências externas.
- `server/alerts.test.js`: testes automáticos das regras.
- `server/cli.js`: comando para analisar um JSON de previsão.
- `exemplo.json`: fixture de demonstração.

## Uso de IA

Usei **ChatGPT (GPT-6)** como assistente de programação para estruturar o projeto, acelerar a escrita inicial do frontend React, do servidor Express, dos testes, do comando CLI e deste README. Revisei e executei o código localmente, em vez de aceitar sugestões sem validação.

Exemplo concreto de revisão: a primeira abordagem simplificada para a seca podia acumular dias secos sem tratar explicitamente um valor em falta. Corrigi a implementação para fechar o período quando a precipitação é `null` (ou não numérica), e acrescentei um teste automático que garante que um `null` interrompe a sequência. Também mantive a chamada à Open-Meteo no servidor, não no browser, para respeitar o requisito de arquitetura.

## O que faria a seguir

1. Integrar o `exemplo.json` original fornecido para a prova e confirmar o output esperado.
2. Persistir cache partilhada em Redis se a aplicação passasse a correr em várias instâncias.
3. Adicionar pesquisa de localidade por nome e guardar locais favoritos numa base de dados, com autenticação opcional.
4. Acrescentar testes de integração à rota HTTP, incluindo timeout, erro da API e fallback de cache.
5. Melhorar acessibilidade, internacionalização e monitorização do serviço.
