namespace AuditApi.Domain;

public enum AuditOperationType
{
    Added = 1,
    Deleted = 2,
    Modified = 3
}

public enum KnownEntityType
{
    Unknown = 0,
    ContractHeaderEntity = 1,
    AnnexHeaderEntity = 2,
    AnnexChangeEntity = 3,
    FileEntity = 4,
    InvoiceEntity = 5,
    PaymentScheduleEntity = 6,
    ContractFundingEntity = 7
}

public enum AuditSortDirection
{
    Descending,
    Ascending
}
