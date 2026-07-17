using System.Collections.Specialized;
using AuditApi.Domain;
using AuditApi.Models;

namespace AuditApi.Application;

public static class AuditFilterParser
{
    public const int MaxSearchLength = 100;
    private static readonly TimeZoneInfo WarsawTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Europe/Warsaw");

    public static FilterParseResult Parse(NameValueCollection query)
    {
        var operationResult = ParseOperation(query["operationType"]);
        if (operationResult.Error is not null)
        {
            return new(null, operationResult.Error);
        }

        int? entityType = null;
        if (!string.IsNullOrWhiteSpace(query["entityType"]))
        {
            if (!int.TryParse(query["entityType"], out var parsedEntityType) || parsedEntityType < 0)
            {
                return new(null, "Nieprawidłowy typ encji.");
            }

            entityType = parsedEntityType;
        }

        var fromResult = ParsePolishDate(query["from"], false);
        if (fromResult.Error is not null)
        {
            return new(null, fromResult.Error);
        }

        var toResult = ParsePolishDate(query["to"], true);
        if (toResult.Error is not null)
        {
            return new(null, toResult.Error);
        }

        if (fromResult.Utc is not null && toResult.Utc is not null && fromResult.Utc >= toResult.Utc)
        {
            return new(null, "Data „od” musi być wcześniejsza lub równa dacie „do”.");
        }

        var search = query["search"]?.Trim();
        if (search?.Length > MaxSearchLength)
        {
            return new(null, $"Wyszukiwana fraza może mieć maksymalnie {MaxSearchLength} znaków.");
        }

        var sort = string.Equals(query["sort"], "asc", StringComparison.OrdinalIgnoreCase)
            ? AuditSortDirection.Ascending
            : AuditSortDirection.Descending;
        if (!string.IsNullOrWhiteSpace(query["sort"]) &&
            !string.Equals(query["sort"], "asc", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(query["sort"], "desc", StringComparison.OrdinalIgnoreCase))
        {
            return new(null, "Nieprawidłowy kierunek sortowania.");
        }

        return new(new AuditFilter(operationResult.Operation, entityType, fromResult.Utc, toResult.Utc, search, sort), null);
    }

    private static (AuditOperationType? Operation, string? Error) ParseOperation(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return (null, null);
        }

        if (Enum.TryParse<AuditOperationType>(value, true, out var operation) && Enum.IsDefined(operation))
        {
            return (operation, null);
        }

        return (null, "Nieprawidłowy typ operacji.");
    }

    private static (DateTime? Utc, string? Error) ParsePolishDate(string? value, bool nextDay)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return (null, null);
        }

        if (!DateOnly.TryParseExact(value, "yyyy-MM-dd", out var date))
        {
            return (null, "Daty muszą mieć format RRRR-MM-DD.");
        }

        if (nextDay)
        {
            date = date.AddDays(1);
        }

        var localMidnight = DateTime.SpecifyKind(date.ToDateTime(TimeOnly.MinValue), DateTimeKind.Unspecified);
        return (TimeZoneInfo.ConvertTimeToUtc(localMidnight, WarsawTimeZone), null);
    }
}
