# CS Inventory Tracker

A full-stack inventory tracking application built with Next.js, .NET EF Core, PostgreSQL, and GSAP.

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
└── README.md
```

## Prerequisites

- Node.js 18+ and npm
- .NET 9.0 SDK
- PostgreSQL 12+ (or Docker with PostgreSQL)


The backend will be available at:
- API: `https://localhost:5001` or `http://localhost:5000`
- Swagger UI: `https://localhost:5001/swagger` (in development)

### 3. Frontend Setup

```bash
cd frontend

# Run the development server
npm run dev
```

The frontend will be available at `http://localhost:3000`


# Quick Start (You need 2 Terminals running)

### Terminal 1 - Backend 
```bash
cd backend
dotnet run
```

**Wait for**: `Now listening on: http://localhost:5027`

### Terminal 2 - Frontend 
```bash
cd frontend
npm run dev
```

### Adding New Database Models

1. Create a model in `backend/Models/`
2. Add a `DbSet` to `ApplicationDbContext`
3. Create a migration: `dotnet ef migrations add MigrationName --project backend`
4. Apply migration: `dotnet ef database update --project backend`


'
