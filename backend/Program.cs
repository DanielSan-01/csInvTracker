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

// Configure JWT Authentication
var jwtSecret = builder.Configuration["JWT:Secret"] ?? Environment.GetEnvironmentVariable("JWT_SECRET");
var jwtIssuer = builder.Configuration["JWT:Issuer"] ?? Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "cs-inv-tracker";
var jwtAudience = builder.Configuration["JWT:Audience"] ?? Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "cs-inv-tracker";

if (string.IsNullOrEmpty(jwtSecret))
{
    Console.WriteLine("[JWT Config] WARNING: JWT_SECRET is not set! Authentication will not work properly.");
    Console.WriteLine("[JWT Config] Set JWT_SECRET environment variable in Railway.");
}
else
{
    Console.WriteLine($"[JWT Config] JWT_SECRET loaded. Length: {jwtSecret.Length}, First 10 chars: {(jwtSecret.Length > 10 ? jwtSecret.Substring(0, 10) + "..." : jwtSecret)}");
}

if (!string.IsNullOrEmpty(jwtSecret))
{
    builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
        
        // Read token from cookie if Authorization header is not present
        options.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                // Try to get token from cookie if not in Authorization header
                if (string.IsNullOrEmpty(context.Token))
                {
                    context.Token = context.Request.Cookies["auth_token"];
                }
                return System.Threading.Tasks.Task.CompletedTask;
            }
        };
    });
}

