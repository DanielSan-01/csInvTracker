# CSGOSkins Scraper Implementation Guide

This guide explains how to scrape price data from csgoskins.gg and integrate it into the CS Inv Tracker.

## Overview

We've implemented two options for scraping csgoskins.gg:

1. **AngleSharp (C#) - Recommended** - Pure C# solution, no external dependencies
2. **justhtml (Python) - Alternative** - Python service that can be called from C# backend

## Option 1: AngleSharp Implementation (Recommended)

### What Was Added

1. **Package**: `AngleSharp` v1.1.2 added to `backend.csproj`
2. **Service**: `backend/Services/CsgoskinsScraperService.cs` - Handles HTML scraping
3. **Controller**: `backend/Controllers/CsgoskinsController.cs` - API endpoint
4. **Registration**: Service registered in `Program.cs`

### How It Works

The service:
- Fetches HTML from csgoskins.gg URLs
- Parses HTML using AngleSharp (C# HTML5 parser, similar to justhtml)
- Extracts price data using CSS selectors
- Caches results for 5 minutes (configurable)
- Returns structured price data

### API Endpoint

```
GET /api/csgoskins/price?skinSlug={slug}&exteriorSlug={exterior}
```

**Example:**
```bash
curl "http://localhost:5027/api/csgoskins/price?skinSlug=m9-bayonet-ultraviolet&exteriorSlug=field-tested"
```

**Response:**
```json
{
  "price": 125.50,
  "priceText": "$125.50",
  "volume": 42,
  "listings": 15,
  "scrapedAt": "2025-01-01T12:00:00Z"
}
```

### Finding the Correct CSS Selectors

**Important**: The CSS selectors in `CsgoskinsScraperService.cs` are placeholders. You need to inspect csgoskins.gg to find the actual selectors.

**Steps to find selectors:**

1. Open csgoskins.gg in your browser
2. Navigate to a skin page (e.g., `https://www.csgoskins.gg/items/m9-bayonet-ultraviolet/field-tested`)
3. Open browser DevTools (F12)
4. Inspect the price element
5. Note the CSS selector (e.g., `.price`, `#price`, `[data-price]`, etc.)
6. Update `ParsePriceDataAsync()` in `CsgoskinsScraperService.cs` with the correct selectors

**Example selector patterns to try:**
```csharp
// Price selectors
var priceElement = document.QuerySelector(".price");
var priceElement = document.QuerySelector("[data-price]");
var priceElement = document.QuerySelector(".item-price");
var priceElement = document.QuerySelector("#price-value");

// Volume/Listings selectors
var volumeElement = document.QuerySelector(".volume");
var listingsElement = document.QuerySelector(".listings-count");
```

### Configuration

Add to `appsettings.json` or environment variables:

```json
{
  "Csgoskins": {
    "CacheSeconds": 300
  }
}
```

Or set environment variable:
```bash
Csgoskins__CacheSeconds=300
```

### Usage in Frontend

You can call this from your frontend:

```typescript
// In your component or API route
const response = await fetch(
  `/api/csgoskins/price?skinSlug=${skinSlug}&exteriorSlug=${exteriorSlug}`
);
const priceData = await response.json();
```

## Option 2: Python Service with justhtml (Alternative)

### Setup

1. **Install dependencies:**
```bash
cd scraper
pip install -r requirements.txt
```

2. **Run the service:**
```bash
python scraper_service.py
```

Service runs on `http://localhost:8000`

### Integration with C# Backend

To use the Python service instead of AngleSharp, modify `CsgoskinsScraperService.cs`:

```csharp
private async Task<CsgoskinsPriceData?> FetchFromPythonServiceAsync(
    string skinSlug, 
    string? exteriorSlug, 
    CancellationToken cancellationToken)
{
    var serviceUrl = _configuration["Csgoskins:PythonServiceUrl"] ?? "http://localhost:8000";
    var client = _httpClientFactory.CreateClient();
    
    var url = $"{serviceUrl}/price?skin_slug={Uri.EscapeDataString(skinSlug)}";
    if (!string.IsNullOrWhiteSpace(exteriorSlug))
    {
        url += $"&exterior_slug={Uri.EscapeDataString(exteriorSlug)}";
    }
    
    try
    {
        var response = await client.GetAsync(url, cancellationToken);
        if (!response.IsSuccessStatusCode) return null;
        
        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        var data = JsonSerializer.Deserialize<CsgoskinsPriceData>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
        
        return data;
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error calling Python scraper service");
        return null;
    }
}
```

### Deployment

For production:
1. Deploy Python service separately (Railway, Render, Docker)
2. Set `Csgoskins:PythonServiceUrl` in C# configuration
3. Update C# service to call remote URL

## Testing

### Test the C# Service

```bash
# Test with skin slug only
curl "http://localhost:5027/api/csgoskins/price?skinSlug=m9-bayonet-ultraviolet"

# Test with exterior
curl "http://localhost:5027/api/csgoskins/price?skinSlug=m9-bayonet-ultraviolet&exteriorSlug=field-tested"
```

### Test the Python Service

```bash
curl "http://localhost:8000/price?skin_slug=m9-bayonet-ultraviolet&exterior_slug=field-tested"
```

## Next Steps

1. **Inspect csgoskins.gg** to find the correct CSS selectors
2. **Update selectors** in `CsgoskinsScraperService.cs` or `scraper_service.py`
3. **Test** with real skin slugs
4. **Integrate** into frontend to display scraped prices
5. **Add error handling** for rate limiting and page changes

## Troubleshooting

### No price found
- Check that CSS selectors match the actual page structure
- Verify the URL format is correct
- Check browser DevTools to see the actual HTML structure

### Rate limiting
- Add delays between requests
- Implement exponential backoff
- Consider using a proxy service

### Page structure changed
- csgoskins.gg may have updated their HTML
- Update CSS selectors accordingly
- Consider adding fallback selectors

## References

- [AngleSharp Documentation](https://anglesharp.github.io/)
- [justhtml GitHub](https://github.com/EmilStenstrom/justhtml)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

