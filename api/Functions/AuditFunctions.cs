using System.Net;
using AuditApi.Application;
using AuditApi.Infrastructure.Http;
using AuditApi.Security;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace AuditApi.Functions;

public sealed class AuditFunctions(
    AuditApplicationService service,
    CsvExportService csvExportService,
    AccessSessionService sessions)
{
    [Function("GetAuditHistory")]
    public async Task<HttpResponseData> GetHistoryAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "contracts/{contractId}/audit")] HttpRequestData request,
        string contractId,
        FunctionContext context)
    {
        var validation = await ValidateAsync(request, contractId, context.CancellationToken);
        if (validation.Response is not null) return validation.Response;

        var history = await service.GetHistoryAsync(validation.ContractId!.Value, validation.Filter!, context.CancellationToken);
        return await HttpResponses.JsonAsync(request, HttpStatusCode.OK, history, context.CancellationToken);
    }

    [Function("GetAuditVersion")]
    public async Task<HttpResponseData> GetVersionAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "contracts/{contractId}/audit/version")] HttpRequestData request,
        string contractId,
        FunctionContext context)
    {
        if (!RequestAuthentication.IsAuthenticated(request, sessions))
        {
            return await HttpResponses.ErrorAsync(request, HttpStatusCode.Unauthorized, "Sesja wygasła lub jest nieprawidłowa.", context.CancellationToken);
        }

        if (!Guid.TryParse(contractId, out var parsedContractId))
        {
            return await HttpResponses.ErrorAsync(request, HttpStatusCode.BadRequest, "Nieprawidłowy identyfikator umowy.", context.CancellationToken);
        }

        var version = await service.GetVersionAsync(parsedContractId, context.CancellationToken);
        return await HttpResponses.JsonAsync(request, HttpStatusCode.OK, version, context.CancellationToken);
    }

    [Function("ExportAuditHistory")]
    public async Task<HttpResponseData> ExportAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "contracts/{contractId}/audit/export.csv")] HttpRequestData request,
        string contractId,
        FunctionContext context)
    {
        var validation = await ValidateAsync(request, contractId, context.CancellationToken);
        if (validation.Response is not null) return validation.Response;

        var id = validation.ContractId!.Value;
        var filter = validation.Filter!;
        var contractTask = service.GetContractAsync(id, context.CancellationToken);
        var historyTask = service.GetHistoryAsync(id, filter, context.CancellationToken);
        await Task.WhenAll(contractTask, historyTask);
        var export = csvExportService.Create(contractTask.Result, historyTask.Result, filter);

        var response = request.CreateResponse(HttpStatusCode.OK);
        response.Headers.Add("Content-Type", "text/csv; charset=utf-8");
        response.Headers.Add("Content-Disposition", $"attachment; filename=\"{export.FileName}\"");
        response.Headers.Add("Cache-Control", "no-store");
        await response.Body.WriteAsync(export.Content, context.CancellationToken);
        return response;
    }

    private async Task<(HttpResponseData? Response, Guid? ContractId, Domain.AuditFilter? Filter)> ValidateAsync(
        HttpRequestData request,
        string contractId,
        CancellationToken cancellationToken)
    {
        if (!RequestAuthentication.IsAuthenticated(request, sessions))
        {
            return (await HttpResponses.ErrorAsync(request, HttpStatusCode.Unauthorized, "Sesja wygasła lub jest nieprawidłowa.", cancellationToken), null, null);
        }

        if (!Guid.TryParse(contractId, out var parsedContractId))
        {
            return (await HttpResponses.ErrorAsync(request, HttpStatusCode.BadRequest, "Nieprawidłowy identyfikator umowy.", cancellationToken), null, null);
        }

        var parsedFilter = AuditFilterParser.Parse(request.Query);
        if (!parsedFilter.IsValid)
        {
            return (await HttpResponses.ErrorAsync(request, HttpStatusCode.BadRequest, parsedFilter.Error!, cancellationToken), null, null);
        }

        return (null, parsedContractId, parsedFilter.Filter);
    }
}
