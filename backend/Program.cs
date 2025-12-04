using backend.Data;
using backend.Services;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.Linq;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();
builder.Services.AddScoped<AdminDashboardService>();
builder.Services.AddScoped<SkinImportService>();
builder.Services.AddSingleton<DopplerPhaseService>();
builder.Services.AddScoped<SteamApiService>();

// Add Entity Framework Core with PostgreSQL
// Support Railway's DATABASE_URL or fall back to ConnectionStrings__DefaultConnection
var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
var connectionStringFromConfig = builder.Configuration.GetConnectionString("DefaultConnection");

// Log what we found (for debugging)
Console.WriteLine($"[DB Config] DATABASE_URL is {(string.IsNullOrEmpty(databaseUrl) ? "NOT SET" : "SET")}");
Console.WriteLine($"[DB Config] ConnectionStrings__DefaultConnection is {(string.IsNullOrEmpty(connectionStringFromConfig) ? "NOT SET" : "SET")}");

// Prefer DATABASE_URL, fall back to ConnectionStrings__DefaultConnection
var connectionString = !string.IsNullOrEmpty(databaseUrl) ? databaseUrl : connectionStringFromConfig;

if (string.IsNullOrEmpty(connectionString))
{
    Console.WriteLine("[DB Config] ERROR: No database connection string found!");
    throw new InvalidOperationException(
        "Database connection string is required. Set DATABASE_URL environment variable or ConnectionStrings__DefaultConnection.");
}

// Log first part of connection string for debugging (don't log full password)
var connectionStringPreview = connectionString.Length > 50 
    ? connectionString.Substring(0, 50) + "..." 
    : connectionString;
Console.WriteLine($"[DB Config] Using connection string: {connectionStringPreview}");

// Convert PostgreSQL URI format to standard connection string if needed
string finalConnectionString = connectionString;
if (connectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase) || 
    connectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase))
{
    try
    {
        var uri = new Uri(connectionString);
        var connBuilder = new Npgsql.NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port != -1 ? uri.Port : 5432,
            Database = uri.AbsolutePath.TrimStart('/'),
            Username = uri.UserInfo.Split(':')[0],
            Password = uri.UserInfo.Split(':').Length > 1 ? uri.UserInfo.Split(':')[1] : string.Empty
        };
        finalConnectionString = connBuilder.ConnectionString;
        Console.WriteLine("[DB Config] Converted PostgreSQL URI to standard connection string format");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[DB Config] Warning: Failed to parse PostgreSQL URI, using as-is: {ex.Message}");
        // Use original connection string if parsing fails
    }
}

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(finalConnectionString));

// Add CORS for Next.js frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowNextJs", policy =>
    {
        var allowedOrigins = new List<string>
        {
            "http://localhost:3000",
            "http://localhost:3002",
            "http://127.0.0.1:3000",
            "http://192.168.10.105:3000",
            "http://192.168.10.105:3002",
            "https://192.168.10.105:3000",
            "https://192.168.10.105:3002",
            "http://172.20.10.12:3000",
            "https://172.20.10.12:3000",
            // Vercel production domains
            "https://www.csinvtracker.com",
            "https://csinvtracker.com",
            "https://cs-inv-tracker.vercel.app"
        };

        // Add Vercel frontend URL from environment variable
        var frontendUrl = builder.Configuration["FRONTEND_URL"];
        if (!string.IsNullOrEmpty(frontendUrl))
        {
            allowedOrigins.Add(frontendUrl);
            // Also add without www if it has www
            if (frontendUrl.Contains("www."))
            {
                allowedOrigins.Add(frontendUrl.Replace("www.", ""));
            }
        }

        // Allow all origins in development, specific origins in production
        if (builder.Environment.IsDevelopment())
        {
            policy.AllowAnyOrigin()
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        }
        else
        {
            policy.WithOrigins(allowedOrigins.ToArray())
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
    });
});

var app = builder.Build();

