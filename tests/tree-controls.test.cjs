"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const base=path.resolve(__dirname,"..");
const html=fs.readFileSync(path.join(base,"index.html"),"utf8");
const app=fs.readFileSync(path.join(base,"app.js"),"utf8");
const css=fs.readFileSync(path.join(base,"layout-controls.css"),"utf8");
test("tree viewport has no title/subtitle or old decorative header",()=>{
  assert.doesNotMatch(html,/class="canvas-header"/);
  assert.doesNotMatch(html,/id="courseSubtitle"/);
  assert.doesNotMatch(html,/>Learning Progression Tree</);
  assert.doesNotMatch(html,/A structured path to build your thinking and learning skills/);
  assert.doesNotMatch(app,/getElementById\("courseSubtitle"\)|\$\("courseSubtitle"\)/);
});
test("only tiny fit button survives; separate zoom buttons and percent display are removed",()=>{
  assert.match(html,/class="fitbtn" id="zoomFit"/);
  assert.doesNotMatch(html,/id="zoomOut"|id="zoomIn"|id="zoomValue"|class="zoomgroup"/);
  assert.doesNotMatch(app,/\$\("zoomOut"\)|\$\("zoomIn"\)|\$\("zoomValue"\)/);
  assert.match(app,/\$\("zoomFit"\)\.addEventListener\("click",fitTree\)/);
  assert.match(css,/\.canvas-view \.zoomtools\{\s*top:7px!important;\s*right:7px!important/);
  assert.match(css,/width:28px;\s*height:28px;/);
});
test("wheel and pinch zoom remain active without visible zoom controls",()=>{
  assert.match(app,/window\.SDGTreeGestures\.attach\(\{viewport:\$\("viewport"\),getZoom:\(\)=>zoom,setZoom\}\)/);
  assert.match(app,/function setZoom\(value,anchor\)/);
  assert.match(app,/function fitTree\(\)/);
  const gesture=fs.readFileSync(path.join(base,"tree-gestures.js"),"utf8");
  assert.match(gesture,/addEventListener\("wheel",onWheel,\{passive:false\}\)/);
  assert.match(gesture,/pinchValues\(\)/);
});
