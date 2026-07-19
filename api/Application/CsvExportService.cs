using System.Globalization;
using System.Text;
using AuditApi.Domain;
using AuditApi.Models;

namespace AuditApi.Application;

public sealed class CsvExportService
{
    private const char Delimiter = ';';
    private static readonly UTF8Encoding Utf8WithBom = new(encoderShouldEmitUTF8Identifier: true);
    private static readonly TimeZoneInfo WarsawTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Europe/Warsaw");

    public CsvExport Create(ContractDto contract, AuditHistoryDto history, AuditFilter filter)
    {
        var lines = new List<string>
        {
            Row("Raport historii zmian umowy"),
            Row("Identyfikator umowy", contract.Id.ToString()),
            Row("Nazwa umowy", contract.DisplayName),
            Row("Identyfikator organizacji", contract.OrganizationId.ToString()),
            Row("Wygenerowano UTC", history.GeneratedAtUtc.ToString("O")),
            Row("Zastosowane filtry", DescribeFilters(filter)),
            string.Empty,
            Row(
                "Id zdarzenia", "Data i czas UTC", "Użytkownik", "Identyfikator użytkownika",
                "Operacja", "Encja", "Identyfikator encji", "Pole", "Pole techniczne",
                "Poprzednia wartość", "Nowa wartość", "Opis")
        };

        foreach (var item in history.Items)
        {
            if (item.Changes.Count == 0)
            {
                lines.Add(EventRow(item, null));
                continue;
            }

            foreach (var change in item.Changes)
            {
                lines.Add(EventRow(item, change));
            }
        }

        var body = string.Join("\r\n", lines) + "\r\n";
        var content = Utf8WithBom.GetPreamble().Concat(Encoding.UTF8.GetBytes(body)).ToArray();
        var fileName = $"contract-{contract.Id}-audit-{history.GeneratedAtUtc:yyyy-MM-dd}.csv";
        return new(content, fileName);
    }

    internal static string ProtectFormula(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return value ?? string.Empty;
        }

        var firstNonWhitespace = -1;
        for (var index = 0; index < value.Length; index++)
        {
            if (!char.IsWhiteSpace(value[index]))
            {
                firstNonWhitespace = index;
                break;
            }
        }
        if (firstNonWhitespace >= 0 && value[firstNonWhitespace] is '=' or '+' or '-' or '@')
        {
            // A plain negative number is data, not a formula; left it numeric for Excel.
            if (value[firstNonWhitespace] == '-' && decimal.TryParse(
                    value.AsSpan(firstNonWhitespace),
                    NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint,
                    CultureInfo.InvariantCulture,
                    out _))
            {
                return value;
            }

            return value.Insert(firstNonWhitespace, "'");
        }

        return value;
    }

    internal static string Cell(string? value)
    {
        var protectedValue = ProtectFormula(value).Replace("\"", "\"\"");
        return $"\"{protectedValue}\"";
    }

    private static string Row(params string?[] cells) => string.Join(Delimiter, cells.Select(Cell));

    private static string EventRow(AuditEventDto item, AuditChangeDto? change) => Row(
        item.Id,
        item.OccurredAtUtc.ToString("O"),
        item.ActorDisplayName,
        item.ActorId.ToString(),
        OperationLabel(item.OperationType),
        EntityLabel(item.EntityType),
        item.EntityId?.ToString(),
        change?.FieldDisplayName,
        change?.FieldName,
        change?.OldValue,
        change?.NewValue,
        item.Description);

    private static string DescribeFilters(AuditFilter filter)
    {
        var filters = new List<string>();
        if (filter.OperationType is not null) filters.Add($"operacja={filter.OperationType}");
        if (filter.EntityType is not null) filters.Add($"encja={filter.EntityType}");
        if (filter.FromUtc is not null)
        {
            var fromWarsaw = TimeZoneInfo.ConvertTimeFromUtc(filter.FromUtc.Value, WarsawTimeZone);
            filters.Add($"od={fromWarsaw:yyyy-MM-dd}");
        }
        if (filter.ToExclusiveUtc is not null)
        {
            var toExclusiveWarsaw = TimeZoneInfo.ConvertTimeFromUtc(filter.ToExclusiveUtc.Value, WarsawTimeZone);
            filters.Add($"do={toExclusiveWarsaw.Date.AddDays(-1):yyyy-MM-dd}");
        }
        if (!string.IsNullOrWhiteSpace(filter.Search)) filters.Add($"szukaj={filter.Search}");
        filters.Add(filter.SortDirection == AuditSortDirection.Ascending ? "kolejność=najstarsze" : "kolejność=najnowsze");
        return string.Join(", ", filters);
    }

    private static string OperationLabel(string operation) => PolishAuditLabels.OperationLabel(operation) ?? operation;

    private static string EntityLabel(string entity) => PolishAuditLabels.EntityLabel(entity);
}
