/* SDGGold Settings — offline-capable external-template reader, clipboard, and file downloads. */
(function(root){
  "use strict";
  const catalog=root.SDGReferenceCatalog;
  if(!catalog)return;
  const DOCS=catalog.DOCUMENTS,loaded=new Map(),pending=new Map();
  let layer=null,buildPromise=null,current=DOCS[0],allReady=false,lastFocus=null,readingTicket=0;
  const $=id=>document.getElementById(id);
  const el=(tag,className,value)=>{
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(value!==undefined)node.textContent=String(value);
    return node;
  };
  function status(message,type=""){
    const node=$("ref-status");
    if(!node)return;
    node.textContent=message;
    node.dataset.type=type;
  }
  function loadFile(doc){
    if(loaded.has(doc.file))return Promise.resolve(loaded.get(doc.file));
    if(pending.has(doc.file))return pending.get(doc.file);
    const task=fetch(new URL("./"+doc.file,document.baseURI),{cache:"default"})
      .then(response=>{
        if(!response.ok)throw Error(doc.file+" is unavailable (HTTP "+response.status+").");
        return response.text();
      })
      .then(value=>{
        if(!value.trim())throw Error(doc.file+" is empty.");
        loaded.set(doc.file,value);
        updateReadiness();
        return value;
      })
      .catch(error=>{pending.delete(doc.file);throw error});
    pending.set(doc.file,task);
    return task;
  }
  function updateReadiness(){
    allReady=DOCS.every(doc=>loaded.has(doc.file));
    const bulk=$("ref-copy-all"),download=$("ref-download-all");
    if(bulk)bulk.disabled=!allReady;
    if(download)download.disabled=!allReady;
    for(const doc of DOCS){
      const buttons=document.querySelectorAll('[data-ref-file="'+doc.file+'"][data-ref-action]');
      for(const button of buttons){
        if(button.dataset.refAction==="open")continue;
        button.disabled=!loaded.has(doc.file);
      }
    }
    const count=$("ref-loaded-count");
    if(count)count.textContent=loaded.size+" / "+DOCS.length+" ready";
  }
  async function loadAll(){
    status("Preparing the template and examples for one-click copying…");
    const outcomes=await Promise.allSettled(DOCS.map(loadFile));
    const failures=outcomes.filter(result=>result.status==="rejected");
    updateReadiness();
    if(failures.length){
      const names=DOCS.filter(doc=>!loaded.has(doc.file)).map(doc=>doc.file);
      status("Couldn't load "+names.join(", ")+". Other files can still be opened, copied, or downloaded. Choose Retry to try again.","error");
      $("ref-retry").hidden=false;
    }else{
      status("All six documents are ready. Copy Everything copies the FULL files, not links or summaries.","success");
      $("ref-retry").hidden=true;
    }
  }
  function downloadText(filename,value,mime){
    const url=URL.createObjectURL(new Blob([value],{type:mime+";charset=utf-8"}));
    const link=document.createElement("a");
    link.href=url;link.download=filename;
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),3000);
  }
  function fallbackCopy(value){
    const textarea=el("textarea");
    textarea.value=value;
    textarea.setAttribute("aria-label","Temporary clipboard content");
    textarea.style.cssText="position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
    document.body.append(textarea);
    textarea.focus();textarea.select();
    let success=false;
    try{success=typeof document.execCommand==="function"&&document.execCommand("copy")}
    finally{textarea.remove()}
    if(!success)throw Error("Clipboard access was blocked. You can select the text in the reader and copy it manually.");
  }
  function copyText(value){
    if(navigator.clipboard&&typeof navigator.clipboard.writeText==="function"){
      return navigator.clipboard.writeText(value).catch(()=>fallbackCopy(value));
    }
    return Promise.resolve().then(()=>fallbackCopy(value));
  }
  function completeText(){
    return catalog.buildBundle(DOCS.map(doc=>({file:doc.file,text:loaded.get(doc.file)})));
  }
  function copyAll(){
    if(!allReady)return status("All files must finish loading before Copy Everything can be used.","error");
    const value=completeText();
    copyText(value)
      .then(()=>status("Copied the complete template, examples, and schema ("+value.length.toLocaleString()+" characters).","success"))
      .catch(error=>status(error.message,"error"));
  }
  function downloadAll(){
    if(!allReady)return;
    downloadText("SDGGold_Complete_Template_and_Examples.txt",completeText(),"text/plain");
    status("Downloaded the complete reference set as one text file.","success");
  }
  function copyOne(doc){
    const value=loaded.get(doc.file);
    if(value===undefined)return status("This document is still loading. Choose Open, then try again.","error");
    copyText(value)
      .then(()=>status("Copied the complete contents of "+doc.file+".","success"))
      .catch(error=>status(error.message,"error"));
  }
  function downloadOne(doc){
    const value=loaded.get(doc.file);
    if(value===undefined)return status("This document is still loading. Choose Open, then try again.","error");
    downloadText(doc.file,value,doc.mime);
    status("Downloaded "+doc.file+".","success");
  }
  async function openFile(doc){
    current=doc;
    const ticket=++readingTicket;
    $("ref-reader-title").textContent=doc.title;
    $("ref-reader-name").textContent=doc.file;
    $("ref-reader-kind").textContent=doc.kind;
    $("ref-reader-description").textContent=doc.description;
    $("ref-reader-content").textContent="Loading "+doc.file+"…";
    $("ref-reader-copy").disabled=true;
    $("ref-reader-download").disabled=true;
    for(const row of document.querySelectorAll(".ref-entry")){
      const selected=row.dataset.file===doc.file;
      row.classList.toggle("selected",selected);
      row.querySelector('[data-ref-action="open"]')?.setAttribute("aria-pressed",String(selected));
    }
    try{
      const value=await loadFile(doc);
      if(ticket!==readingTicket||layer.hidden)return;
      $("ref-reader-content").textContent=value;
      $("ref-reader-copy").disabled=false;
      $("ref-reader-download").disabled=false;
      $("ref-reader-scroll").scrollTop=0;
      updateReadiness();
    }catch(error){
      if(ticket!==readingTicket||layer.hidden)return;
      $("ref-reader-content").textContent="Unable to open this document. "+error.message;
      status(error.message,"error");
    }
  }
  function rows(){
    const list=$("ref-list");
    list.replaceChildren();
    for(const doc of DOCS){
      const row=el("div","ref-entry");
      row.dataset.file=doc.file;
      const meta=el("div","ref-entry-meta");
      meta.append(el("div","ref-entry-kind",doc.kind),el("strong","ref-entry-title",doc.title),el("span","ref-entry-filename",doc.file),el("p","ref-entry-description",doc.description));
      const actions=el("div","ref-entry-actions");
      for(const [action,label] of [["open","Open"],["copy","Copy"],["download","Download"]]){
        const button=el("button","ref-action"+(action==="open"?" ref-action-open":""),label);
        button.type="button";
        button.dataset.refAction=action;
        button.dataset.refFile=doc.file;
        button.setAttribute("aria-label",label+" "+doc.title);
        if(action!=="open")button.disabled=!loaded.has(doc.file);
        button.addEventListener("click",()=>{
          if(action==="open")void openFile(doc);
          else if(action==="copy")copyOne(doc);
          else downloadOne(doc);
        });
        actions.append(button);
      }
      row.append(meta,actions);
      list.append(row);
    }
  }
  async function build(){
    layer=el("div","ref-overlay");
    layer.id="ref-settings-layer";
    layer.hidden=true;
    document.body.append(layer);
    const response=await fetch("./settings-panel.html",{cache:"default"});
    if(!response.ok)throw Error("Settings reader layout failed to load (HTTP "+response.status+").");
    layer.innerHTML=await response.text();
    rows();
    $("ref-close").addEventListener("click",close);
    $("ref-copy-all").addEventListener("click",copyAll);
    $("ref-download-all").addEventListener("click",downloadAll);
    $("ref-retry").addEventListener("click",()=>void loadAll());
    $("ref-reader-copy").addEventListener("click",()=>copyOne(current));
    $("ref-reader-download").addEventListener("click",()=>downloadOne(current));
    layer.addEventListener("click",event=>{if(event.target===layer)close()});
    document.addEventListener("keydown",event=>{
      if(layer.hidden)return;
      if(event.key==="Escape"){event.preventDefault();close();return}
      if(event.key!=="Tab")return;
      const focusable=[...layer.querySelectorAll('button:not([disabled]):not([hidden]),[tabindex="0"]')]
        .filter(node=>node.getClientRects().length&&!node.closest("[hidden]"));
      if(!focusable.length)return;
      if(event.shiftKey&&document.activeElement===focusable[0]){event.preventDefault();focusable[focusable.length-1].focus()}
      else if(!event.shiftKey&&document.activeElement===focusable[focusable.length-1]){event.preventDefault();focusable[0].focus()}
    });
  }
  async function open(){
    try{
      lastFocus=document.activeElement;
      if(!buildPromise)buildPromise=build().catch(error=>{buildPromise=null;layer?.remove();layer=null;throw error});
      await buildPromise;
      layer.hidden=false;
      document.body.classList.add("ref-settings-open");
      $("ref-close").focus();
      rows();updateReadiness();
      void openFile(current);
      if(!allReady)void loadAll();
      else status("All six files are ready. Copy Everything includes every file in full.","success");
    }catch(error){
      console.error("SDGGold settings",error);
      alert("Templates & Examples could not open: "+error.message);
    }
  }
  function close(){
    if(!layer||layer.hidden)return;
    layer.hidden=true;
    document.body.classList.remove("ref-settings-open");
    if(lastFocus&&typeof lastFocus.focus==="function")lastFocus.focus();
  }
  root.SDGReferenceSettings={open,close};
})(window);
