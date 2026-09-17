import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { normalizeEmail } from "@/domain/identity/normalize";

const inputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(128),
});

export type RegisterPersonalAccountInput = z.infer<typeof inputSchema>;

export class PersonalRegistrationConflictError extends Error {
  constructor(message = "An account already exists for this email.") {
    super(message);
    this.name = "PersonalRegistrationConflictError";
  }
}

export async function registerPersonalAccount(raw: RegisterPersonalAccountInput) {
  const input = inputSchema.parse(raw);
  const email = normalizeEmail(input.email);
  const passwordHash = await hash(input.password, 12);

  try {
    return await db.user.create({
      data: { email, passwordHash },
      select: { id: true, email: true, status: true, createdAt: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(",") : String(error.meta?.target ?? "");
      if (target.includes("email")) throw new PersonalRegistrationConflictError();
    }
    throw error;
  }
}