// Apply pending migrations on startup
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        Console.WriteLine("Checking for pending migrations...");
        
        // Get ALL migrations that EF Core knows about
        var allMigrations = dbContext.Database.GetMigrations().ToList();
        Console.WriteLine($"All migrations in assembly ({allMigrations.Count}):");
        foreach (var migration in allMigrations)
        {
            Console.WriteLine($"  - {migration}");
        }
        
        // Get pending migrations
        var pendingMigrations = dbContext.Database.GetPendingMigrations().ToList();
        if (pendingMigrations.Any())
        {
            Console.WriteLine($"Found {pendingMigrations.Count} pending migration(s):");
            foreach (var migration in pendingMigrations)
            {
                Console.WriteLine($"  - {migration}");
            }
        }
        else
        {
            Console.WriteLine("No pending migrations found.");
        }
        
        // Get applied migrations
        var appliedMigrations = dbContext.Database.GetAppliedMigrations().ToList();
        Console.WriteLine($"Applied migrations ({appliedMigrations.Count}):");
        foreach (var migration in appliedMigrations)
        {
            Console.WriteLine($"  - {migration}");
        }
        
        Console.WriteLine("Applying pending migrations...");
        dbContext.Database.Migrate();
        Console.WriteLine("Database migrations completed successfully.");
        
        // Workaround: Manually create Stickers table if it doesn't exist
        // This is a temporary fix until we figure out why migrations aren't being detected
        try
        {
            var connection = dbContext.Database.GetDbConnection();
            await connection.OpenAsync();
            using var checkCommand = connection.CreateCommand();
            checkCommand.CommandText = @"
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'Stickers'
                );
            ";
            var exists = (bool)(await checkCommand.ExecuteScalarAsync() ?? false);
            await connection.CloseAsync();
            
            if (!exists)
            {
                Console.WriteLine("Stickers table does not exist. Creating it manually...");
                await dbContext.Database.ExecuteSqlRawAsync(@"
                    CREATE TABLE ""Stickers"" (
                        ""Id"" integer GENERATED BY DEFAULT AS IDENTITY,
                        ""InventoryItemId"" integer NOT NULL,
                        ""Name"" character varying(200) NOT NULL,
                        ""Price"" decimal(18,2) NULL,
                        ""Slot"" integer NULL,
                        ""ImageUrl"" character varying(500) NULL,
                        CONSTRAINT ""PK_Stickers"" PRIMARY KEY (""Id""),
                        CONSTRAINT ""FK_Stickers_InventoryItems_InventoryItemId"" 
                            FOREIGN KEY (""InventoryItemId"") 
                            REFERENCES ""InventoryItems"" (""Id"") 
                            ON DELETE CASCADE
                    );
                    CREATE INDEX ""IX_Stickers_InventoryItemId"" ON ""Stickers"" (""InventoryItemId"");
                ");
                Console.WriteLine("Stickers table created successfully.");
            }
            else
            {
                Console.WriteLine("Stickers table already exists.");
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to create Stickers table manually. This might be okay if it already exists.");
            Console.WriteLine($"Warning: Could not verify/create Stickers table: {ex.Message}");
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred while migrating the database.");
        Console.WriteLine($"FATAL ERROR: Database migration failed: {ex.Message}");
        Console.WriteLine($"Stack trace: {ex.StackTrace}");
        // Don't exit - let the app start and show the error in logs
    }
}

var runByMykelImport = args.Contains("--import-skins", StringComparer.OrdinalIgnoreCase);
var runCsFloatImport = args.Contains("--import-csfloat", StringComparer.OrdinalIgnoreCase);

if (runByMykelImport || runCsFloatImport)
{
    using var scope = app.Services.CreateScope();
    var importService = scope.ServiceProvider.GetRequiredService<SkinImportService>();
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("SkinImportCLI");

    if (runByMykelImport)
    {
        logger.LogInformation("Running ByMykel import because --import-skins flag was provided.");
        var result = await importService.ImportFromByMykelAsync();
        logger.LogInformation("{Message}", result.Message);
    }

    if (runCsFloatImport)
    {
        logger.LogInformation("Running CSFloat import because --import-csfloat flag was provided.");
        var result = await importService.ImportFromCsFloatAsync();
        logger.LogInformation("{Message}", result.Message);
    }

    return;
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowNextJs");
app.UseAuthorization();

app.MapControllers();

// Use PORT environment variable if available (for Railway, Render, etc.)
// Railway automatically sets PORT, so we use it if present
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port) && int.TryParse(port, out int portNumber))
{
    app.Urls.Clear(); // Clear default URLs
    app.Urls.Add($"http://0.0.0.0:{portNumber}");
}
// If PORT is not set, use default behavior (app.Run() will use default ports)

app.Run();
