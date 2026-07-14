using System.Net;
using AuditApi.Application;
using AuditApi.Infrastructure.Http;
using AuditApi.Security;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace AuditApi.Functions;

public sealed class ContractFunctions(AuditApplicationService service, AccessSessionService sessions)
{
    [Function("GetContracts")]
    public async Task<HttpResponseData> GetContractsAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "contracts")] HttpRequestData request,
        FunctionContext context)
    {
        if (!RequestAuthentication.IsAuthenticated(request, sessions))
        {
            return await HttpResponses.ErrorAsync(request, HttpStatusCode.Unauthorized, "Sesja wygasła lub jest nieprawidłowa.", context.CancellationToken);
        }

        var contracts = await service.GetContractsAsync(context.CancellationToken);
        return await HttpResponses.JsonAsync(request, HttpStatusCode.OK, contracts, context.CancellationToken);
    }
}
