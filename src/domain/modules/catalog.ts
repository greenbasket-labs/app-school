export const MODULE_CATALOG = [
  { code: "ACADEMICS", name: "Academics", description: "Sessions, terms, classes, arms and subjects.", category: "Core", sortOrder: 10 },
  { code: "STUDENTS", name: "Students", description: "Student records, enrollment and roster management.", category: "Core", sortOrder: 20 },
  { code: "ATTENDANCE", name: "Attendance", description: "Daily attendance recording and history.", category: "Operations", sortOrder: 30 },
  { code: "ASSESSMENTS", name: "Assessments & Results", description: "Assessment setup, scores, approvals and results.", category: "Academic", sortOrder: 40 },
  { code: "FINANCE", name: "Fees & Finance", description: "Fees, invoices, payments and financial records.", category: "Finance", sortOrder: 50 },
  { code: "COMMUNICATION", name: "Communication", description: "School-to-family and internal communication.", category: "Communication", sortOrder: 60 },
  { code: "REPORTS", name: "Reports", description: "Operational and management reports.", category: "Insights", sortOrder: 70 },
] as const;

export type ModuleCode = (typeof MODULE_CATALOG)[number]["code"];
