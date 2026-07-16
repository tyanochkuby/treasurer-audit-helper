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
        Assert.Equal(1, repository.SnapshotCallCount);
        Assert.Equal(0, repository.VersionCallCount);
    }

    [Fact]
    public async Task Event_without_a_meaningful_difference_is_preserved_with_no_change_rows()
    {
        var repository = CreateRepository();
        repository.AuditRows.Add(CreateRow(_contractId, 20, 3, 4, null, null));
        var service = CreateService(repository);

        var history = await service.GetHistoryAsync(_contractId, AuditFilter.Empty, CancellationToken.None);

        Assert.Empty(Assert.Single(history.Items).Changes);
    }

    [Fact]
    public void Mapper_keeps_only_values_that_are_meaningful_for_each_operation()
    {
        var mapper = new AuditMapper();
        var added = mapper.Map(CreateRow(
            _contractId,
            30,
            1,
            3,
            null,
            "{\"AnnexId\":\"annex-1\",\"ConclusionDate\":null}"));
        var deleted = mapper.Map(CreateRow(
            _contractId,
            31,
            2,
            3,
            "{\"AnnexId\":\"annex-1\",\"ConclusionDate\":null}",
            null));
        var modified = mapper.Map(CreateRow(
            _contractId,
            32,
            3,
            3,
            "{\"ContractGrossValue\":\"100\",\"Subject\":\"unchanged\",\"Comment\":null}",
            "{\"ContractGrossValue\":\"120\",\"Subject\":\"unchanged\",\"Comment\":null}"));

        Assert.Equal("AnnexId", Assert.Single(added.Changes).FieldName);
        Assert.Equal("AnnexId", Assert.Single(deleted.Changes).FieldName);
        var change = Assert.Single(modified.Changes);
        Assert.Equal("ContractGrossValue", change.FieldName);
        Assert.Equal("100", change.OldValue);
        Assert.Equal("120", change.NewValue);
    }

    [Fact]
    public void Mapper_uses_shared_entity_labels_and_preserves_ambiguous_field_names()
    {
        var item = new AuditMapper().Map(CreateRow(
            _contractId,
            33,
            1,
            5,
            null,
            "{\"Number\":\"FV/1\",\"OrganizationId\":\"org\",\"P4\":\"x\"}"));

        Assert.Collection(
            item.Changes,
            change => Assert.Equal(("Number", "Numer faktury"), (change.FieldName, change.FieldDisplayName)),
            change => Assert.Equal(("OrganizationId", "Identyfikator organizacji"), (change.FieldName, change.FieldDisplayName)),
            change => Assert.Equal(("P4", "P4"), (change.FieldName, change.FieldDisplayName)));
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
        repository.Contracts.Add(new ContractRecord(_contractId, _organizationId, "12/2026", "INT-1", "Testowa umowa", 0));
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
