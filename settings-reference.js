/* SDGGold settings reference catalog and lossless copy bundle. No AI/network calls. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.SDGReferenceCatalog=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const DOCUMENTS=Object.freeze([
    Object.freeze({file:"CHATGPT_COURSE_TEMPLATE.md",title:"Master ChatGPT Template",kind:"Template",description:"Complete external instructions: source review, tracks, dependencies, five phases, self-validation.",mime:"text/markdown"}),
    Object.freeze({file:"EXAMPLE_COMPLETE_COURSE.json",title:"Complete Course Example",kind:"Example",description:"A complete, directly importable course with foundations, branches, merges, and one mastery point.",mime:"application/json"}),
    Object.freeze({file:"EXAMPLE_BATCH_B001.jsonl",title:"Large-Course Example · Batch 001",kind:"Example",description:"The first part of a fully authored multi-file JSONL course.",mime:"application/x-ndjson"}),
    Object.freeze({file:"EXAMPLE_BATCH_B002.jsonl",title:"Large-Course Example · Batch 002",kind:"Example",description:"The second part of the same multi-file course.",mime:"application/x-ndjson"}),
    Object.freeze({file:"EXAMPLE_BATCH_B003.jsonl",title:"Large-Course Example · Batch 003",kind:"Example",description:"The final part, including the mandatory course_end completion record.",mime:"application/x-ndjson"}),
    Object.freeze({file:"COURSE_PACKAGE_SCHEMA.json",title:"Course Package Schema",kind:"Reference",description:"Machine-readable field and type specification for the externally authored output.",mime:"application/json"})
  ]);
  function buildBundle(contents){
    if(!Array.isArray(contents)||contents.length!==DOCUMENTS.length)throw Error("All reference documents are required before copying the full set.");
    const names=new Set();
    const segments=contents.map((entry,index)=>{
      const expected=DOCUMENTS[index].file;
      if(!entry||entry.file!==expected||typeof entry.text!=="string"||!entry.text.trim()||names.has(entry.file))
        throw Error("Reference missing, out of order, or empty: "+expected);
      names.add(entry.file);
      return "===== BEGIN FILE: "+expected+" =====\n"+entry.text+(entry.text.endsWith("\n")?"":"\n")+"===== END FILE: "+expected+" =====";
    });
    return "SDGGold — COMPLETE EXTERNAL CHATGPT TEMPLATE AND EXAMPLES\n"+
      "The following six files are reproduced in full, separated by exact file markers. "+
      "Give the template, examples, and schema to an external AI with your course materials. "+
      "The batch examples are three parts of ONE example course and are not additional independent courses.\n\n"+
      segments.join("\n\n")+"\n";
  }
  return {DOCUMENTS,buildBundle};
});
