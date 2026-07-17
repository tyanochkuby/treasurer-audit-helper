using AuditApi.Security;
using Microsoft.Azure.Functions.Worker.Http;

namespace AuditApi.Infrastructure.Http;

public static class RequestAuthentication
{
    public static bool IsAuthenticated(HttpRequestData request, AccessSessionService sessions)
    {
        var token = request.Cookies
            .FirstOrDefault(cookie => cookie.Name.Equals(AccessSessionService.CookieName, StringComparison.Ordinal))?
            .Value;
        return sessions.IsAuthenticated(token);
    }
}
