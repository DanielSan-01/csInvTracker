#!/usr/bin/env node

/**
 * Utility script to list Doppler-phase skins from the local backend database.
 * The backend must be running (dotnet run) so the /api/skins endpoint is available.
 *
 * Usage:
 *   node scripts/list-doppler-phases.js [weaponFilter]
 *
 * Example:
 *   node scripts/list-doppler-phases.js "Butterfly Knife"
 */

const weaponFilter = (process.argv[2] || '').toLowerCase();
const apiBase = process.env.API_BASE_URL || 'http://localhost:5027/api';

async function main() {
  try {
    const url = `${apiBase}/skins?search=doppler`;
    const response = await fetch(url);

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Backend responded with ${response.status}: ${body}`);
    }

    const skins = await response.json();
    if (!Array.isArray(skins)) {
      throw new Error('Unexpected payload returned from /api/skins');
    }

    const dopplers = skins
      .filter(skin => typeof skin.name === 'string' && skin.name.toLowerCase().includes('doppler'))
      .filter(skin => (weaponFilter ? skin.name.toLowerCase().includes(weaponFilter) : true));

    if (dopplers.length === 0) {
      console.log('No Doppler skins found for the provided filter.');
      return;
    }

    dopplers.forEach(skin => {
      const paintIndex = skin.paintIndex ?? 'unknown';
      const phase = skin.dopplerPhase || 'Unknown Phase';
      const imageUrl = skin.dopplerPhaseImageUrl || skin.imageUrl || '';
      console.log(`${skin.name} | ${phase} | paint_index=${paintIndex} | image=${imageUrl}`);
    });
  } catch (error) {
    console.error('Failed to fetch Doppler skins from the backend:', error.message);
    process.exit(1);
  }
}

main();

