export function formatOrganizationId(organizationId: string) {
  if (organizationId.length <= 15) return organizationId
  return `${organizationId.slice(0, 8)}…${organizationId.slice(-6)}`
}
