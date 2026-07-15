using System.Net;
using AuditApi.Application;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Middleware;
using Microsoft.Extensions.Logging;

namespace AuditApi.Infrastructure.Http;

public sealed class ExceptionHandlingMiddleware(ILogger<ExceptionHandlingMiddleware> logger) : IFunctionsWorkerMiddleware
{
    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        try
        {
            await next(context);
        }
        catch (ContractNotFoundException)
        {
            await WriteErrorAsync(context, HttpStatusCode.NotFound, "Nie znaleziono wybranej umowy.");
        }
        catch (OperationCanceledException) when (context.CancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception)
        {
            logger.LogError("Function {FunctionName} failed. Details were suppressed to protect server data.", context.FunctionDefinition.Name);
            await WriteErrorAsync(context, HttpStatusCode.InternalServerError, "Nie udało się wykonać operacji. Spróbuj ponownie później.");
        }
    }

    private static async Task WriteErrorAsync(FunctionContext context, HttpStatusCode status, string message)
    {
        var request = await context.GetHttpRequestDataAsync();
        if (request is null)
        {
            throw new InvalidOperationException("HTTP request context is unavailable.");
        }

        var response = await HttpResponses.ErrorAsync(request, status, message, context.CancellationToken);
        context.GetInvocationResult().Value = response;
    }
}
