const https = require('https');

const weaponFilter = process.argv[2] || '';
const url = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json';

https
  .get(url, res => {
    if (res.statusCode !== 200) {
      console.error(`Failed to fetch skins.json: ${res.statusCode}`);
      res.resume();
      process.exit(1);
    }

    let rawData = '';
    res.on('data', chunk => (rawData += chunk));
    res.on('end', () => {
      try {
        const skins = JSON.parse(rawData);
        skins
          .filter(skin => skin.name && skin.name.includes('Doppler'))
          .filter(skin => (weaponFilter ? skin.name.includes(weaponFilter) : true))
          .forEach(skin => {
            console.log(
              `${skin.name}|paint_index=${skin.paint_index}|phase=${skin.phase}|image=${skin.image}`
            );
          });
      } catch (err) {
        console.error('Failed to parse skins dataset:', err);
        process.exit(1);
      }
    });
  })
  .on('error', err => {
    console.error('Request error:', err);
    process.exit(1);
  });

