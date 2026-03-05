"""
CSGOSkins Scraper Service using justhtml
Alternative Python implementation that can be called from C# backend
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import httpx
from justhtml import JustHTML
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="CSGOSkins Scraper Service")


class PriceData(BaseModel):
    """Price data scraped from csgoskins.gg"""
    price: float
    price_text: Optional[str] = None
    volume: Optional[int] = None
    listings: Optional[int] = None
    scraped_at: str


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.get("/price", response_model=PriceData)
async def get_price(
    skin_slug: str = Query(..., description="URL-friendly skin name (e.g., 'm9-bayonet-ultraviolet')"),
    exterior_slug: Optional[str] = Query(None, description="Optional exterior condition (e.g., 'field-tested')")
):
    """
    Scrape price data from csgoskins.gg
    
    Args:
        skin_slug: URL-friendly skin name
        exterior_slug: Optional exterior condition
    
    Returns:
        Price data including price, volume, listings, etc.
    """
    try:
        # Build URL
        if exterior_slug:
            url = f"https://www.csgoskins.gg/items/{skin_slug}/{exterior_slug}"
        else:
            url = f"https://www.csgoskins.gg/items/{skin_slug}"
        
        logger.info(f"Scraping {url}")
        
        # Fetch HTML
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9"
                }
            )
            response.raise_for_status()
            html = response.text
        
        # Parse HTML with justhtml
        doc = JustHTML(html, fragment=False)
        
        # Extract price - selectors based on csgoskins.gg structure
        # First try: find span.font-bold within div.order-1 (item details panel on the left)
        price_text = None
        price_value = None
        
        # Use combined selector: div.order-1 span.font-bold
        bold_spans_in_order1 = doc.query("div.order-1 span.font-bold")
        if bold_spans_in_order1:
            for span in bold_spans_in_order1:
                text = span.to_text().strip()
                # Check if it looks like a price (starts with $ and contains numbers)
                if text.startswith("$") and len(text) > 1:
                    price_text = text
                    price_value = extract_price(text)
                    break
        
        # Fallback: if div.order-1 not found or no price in it, try searching entire document
        if not price_value:
            all_bold_spans = doc.query("span.font-bold")
            for span in all_bold_spans:
                text = span.to_text().strip()
                if text.startswith("$") and len(text) > 1:
                    price_text = text
                    price_value = extract_price(text)
                    break
        
        if not price_value:
            raise HTTPException(
                status_code=404,
                detail="Could not find price data on the page. The page structure may have changed."
            )
        
        # Extract additional data (volume, listings, etc.)
        volume_element = doc.query(".volume, [data-volume], .sales-count")
        volume = None
        if volume_element:
            volume_text = volume_element[0].to_text()
            volume = parse_int(volume_text)
        
        listings_element = doc.query(".listings, [data-listings], .active-listings")
        listings = None
        if listings_element:
            listings_text = listings_element[0].to_text()
            listings = parse_int(listings_text)
        
        return PriceData(
            price=price_value,
            price_text=price_text,
            volume=volume,
            listings=listings,
            scraped_at=datetime.utcnow().isoformat() + "Z"
        )
    
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error fetching {url}: {e}")
        raise HTTPException(status_code=e.response.status_code, detail=f"Failed to fetch page: {e}")
    except Exception as e:
        logger.error(f"Error scraping csgoskins.gg: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


def extract_price(text: str) -> Optional[float]:
    """Extract numeric price from text"""
    if not text:
        return None
    
    # Remove currency symbols, commas, and extract number
    cleaned = text.replace("$", "").replace("€", "").replace("£", "").replace(",", "").replace("USD", "").strip()
    
    try:
        return float(cleaned)
    except ValueError:
        return None


def parse_int(text: str) -> Optional[int]:
    """Parse integer from text, removing formatting"""
    if not text:
        return None
    
    cleaned = text.replace(",", "").replace(" ", "").strip()
    
    try:
        return int(cleaned)
    except ValueError:
        return None


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

