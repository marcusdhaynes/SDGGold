/* SDGGold tree gestures: wheel/trackpad zoom, pointer-anchored pinch, drag panning.
   Pure geometry can be tested in Node; the browser adapter is dependency-free. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.SDGTreeGestures=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const MIN_ZOOM=.18,MAX_ZOOM=2.5;
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 function clampZoom(value){return clamp(Number.isFinite(value)?value:1,MIN_ZOOM,MAX_ZOOM)}
 function anchorZoom(before,after,left,top,anchorX,anchorY){
  const ratio=after/before;
  return {left:Math.max(0,(left+anchorX)*ratio-anchorX),
    top:Math.max(0,(top+anchorY)*ratio-anchorY)};
 }
 function wheelFactor(deltaY,deltaMode=0,viewportHeight=800){
  const pixels=deltaY*(deltaMode===1?18:deltaMode===2?viewportHeight:1);
  return Math.exp(-clamp(pixels,-800,800)*.002);
 }
 function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
 function midpoint(a,b){return {x:(a.x+b.x)/2,y:(a.y+b.y)/2}}
 function attach({viewport,getZoom,setZoom}){
  if(!viewport||typeof getZoom!=="function"||typeof setZoom!=="function")throw Error("Tree gesture viewport and zoom methods are required.");
  const pointers=new Map();
  let dragId=null,dragOrigin=null,lastPoint=null,pinchLast=null,dragged=false,suppressClick=false,resetClickTask=null;
  const isBlockedTarget=target=>{
   const element=target?.closest?.("input,select,textarea,[contenteditable],.tree-navigator,.zoomtools");
   return Boolean(element);
  };
  const relative=p=>{
   const r=viewport.getBoundingClientRect();
   return {x:p.x-r.left,y:p.y-r.top};
  };
  const record=e=>({x:e.clientX,y:e.clientY});
  const pinchValues=()=>{
   if(pointers.size<2)return null;
   const [a,b]=[...pointers.values()].slice(0,2);
   return {distance:distance(a,b),middle:midpoint(a,b)};
  };
  const capture=id=>{
   try{viewport.setPointerCapture?.(id)}catch{/* capture may be unsupported or target disposed */}
  };
  const onWheel=e=>{
   if(isBlockedTarget(e.target))return;
   if(!Number.isFinite(e.deltaY)||e.deltaY===0)return;
   e.preventDefault();
   const next=clampZoom(getZoom()*wheelFactor(e.deltaY,e.deltaMode,viewport.clientHeight));
   setZoom(next,{clientX:e.clientX,clientY:e.clientY});
  };
  const onDown=e=>{
   if(e.pointerType==="mouse"&&e.button!==0)return;
   if(isBlockedTarget(e.target))return;
   pointers.set(e.pointerId,record(e));
   if(pointers.size===1){
    dragId=e.pointerId;dragOrigin=record(e);lastPoint=record(e);
    pinchLast=null;dragged=false;
   }else if(pointers.size>=2){
    pinchLast=pinchValues();
    dragId=null;
    dragged=true;
    viewport.classList.add("is-panning");
    capture(e.pointerId);
   }
  };
  const onMove=e=>{
   if(!pointers.has(e.pointerId))return;
   const point=record(e);pointers.set(e.pointerId,point);
   if(pointers.size>=2){
    e.preventDefault();capture(e.pointerId);
    const next=pinchValues();
    if(pinchLast&&next&&pinchLast.distance>2&&next.distance>2){
     const anchor=relative(next.middle);
     setZoom(clampZoom(getZoom()*next.distance/pinchLast.distance),{clientX:next.middle.x,clientY:next.middle.y});
     viewport.scrollLeft-=next.middle.x-pinchLast.middle.x;
     viewport.scrollTop-=next.middle.y-pinchLast.middle.y;
    }
    pinchLast=next;dragged=true;viewport.classList.add("is-panning");
    return;
   }
   if(e.pointerId!==dragId||!lastPoint||!dragOrigin)return;
   if(!dragged&&distance(point,dragOrigin)<6)return;
   if(!dragged){
    dragged=true;
    viewport.classList.add("is-panning");
    capture(e.pointerId);
   }
   e.preventDefault();
   viewport.scrollLeft-=point.x-lastPoint.x;
   viewport.scrollTop-=point.y-lastPoint.y;
   lastPoint=point;
  };
  const onEnd=e=>{
   if(!pointers.has(e.pointerId))return;
   pointers.delete(e.pointerId);
   try{if(viewport.hasPointerCapture?.(e.pointerId))viewport.releasePointerCapture(e.pointerId)}catch{}
   if(dragged){
    suppressClick=true;
    if(resetClickTask!==null)clearTimeout(resetClickTask);
    resetClickTask=setTimeout(()=>{suppressClick=false;resetClickTask=null},0);
   }
   if(pointers.size>=2){pinchLast=pinchValues();dragId=null}
   else if(pointers.size===1){
    const [id,point]=pointers.entries().next().value;
    dragId=id;dragOrigin=point;lastPoint=point;pinchLast=null;
   }else{
    dragId=null;dragOrigin=null;lastPoint=null;pinchLast=null;dragged=false;
    viewport.classList.remove("is-panning");
   }
  };
  const onClickCapture=e=>{
   if(!suppressClick)return;
   suppressClick=false;
   if(resetClickTask!==null){clearTimeout(resetClickTask);resetClickTask=null}
   e.preventDefault();e.stopImmediatePropagation?.();e.stopPropagation();
  };
  const onContext=e=>{if(dragged)e.preventDefault()};
  viewport.addEventListener("wheel",onWheel,{passive:false});
  viewport.addEventListener("pointerdown",onDown);
  viewport.addEventListener("pointermove",onMove,{passive:false});
  viewport.addEventListener("pointerup",onEnd);
  viewport.addEventListener("pointercancel",onEnd);
  viewport.addEventListener("lostpointercapture",e=>{if(pointers.has(e.pointerId))onEnd(e)});
  viewport.addEventListener("click",onClickCapture,true);
  viewport.addEventListener("contextmenu",onContext);
  return {destroy(){
   viewport.removeEventListener("wheel",onWheel);
   viewport.removeEventListener("pointerdown",onDown);
   viewport.removeEventListener("pointermove",onMove);
   viewport.removeEventListener("pointerup",onEnd);
   viewport.removeEventListener("pointercancel",onEnd);
   viewport.removeEventListener("click",onClickCapture,true);
   viewport.removeEventListener("contextmenu",onContext);
   if(resetClickTask!==null)clearTimeout(resetClickTask);
   pointers.clear();viewport.classList.remove("is-panning");
  }};
 }
 return {MIN_ZOOM,MAX_ZOOM,clampZoom,anchorZoom,wheelFactor,distance,midpoint,attach};
});
