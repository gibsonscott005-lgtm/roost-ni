import { load } from "cheerio";
import { validateLegalSourceUrl } from "./legal-source-url";

export { validateLegalSourceUrl };
export async function readLegalSource(value:string) {
  let url=validateLegalSourceUrl(value);
  for(let redirects=0;redirects<6;redirects++) {
    const response=await fetch(url,{redirect:"manual",signal:AbortSignal.timeout(25000),headers:{"Accept":"text/html","User-Agent":"RoostNI legal source review (+https://roostni.co.uk)"}});
    if(response.status>=300&&response.status<400) {
      const location=response.headers.get("location"); if(!location) throw new Error("Source redirect has no destination.");
      url=validateLegalSourceUrl(new URL(location,url).toString()); continue;
    }
    if(!response.ok) throw new Error(`Source could not be read (HTTP ${response.status}).`);
    if(!response.headers.get("content-type")?.includes("text/html")) throw new Error("Source did not return an HTML page.");
    const html=await response.text(); if(html.length>2500000) throw new Error("Source page too large to check safely.");
    const $=load(html); $("script,style,nav,header,footer,noscript,.cookie-banner,.cookie-consent").remove();
    const main=$("main").first(); const article=$("article").first();
    const target=main.length?main:article.length?article:$("body");
    target.find("p,li,h1,h2,h3,h4,tr,br").append("\n");
    const text=target.text().split("\n").map(line=>line.replace(/\s+/g," ").trim()).filter(Boolean).join("\n").slice(0,180000);
    if(text.length<200 || /just a moment|verify you are human|access denied|enable javascript and cookies/i.test(text.slice(0,1200))) throw new Error("Source returned no usable page text; URL remains unconfirmed.");
    const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));
    return {text,hash:Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join(""),resolvedUrl:url};
  }
  throw new Error("Too many source redirects.");
}