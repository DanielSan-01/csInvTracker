# CS Inventory Tracker

A full-stack inventory tracking application built with Next.js, .NET EF Core, PostgreSQL, and GSAP. Taken from Figma designs through deployment with custom domain and Railway hosting.

<img width="879" height="933" alt="CleanShot 2025-12-06 at 19 32 28" src="https://github.com/user-attachments/assets/6430ab37-e1a4-4177-a020-a5f4c2b9c9f8" />


## Project Structure

```
csInvTracker/
├── frontend/          # Next.js frontend application
│   ├── app/           # Next.js app directory
│   │   ├── components/  # React components
│   │   └── ...
│   ├── lib/           # Utility functions and API client
│   └── ...
├── backend/           # .NET Web API backend
│   ├── Controllers/   # API controllers
│   ├── Data/          # EF Core DbContext
│   ├── Models/        # Data models
│   └── ...
```

## tech-stack

- Node.js 18+ and npm
- .NET 9.0 SDK
- PostgreSQL 12+ (or Docker with PostgreSQL)


Valid market codes include `STEAMCOMMUNITY`, `BUFFMARKET`, `SKINPORT`, `MARKETCSGO`, `DMARKET`, `GAMERPAYGG`, `CSDEALS`, `SKINBARON`, `CSFLOAT`, `CSMONEY`, and `WHITEMARKET`.
