# CS Inventory Tracker

A full-stack inventory tracking application built with Next.js, .NET EF Core, PostgreSQL, and GSAP.

## Tech Stack

- **Frontend**: Next.js 16 with TypeScript, Tailwind CSS, and GSAP for animations
- **Backend**: .NET 9.0 Web API with Entity Framework Core
- **Database**: PostgreSQL
- **Animation**: GSAP (GreenSock Animation Platform)

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

## Setup Instructions

### 1. Database Setup

Install and start PostgreSQL:

```bash
# Using Homebrew on macOS
brew install postgresql@14
brew services start postgresql@14

# Create matching superuser/password for local development
/opt/homebrew/opt/postgresql@14/bin/createuser -s postgres
/opt/homebrew/opt/postgresql@14/bin/psql -U postgres -d postgres -c "ALTER ROLE postgres WITH PASSWORD 'postgres';"

# Create database
createdb csinvtracker

# Or using Docker
docker run --name postgres-csinv -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=csInvTracker -p 5432:5432 -d postgres:14
```

### 2. Backend Setup

```bash
cd backend

# Update connection string in appsettings.json if needed
# Default: Host=localhost;Port=5432;Database=csInvTracker;Username=postgres;Password=postgres

# Apply migration to database
# (If `dotnet ef` is not on your PATH, run `dotnet tool install --global dotnet-ef` once
# or invoke `~/.dotnet/tools/dotnet-ef`.)
dotnet ef database update --project .

# Run the backend
dotnet run
```

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

## Development

### Running Both Services

**Terminal 1 - Backend:**
```bash
cd backend
dotnet watch run
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Adding New Database Models

1. Create a model in `backend/Models/`
2. Add a `DbSet` to `ApplicationDbContext`
3. Create a migration: `dotnet ef migrations add MigrationName --project backend`
4. Apply migration: `dotnet ef database update --project backend`

### Using GSAP

GSAP is already installed. Import it in your components:

```tsx
'use client';
import { gsap } from 'gsap';
import { useEffect, useRef } from 'react';

export default function MyComponent() {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (ref.current) {
      gsap.from(ref.current, { opacity: 0, y: 20, duration: 1 });
    }
  }, []);
  
  return <div ref={ref}>Animated content</div>;
}
```

## API Endpoints

### Health Check
- `GET /api/health` - Returns API health status

## Useful Commands

### Backend
- `dotnet run` - Run the API
- `dotnet watch run` - Run with hot reload
- `dotnet ef migrations add <Name>` - Create a new migration
- `dotnet ef database update` - Apply migrations
- `dotnet ef migrations remove` - Remove last migration

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Environment Variables

### Backend (`appsettings.json`)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=csInvTracker;Username=postgres;Password=postgres"
  }
}
```

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## License

MIT

