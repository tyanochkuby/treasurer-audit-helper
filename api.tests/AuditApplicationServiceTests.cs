using AuditApi.Application;
using AuditApi.Domain;
using AuditApi.Infrastructure;

namespace AuditApi.Tests;

public sealed class AuditApplicationServiceTests
{
    private readonly Guid _contractId = Guid.NewGuid();
    private readonly Guid _organizationId = Guid.NewGuid();

    [Fact]
    public async Task History_is_scoped_and_filters_are_applied()
    {
        var repository = CreateRepository();
        repository.AuditRows.Add(CreateRow(_contractId, 10, 3, 1, "{\"ContractGrossValue\":\"100\"}", "{\"ContractGrossValue\":\"120\"}"));
        repository.AuditRows.Add(CreateRow(Guid.NewGuid(), 11, 3, 1, "{\"ContractGrossValue\":\"100\"}", "{\"ContractGrossValue\":\"999\"}"));
        repository.AuditRows.Add(CreateRow(_contractId, 12, 1, 5, null, "{\"Number\":\"FV/1\"}"));
        repository.AuditRows.Add(CreateRow(_contractId, 13, 0, 1, null, null));
        var service = CreateService(repository);
        var filter = new AuditFilter(AuditOperationType.Modified, 1, null, null, "Wartość brutto", AuditSortDirection.Descending);

        var history = await service.GetHistoryAsync(_contractId, filter, CancellationToken.None);

        var item = Assert.Single(history.Items);
        Assert.Equal("10", item.Id);
        Assert.Equal("ContractGrossValue", Assert.Single(item.Changes).FieldName);
        Assert.Equal("Wartość brutto umowy", item.Changes[0].FieldDisplayName);
        Assert.Equal("99", history.Version);
    }

    [Fact]
    public async Task Missing_old_and_new_values_produce_a_readable_fallback_row()
    {
        var repository = CreateRepository();
        repository.AuditRows.Add(CreateRow(_contractId, 20, 3, 4, null, null));
        var service = CreateService(repository);

        var history = await service.GetHistoryAsync(_contractId, AuditFilter.Empty, CancellationToken.None);

        var change = Assert.Single(Assert.Single(history.Items).Changes);
        Assert.Equal("ContractGrossValue", change.FieldName);
        Assert.Null(change.OldValue);
        Assert.Null(change.NewValue);
    }

    [Fact]
    public async Task Unknown_entity_codes_are_not_mislabelled()
    {
        var repository = CreateRepository();
        repository.AuditRows.Add(CreateRow(_contractId, 21, 1, 16, null, "{\"Comment\":\"x\"}"));
        var service = CreateService(repository);

        var history = await service.GetHistoryAsync(_contractId, AuditFilter.Empty, CancellationToken.None);

        Assert.Equal("Unknown (16)", Assert.Single(history.Items).EntityType);
    }

    private FakeAuditRepository CreateRepository()
    {
        var repository = new FakeAuditRepository();
        repository.Contracts.Add(new ContractRecord(_contractId, _organizationId, "12/2026", "INT-1", "Testowa umowa"));
        return repository;
    }

    private static AuditApplicationService CreateService(FakeAuditRepository repository) =>
        new(repository, new AuditMapper(), new ManualTimeProvider(new DateTimeOffset(2026, 7, 14, 10, 0, 0, TimeSpan.Zero)));

    private AuditLogRecord CreateRow(
        Guid rootContractId,
        int id,
        int type,
        int entityType,
        string? oldValues,
        string? newValues) =>
        new(
            rootContractId,
            id,
            _organizationId,
            Guid.NewGuid(),
            "anna@example.pl",
            type,
            entityType,
            new DateTime(2026, 7, 14, 8, 42, 12),
            oldValues,
            newValues,
            type == 3 ? "[\"ContractGrossValue\"]" : null,
            null,
            Guid.NewGuid(),
            _contractId);
}
