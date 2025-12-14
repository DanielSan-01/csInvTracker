# Tech Stack Guardrails

This project must always conform to the following stack decisions. Treat these as non-negotiable guardrails when adding new features or refactoring.

- **Frontend**: Next.js 16 with React 19 and TypeScript. Styling relies on Tailwind utilities and GSAP for animations.
- **Backend**: ASP.NET Core 9 Web API with Entity Framework Core.
- **Data Access**: Entity Framework Core must use the PostgreSQL provider (`Npgsql.EntityFrameworkCore.PostgreSQL`). No other relational providers should be introduced.
- **Database**: PostgreSQL. Local development defaults to `csinvtracker` on `localhost:5432`. Any scripts, migrations, or tooling must target Postgres.
- **Testing**: Backend unit tests may continue to use the EF Core InMemory provider for isolation, but production/runtime code must stay on PostgreSQL.

If you need to deviate from these rules, document the rationale in this file and obtain explicit approval first. This keeps the implementation aligned with the intended architecture.


