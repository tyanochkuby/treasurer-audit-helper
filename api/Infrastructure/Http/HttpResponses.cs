using System.Net;
using System.Text.Json;
using AuditApi.Models;
using Microsoft.Azure.Functions.Worker.Http;

namespace AuditApi.Infrastructure.Http;

public static class HttpResponses
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static async Task<HttpResponseData> JsonAsync<T>(
        HttpRequestData request,
        HttpStatusCode status,
        T value,
        CancellationToken cancellationToken)
    {
        var response = request.CreateResponse(status);
        response.Headers.Add("Content-Type", "application/json; charset=utf-8");
        await JsonSerializer.SerializeAsync(response.Body, value, JsonOptions, cancellationToken);
        return response;
    }

    public static Task<HttpResponseData> ErrorAsync(
        HttpRequestData request,
        HttpStatusCode status,
        string message,
        CancellationToken cancellationToken) =>
        JsonAsync(request, status, new ApiError(message), cancellationToken);

    public static HttpResponseData NoContent(HttpRequestData request) => request.CreateResponse(HttpStatusCode.NoContent);
}
