import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { MODULE_CATALOG, ModuleCode } from "./catalog";

export class ModuleAuthorizationError extends Error {
  constructor(message = "Only the school owner can change module settings.") {
    super(message);
    this.name = "ModuleAuthorizationError";
  }
}

async function ensureCatalog() {
  await db.$transaction(
    MODULE_CATALOG.map((module) =>
      db.module.upsert({
        where: { code: module.code },
        update: { name: module.name, description: module.description, category: module.category, sortOrder: module.sortOrder },
        create: module,
      }),
    ),
  );
}

export async function getSchoolModules(schoolId: string) {
  await ensureCatalog();
  const modules = await db.module.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  const enabled = await db.schoolModule.findMany({ where: { schoolId } });
  const byId = new Map(enabled.map((item) => [item.moduleId, item]));
  return modules.map((module) => ({
    code: module.code,
    name: module.name,
    description: module.description,
    category: module.category,
    enabled: byId.get(module.id)?.enabled ?? false,
    enabledAt: byId.get(module.id)?.enabledAt ?? null,
    disabledAt: byId.get(module.id)?.disabledAt ?? null,
  }));
}

export async function setSchoolModule(input: { schoolId: string; userId: string; code: ModuleCode; enabled: boolean }) {
  const membership = await db.membership.findFirst({
    where: { userId: input.userId, schoolId: input.schoolId, status: "ACTIVE", isOwner: true },
    select: { id: true },
  });
  if (!membership) throw new ModuleAuthorizationError();

  await ensureCatalog();
  const module = await db.module.findUnique({ where: { code: input.code }, select: { id: true, code: true } });
  if (!module) throw new Error("Unknown school module.");

  const now = new Date();
  const result = await db.schoolModule.upsert({
    where: { schoolId_moduleId: { schoolId: input.schoolId, moduleId: module.id } },
    update: { enabled: input.enabled, enabledAt: input.enabled ? now : undefined, disabledAt: input.enabled ? null : now },
    create: { schoolId: input.schoolId, moduleId: module.id, enabled: input.enabled, enabledAt: input.enabled ? now : null, disabledAt: input.enabled ? null : now },
  });

  await db.auditEvent.create({
    data: {
      schoolId: input.schoolId,
      actorUserId: input.userId,
      action: input.enabled ? "school.module.enabled" : "school.module.disabled",
      entityType: "SchoolModule",
      entityId: `${input.schoolId}:${module.id}`,
      currentState: { moduleCode: module.code, enabled: input.enabled },
    },
  });

  return result;
}

export async function isSchoolModuleEnabled(schoolId: string, code: ModuleCode) {
  const module = await db.module.findUnique({ where: { code }, select: { id: true } });
  if (!module) return false;
  const setting = await db.schoolModule.findUnique({ where: { schoolId_moduleId: { schoolId, moduleId: module.id } }, select: { enabled: true } });
  return setting?.enabled ?? false;
}
