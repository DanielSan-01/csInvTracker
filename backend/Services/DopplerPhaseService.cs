using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using Microsoft.Extensions.Hosting;

namespace backend.Services;

public record DopplerPhaseInfo(
    string Family,
    string Phase,
    int PaintSeed,
    string? ImageUrl,
    IReadOnlyCollection<string> SupportedWeapons);

public class DopplerPhaseService
{
    private readonly Dictionary<int, DopplerPhaseInfo> _phaseByPaintSeed = new();
    private readonly Dictionary<string, List<DopplerPhaseInfo>> _phasesByFamily = new(StringComparer.OrdinalIgnoreCase);
    private readonly ILogger<DopplerPhaseService> _logger;

    public DopplerPhaseService(IWebHostEnvironment env, ILogger<DopplerPhaseService> logger)
    {
        _logger = logger;

        try
        {
            var filePath = Path.Combine(env.ContentRootPath, "Data", "DopplerPhaseMappings.json");
            if (!File.Exists(filePath))
            {
                _logger.LogWarning("Doppler phase mapping file not found at {FilePath}", filePath);
                return;
            }

            using var stream = File.OpenRead(filePath);
            using var document = JsonDocument.Parse(stream);

            if (!document.RootElement.TryGetProperty("families", out var familiesElement))
            {
                _logger.LogWarning("Doppler phase mapping file missing 'families' section.");
                return;
            }

            foreach (var familyProperty in familiesElement.EnumerateObject())
            {
                var familyName = familyProperty.Name;
                var familyElement = familyProperty.Value;

                var supportedWeapons = familyElement.TryGetProperty("supportedWeapons", out var weaponsElement)
                    ? weaponsElement.EnumerateArray()
                        .Select(weapon => weapon.GetString())
                        .Where(name => !string.IsNullOrWhiteSpace(name))
                        .Select(name => name!)
                        .ToArray()
                    : Array.Empty<string>();

                if (!familyElement.TryGetProperty("phases", out var phasesElement))
                {
                    continue;
                }

                foreach (var phaseElement in phasesElement.EnumerateArray())
                {
                    if (!phaseElement.TryGetProperty("paintSeed", out var paintSeedElement) ||
                        paintSeedElement.ValueKind != JsonValueKind.Number)
                    {
                        continue;
                    }

                    var paintSeed = paintSeedElement.GetInt32();
                    var phaseName = phaseElement.TryGetProperty("phase", out var phaseNameElement)
                        ? phaseNameElement.GetString() ?? "Unknown Phase"
                        : "Unknown Phase";

                    if (familyName.Equals("gammaDoppler", StringComparison.OrdinalIgnoreCase) &&
                        phaseName.StartsWith("Phase", StringComparison.OrdinalIgnoreCase))
                    {
                        phaseName = $"Gamma {phaseName}";
                    }

                    var imageUrl = phaseElement.TryGetProperty("imageUrl", out var imageElement)
                        ? imageElement.GetString()
                        : null;

                    var info = new DopplerPhaseInfo(
                        familyName,
                        phaseName,
                        paintSeed,
                        imageUrl,
                        supportedWeapons);

                    _phaseByPaintSeed[paintSeed] = info;
                    if (!_phasesByFamily.TryGetValue(familyName, out var familyList))
                    {
                        familyList = new List<DopplerPhaseInfo>();
                        _phasesByFamily[familyName] = familyList;
                    }
                    familyList.Add(info);
                }
            }

            _logger.LogInformation("Loaded {Count} Doppler phase mappings.", _phaseByPaintSeed.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load Doppler phase mappings.");
        }
    }

    public DopplerPhaseInfo? GetPhaseInfo(int? paintIndex)
    {
        if (!paintIndex.HasValue)
        {
            return null;
        }

        return _phaseByPaintSeed.TryGetValue(paintIndex.Value, out var info) ? info : null;
    }

    public IEnumerable<DopplerPhaseInfo> GetFamilyPhases(string family, string? weapon)
    {
        if (!_phasesByFamily.TryGetValue(family, out var phases))
        {
            return Enumerable.Empty<DopplerPhaseInfo>();
        }

        if (string.IsNullOrWhiteSpace(weapon))
        {
            return phases;
        }

        return phases.Where(info =>
            info.SupportedWeapons.Any(w => string.Equals(w, weapon, StringComparison.OrdinalIgnoreCase)));
    }
}


