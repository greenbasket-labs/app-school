import { db } from "@/lib/db";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { MODULE_CATALOG } from "@/domain/modules/catalog";

export async function ensureOnboardingCatalogs() {
  const capabilityEntries = Object.entries(CAPABILITIES);

  await Promise.all(
    capabilityEntries.map(([code, value]) =>
      db.capability.upsert({
        where: { code: value },
        update: {},
        create: {
          code: value,
          description: `Allows ${code.toLowerCase().replaceAll("_", " ")} actions.`,
        },
      }),
    ),
  );

  await Promise.all(
    MODULE_CATALOG.map((moduleDefinition) =>
      db.module.upsert({
        where: { code: moduleDefinition.code },
        update: {
          name: moduleDefinition.name,
          description: moduleDefinition.description,
          category: moduleDefinition.category,
          sortOrder: moduleDefinition.sortOrder,
        },
        create: moduleDefinition,
      }),
    ),
  );

  const [capabilities, modules] = await Promise.all([
    db.capability.findMany({
      where: { code: { in: capabilityEntries.map(([, value]) => value) } },
      select: { id: true, code: true },
    }),
    db.module.findMany({
      where: { code: { in: MODULE_CATALOG.map((moduleDefinition) => moduleDefinition.code) } },
      select: { id: true, code: true },
    }),
  ]);

  return { capabilities, modules };
}
