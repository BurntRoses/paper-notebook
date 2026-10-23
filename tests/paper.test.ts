import test from 'node:test';
import assert from 'node:assert/strict';
import { introNotebook } from '../src/intro';
import { conceptExample } from '../src/examples';
import { parseDocument } from '../src/model/document';
import { paperShape, paperSize, inkPoints, frameFor, setFrame, safeBoundary } from '../src/model/paper';
import { readerCopy } from '../src/reader/records';
test('paper follows viewport orientation and keeps independent layouts',()=>{
 const d=structuredClone(introNotebook),p=d.notebook.chapters[0].pages[0];assert.equal(paperShape('auto',1200,800),'landscape');assert.equal(paperShape('auto',800,1200),'portrait');assert.equal(paperShape('portrait',1200,800),'portrait');assert.deepEqual(paperSize('landscape'),{width:1120,height:792});
 setFrame(d,p.id,'portrait','intro-lead',{x:90,y:210,width:600,z:1});const vertical=structuredClone(frameFor(d,p,'portrait','intro-lead'));setFrame(d,p.id,'landscape','intro-lead',{x:125,y:240,width:650,z:4,sheet:0});assert.deepEqual(frameFor(d,p,'portrait','intro-lead'),vertical);assert.equal(frameFor(d,p,'landscape','intro-lead')?.x,125);parseDocument(d);
});
test('legacy width-normalized samples remain intact and visibly await placement',()=>{
 const d=structuredClone(conceptExample),pts=[[.1,.8,.4],[.25,1.1,.7]];d.userState.annotations.push({id:'old-stroke',pageId:'observation-1',kind:'freehand',points:pts,selectors:[],color:'#334433',width:2,seed:10});
 const a=parseDocument(d).document.userState.annotations.at(-1)!;assert.equal(a.status,'needs-placement');assert.equal(a.coordinateSpace,'legacy-width');assert.deepEqual(a.originalPoints,pts);assert.deepEqual(a.points,pts);assert.deepEqual(inkPoints(a,1000,700),[[100,800,.4],[250,1100,.7]]);assert.equal(d.userState.annotations.at(-1)?.coordinateSpace,undefined);
});
test('new independent ink preserves aspect ratio across orientation',()=>{
 const a={id:'stroke',pageId:'p',kind:'freehand' as const,selectors:[],color:'#334433',width:2,seed:10,coordinateSpace:'normalized-page' as const,sourceSize:{width:1120,height:792},points:[[.2,.3,.5],[.4,.5,.5]]};
 const wide=inkPoints(a,1120,792),tall=inkPoints(a,792,1120),ratio=(pts:number[][])=>(pts[1][0]-pts[0][0])/(pts[1][1]-pts[0][1]);assert.ok(Math.abs(ratio(wide)-ratio(tall))<1e-10);
});
test('full personal copy roundtrips notes, ink, layouts, source IDs and seeds',()=>{
 const d=structuredClone(introNotebook),p=d.notebook.chapters[0].pages[0];setFrame(d,p.id,'portrait','intro-lead',{x:110,y:250,width:580,z:4});const full=readerCopy(d,{marks:true,questions:true,answers:true,legacy:true}),again=parseDocument(full).document;
 assert.equal(again.notebook.id,d.notebook.id);assert.deepEqual(again.userState.layouts,d.userState.layouts);assert.deepEqual(again.userState.notes,d.userState.notes);assert.deepEqual(again.userState.annotations,d.userState.annotations);
 const publicCopy=readerCopy(d,{marks:false,questions:false,answers:false,legacy:false});assert.equal(publicCopy.userState.annotations.length,0);assert.equal(publicCopy.userState.notes.length,0);assert.equal(publicCopy.userState.layouts,undefined);assert.deepEqual(publicCopy.notebook.chapters,d.notebook.chapters);
});
test('UTF-16 continuation boundaries do not cut emoji pairs',()=>{assert.equal(safeBoundary('中😀文',2),1);assert.equal(safeBoundary('中😀文',3),3);});
