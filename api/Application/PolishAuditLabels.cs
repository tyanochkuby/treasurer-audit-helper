namespace AuditApi.Application;

internal static class PolishAuditLabels
{
    public static string? OperationLabel(string operation) => operation switch
    {
        "Added" => "Dodano",
        "Deleted" => "Usunięto",
        "Modified" => "Zmieniono",
        _ => null
    };

    public static string EntityLabel(string entity) => entity switch
    {
        "Unknown" => "Nieznana",
        "ContractHeaderEntity" => "Umowa",
        "AnnexHeaderEntity" => "Aneks",
        "AnnexChangeEntity" => "Zmiana aneksu",
        "FileEntity" => "Plik",
        "InvoiceEntity" => "Faktura",
        "PaymentScheduleEntity" => "Harmonogram płatności",
        "ContractFundingEntity" => "Finansowanie umowy",
        _ => entity
    };
}
