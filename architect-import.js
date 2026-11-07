/* SDGGold large-corpus importer. All source content remains local until the user initiates an authenticated AI call. */
(function(root,factory){const api=factory(root.SDGArchitectCore,root.SDGArchitectStore);root.SDGArchitectImport=api})(window,function(C,Store){
"use strict";
const PDF="https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs";
const WORKER="https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs";
const ZIP="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
let pdfModule,zipPromise;
const ext=name=>(String(name).split(".").pop()||"").toLowerCase();
const safeLabel=name=>String(name||"Unknown").replace(/[^\w .()[\]-]/g,"_").slice(0,150);
const SUPPORTED_TEXT=new Set(["txt","md","markdown","csv","tsv","json","jsonl","ndjson","html","htm","xml","srt","vtt","log","yaml","yml","rtf","tex"]);
const images=new Set(["png","jpg","jpeg","webp"]);
function xmlText(xml,tag){const p=new DOMParser().parseFromString(xml,"application/xml");const nodes=p.getElementsByTagNameNS("*",tag);return Array.from(nodes).map(n=>n.textContent||"").join(" ")}
async function loadZip(){
 if(window.JSZip)return window.JSZip;
 if(!zipPromise)zipPromise=new Promise((resolve,reject)=>{const script=document.createElement("script");script.src=ZIP;script.onload=()=>window.JSZip?resolve(window.JSZip):reject(Error("ZIP parser unavailable"));script.onerror=()=>reject(Error("ZIP library could not load; import preprocessed JSONL instead"));document.head.append(script)});
 return zipPromise;
}
async function addText(job,name,text,format,locator="document"){
 const id=C.addSource(job.packet,name,text,format,locator);
 const passages=job.packet.passages.splice(0);
 for(const passage of passages)await Store.savePassage(job.id,passage);
 job.input_chars=(job.input_chars||0)+text.length;
 return id;
}
function gap(job,name,reason,kind="unsupported_format"){
 const id="GAP-"+Date.now()+"-"+Math.floor(Math.random()*100000);
 job.packet.gaps.push({record_type:"gap",gap_id:id,source_id:name,locator:"file",severity:"high",kind,description:reason,action_needed:"Supply a readable transcript or use the SDGGold pre-processing template."});
}
async function addRecords(job,records,label){
 const p=job.packet;C.ingestPackets(p,records,label);
 const parts=p.passages.splice(0);
 for(const piece of parts)await Store.savePassage(job.id,piece);
 job.input_chars=(job.input_chars||0)+parts.reduce((sum,x)=>sum+(x.text||"").length,0);
}
async function pdfFile(job,file,onProgress){
 let pdf;
 try{
  if(!pdfModule)pdfModule=await import(PDF);
  pdfModule.GlobalWorkerOptions.workerSrc=WORKER;
  pdf=await pdfModule.getDocument({data:new Uint8Array(await file.arrayBuffer()),useSystemFonts:true}).promise;
  const sourceId="PDF-"+C.slug(file.name)+"-"+Date.now().toString(36);
  job.packet.sources.push({record_type:"source",source_id:sourceId,title:safeLabel(file.name),format:"pdf",author:"unknown",version:"unknown",uri:"user_upload",rights:"unknown",trust:"user_supplied",available_locators:"pages 1-"+pdf.numPages,missing_locators:"none"});
  for(let pageIndex=1;pageIndex<=pdf.numPages;pageIndex++){
   const page=await pdf.getPage(pageIndex);
   const items=await page.getTextContent();
   const text=(items.items||[]).map(x=>x.str||"").join(" ").trim();
   if(text.length<20){
    try{
     const original=page.getViewport({scale:1}),scale=Math.min(1.6,1400/Math.max(original.width,original.height));
     const viewport=page.getViewport({scale}),canvas=document.createElement("canvas");
     canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
     const context=canvas.getContext("2d",{alpha:false});
     await page.render({canvasContext:context,viewport}).promise;
     const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",.76));
     if(blob&&blob.size<=2800000){
      await Store.saveAsset(job.id,file.name+" page "+pageIndex+".jpg",blob);
      job.packet.gaps.push({record_type:"gap",gap_id:"PENDING-"+sourceId+"-"+pageIndex,source_id:sourceId,locator:"page "+pageIndex,severity:"review",kind:"pending_scanned_page_ocr",description:"Scanned PDF page queued for visual AI inspection. Do not count as covered until OCR succeeds."});
     }else gap(job,file.name+" page "+pageIndex,"Could not prepare this scanned page for OCR.","unreadable_pdf_page");
    }catch(e){gap(job,file.name+" page "+pageIndex,"Scanned-page rendering failed: "+e.message,"unreadable_pdf_page")}
   }
   else{
    const parts=C.passagesFromText(text,sourceId,"page "+pageIndex);
    for(const part of parts)await Store.savePassage(job.id,part);
    job.input_chars=(job.input_chars||0)+text.length;
   }
   if(onProgress&&pageIndex%10===0)onProgress(file.name+" · page "+pageIndex+"/"+pdf.numPages);
  }
   job.packet.gaps.push({record_type:"gap",gap_id:"PDF-VISUAL-"+sourceId,source_id:sourceId,locator:"PDF figures",severity:"review",kind:"figure_review",description:"Text was extracted from the PDF; diagrams, formulas and charts may still require visual review."});
 }finally{if(pdf)await pdf.destroy()}
}
async function officeFile(job,file,format,onProgress){
 const JSZip=await loadZip(),zip=await JSZip.loadAsync(file);
 const entries=Object.keys(zip.files).filter(x=>!zip.files[x].dir);
 if(entries.length>30000)throw Error("Archive has too many entries.");
 let chunks=[];
 if(format==="docx"||format==="odt"){
  const path=format==="docx"?"word/document.xml":"content.xml",doc=zip.file(path);
  if(!doc)throw Error("Document XML missing");
  const body=await doc.async("string");const parsed=new DOMParser().parseFromString(body,"application/xml");
  const paragraphs=[...parsed.getElementsByTagNameNS("*","p")];
  chunks=paragraphs.map(p=>[...p.getElementsByTagNameNS("*","t")].map(x=>x.textContent).join("")).filter(Boolean);
  if(!chunks.length)chunks=[xmlText(body,"t")];
 }else if(format==="pptx"){
  const slides=entries.filter(x=>/^ppt\/slides\/slide\d+\.xml$/.test(x)).sort((a,b)=>Number(a.match(/slide(\d+)/)[1])-Number(b.match(/slide(\d+)/)[1]));
  for(const [i,path] of slides.entries()){chunks.push("Slide "+(i+1)+"\n"+xmlText(await zip.file(path).async("string"),"t"));if(onProgress&&i%30===0)onProgress(file.name+" · slide "+(i+1)+"/"+slides.length)}
 }else if(format==="xlsx"){
  const shared=zip.file("xl/sharedStrings.xml");
  const strings=shared?[...new DOMParser().parseFromString(await shared.async("string"),"application/xml").getElementsByTagNameNS("*","si")].map(n=>n.textContent):[];
  const sheets=entries.filter(x=>/^xl\/worksheets\/sheet\d+\.xml$/.test(x)).sort();
  for(const path of sheets){
   const doc=new DOMParser().parseFromString(await zip.file(path).async("string"),"application/xml");
   const rows=[...doc.getElementsByTagNameNS("*","row")];
   chunks.push(path+"\n"+rows.map(row=>[...row.getElementsByTagNameNS("*","c")].map(cell=>{const v=cell.getElementsByTagNameNS("*","v")[0]?.textContent||cell.textContent||"";return cell.getAttribute("t")==="s"?strings[Number(v)]||"":v}).join("\t")).join("\n"));
  }
 }else if(format==="epub"){
  const docs=entries.filter(x=>/\.(xhtml|html|htm)$/i.test(x)).slice(0,500);
  for(const path of docs){const contents=await zip.file(path).async("string");chunks.push(path+"\n"+new DOMParser().parseFromString(contents,"text/html").body.textContent)}
 }else if(format==="zip"){
  let count=0,total=0;
  for(const path of entries){
   if(count>=120){gap(job,file.name,"Archive contains more than 120 entries; split the archive into parts.","archive_limit");break}
   if(!/\.(txt|md|csv|tsv|jsonl|ndjson|html|htm|srt|vtt|xml)$/i.test(path))continue;
   const content=await zip.file(path).async("string");total+=content.length;
   if(total>40000000){gap(job,file.name,"Archive text exceeded the 40-million-character safety ceiling. Split into batches.","archive_limit");break}
   await addText(job,file.name+" / "+path,stripMarkup(content,ext(path)),ext(path),"archive "+path);count++;
  }
  return;
 }
 await addText(job,file.name,chunks.join("\n\n"),format,format==="pptx"?"slides":format==="xlsx"?"sheets":"document");
}
function stripMarkup(text,type){
 if(type==="html"||type==="htm"||type==="xml"){const doc=new DOMParser().parseFromString(text,"text/html");doc.querySelectorAll("script,style,noscript,iframe").forEach(x=>x.remove());return doc.body.textContent||""}
 if(type==="rtf")return text.replace(/\\par[d]?/g,"\n").replace(/\\'[0-9a-f]{2}/gi," ").replace(/\\[a-z]+-?\d* ?/gi,"").replace(/[{}]/g,"");
 return text;
}
async function addFile(job,file,onProgress=()=>{}){
 const name=safeLabel(file.name),type=ext(name);
 onProgress("Reading "+name);
 if(file.size>200000000){gap(job,name,"File exceeds 200 MB. Split or preprocess externally.","file_size_limit");return}
 if(type==="jsonl"||type==="ndjson"){
  try{await addRecords(job,C.packetRecords(await file.text(),name),name);return}catch(e){gap(job,name,"Invalid preprocessing JSONL: "+e.message,"invalid_packet");return}
 }
 if(type==="json"){
  const text=await file.text();
  try{
   const j=JSON.parse(text);
   if(j&&j.nodes&&Array.isArray(j.nodes)){job.direct_course=j;return}
   if(j&&((j.schema==="sdggold-preprocess-v1")||j.record_type||j.records||Array.isArray(j))){await addRecords(job,C.packetRecords(text,name),name);return}
  }catch(e){/* generic JSON will become ordinary text */}
  await addText(job,name,text,"json");return;
 }
 if(SUPPORTED_TEXT.has(type)){
  const raw=await file.text();await addText(job,name,stripMarkup(raw,type),type);return;
 }
 if(type==="pdf"){await pdfFile(job,file,onProgress);return}
 if(["docx","odt","pptx","xlsx","epub","zip"].includes(type)){await officeFile(job,file,type,onProgress);return}
 if(images.has(type)){
  job.packet.sources.push({record_type:"source",source_id:"IMG-"+C.slug(name)+"-"+Date.now().toString(36),title:name,format:type,author:"unknown",version:"unknown",uri:"user_upload",rights:"unknown",trust:"user_supplied",available_locators:"image",missing_locators:"pending AI visual inspection"});
  if(file.size>2800000)gap(job,name,"Image exceeds 2.8 MB inspection limit. Compress the image or preprocess elsewhere.","image_size_limit");
  else await Store.saveAsset(job.id,name,file);
  return;
 }
 if(["mp3","mp4","m4a","wav","ogg","webm","mov","avi"].includes(type)){
  gap(job,name,"Audio/video transcription is not yet available in-browser. Upload a transcript or use the external AI preprocessor.","transcription_required");return;
 }
 gap(job,name,"Format "+type+" could not be parsed. Use a readable export or the preprocessing template.");
}
async function addURL(job,url,onProgress){
 let parsed;try{parsed=new URL(url)}catch{throw Error("Invalid URL")}
 if(!["https:","http:"].includes(parsed.protocol))throw Error("Only HTTP(S) URLs supported.");
 onProgress("Checking whether the source permits direct text extraction.");
 try{
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);
  let res;try{res=await fetch(parsed.href,{credentials:"omit",redirect:"follow",signal:controller.signal})}finally{clearTimeout(timeout)}
  if(!res.ok)throw Error("HTTP "+res.status);
  const ct=res.headers.get("content-type")||"";
  if(!/(text|html|json|xml|markdown)/i.test(ct))throw Error("This resource is not text; download the source file first.");
  if(Number(res.headers.get("content-length")||0)>6000000)throw Error("Web page is too large for direct import.");
  let text=await res.text();if(text.length>6000000)throw Error("Downloaded page exceeded 6M characters.");
  if(/html/i.test(ct))text=stripMarkup(text,"html");
  await addText(job,parsed.hostname+parsed.pathname,text,"webpage",parsed.href);
 }catch(e){
  gap(job,parsed.href,"Website could not be read directly ("+e.message+"). Browser CORS restrictions may apply. Paste the page text or use another AI to preprocess.","unreadable_url");
 }
}
return {addFile,addText,addURL,addRecords,stripMarkup};
});
