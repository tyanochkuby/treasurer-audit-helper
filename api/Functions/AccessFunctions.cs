using System.Net;
using System.Text.Json;
using AuditApi.Infrastructure.Http;
using AuditApi.Models;
using AuditApi.Security;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace AuditApi.Functions;

public sealed class AccessFunctions(AccessSessionService sessions)
{
    [Function("Access")]
    public async Task<HttpResponseData> AccessAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "access")] HttpRequestData request,
        FunctionContext context)
    {
        var cancellationToken = context.CancellationToken;
        AccessRequest? payload;
        try
        {
            payload = await JsonSerializer.DeserializeAsync<AccessRequest>(
                request.Body,
                new JsonSerializerOptions(JsonSerializerDefaults.Web),
                cancellationToken);
        }
        catch (JsonException)
        {
            return await HttpResponses.ErrorAsync(request, HttpStatusCode.BadRequest, "Nieprawidłowe żądanie.", cancellationToken);
        }

        if (!sessions.TryCreateSession(payload?.Code, out var token))
        {
            return await HttpResponses.ErrorAsync(request, HttpStatusCode.Unauthorized, "Nieprawidłowy kod dostępu.", cancellationToken);
        }

        var response = HttpResponses.NoContent(request);
        response.Headers.Add("Set-Cookie", sessions.CreateCookie(token));
        response.Headers.Add("Cache-Control", "no-store");
        return response;
    }

    [Function("Logout")]
    public HttpResponseData Logout(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "logout")] HttpRequestData request)
    {
        var response = HttpResponses.NoContent(request);
        response.Headers.Add("Set-Cookie", sessions.CreateExpiredCookie());
        response.Headers.Add("Cache-Control", "no-store");
        return response;
    }
}
