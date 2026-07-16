using System.Reflection;
using System.Text.Json;

namespace AuditApi.Application;

internal static class FieldLabelCatalog
{
    private const string ResourceName = "AuditApi.Localization.auditFieldLabels.pl.json";
    private static readonly Catalog Labels = Load();

    public static string GetDisplayName(int entityType, string fieldName)
    {
        if (Labels.ByEntityType.TryGetValue(entityType.ToString(), out var entityLabels) &&
            entityLabels.TryGetValue(fieldName, out var entityLabel))
        {
            return entityLabel;
        }

        return Labels.Default.GetValueOrDefault(fieldName, fieldName);
    }

    private static Catalog Load()
    {
        using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(ResourceName)
            ?? throw new InvalidOperationException($"Missing embedded field-label resource: {ResourceName}.");
        var source = JsonSerializer.Deserialize<CatalogSource>(stream, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        }) ?? throw new InvalidOperationException("The embedded field-label resource is empty.");

        return new(
            new Dictionary<string, string>(source.Default, StringComparer.OrdinalIgnoreCase),
            source.ByEntityType.ToDictionary(
                pair => pair.Key,
                pair => new Dictionary<string, string>(pair.Value, StringComparer.OrdinalIgnoreCase),
                StringComparer.OrdinalIgnoreCase));
    }

    private sealed record Catalog(
        IReadOnlyDictionary<string, string> Default,
        IReadOnlyDictionary<string, Dictionary<string, string>> ByEntityType);

    private sealed record CatalogSource(
        Dictionary<string, string> Default,
        Dictionary<string, Dictionary<string, string>> ByEntityType);
}
