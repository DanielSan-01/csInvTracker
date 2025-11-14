using backend.Data;
using backend.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();
builder.Services.AddScoped<SkinImportService>();

// Add Entity Framework Core with PostgreSQL
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Add CORS for Next.js frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowNextJs", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://localhost:3002")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

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

app.Run();
