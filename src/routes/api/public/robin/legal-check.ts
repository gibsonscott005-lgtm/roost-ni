import {createFileRoute} from "@tanstack/react-router";
import {timingSafeEqual} from "node:crypto";
import {z} from "zod";
export const Route=createFileRoute("/api/public/robin/legal-check")({server:{handlers:{POST:async({request})=>{
  const expected=process.env["LEGAL_CHECK_SECRET"], supplied=request.headers.get("authorization")?.replace(/^Bearer /,"");
  if(!expected || !supplied || expected.length!==supplied.length || !timingSafeEqual(Buffer.from(expected),Buffer.from(supplied))) return Response.json({error:"Unauthorized"},{status:401});
  const parsed=z.object({sourceId:z.string().uuid()}).safeParse(await request.json().catch(()=>null)); if(!parsed.success) return Response.json({error:"Invalid source"},{status:400});
  try {const {checkLegalSource}=await import("@/lib/legal-monitor.server"); return Response.json(await checkLegalSource(parsed.data.sourceId));}
  catch(error) {console.error("Legal source checker failed",error); return Response.json({error:"Source check failed; review required."},{status:500});}
}}}});