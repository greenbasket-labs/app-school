import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthorizationError, requireCapability } from "@/domain/auth/authorize";
import { CAPABILITIES } from "@/domain/auth/capabilities";
import { currentSession } from "@/domain/auth/session-cookie";
import {
  createClassTeacherResponsibility,
  endClassTeacherResponsibility,
  ClassTeacherResponsibilityAuthorizationError,
  ClassTeacherResponsibilityValidationError,
} from "@/domain/class-teacher-responsibilities/service";
import { db } from "@/lib/db";

const createSchema=z.object({
  membershipId:z.string().uuid(), academicSessionId:z.string().uuid(),
  academicTermId:z.string().uuid(), classArmId:z.string().uuid(),
});
const endSchema=z.object({responsibilityId:z.string().uuid()});

async function requireOwner(schoolId:string){
  const session=await currentSession();
  if(!session) throw new AuthorizationError("Authentication required.");
  return requireCapability(session.user.id,schoolId,CAPABILITIES.MANAGE_SCHOOL);
}

export async function GET(_request:Request,{params}:{params:Promise<{schoolId:string}>}){
  try{
    const membership=await requireOwner((await params).schoolId);
    const schoolId=membership.schoolId;
    const [teachers,sessions,classLevels]=await Promise.all([
      db.membership.findMany({
        where:{schoolId,status:"ACTIVE",isOwner:false,relationship:"TEACHER"},
        orderBy:{createdAt:"asc"},
        select:{id:true,user:{select:{email:true}},classTeacherResponsibilities:{
          where:{status:"ACTIVE"},orderBy:{createdAt:"desc"},
          select:{id:true,academicSession:{select:{id:true,name:true}},academicTerm:{select:{id:true,name:true}},classArm:{select:{id:true,name:true,classLevel:{select:{name:true}}}}}
        }}
      }),
      db.academicSession.findMany({where:{schoolId},orderBy:{startsAt:"desc"},select:{id:true,name:true,status:true,terms:{orderBy:{order:"asc"},select:{id:true,name:true,order:true}}}}),
      db.classLevel.findMany({where:{schoolId},orderBy:{order:"asc"},select:{id:true,name:true,order:true,arms:{orderBy:{name:"asc"},select:{id:true,name:true}}}})
    ]);
    return NextResponse.json({ok:true,teachers,sessions,classLevels});
  }catch(error){
    if(error instanceof AuthorizationError||error instanceof ClassTeacherResponsibilityAuthorizationError)return NextResponse.json({ok:false,error:"OWNER_REQUIRED"},{status:403});
    console.error("class teacher responsibility read failed",error);
    return NextResponse.json({ok:false,error:"CLASS_TEACHER_RESPONSIBILITY_READ_FAILED"},{status:500});
  }
}

export async function POST(request:Request,{params}:{params:Promise<{schoolId:string}>}){
  try{
    const membership=await requireOwner((await params).schoolId);
    const input=createSchema.parse(await request.json());
    const responsibility=await createClassTeacherResponsibility({...input,schoolId:membership.schoolId,actorUserId:membership.userId});
    return NextResponse.json({ok:true,responsibility},{status:201});
  }catch(error){
    if(error instanceof z.ZodError)return NextResponse.json({ok:false,error:"INVALID_CLASS_TEACHER_RESPONSIBILITY"},{status:400});
    if(error instanceof AuthorizationError||error instanceof ClassTeacherResponsibilityAuthorizationError)return NextResponse.json({ok:false,error:"OWNER_REQUIRED"},{status:403});
    if(error instanceof ClassTeacherResponsibilityValidationError)return NextResponse.json({ok:false,error:error.message},{status:400});
    console.error("class teacher responsibility creation failed",error);
    return NextResponse.json({ok:false,error:"CLASS_TEACHER_RESPONSIBILITY_CREATE_FAILED"},{status:500});
  }
}

export async function DELETE(request:Request,{params}:{params:Promise<{schoolId:string}>}){
  try{
    const membership=await requireOwner((await params).schoolId);
    const input=endSchema.parse(await request.json());
    const responsibility=await endClassTeacherResponsibility({...input,schoolId:membership.schoolId,actorUserId:membership.userId});
    return NextResponse.json({ok:true,responsibility});
  }catch(error){
    if(error instanceof z.ZodError)return NextResponse.json({ok:false,error:"INVALID_CLASS_TEACHER_RESPONSIBILITY"},{status:400});
    if(error instanceof AuthorizationError||error instanceof ClassTeacherResponsibilityAuthorizationError)return NextResponse.json({ok:false,error:"OWNER_REQUIRED"},{status:403});
    if(error instanceof ClassTeacherResponsibilityValidationError)return NextResponse.json({ok:false,error:error.message},{status:400});
    console.error("class teacher responsibility ending failed",error);
    return NextResponse.json({ok:false,error:"CLASS_TEACHER_RESPONSIBILITY_END_FAILED"},{status:500});
  }
}
