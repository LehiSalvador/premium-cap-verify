# Contador real de scans

El contador ya no es texto fijo.

Cada vez que alguien abre o recarga la pagina:
1. script.js llama a /api/scan.
2. api/scan.js llama a CounterAPI.
3. CounterAPI suma +1.
4. La pagina muestra el nuevo total.

El contador usa un offset base de 2.
Eso significa que la primera visita real del sistema mostrara 3 SCANS.

Pagina de prueba:
https://premiumcapverify.site/barbas-hats/caps/chrome-ct/

API de prueba:
https://premiumcapverify.site/api/scan?key=barbas-hats-caps-chrome-ct