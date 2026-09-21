import { db } from "@/lib/db";

export class ClassTeacherResponsibilityAuthorizationError extends Error {
  constructor(message = "You are not authorized to manage class teacher responsibilities.") {
    super(message);
    this.name = "ClassTeacherResponsibilityAuthorizationError";
  }
}
export class ClassTeacherResponsibilityValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClassTeacherResponsibilityValidationError";
  }
}
type ResponsibilityInput = { schoolId:string; membershipId:string; academicSessionId:string; academicTermId:string; classArmId:string };

async function requireOwner(schoolId:string,userId:string) {
  const membership=await db.membership.findFirst({where:{schoolId,userId,status:"ACTIVE",isOwner:true},select:{id:true}});
  if(!membership) throw new ClassTeacherResponsibilityAuthorizationError();
}

export async function createClassTeacherResponsibility(input:ResponsibilityInput & {actorUserId:string}) {
  await requireOwner(input.schoolId,input.actorUserId);
  const teacher=await db.membership.findFirst({where:{id:input.membershipId,schoolId:input.schoolId,status:"ACTIVE",isOwner:false,relationship:"TEACHER"},select:{id:true,userId:true}});
  if(!teacher) throw new ClassTeacherResponsibilityValidationError("The selected membership is not an active teacher in this school.");
  const [session,term,classArm]=await Promise.all([
    db.academicSession.findFirst({where:{id:input.academicSessionId,schoolId:input.schoolId},select:{id:true}}),
    db.academicTerm.findFirst({where:{id:input.academicTermId,academicSessionId:input.academicSessionId},select:{id:true}}),
    db.classArm.findFirst({where:{id:input.classArmId,classLevel:{schoolId:input.schoolId}},select:{id:true}})
  ]);
  if(!session) throw new ClassTeacherResponsibilityValidationError("The academic session does not belong to this school.");
  if(!term) throw new ClassTeacherResponsibilityValidationError("The academic term does not belong to the selected academic session.");
  if(!classArm) throw new ClassTeacherResponsibilityValidationError("The selected class does not belong to this school.");
  const existing=await db.classTeacherResponsibility.findFirst({where:{schoolId:input.schoolId,academicSessionId:input.academicSessionId,academicTermId:input.academicTermId,classArmId:input.classArmId,status:"ACTIVE"},select:{id:true,membershipId:true}});
  if(existing) throw new ClassTeacherResponsibilityValidationError(existing.membershipId===teacher.id?"This teacher is already the class teacher for the selected class and term.":"The selected class already has an active class teacher for this term.");
  const responsibility=await db.classTeacherResponsibility.create({data:{schoolId:input.schoolId,membershipId:teacher.id,academicSessionId:input.academicSessionId,academicTermId:input.academicTermId,classArmId:input.classArmId}});
  await db.auditEvent.create({data:{schoolId:input.schoolId,actorUserId:input.actorUserId,action:"teacher.class_responsibility.created",entityType:"ClassTeacherResponsibility",entityId:responsibility.id,currentState:{membershipId:teacher.id,teacherUserId:teacher.userId,academicSessionId:input.academicSessionId,academicTermId:input.academicTermId,classArmId:input.classArmId,status:"ACTIVE"}}});
  return responsibility;
}

export async function endClassTeacherResponsibility(input:{schoolId:string;responsibilityId:string;actorUserId:string}) {
  await requireOwner(input.schoolId,input.actorUserId);
  const responsibility=await db.classTeacherResponsibility.findFirst({where:{id:input.responsibilityId,schoolId:input.schoolId,status:"ACTIVE"},select:{id:true,membershipId:true,academicSessionId:true,academicTermId:true,classArmId:true}});
  if(!responsibility) throw new ClassTeacherResponsibilityValidationError("Active class teacher responsibility not found.");
  const endedAt=new Date();
  const updated=await db.classTeacherResponsibility.update({where:{id:responsibility.id},data:{status:"ENDED",endedAt}});
  await db.auditEvent.create({data:{schoolId:input.schoolId,actorUserId:input.actorUserId,action:"teacher.class_responsibility.ended",entityType:"ClassTeacherResponsibility",entityId:responsibility.id,previousState:{status:"ACTIVE",membershipId:responsibility.membershipId,academicSessionId:responsibility.academicSessionId,academicTermId:responsibility.academicTermId,classArmId:responsibility.classArmId},currentState:{status:"ENDED",endedAt:endedAt.toISOString()}}});
  return updated;
}
