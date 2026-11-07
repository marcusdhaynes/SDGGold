/* SDGGold logical track-band layout; pure geometry, never alters learning dependencies. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.SDGGraphLayout=api})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const NODE_W=235,NODE_H=79,COLUMN=304,ROW=104,MAX_ROWS=6;
const COLORS=["#368fa9","#a67a43","#5c8b78","#916eaf","#c27c66","#6484a5","#a68d54","#729395"];
function layout(course){
 const nodes=course?.nodes||[];
 const rawTracks=Array.isArray(course.tracks)&&course.tracks.length?course.tracks.map(t=>({id:t.id,title:t.title})):null;
 const tracks=rawTracks||[...new Set(nodes.map(n=>n.subject||"General"))].map(s=>({id:s,title:s}));
 const trackIds=new Set(tracks.map(t=>t.id)),masteryId=course?.course?.mastery_node_id||null;
 const terminalIds=new Set(nodes.flatMap(n=>n.prerequisites||[]));
 const isMastery=n=>n.id===masteryId||(masteryId==null&&n.kind==="milestone"&&!terminalIds.has(n.id));
 const groupOf=n=>{
  if(isMastery(n))return "__mastery";
  if(rawTracks){const ids=(n.track_ids||[]).filter(id=>trackIds.has(id));return ids.length===1?ids[0]:"__shared";}
  return tracks.some(t=>t.id===(n.subject||"General"))?(n.subject||"General"):tracks[0]?.id||"General";
 };
 const groups=new Map();
 for(const n of nodes){const id=groupOf(n);if(id!=="__mastery"){if(!groups.has(id))groups.set(id,[]);groups.get(id).push(n)}}
 const ordered=[...(groups.has("__shared")?[{id:"__shared",title:"Shared foundations & cross-track concepts",shared:true}]:[]),...tracks.filter(t=>groups.has(t.id))];
 const tiers=[...new Set(nodes.map(n=>n.tier))].sort((a,b)=>a-b);
 const maxCols=new Map();
 for(const t of tiers){let c=1;for(const g of ordered){const count=(groups.get(g.id)||[]).filter(n=>n.tier===t).length;c=Math.max(c,Math.ceil(count/MAX_ROWS))}maxCols.set(t,c)}
 const tierX=new Map();let x=58,finalNode=nodes.find(isMastery);
 for(const t of tiers){if(t===finalNode?.tier&&rawTracks&&ordered.length>1)x+=COLUMN;
  tierX.set(t,x);x+=maxCols.get(t)*COLUMN+34}
 const pos=new Map(),bands=[];let y=170;
 for(const [index,g] of ordered.entries()){
  const groupNodes=groups.get(g.id)||[],counts=tiers.map(t=>groupNodes.filter(n=>n.tier===t).length);
  const rows=Math.max(1,...counts.map(c=>Math.min(MAX_ROWS,c)));
  const height=rows*ROW+90,color=g.shared?"#b69a61":COLORS[(index-(ordered[0]?.shared?1:0))%COLORS.length];
  const band={id:g.id,title:g.title,top:y-44,height,bottom:y-44+height,color,count:groupNodes.length,shared:!!g.shared};bands.push(band);
  for(const t of tiers){const set=groupNodes.filter(n=>n.tier===t).sort((a,b)=>
   (Number.isFinite(a.lane)?a.lane:9999)-(Number.isFinite(b.lane)?b.lane:9999)||a.title.localeCompare(b.title));
   set.forEach((n,i)=>{const col=Math.floor(i/MAX_ROWS),row=i%MAX_ROWS;
    pos.set(n.id,{x:tierX.get(t)+COLUMN*col,y:y+row*ROW+12,group:g.id});});}
  y=band.bottom+42;
 }
 if(finalNode){const trackBands=bands.filter(b=>!b.shared);
  const center=trackBands.length?(trackBands[0].top+trackBands.at(-1).bottom)/2:(bands[0]?.top+bands[0]?.bottom)/2||250;
  pos.set(finalNode.id,{x:tierX.get(finalNode.tier),y:center-NODE_H/2,group:"__mastery"});
 }
 const collectors=[];
 if(finalNode&&rawTracks&&tracks.length>1){
  const master=pos.get(finalNode.id),finals=new Set(finalNode.prerequisites||[]);
  for(const band of bands.filter(b=>!b.shared)){
   const required=nodes.filter(n=>finals.has(n.id)&&groupOf(n)===band.id).map(n=>n.id);
   if(!required.length)continue;
   collectors.push({id:band.id,title:band.title,color:band.color,required,x:master.x-COLUMN+6,y:band.top+band.height/2-24});
  }
 }
 const height=Math.max(800,y+25,finalNode?(pos.get(finalNode.id).y+NODE_H+180):0),width=Math.max(1200,x+60);
 return {pos,bands,collectors,width,height,tiers,groupOf,nodes:pos.size,nodeWidth:NODE_W,nodeHeight:NODE_H};
}
function overlaps(result){const positions=[...result.pos.entries()],bad=[];
 for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++){
  const a=positions[i][1],b=positions[j][1];
  if(Math.abs(a.x-b.x)<NODE_W+6&&Math.abs(a.y-b.y)<NODE_H+6)bad.push([positions[i][0],positions[j][0]]);
 }return bad;
}
return {layout,overlaps,NODE_W,NODE_H,COLUMN,ROW,MAX_ROWS};
});
