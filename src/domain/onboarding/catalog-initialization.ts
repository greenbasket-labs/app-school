import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { MODULE_CATALOG } from "@/domain/modules/catalog";

export async function ensurePlatformCatalog() {
  const capabilityIds = new Map<string, string>();
  for (const [code, value] of Object.entries(CAPABILITIES)) {
    const capability = await db.capability.upsert({
      where: { code: value },
      update: {},
      create: {
        code: value,
        description: `Allows ${code.toLowerCase().replaceAll("_", " ")} actions.`,
      },
      select: { id: true },
    });
    capabilityIds.set(value, capability.id);
  }

  const moduleIds = new Map<string, string>();
  for (const moduleDefinition of MODULE_CATALOG) {
    const module = await db.module.upsert({
      where: { code: moduleDefinition.code },
      update: {
        name: moduleDefinition.name,
        description: moduleDefinition.description,
        category: moduleDefinition.category,
        sortOrder: moduleDefinition.sortOrder,
      },
      create: moduleDefinition,
      select: { id: true },
    });
    moduleIds.set(moduleDefinition.code, module.id);
  }

  return { capabilityIds, moduleIds };
}

export async function getPlatformCatalog() {
  const [capabilities, modules] = await Promise.all([
    db.capability.findMany({ select: { id: true, code: true } }),
    db.module.findMany({ select: { id: true, code: true } }),
  ]);
  return {
    capabilityIds: new Map(capabilities.map((item) => [item.code, item.id])),
    moduleIds: new Map(modules.map((item) => [item.code, item.id])),
  };
}

export async function ensurePlatformCatalogForRegistration() {
  try {
    return await ensurePlatformCatalog();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) throw error;
    throw error;
  }
}
