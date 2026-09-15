import { db } from "@/lib/db";

export type SetupReadiness = {
  ready: boolean;
  completed: number;
  total: number;
  checks: Array<{ key: string; label: string; complete: boolean; detail: string }>;
};

export async function getSchoolSetupReadiness(schoolId: string): Promise<SetupReadiness> {
  const [sessionCount, validTermCount, levelCount, armCount, subjectCount, assignmentCount] = await Promise.all([
    db.academicSession.count({ where: { schoolId } }),
    db.academicTerm.count({ where: { academicSession: { schoolId } } }),
    db.classLevel.count({ where: { schoolId } }),
    db.classArm.count({ where: { classLevel: { schoolId } } }),
    db.subject.count({ where: { schoolId } }),
    db.classSubject.count({ where: { academicSession: { schoolId }, classArm: { classLevel: { schoolId } }, subject: { schoolId } } }),
  ]);

  const checks = [
    { key: "academic-session", label: "Academic session", complete: sessionCount > 0, detail: sessionCount > 0 ? `${sessionCount} session(s) configured.` : "Create at least one academic session." },
    { key: "academic-term", label: "Academic term", complete: validTermCount > 0, detail: validTermCount > 0 ? `${validTermCount} term(s) configured.` : "Create at least one academic term." },
    { key: "class-level", label: "Class levels", complete: levelCount > 0, detail: levelCount > 0 ? `${levelCount} class level(s) configured.` : "Create at least one class level." },
    { key: "class-arm", label: "Class arms", complete: armCount > 0, detail: armCount > 0 ? `${armCount} class arm(s) configured.` : "Create at least one class arm." },
    { key: "subject", label: "Subjects", complete: subjectCount > 0, detail: subjectCount > 0 ? `${subjectCount} subject(s) configured.` : "Create at least one subject." },
    { key: "class-subject", label: "Subject assignments", complete: assignmentCount > 0, detail: assignmentCount > 0 ? `${assignmentCount} subject assignment(s) configured.` : "Assign at least one subject to a class for an academic session." },
  ];

  const completed = checks.filter((check) => check.complete).length;
  return { ready: completed === checks.length, completed, total: checks.length, checks };
}
