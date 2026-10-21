# EUR/USD Quant Analyzer Pro

## Archivos
- `index.html`: interfaz, gráfico, indicadores, calculadora de riesgo, backtest simplificado e historial local.
- `servidor.js`: servidor Express, proxy histórico y retransmisión WebSocket.
- `package.json`: dependencias e inicio.

## Publicar en Render
1. Sube el contenido de esta carpeta a un repositorio GitHub.
2. En Render crea un **Web Service** conectado al repositorio.
3. Build Command: `npm install`
4. Start Command: `npm start`
5. En Environment añade `TWELVE_DATA_API_KEY` con tu clave Twelve Data.
6. Despliega y abre la URL del servicio.

No pongas la API Key en `index.html` ni la compartas públicamente.

## Limitaciones importantes
- El streaming requiere que tu plan de Twelve Data permita WebSocket y EUR/USD.
- Los intervalos de 10 minutos y 10 horas se aproximan agregando velas inferiores.
- El backtest es educativo y simplificado; no incorpora todos los costes reales ni valida rentabilidad futura.
- La aplicación no ejecuta operaciones ni se conecta a un bróker.
- Verifica los mensajes y formatos actuales de Twelve Data al desplegar; los límites y permisos dependen del plan.
