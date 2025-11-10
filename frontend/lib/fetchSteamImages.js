// Script to help fetch Steam inventory image URLs
// Run this in browser console on your Steam inventory page to get image URLs

// Paste this into browser console on: https://steamcommunity.com/profiles/76561197996404463/inventory/#730_2_46555044588

const fetchInventoryImages = async () => {
  try {
    const response = await fetch('https://steamcommunity.com/inventory/76561197996404463/730/2?l=english&count=5000');
    const data = await response.json();
    
    const itemMap = {};
    
    if (data.descriptions) {
      data.descriptions.forEach(desc => {
        const name = desc.market_name || desc.name;
        if (name && desc.icon_url) {
          // Convert relative URL to full Steam economy image URL
          const fullUrl = `https://community.fastly.steamstatic.com/economy/image/${desc.icon_url}/330x192?allow_animated=1`;
          itemMap[name] = fullUrl;
        }
      });
    }
    
    console.log('Item Image URLs:');
    console.log(JSON.stringify(itemMap, null, 2));
    
    return itemMap;
  } catch (error) {
    console.error('Error fetching inventory:', error);
  }
};

// Uncomment to run:
// fetchInventoryImages();

