"use client";

import { useEffect, useMemo, useState } from "react";

type Responsibility = {
  id: string;
  academicSession: { id: string; name: string };
  academicTerm: { id: string; name: string };
  classArm: { id: string; name: string; classLevel: { name: string } };
};
type Teacher = { id: string; user: { email: string }; classTeacherResponsibilities: Responsibility[] };
type Session = { id: string; name: string; status: string; terms: { id: string; name: string; order: number }[] };
type ClassLevel = { id: string; name: string; order: number; arms: { id: string; name: string }[] };

export default function ClassTeacherResponsibilitiesSettings({ schoolId, canManage }: { schoolId: string; canManage: boolean }) {
  const [teachers,setTeachers]=useState<Teacher[]>([]);
  const [sessions,setSessions]=useState<Session[]>([]);
  const [classLevels,setClassLevels]=useState<ClassLevel[]>([]);
  const [teacherId,setTeacherId]=useState("");
  const [sessionId,setSessionId]=useState("");
  const [termId,setTermId]=useState("");
  const [classArmId,setClassArmId]=useState("");
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  async function load() {
    const response=await fetch(`/api/schools/${schoolId}/class-teacher-responsibilities`,{cache:"no-store"});
    const data=await response.json();
    if(!response.ok) throw new Error(data.message??data.error??"Could not load class teacher responsibilities.");
    setTeachers(data.teachers??[]);
    setSessions(data.sessions??[]);
    setClassLevels(data.classLevels??[]);
  }

  useEffect(()=>{ if(canManage) load().catch(e=>setError(e instanceof Error?e.message:"Could not load class teacher responsibilities.")); },[schoolId,canManage]);

  useEffect(()=>{
    if(!sessionId){setTermId("");return;}
    const session=sessions.find(item=>item.id===sessionId);
    setTermId(session?.terms[0]?.id??"");
  },[sessionId,sessions]);

  const arms=useMemo(()=>classLevels.flatMap(level=>level.arms.map(arm=>({...arm,classLevelName:level.name}))),[classLevels]);

  async function createResponsibility(){
    setBusy(true);setMessage("");setError("");
    try{
      const response=await fetch(`/api/schools/${schoolId}/class-teacher-responsibilities`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({membershipId:teacherId,academicSessionId:sessionId,academicTermId:termId,classArmId})
      });
      const data=await response.json();
      if(!response.ok) throw new Error(data.message??data.error??"Could not assign class teacher.");
      setMessage("Class teacher responsibility created.");
      await load();
    }catch(e){setError(e instanceof Error?e.message:"Could not assign class teacher.");}
    finally{setBusy(false);}
  }

  async function endResponsibility(responsibilityId:string){
    if(!window.confirm("End this class teacher responsibility? The historical record will remain.")) return;
    setBusy(true);setMessage("");setError("");
    try{
      const response=await fetch(`/api/schools/${schoolId}/class-teacher-responsibilities`,{
        method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({responsibilityId})
      });
      const data=await response.json();
      if(!response.ok) throw new Error(data.message??data.error??"Could not end class teacher responsibility.");
      setMessage("Class teacher responsibility ended.");
      await load();
    }catch(e){setError(e instanceof Error?e.message:"Could not end class teacher responsibility.");}
    finally{setBusy(false);}
  }

  if(!canManage) return <section style={card}><h2 style={{marginTop:0}}>Class teacher responsibilities</h2><p style={sub}>Only the school owner can create or end class teacher responsibilities.</p></section>;

  return <section style={card}>
    <h2 style={{margin:0}}>Class teacher responsibilities</h2>
    <p style={sub}>Assign one teacher as the class teacher for a class, academic session and term. Historical responsibilities remain recorded when ended.</p>
    {message&&<div role="status" aria-live="polite" style={success}>{message}</div>}
    {error&&<div role="alert" style={errorBox}>{error}</div>}
    <div style={{marginTop:18,display:"grid",gap:10}}>
      <label style={field}>Teacher
        <select value={teacherId} onChange={e=>setTeacherId(e.target.value)} style={input}>
          <option value="">Select teacher</option>
          {teachers.map(teacher=><option key={teacher.id} value={teacher.id}>{teacher.user.email}</option>)}
        </select>
      </label>
      <label style={field}>Academic session
        <select value={sessionId} onChange={e=>setSessionId(e.target.value)} style={input}>
          <option value="">Select session</option>
          {sessions.map(session=><option key={session.id} value={session.id}>{session.name} · {session.status}</option>)}
        </select>
      </label>
      <label style={field}>Academic term
        <select value={termId} onChange={e=>setTermId(e.target.value)} disabled={!sessionId} style={input}>
          <option value="">Select term</option>
          {(sessions.find(session=>session.id===sessionId)?.terms??[]).map(term=><option key={term.id} value={term.id}>{term.name}</option>)}
        </select>
      </label>
      <label style={field}>Class
        <select aria-label="Class teacher class" value={classArmId} onChange={e=>setClassArmId(e.target.value)} style={input}>
          <option value="">Select class</option>
          {arms.map(arm=><option key={arm.id} value={arm.id}>{arm.classLevelName} {arm.name}</option>)}
        </select>
      </label>
      <button type="button" disabled={busy||!teacherId||!sessionId||!termId||!classArmId} onClick={()=>void createResponsibility()} style={button}>{busy?"Saving…":"Assign class teacher"}</button>
    </div>

    <div style={{marginTop:28}}>
      <h3 style={{marginBottom:8}}>Active class teacher responsibilities</h3>
      {teachers.length===0?<p style={sub}>No active teachers are currently connected to this school.</p>:teachers.map(teacher=><div key={teacher.id} data-testid={`class-teacher-${teacher.id}`} style={teacherCard}>
        <strong>{teacher.user.email}</strong>
        {teacher.classTeacherResponsibilities.length===0?<p style={sub}>No active class teacher responsibilities.</p>:teacher.classTeacherResponsibilities.map(item=><div key={item.id} data-testid={`class-teacher-row-${item.id}`} style={assignmentCard}>
          <div><strong>{item.classArm.classLevel.name} {item.classArm.name}</strong><div style={sub}>{item.academicSession.name} · {item.academicTerm.name}</div></div>
          <button type="button" disabled={busy} onClick={()=>void endResponsibility(item.id)} style={endButton}>End responsibility</button>
        </div>)}
      </div>)}
    </div>
  </section>;
}

const card={marginTop:24,border:"1px solid #dfe5e1",borderRadius:16,padding:20};
const teacherCard={marginTop:10,padding:16,border:"1px solid #e0e6e2",borderRadius:12};
const assignmentCard={marginTop:10,padding:14,borderRadius:10,background:"#f8faf8",display:"flex",gap:12,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap" as const};
const field={display:"grid",gap:6};
const input={padding:10,border:"1px solid #d8e0db",borderRadius:9};
const button={padding:"10px 14px",border:0,borderRadius:9,cursor:"pointer",fontWeight:700};
const endButton={...button,background:"#fff1f1"};
const sub={margin:"6px 0 0",color:"#53615a",lineHeight:1.5};
const success={marginTop:14,padding:12,borderRadius:10,background:"#eef8f0"};
const errorBox={marginTop:14,padding:12,borderRadius:10,background:"#fff1f1"};
