using backend.Data;
using backend.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();
builder.Services.AddScoped<AdminDashboardService>();
builder.Services.AddScoped<SkinImportService>();
builder.Services.AddSingleton<DopplerPhaseService>();

// Add Entity Framework Core with PostgreSQL
// Support Railway's DATABASE_URL or fall back to ConnectionStrings__DefaultConnection
var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL");
if (string.IsNullOrEmpty(connectionString))
{
    // Fall back to configuration (appsettings.json or ConnectionStrings__DefaultConnection env var)
    connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
}

// If DATABASE_URL is provided, it's in PostgreSQL URI format which Npgsql supports directly
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString));

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
            "https://172.20.10.12:3000"
        };

        // Add Vercel frontend URL from environment variable
        var frontendUrl = builder.Configuration["FRONTEND_URL"];
        if (!string.IsNullOrEmpty(frontendUrl))
        {
            allowedOrigins.Add(frontendUrl);
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
    try
    {
        dbContext.Database.Migrate();
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while migrating the database.");
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
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port))
{
    app.Urls.Add($"http://0.0.0.0:{port}");
}

app.Run();
