export const SKULGO_MVP_MODULES = [
  { key: "school-setup", label: "School Setup", href: "/register" },
  { key: "backend-toggle", label: "Backend", href: "/app" },
  { key: "classes", label: "Classes & Subjects", href: "/app" },
  { key: "fees", label: "Fees & Bursary", href: "/app" },
  { key: "portals", label: "Student & Parent", href: "/app/parent" },
] as const;

export type SkulgoMvpModule = (typeof SKULGO_MVP_MODULES)[number]["key"];
