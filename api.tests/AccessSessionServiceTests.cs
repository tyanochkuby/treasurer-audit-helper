using AuditApi.Infrastructure;
using AuditApi.Security;

namespace AuditApi.Tests;

public sealed class AccessSessionServiceTests
{
    private static AppSettings Settings() => new(
        "not-used-by-this-unit-test",
        "correct-horse-battery-staple",
        "a-session-signing-key-that-is-longer-than-32-characters",
        "false");

    [Fact]
    public void Invalid_access_code_is_rejected()
    {
        var service = new AccessSessionService(Settings(), new ManualTimeProvider(DateTimeOffset.UtcNow));

        var accepted = service.TryCreateSession("wrong-code", out var token);

        Assert.False(accepted);
        Assert.Empty(token);
    }

    [Fact]
    public void Protected_session_requires_a_valid_unexpired_cookie()
    {
        var clock = new ManualTimeProvider(new DateTimeOffset(2026, 7, 14, 10, 0, 0, TimeSpan.Zero));
        var service = new AccessSessionService(Settings(), clock);
        Assert.False(service.IsAuthenticated(null));
        Assert.True(service.TryCreateSession("correct-horse-battery-staple", out var token));

        Assert.True(service.IsAuthenticated($"other=x; {AccessSessionService.CookieName}={token}"));

        clock.Now = clock.Now.AddMinutes(31);
        Assert.False(service.IsAuthenticated($"{AccessSessionService.CookieName}={token}"));
    }
}
