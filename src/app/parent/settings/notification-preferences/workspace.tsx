"use client";

import { useState } from "react";
type Pref={inAppEnabled:boolean;smsEnabled:boolean;emailEnabled:boolean;whatsappEnabled:boolean};
export function ParentNotificationPreferences({schoolId,initial}:{schoolId:string;initial:Pref}){
 const [p,setP]=useState(initial); const [message,setMessage]=useState("");
 async function save(next:Pref){setP(next);const r=await fetch("/api/parent/settings/notification-preferences",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({schoolId,...next})});const d=await r.json();setMessage(r.ok?"Saved.":d.error??"Could not save.");}
 return <section style={{marginTop:20,border:"1px solid #dfe7e2",borderRadius:14,padding:18}}>
 <p style={{color:"#53615a"}}>These settings apply only to your verified guardian relationship at this school.</p>
 {([["inAppEnabled","In-app"],["smsEnabled","SMS"],["emailEnabled","Email"],["whatsappEnabled","WhatsApp"]] as const).map(([k,l])=><label key={k} style={{display:"block",margin:"10px 0"}}><input type="checkbox" checked={p[k]} onChange={e=>void save({...p,[k]:e.target.checked})}/> {l}</label>)}
 {message&&<p>{message}</p>}
 </section>;
}
