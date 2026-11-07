"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const G=require("../tree-gestures.js"),root=path.resolve(__dirname,"..");
function viewport(){
 const handlers=new Map(),classes=new Set();
 return {
  clientWidth:900,clientHeight:600,scrollLeft:600,scrollTop:350,
  classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},
  classes,handlers,
  addEventListener(name,cb){if(!handlers.has(name))handlers.set(name,[]);handlers.get(name).push(cb)},
  removeEventListener(name,cb){const list=handlers.get(name)||[];handlers.set(name,list.filter(x=>x!==cb))},
  getBoundingClientRect:()=>({left:100,top:50,width:900,height:600}),
  setPointerCapture(){},hasPointerCapture:()=>false,
  dispatch(name,props={}){
   const e={pointerId:1,pointerType:"mouse",button:0,clientX:400,clientY:250,
    deltaY:0,deltaMode:0,target:{closest:()=>null},
    prevented:false,stopped:false,
    preventDefault(){this.prevented=true},
    stopPropagation(){this.stopped=true},
    stopImmediatePropagation(){this.stopped=true},...props};
   for(const cb of this.handlers.get(name)||[])cb(e);
   return e;
  }
 };
}
function bind(v){
 let zoom=1,zoomCalls=0;
 const handler=G.attach({viewport:v,getZoom:()=>zoom,setZoom(value,anchor){
  const next=G.clampZoom(value),a={x:anchor.clientX-100,y:anchor.clientY-50};
  const p=G.anchorZoom(zoom,next,v.scrollLeft,v.scrollTop,a.x,a.y);
  v.scrollLeft=p.left;v.scrollTop=p.top;zoom=next;zoomCalls++;
 }});
 return {handler,getZoom:()=>zoom,getZoomCalls:()=>zoomCalls};
}
test("wheel zoom is smooth, cursor-anchored and prevents the browser scroll",()=>{
 const v=viewport(),g=bind(v),beforeX=v.scrollLeft+300,beforeY=v.scrollTop+200;
 const ev=v.dispatch("wheel",{deltaY:-120,clientX:400,clientY:250});
 assert.equal(ev.prevented,true);
 assert.ok(g.getZoom()>1);
 const afterX=(v.scrollLeft+300)/g.getZoom(),afterY=(v.scrollTop+200)/g.getZoom();
 assert.ok(Math.abs(beforeX-afterX)<.001);
 assert.ok(Math.abs(beforeY-afterY)<.001);
 g.handler.destroy();
 assert.equal((v.handlers.get("wheel")||[]).length,0);
});
test("mouse wheel and pinch-style wheel respect zoom bounds and support deltaMode lines",()=>{
 assert.equal(G.clampZoom(-30),G.MIN_ZOOM);
 assert.equal(G.clampZoom(200),G.MAX_ZOOM);
 assert.ok(G.wheelFactor(-3,1)>1);
 assert.ok(G.wheelFactor(5,1)<1);
 const v=viewport(),g=bind(v);
 for(let i=0;i<200;i++)v.dispatch("wheel",{deltaY:-500});
 assert.equal(g.getZoom(),G.MAX_ZOOM);
 for(let i=0;i<200;i++)v.dispatch("wheel",{deltaY:500});
 assert.equal(g.getZoom(),G.MIN_ZOOM);
 g.handler.destroy();
});
test("mouse drag pans in both directions, but does not zoom or trigger a node click",()=>{
 const v=viewport(),g=bind(v);
 v.dispatch("pointerdown",{pointerId:7,clientX:200,clientY:200});
 v.dispatch("pointermove",{pointerId:7,clientX:180,clientY:160});
 assert.equal(v.scrollLeft,620);
 assert.equal(v.scrollTop,390);
 assert.equal(v.classes.has("is-panning"),true);
 v.dispatch("pointerup",{pointerId:7,clientX:180,clientY:160});
 const click=v.dispatch("click");
 assert.equal(click.prevented,true);assert.equal(click.stopped,true);
 assert.equal(g.getZoom(),1);
 assert.equal(v.classes.has("is-panning"),false);
 g.handler.destroy();
});
test("a simple tap does not prevent the normal learning-node click",()=>{
 const v=viewport(),g=bind(v);
 v.dispatch("pointerdown",{pointerId:9,clientX:200,clientY:200,pointerType:"touch"});
 v.dispatch("pointerup",{pointerId:9,clientX:200,clientY:200,pointerType:"touch"});
 assert.equal(v.dispatch("click").prevented,false);
 g.handler.destroy();
});
test("two touch pointers pinch and move midpoint while retaining the focal content",()=>{
 const v=viewport(),g=bind(v);
 v.dispatch("pointerdown",{pointerId:1,pointerType:"touch",clientX:250,clientY:250});
 v.dispatch("pointerdown",{pointerId:2,pointerType:"touch",clientX:450,clientY:250});
 const before=g.getZoom();
 const moved=v.dispatch("pointermove",{pointerId:2,pointerType:"touch",clientX:550,clientY:250});
 assert.equal(moved.prevented,true);
 assert.ok(g.getZoom()>before,"fingers moving apart must zoom in");
 assert.ok(v.scrollLeft>600,"pinching should recenter the canvas around the fingers");
 v.dispatch("pointerup",{pointerId:2,pointerType:"touch",clientX:550,clientY:250});
 v.dispatch("pointerup",{pointerId:1,pointerType:"touch",clientX:250,clientY:250});
 assert.equal(v.classes.has("is-panning"),false);
 g.handler.destroy();
});
test("right clicks and interactive tree controls do not initiate panning",()=>{
 const v=viewport(),g=bind(v);
 v.dispatch("pointerdown",{pointerId:1,button:2,clientX:100,clientY:100});
 v.dispatch("pointermove",{pointerId:1,button:2,clientX:30,clientY:10});
 assert.equal(v.scrollLeft,600);
 v.dispatch("pointerdown",{pointerId:3,button:0,clientX:100,clientY:100,target:{closest:()=>({tagName:"SELECT"})}});
 v.dispatch("pointermove",{pointerId:3,clientX:20,clientY:15});
 assert.equal(v.scrollLeft,600);
 g.handler.destroy();
});
test("screen height, scrollbar removal and icon-rail collapse are explicitly specified",()=>{
 const css=fs.readFileSync(path.join(root,"layout-controls.css"),"utf8");
 const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
 const app=fs.readFileSync(path.join(root,"app.js"),"utf8");
 assert.match(css,/height:100vh;height:100dvh;min-height:0!important/);
 assert.match(css,/scrollbar-width:none!important/);
 assert.match(css,/touch-action:none/);
 assert.match(css,/#app\.sidebar-collapsed\{--sidebar-width:62px\}/);
 assert.match(html,/id="sidebarToggle"/);
 for(const section of ["all","progress","saved","recent"])assert.match(html,new RegExp('data-section="'+section+'"'));
 for(const control of ["search","subject","level","type"])assert.match(html,new RegExp('data-expand-control="'+control+'"'));
 for(const state of ["available","started","mastered","locked"])assert.match(html,new RegExp('data-state="'+state+'" checked'));
 assert.match(app,/SIDEBAR_STATE_KEY/);
 assert.match(app,/window\.SDGTreeGestures\.attach/);
 assert.match(app,/function setZoom\(value,anchor\)/);
});
