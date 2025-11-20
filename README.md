# CS Inventory Tracker

A full-stack inventory tracking application built with Next.js, .NET EF Core, PostgreSQL, and GSAP.


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

# Install dependencies (already done)
npm install

# Create .env.local file for API URL
echo "NEXT_PUBLIC_API_URL=http://localhost:5000" > .env.local

# Run the development server
npm run dev
```

The frontend will be available at `http://localhost:3000`


# Quick Start (2 Terminals)

### Terminal 1 - Backend (Port 5027)
```bash
cd backend
dotnet run
```

**Wait for**: `Now listening on: http://localhost:5027`

### Terminal 2 - Frontend (Port 3002)
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
