using AuditApi.Application;
using AuditApi.Infrastructure;
using AuditApi.Infrastructure.Http;
using AuditApi.Security;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults(worker => worker.UseMiddleware<ExceptionHandlingMiddleware>())
    .ConfigureServices(services =>
    {
        services.AddSingleton(TimeProvider.System);
        services.AddSingleton<AppSettings>();
        services.AddSingleton<ISqlConnectionFactory, SqlConnectionFactory>();
        services.AddSingleton<IAuditRepository, SqlAuditRepository>();
        services.AddSingleton<AccessSessionService>();
        services.AddSingleton<AuditMapper>();
        services.AddSingleton<AuditApplicationService>();
        services.AddSingleton<CsvExportService>();
    })
    .Build();

host.Run();
