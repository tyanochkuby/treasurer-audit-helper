using System.Text;
using AuditApi.Application;
using AuditApi.Domain;
using AuditApi.Models;

namespace AuditApi.Tests;

public sealed class CsvExportServiceTests
{
    [Theory]
    [InlineData("=SUM(A1:A2)", "'=SUM(A1:A2)")]
    [InlineData("+cmd", "'+cmd")]
    [InlineData("-100", "'-100")]
    [InlineData("@value", "'@value")]
    [InlineData("  =value", "  '=value")]
    [InlineData("safe", "safe")]
    public void Formula_injection_is_neutralized(string input, string expected) =>
        Assert.Equal(expected, CsvExportService.ProtectFormula(input));

    [Fact]
    public void Csv_preserves_polish_characters_and_escapes_quotes_delimiters_and_newlines()
    {
        var contract = new ContractDto(Guid.NewGuid(), Guid.NewGuid(), "Umowa Żółć; \"ważna\"");
        var change = new AuditChangeDto("Comment", "Komentarz", "stara; wartość", "nowa\n\"wartość\"");
        var item = new AuditEventDto(
            "1", contract.Id, new DateTime(2026, 7, 14, 8, 0, 0, DateTimeKind.Utc),
            "żaneta@example.pl", Guid.NewGuid(), "Modified", 1, "ContractHeaderEntity", Guid.NewGuid(),
            "Zmieniono komentarz", [change]);
        var history = new AuditHistoryDto(contract.Id, new DateTime(2026, 7, 14, 10, 0, 0, DateTimeKind.Utc), "1", [item]);

        var export = new CsvExportService().Create(contract, history, AuditFilter.Empty);
        var text = Encoding.UTF8.GetString(export.Content);

        Assert.True(export.Content.AsSpan().StartsWith(Encoding.UTF8.Preamble));
        Assert.StartsWith("\uFEFFsep=;\r\n", text);
        Assert.Contains("Umowa Żółć; \"\"ważna\"\"", text);
        Assert.Contains("\"stara; wartość\"", text);
        Assert.Contains("\"nowa\n\"\"wartość\"\"\"", text);
        Assert.Contains("żaneta@example.pl", text);
    }

    [Fact]
    public void Csv_describes_date_filters_as_the_original_warsaw_calendar_dates()
    {
        var contract = new ContractDto(Guid.NewGuid(), Guid.NewGuid(), "Umowa");
        var history = new AuditHistoryDto(
            contract.Id,
            new DateTime(2026, 7, 15, 10, 0, 0, DateTimeKind.Utc),
            "0",
            []);
        var filter = new AuditFilter(
            null,
            null,
            new DateTime(2026, 6, 30, 22, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 7, 15, 22, 0, 0, DateTimeKind.Utc),
            null,
            AuditSortDirection.Descending);

        var export = new CsvExportService().Create(contract, history, filter);
        var text = Encoding.UTF8.GetString(export.Content);

        Assert.Contains("od=2026-07-01, do=2026-07-15", text);
    }

    [Fact]
    public void Csv_preserves_events_without_meaningful_field_differences()
    {
        var contract = new ContractDto(Guid.NewGuid(), Guid.NewGuid(), "Umowa");
        var item = new AuditEventDto(
            "42", contract.Id, new DateTime(2026, 7, 14, 8, 0, 0, DateTimeKind.Utc),
            "anna@example.pl", Guid.NewGuid(), "Modified", 1, "ContractHeaderEntity", Guid.NewGuid(),
            "Zmieniono ContractHeaderEntity", []);
        var history = new AuditHistoryDto(contract.Id, DateTime.UtcNow, "42", [item]);

        var export = new CsvExportService().Create(contract, history, AuditFilter.Empty);
        var eventLine = Assert.Single(
            Encoding.UTF8.GetString(export.Content).Split("\r\n"),
            line => line.StartsWith("\"42\";", StringComparison.Ordinal));

        Assert.Contains(";\"\";\"\";\"\";\"\";\"Zmieniono ContractHeaderEntity\"", eventLine);
    }
}
