import { db } from "../prisma/db";
import { writeAuditLog } from "./audit";
import { getSession } from "./session";

/**
 * Resolve the school from the authenticated session's user.
 *
 * This must never fall back to "the first school" because that would make
 * school context depend on database ordering and can cross tenant boundaries.
 */
export async function getSchool() {
  const session = await getSession();

  if (!session.userId) {
    return null;
  }

  const users = await db.orm.public.User.all();
  const user = users.find((item) => item.id === session.userId);

  if (!user) {
    return null;
  }

  const schools = await db.orm.public.School.all();

  return schools.find((school) => school.id === user.schoolId) ?? null;
}

export async function updateSchool(input: {
  name: string;
  motto: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  principalName: string;
  registrationInfo: string;
}) {
  const school = await getSchool();

  if (!school) {
    throw new Error("School not found");
  }

  await db.orm.public.School
    .where({ id: school.id })
    .update({
      name: input.name,
      motto: input.motto,
      address: input.address,
      phone: input.phone,
      email: input.email,
      website: input.website,
      principalName: input.principalName,
      registrationInfo: input.registrationInfo,
    });

  await writeAuditLog({
    schoolId: school.id,
    action: "UPDATE",
    entity: "School",
    entityId: school.id,
    oldValue: {
      name: school.name,
      motto: school.motto,
      address: school.address,
      phone: school.phone,
      email: school.email,
      website: school.website,
      principalName: school.principalName,
      registrationInfo: school.registrationInfo,
    },
    newValue: {
      name: input.name,
      motto: input.motto,
      address: input.address,
      phone: input.phone,
      email: input.email,
      website: input.website,
      principalName: input.principalName,
      registrationInfo: input.registrationInfo,
    },
  });

  return true;
}