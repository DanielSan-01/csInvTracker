export interface CsMarketInfo {
  code: string;
  label: string;
  description: string;
}

export const ALL_CSMARKET_CODES: CsMarketInfo[] = [
  { code: 'STEAMCOMMUNITY', label: 'Steam Community Market', description: 'Valve marketplace (USD)' },
  { code: 'BUFFMARKET', label: 'BUFF Market', description: 'buff.market' },
  { code: 'SKINS', label: 'Skins.Cash', description: 'skins.cash' },
  { code: 'SKINPORT', label: 'Skinport', description: 'skinport.com' },
  { code: 'MARKETCSGO', label: 'MarketCSGO', description: 'market.csgo.com' },
  { code: 'DMARKET', label: 'DMarket', description: 'dmarket.com' },
  { code: 'GAMERPAYGG', label: 'GamerPay', description: 'gamerpay.gg' },
  { code: 'CSDEALS', label: 'CSDeals', description: 'cs.deals' },
  { code: 'SKINBARON', label: 'SkinBaron', description: 'skinbaron.de' },
  { code: 'CSFLOAT', label: 'CSFloat Market', description: 'market.csfloat.com' },
  { code: 'CSMONEY', label: 'CS.MONEY', description: 'cs.money' },
  { code: 'WHITEMARKET', label: 'WhiteMarket', description: 'whitemarket.gg' },
];

export const DEFAULT_CSMARKET_CODES = ALL_CSMARKET_CODES.map(m => m.code);

