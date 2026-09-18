import { NextResponse } from "next/server";
import { z } from "zod";
import { currentSession } from "@/domain/auth/session-cookie";
import { db } from "@/lib/db";

const querySchema = z.object({
  q: z.string().trim().min(1).max(100),
});

export async function GET(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });

  const search = new URL(request.url).searchParams.get("q") ?? "";
  const parsed = querySchema.safeParse({ q: search });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_SEARCH" }, { status: 400 });

  const schools = await db.school.findMany({
    where: {
      status: { in: ["SETUP", "ACTIVE"] },
      normalizedName: { contains: parsed.data.q.toLowerCase() },
    },
    orderBy: { name: "asc" },
    take: 20,
    select: {
      id: true,
      name: true,
      status: true,
      organization: { select: { name: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    schools: schools.map((school) => ({
      id: school.id,
      name: school.name,
      organizationName: school.organization.name,
      status: school.status,
    })),
  });
}
