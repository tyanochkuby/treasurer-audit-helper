using AuditApi.Security;
using Microsoft.Azure.Functions.Worker.Http;

namespace AuditApi.Infrastructure.Http;

public static class RequestAuthentication
{
    public static bool IsAuthenticated(HttpRequestData request, AccessSessionService sessions)
    {
        request.Headers.TryGetValues("Cookie", out var values);
        return sessions.IsAuthenticated(values?.FirstOrDefault());
    }
}
