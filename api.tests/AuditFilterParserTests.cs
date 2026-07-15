using System.Collections.Specialized;
using AuditApi.Application;

namespace AuditApi.Tests;

public sealed class AuditFilterParserTests
{
    [Fact]
    public void Polish_calendar_dates_are_converted_to_inclusive_warsaw_boundaries()
    {
        var query = new NameValueCollection
        {
            ["from"] = "2026-07-14",
            ["to"] = "2026-07-14",
            ["sort"] = "asc"
        };

        var result = AuditFilterParser.Parse(query);

        Assert.True(result.IsValid);
        Assert.Equal(new DateTime(2026, 7, 13, 22, 0, 0, DateTimeKind.Utc), result.Filter!.FromUtc);
        Assert.Equal(new DateTime(2026, 7, 14, 22, 0, 0, DateTimeKind.Utc), result.Filter.ToExclusiveUtc);
    }

    [Fact]
    public void Search_is_bounded()
    {
        var query = new NameValueCollection { ["search"] = new string('x', 101) };

        var result = AuditFilterParser.Parse(query);

        Assert.False(result.IsValid);
    }
}
