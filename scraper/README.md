?# CSGOSkins Scraper - Python Service (Alternative Implementation)

This is an alternative implementation using the `justhtml` Python library, as requested. This service runs separately and can be called from the C# backend via HTTP.

## Setup

### 1. Install Dependencies

```bash
cd scraper
pip install justhtml fastapi uvicorn httpx
```

### 2. Run the Service

```bash
python scraper_service.py
```

The service will run on `http://localhost:8000` by default.

### 3. Update C# Backend to Call Python Service

You can modify `CsgoskinsScraperService.cs` to call this Python service instead of using AngleSharp directly.

## API Endpoints

- `GET /price?skin_slug={slug}&exterior_slug={exterior}` - Scrape price data

Example:
```bash
curl "http://localhost:8000/price?skin_slug=m9-bayonet-ultraviolet&exterior_slug=field-tested"
```

## Integration with C# Backend

In `CsgoskinsScraperService.cs`, you can replace the AngleSharp implementation with an HTTP call to this Python service:

```csharp
private async Task<CsgoskinsPriceData?> FetchFromPythonServiceAsync(
    string skinSlug, 
    string? exteriorSlug, 
    CancellationToken cancellationToken)
{
    var client = _httpClientFactory.CreateClient();
    var url = $"http://localhost:8000/price?skin_slug={Uri.EscapeDataString(skinSlug)}";
    if (!string.IsNullOrWhiteSpace(exteriorSlug))
    {
        url += $"&exterior_slug={Uri.EscapeDataString(exteriorSlug)}";
    }
    
    var response = await client.GetAsync(url, cancellationToken);
    if (!response.IsSuccessStatusCode) return null;
    
    var json = await response.Content.ReadAsStringAsync(cancellationToken);
    return JsonSerializer.Deserialize<CsgoskinsPriceData>(json);
}
```

## Deployment

For production, you can:
1. Deploy the Python service separately (e.g., on Railway, Render, or as a Docker container)
2. Set the service URL in C# configuration: `Csgoskins:PythonServiceUrl`
3. Update the C# service to call the remote URL instead of localhost

