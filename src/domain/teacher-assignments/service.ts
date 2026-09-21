import { db } from "@/lib/db";

export class TeacherAssignmentAuthorizationError extends Error {
  constructor(message = "You are not authorized to manage teacher assignments.") {
    super(message);
    this.name = "TeacherAssignmentAuthorizationError";
  }
}

export class TeacherAssignmentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TeacherAssignmentValidationError";
  }
}

type AssignmentInput = {
  schoolId: string;
  membershipId: string;
  academicSessionId: string;
  academicTermId: string;
  classArmId: string;
  subjectId: string;
};

async function requireOwner(schoolId: string, userId: string) {
  const membership = await db.membership.findFirst({
    where: { schoolId, userId, status: "ACTIVE", isOwner: true },
    select: { id: true },
  });
  if (!membership) throw new TeacherAssignmentAuthorizationError();
}

export async function createTeacherAssignment(input: AssignmentInput & { actorUserId: string }) {
  await requireOwner(input.schoolId, input.actorUserId);

  const teacherMembership = await db.membership.findFirst({
    where: {
      id: input.membershipId,
      schoolId: input.schoolId,
      status: "ACTIVE",
      isOwner: false,
      relationship: "TEACHER",
    },
    select: { id: true, userId: true },
  });
  if (!teacherMembership) {
    throw new TeacherAssignmentValidationError("The selected membership is not an active teacher in this school.");
  }

  const [session, term, classArm, subject, classSubject] = await Promise.all([
    db.academicSession.findFirst({ where: { id: input.academicSessionId, schoolId: input.schoolId }, select: { id: true } }),
    db.academicTerm.findFirst({ where: { id: input.academicTermId, academicSessionId: input.academicSessionId }, select: { id: true } }),
    db.classArm.findFirst({ where: { id: input.classArmId, classLevel: { schoolId: input.schoolId } }, select: { id: true } }),
    db.subject.findFirst({ where: { id: input.subjectId, schoolId: input.schoolId }, select: { id: true } }),
    db.classSubject.findFirst({ where: { academicSessionId: input.academicSessionId, classArmId: input.classArmId, subjectId: input.subjectId }, select: { id: true } }),
  ]);

  if (!session) throw new TeacherAssignmentValidationError("The academic session does not belong to this school.");
  if (!term) throw new TeacherAssignmentValidationError("The academic term does not belong to the selected academic session.");
  if (!classArm) throw new TeacherAssignmentValidationError("The selected class does not belong to this school.");
  if (!subject) throw new TeacherAssignmentValidationError("The selected subject does not belong to this school.");
  if (!classSubject) throw new TeacherAssignmentValidationError("The subject is not configured for the selected class and academic session.");

  const existing = await db.teacherAssignment.findFirst({
    where: {
      membershipId: teacherMembership.id,
      academicSessionId: input.academicSessionId,
      academicTermId: input.academicTermId,
      classArmId: input.classArmId,
      subjectId: input.subjectId,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  if (existing) throw new TeacherAssignmentValidationError("This teacher assignment already exists.");

  const assignment = await db.teacherAssignment.create({
    data: {
      schoolId: input.schoolId,
      membershipId: teacherMembership.id,
      academicSessionId: input.academicSessionId,
      academicTermId: input.academicTermId,
      classArmId: input.classArmId,
      subjectId: input.subjectId,
    },
  });

  await db.auditEvent.create({
    data: {
      schoolId: input.schoolId,
      actorUserId: input.actorUserId,
      action: "teacher.assignment.created",
      entityType: "TeacherAssignment",
      entityId: assignment.id,
      currentState: {
        membershipId: teacherMembership.id,
        teacherUserId: teacherMembership.userId,
        academicSessionId: input.academicSessionId,
        academicTermId: input.academicTermId,
        classArmId: input.classArmId,
        subjectId: input.subjectId,
      },
    },
  });

  return assignment;
}

export async function endTeacherAssignment(input: { schoolId: string; assignmentId: string; actorUserId: string }) {
  await requireOwner(input.schoolId, input.actorUserId);

  const assignment = await db.teacherAssignment.findFirst({
    where: { id: input.assignmentId, schoolId: input.schoolId, status: "ACTIVE" },
    select: { id: true, membershipId: true, academicSessionId: true, academicTermId: true, classArmId: true, subjectId: true },
  });
  if (!assignment) throw new TeacherAssignmentValidationError("Active teacher assignment not found.");

  const endedAt = new Date();
  const updated = await db.teacherAssignment.update({
    where: { id: assignment.id },
    data: { status: "ENDED", endedAt },
  });

  await db.auditEvent.create({
    data: {
      schoolId: input.schoolId,
      actorUserId: input.actorUserId,
      action: "teacher.assignment.ended",
      entityType: "TeacherAssignment",
      entityId: assignment.id,
      previousState: { status: "ACTIVE", membershipId: assignment.membershipId, academicSessionId: assignment.academicSessionId, academicTermId: assignment.academicTermId, classArmId: assignment.classArmId, subjectId: assignment.subjectId },
      currentState: { status: "ENDED", endedAt: endedAt.toISOString() },
    },
  });

  return updated;
}

export async function getActiveTeacherAssignments(input: { schoolId: string; userId: string }) {
  const membership = await db.membership.findFirst({
    where: { schoolId: input.schoolId, userId: input.userId, status: "ACTIVE", relationship: "TEACHER", isOwner: false },
    select: { id: true },
  });
  if (!membership) return [];

  return db.teacherAssignment.findMany({
    where: { schoolId: input.schoolId, membershipId: membership.id, status: "ACTIVE" },
    include: {
      academicSession: { select: { id: true, name: true, status: true } },
      academicTerm: { select: { id: true, name: true, order: true } },
      classArm: { select: { id: true, name: true, classLevel: { select: { id: true, name: true } } } },
      subject: { select: { id: true, name: true, code: true } },
    },
    orderBy: [
      { academicSession: { startsAt: "desc" } },
      { academicTerm: { order: "asc" } },
      { classArm: { name: "asc" } },
      { subject: { name: "asc" } },
    ],
  });
}
