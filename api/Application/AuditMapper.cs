using System.Text.Json;
using AuditApi.Domain;
using AuditApi.Infrastructure;
using AuditApi.Models;

namespace AuditApi.Application;

public sealed class AuditMapper
{
    public AuditEventDto Map(AuditLogRecord row)
    {
        var oldPayload = ParsePayload(row.OldValues);
        var newPayload = ParsePayload(row.NewValues);
        var fields = ReadAffectedColumns(row.AffectedColumns)
            .Concat(oldPayload.Values.Keys)
            .Concat(newPayload.Values.Keys)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var changes = (fields.Count > 0
            ? fields.Select(field => new AuditChangeDto(
                field,
                GetFieldDisplayName(row.EntityType, field),
                oldPayload.Values.GetValueOrDefault(field),
                newPayload.Values.GetValueOrDefault(field))).ToList()
            : [new AuditChangeDto(null, null, oldPayload.Fallback, newPayload.Fallback)])
            .Where(change => IsMeaningfulChange(row.Type, change))
            .ToList();

        var operation = Enum.IsDefined(typeof(AuditOperationType), row.Type)
            ? ((AuditOperationType)row.Type).ToString()
            : $"Unknown ({row.Type})";
        var entityType = GetEntityTypeName(row.EntityType);
        var description = CreateDescription(operation, entityType, changes);

        return new AuditEventDto(
            row.Id.ToString(),
            row.RootContractId,
            DateTime.SpecifyKind(row.CreatedDate, DateTimeKind.Utc),
            row.UserEmail,
            row.UserId,
            operation,
            row.EntityType,
            entityType,
            row.EntityId,
            description,
            changes);
    }

    public static string GetFieldDisplayName(int entityType, string field) => FieldLabelCatalog.GetDisplayName(entityType, field);

    public static string GetEntityTypeName(int code) => code switch
    {
        0 => nameof(KnownEntityType.Unknown),
        1 => nameof(KnownEntityType.ContractHeaderEntity),
        2 => nameof(KnownEntityType.AnnexHeaderEntity),
        3 => nameof(KnownEntityType.AnnexChangeEntity),
        4 => nameof(KnownEntityType.FileEntity),
        5 => nameof(KnownEntityType.InvoiceEntity),
        6 => nameof(KnownEntityType.PaymentScheduleEntity),
        7 => nameof(KnownEntityType.ContractFundingEntity),
        _ => $"Unknown ({code})"
    };

    private static bool IsMeaningfulChange(int operationType, AuditChangeDto change) => operationType switch
    {
        (int)AuditOperationType.Added => change.NewValue is not null,
        (int)AuditOperationType.Deleted => change.OldValue is not null,
        (int)AuditOperationType.Modified => !string.Equals(change.OldValue, change.NewValue, StringComparison.Ordinal),
        _ => true
    };

    private static string CreateDescription(string operation, string entityType, IReadOnlyList<AuditChangeDto> changes)
    {
        var operationLabel = PolishAuditLabels.OperationLabel(operation) ?? "Zarejestrowano operację";
        var field = changes.Count == 1 && changes[0].FieldDisplayName is not null
            ? $": {changes[0].FieldDisplayName}"
            : string.Empty;
        return $"{operationLabel} {entityType}{field}";
    }

    private static ParsedPayload ParsePayload(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return new(new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase), null);
        }

        try
        {
            using var document = JsonDocument.Parse(json);
            if (document.RootElement.ValueKind == JsonValueKind.Object)
            {
                var values = document.RootElement.EnumerateObject().ToDictionary(
                    property => property.Name,
                    property => FormatValue(property.Value),
                    StringComparer.OrdinalIgnoreCase);
                return new(values, null);
            }

            return new(new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase), FormatValue(document.RootElement));
        }
        catch (JsonException)
        {
            return new(new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase), json);
        }
    }

    private static IEnumerable<string> ReadAffectedColumns(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return [];
        }

        try
        {
            using var document = JsonDocument.Parse(json);
            return document.RootElement.ValueKind == JsonValueKind.Array
                ? document.RootElement.EnumerateArray()
                    .Where(value => value.ValueKind == JsonValueKind.String)
                    .Select(value => value.GetString()!)
                    .ToArray()
                : [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static string? FormatValue(JsonElement value) => value.ValueKind switch
    {
        JsonValueKind.Null or JsonValueKind.Undefined => null,
        JsonValueKind.String => value.GetString(),
        JsonValueKind.Object or JsonValueKind.Array => JsonSerializer.Serialize(value, new JsonSerializerOptions { WriteIndented = true }),
        _ => value.GetRawText()
    };

    private sealed record ParsedPayload(Dictionary<string, string?> Values, string? Fallback);
}
