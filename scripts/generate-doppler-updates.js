const fs = require('fs');
const https = require('https');
const path = require('path');

const url = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json';
const outputPath = path.join(__dirname, 'doppler_updates.sql');

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
        const statements = skins
          .filter(skin => skin.name && skin.name.includes('Doppler') && skin.paint_index !== undefined && skin.image)
          .map(skin => {
            const name = skin.name.replace(/'/g, "''");
            const image = skin.image.replace(/'/g, "''");
            return `UPDATE Skins SET PaintIndex = ${skin.paint_index} WHERE Name = '${name}' AND ImageUrl = '${image}';`;
          })
          .join('\n');

        fs.writeFileSync(outputPath, statements, 'utf8');
        console.log(`Wrote ${statements.split('\n').length} update statements to ${outputPath}`);
      } catch (err) {
        console.error('Failed to process skins dataset:', err);
        process.exit(1);
      }
    });
  })
  .on('error', err => {
    console.error('Request error:', err);
    process.exit(1);
  });

