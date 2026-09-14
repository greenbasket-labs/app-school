export function normalizeCacNumber(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function normalizeOrganizationName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

export function normalizeSchoolName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
