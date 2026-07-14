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
        Assert.Contains("Umowa Żółć; \"\"ważna\"\"", text);
        Assert.Contains("\"stara; wartość\"", text);
        Assert.Contains("\"nowa\n\"\"wartość\"\"\"", text);
        Assert.Contains("żaneta@example.pl", text);
    }
}
