# Project Planning Document

## Project Overview
CS Inventory Tracker - A full-stack inventory management application.

## Tech Stack Summary

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: GSAP (GreenSock Animation Platform)
- **State Management**: (To be determined - Context API, Zustand, or Redux)

### Backend
- **Framework**: .NET 9.0 Web API
- **ORM**: Entity Framework Core 9.0
- **Database**: PostgreSQL
- **API Documentation**: Swagger/OpenAPI

### Database
- **Type**: PostgreSQL
- **Migrations**: EF Core Migrations

## Project Structure

```
csInvTracker/
├── frontend/
│   ├── app/
│   │   ├── components/     # Reusable React components
│   │   ├── lib/            # Utilities, API client, helpers
│   │   ├── (routes)/       # Next.js routes/pages
│   │   └── ...
│   ├── public/             # Static assets
│   └── ...
│
├── backend/
│   ├── Controllers/        # API controllers
│   ├── Data/               # DbContext and database configuration
│   ├── Models/             # Entity models
│   ├── Services/           # Business logic services (to be added)
│   ├── DTOs/               # Data Transfer Objects (to be added)
│   └── ...
│
└── docs/                   # Documentation (optional)
```

## Development Phases

### Phase 1: Foundation ✅ (Completed)
- [x] Set up Next.js frontend
- [x] Set up .NET backend
- [x] Configure EF Core with PostgreSQL
- [x] Install GSAP
- [x] Create project structure
- [x] Set up CORS for frontend-backend communication
- [x] Create basic health check endpoint

### Phase 2: Core Features (Next Steps)
- [ ] Define data models (Inventory items, categories, etc.)
- [ ] Create database schema
- [ ] Implement CRUD operations in backend
- [ ] Create API endpoints
- [ ] Build frontend components for inventory management
- [ ] Implement API integration in frontend

### Phase 3: Enhanced Features
- [ ] Add authentication/authorization
- [ ] Implement search and filtering
- [ ] Add pagination
- [ ] Create dashboard with analytics
- [ ] Implement GSAP animations throughout the UI

### Phase 4: Polish & Optimization
- [ ] Error handling and validation
- [ ] Loading states and UI feedback
- [ ] Responsive design refinement
- [ ] Performance optimization
- [ ] Testing (unit and integration tests)

## Suggested Data Models

Consider creating these models for an inventory tracker:

1. **Item** - Main inventory item
   - Id, Name, Description, SKU, Quantity, Price, CategoryId, CreatedAt, UpdatedAt

2. **Category** - Item categories
   - Id, Name, Description, CreatedAt

3. **Supplier** - Item suppliers (optional)
   - Id, Name, ContactInfo, CreatedAt

4. **Transaction** - Inventory transactions (optional)
   - Id, ItemId, Type (In/Out), Quantity, Date, Notes

## API Endpoints (Suggested)

### Items
- `GET /api/items` - Get all items (with pagination/filtering)
- `GET /api/items/{id}` - Get item by ID
- `POST /api/items` - Create new item
- `PUT /api/items/{id}` - Update item
- `DELETE /api/items/{id}` - Delete item

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category
- (Similar CRUD operations)

## Frontend Pages/Routes (Suggested)

- `/` - Dashboard/Home
- `/items` - Inventory list
- `/items/new` - Create new item
- `/items/[id]` - Item details/edit
- `/categories` - Category management
- `/analytics` - Inventory analytics (optional)

## GSAP Animation Ideas

1. **Page Transitions**: Smooth page transitions
2. **List Animations**: Stagger animations for inventory lists
3. **Form Interactions**: Input focus animations
4. **Loading States**: Animated spinners and skeletons
5. **Notifications**: Toast notifications with GSAP
6. **Modal Animations**: Smooth modal open/close
7. **Dashboard Widgets**: Animated statistics cards

## Environment Setup Checklist

- [x] Node.js and npm installed
- [x] .NET 9.0 SDK installed
- [ ] PostgreSQL installed and running
- [ ] Database created
- [ ] Connection string configured
- [ ] Frontend and backend can communicate

## Next Immediate Steps

1. **Create your first model**:
   ```bash
   # Create a model in backend/Models/Item.cs
   # Add DbSet to ApplicationDbContext
   # Create migration: dotnet ef migrations add AddItemModel
   # Apply: dotnet ef database update
   ```

2. **Create your first controller**:
   ```bash
   # Create backend/Controllers/ItemsController.cs
   # Implement CRUD operations
   ```

3. **Build your first frontend component**:
   ```bash
   # Create frontend/app/components/ItemList.tsx
   # Use the API client from lib/api.ts
   # Add GSAP animations
   ```

## Development Workflow

1. **Backend First**: Define models → Create migrations → Build controllers → Test with Swagger
2. **Frontend Second**: Create components → Integrate API → Add GSAP animations → Style with Tailwind
3. **Iterate**: Test → Refine → Deploy

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [.NET Documentation](https://learn.microsoft.com/en-us/dotnet/)
- [EF Core Documentation](https://learn.microsoft.com/en-us/ef/core/)
- [GSAP Documentation](https://greensock.com/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