builder.Services.AddAuthorization();
builder.Services.AddHttpClient();
builder.Services.AddScoped<AdminDashboardService>();
builder.Services.AddScoped<SkinImportService>();
builder.Services.AddSingleton<DopplerPhaseService>();
    builder.Services.AddScoped<SteamApiService>();
    builder.Services.AddScoped<AuthService>();
    builder.Services.AddScoped<OpenIdVerificationService>();
    builder.Services.AddScoped<StickerCatalogService>();
    builder.Services.AddScoped<SteamInventoryImportService>();
    builder.Services.AddScoped<SteamCatalogRefreshService>();

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
        try
        {
        dbContext.Database.Migrate();
            Console.WriteLine("[Migration] Database migrations applied successfully");
        }
        catch (Exception migrationEx)
        {
            Console.WriteLine($"[Migration] ERROR: Failed to apply migrations: {migrationEx.Message}");
            Console.WriteLine($"[Migration] Stack trace: {migrationEx.StackTrace}");
            // Don't throw - let the app start and handle errors gracefully
            // The error will be visible in logs
        }
        Console.WriteLine("Database migrations completed successfully.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred while migrating the database.");
        Console.WriteLine($"FATAL ERROR: Database migration failed: {ex.Message}");
        Console.WriteLine($"Stack trace: {ex.StackTrace}");
        // Don't exit - let the app start and show the error in logs
    }
    
    // Workarounds: Manually create missing tables/columns if migrations fail
    // These run even if migrations fail, ensuring the database schema is correct
    try
    {
        // Workaround: Manually add AssetId column if it doesn't exist
        Console.WriteLine("Checking for AssetId column...");
        var connection = dbContext.Database.GetDbConnection();
        await connection.OpenAsync();
        using var checkCommand = connection.CreateCommand();
        checkCommand.CommandText = @"
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'InventoryItems'
                AND column_name = 'AssetId'
            );
        ";
        var assetIdExists = (bool)(await checkCommand.ExecuteScalarAsync() ?? false);
        await connection.CloseAsync();
        
        if (!assetIdExists)
        {
            Console.WriteLine("AssetId column does not exist. Adding it manually...");
            await dbContext.Database.ExecuteSqlRawAsync(@"
                ALTER TABLE ""InventoryItems""
                ADD COLUMN ""AssetId"" character varying(100) NULL;
                
                CREATE INDEX IF NOT EXISTS ""IX_InventoryItems_AssetId"" 
                ON ""InventoryItems"" (""AssetId"");
            ");
            Console.WriteLine("AssetId column added successfully.");
        }
        else
        {
            Console.WriteLine("AssetId column already exists.");
        }
        
        // Workaround: Manually create Stickers table if it doesn't exist
        Console.WriteLine("Checking for Stickers table...");
        await connection.OpenAsync();
        using var checkStickersCommand = connection.CreateCommand();
        checkStickersCommand.CommandText = @"
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'Stickers'
            );
        ";
        var stickersExists = (bool)(await checkStickersCommand.ExecuteScalarAsync() ?? false);
        await connection.CloseAsync();
        
        if (!stickersExists)
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
        
        // Workaround: Manually create LoadoutFavorites tables if they don't exist
        Console.WriteLine("Checking for LoadoutFavorites table...");
        await connection.OpenAsync();
        using var checkLoadoutsCommand = connection.CreateCommand();
        checkLoadoutsCommand.CommandText = @"
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'LoadoutFavorites'
            );
        ";
        var loadoutsExists = (bool)(await checkLoadoutsCommand.ExecuteScalarAsync() ?? false);
        await connection.CloseAsync();
        
        if (!loadoutsExists)
        {
            Console.WriteLine("LoadoutFavorites tables do not exist. Creating them manually...");
            await dbContext.Database.ExecuteSqlRawAsync(@"
                CREATE TABLE ""LoadoutFavorites"" (
                    ""Id"" uuid NOT NULL,
                    ""UserId"" integer NOT NULL,
                    ""Name"" character varying(120) NOT NULL,
                    ""CreatedAt"" timestamp with time zone NOT NULL,
                    ""UpdatedAt"" timestamp with time zone NOT NULL,
                    CONSTRAINT ""PK_LoadoutFavorites"" PRIMARY KEY (""Id""),
                    CONSTRAINT ""FK_LoadoutFavorites_Users_UserId"" 
                        FOREIGN KEY (""UserId"") 
                        REFERENCES ""Users"" (""Id"") 
                        ON DELETE CASCADE
                );
                CREATE INDEX ""IX_LoadoutFavorites_UserId"" ON ""LoadoutFavorites"" (""UserId"");
                
                CREATE TABLE ""LoadoutFavoriteEntries"" (
                    ""Id"" uuid NOT NULL,
                    ""LoadoutFavoriteId"" uuid NOT NULL,
                    ""SlotKey"" character varying(100) NOT NULL,
                    ""Team"" character varying(8) NOT NULL,
                    ""InventoryItemId"" integer NULL,
                    ""SkinId"" integer NULL,
                    ""SkinName"" character varying(200) NOT NULL,
                    ""ImageUrl"" character varying(500) NULL,
                    ""Weapon"" character varying(100) NULL,
                    ""Type"" character varying(100) NULL,
                    CONSTRAINT ""PK_LoadoutFavoriteEntries"" PRIMARY KEY (""Id""),
                    CONSTRAINT ""FK_LoadoutFavoriteEntries_LoadoutFavorites_LoadoutFavoriteId"" 
                        FOREIGN KEY (""LoadoutFavoriteId"") 
                        REFERENCES ""LoadoutFavorites"" (""Id"") 
                        ON DELETE CASCADE,
                    CONSTRAINT ""FK_LoadoutFavoriteEntries_InventoryItems_InventoryItemId"" 
                        FOREIGN KEY (""InventoryItemId"") 
                        REFERENCES ""InventoryItems"" (""Id"") 
                        ON DELETE SET NULL,
                    CONSTRAINT ""FK_LoadoutFavoriteEntries_Skins_SkinId"" 
                        FOREIGN KEY (""SkinId"") 
                        REFERENCES ""Skins"" (""Id"") 
                        ON DELETE SET NULL
                );
                CREATE INDEX ""IX_LoadoutFavoriteEntries_LoadoutFavoriteId"" ON ""LoadoutFavoriteEntries"" (""LoadoutFavoriteId"");
                CREATE INDEX ""IX_LoadoutFavoriteEntries_InventoryItemId"" ON ""LoadoutFavoriteEntries"" (""InventoryItemId"");
                CREATE INDEX ""IX_LoadoutFavoriteEntries_SkinId"" ON ""LoadoutFavoriteEntries"" (""SkinId"");
            ");
            Console.WriteLine("LoadoutFavorites tables created successfully.");
        }
        else
        {
            Console.WriteLine("LoadoutFavorites tables already exist.");
        }
    }
    catch (Exception ex)
    {
        logger.LogWarning(ex, "Failed to apply database schema workarounds. This might be okay if everything already exists.");
        Console.WriteLine($"Warning: Could not apply schema workarounds: {ex.Message}");
    }
}

var runCsFloatImport = args.Contains("--import-csfloat", StringComparer.OrdinalIgnoreCase);

if (runCsFloatImport)
{
    using var scope = app.Services.CreateScope();
    var importService = scope.ServiceProvider.GetRequiredService<SkinImportService>();
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("SkinImportCLI");

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

// Global exception handler to ensure CORS headers are included in error responses
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Unhandled exception: {Message}", ex.Message);
        
        // Ensure CORS headers are added even for errors
        context.Response.Headers.Append("Access-Control-Allow-Origin", 
            context.Request.Headers["Origin"].ToString());
        context.Response.Headers.Append("Access-Control-Allow-Credentials", "true");
        
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(new 
        { 
            error = "An error occurred processing your request", 
            details = ex.Message 
        }));
    }
});

app.UseAuthentication();
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
