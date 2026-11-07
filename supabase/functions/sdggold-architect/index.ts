// RETIRED. SDGGold performs NO in-app AI processing.
// All semantic curriculum generation takes place in external ChatGPT.
Deno.serve(req=>new Response(JSON.stringify({
  error:"In-app AI generation has been retired. Supply a complete sdggold-course-v2 package generated externally, then use Import Studio.",
  schema:"sdggold-course-v2"
}),{
  status:410,headers:{"Content-Type":"application/json","Cache-Control":"no-store",
  "Access-Control-Allow-Origin":"https://marcusdhaynes.github.io",
  "Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS"}
}));
