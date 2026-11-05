import assert from 'node:assert/strict';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.NOTEBOOK_BASE||'http://127.0.0.1:5182';

for(const [engine,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/downloads/machine-learning.html?demo');await page.waitForFunction(()=>window.reader?.fontsCalibrated);
  const source=await page.evaluate(()=>{const r=window.reader;r.d.userState.figureMarks=[];r.showVisualPage();return JSON.stringify(r.d.notebook);});
  await page.locator('.figure-edit-entry').first().click();
  const canvas=page.locator('.figure-editor-canvas'),box=await canvas.boundingBox(),x=box.x+box.width*.55,y=box.y+box.height*.4;
  const count=()=>page.evaluate(()=>window.reader.d.userState.figureMarks.length);
  await page.mouse.click(x,y);assert.equal(await count(),0,'A stationary click does not add a pen stroke');
  await page.mouse.move(x,y);await page.mouse.down();
  for(let i=1;i<=24;i++){const angle=i/24*Math.PI*2;await page.mouse.move(box.x+box.width*(.4+.15*Math.cos(angle)),box.y+box.height*(.4+.15*Math.sin(angle)));}
  await page.mouse.up();assert.equal(await count(),1,'A loop returning to its start is retained');
  const path=await page.evaluate(()=>window.reader.d.userState.figureMarks[0].points);
  assert.ok(path.length>20);assert.ok(Math.hypot(path[0][0]-path.at(-1)[0],path[0][1]-path.at(-1)[1])<.1);
  await page.keyboard.press('ControlOrMeta+z');assert.equal(await count(),0);
  await page.keyboard.press('ControlOrMeta+Shift+z');assert.equal(await count(),1);

  // Another contact and its cancellation must not discard the active stroke.
  await canvas.evaluate(node=>node.addEventListener('pointerdown',e=>window.__figurePointer=e.pointerId,{once:true}));
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+20,y+20);
  await canvas.evaluate(node=>{
   const pointerId=window.__figurePointer+100;
   node.dispatchEvent(new PointerEvent('pointerdown',{pointerId,button:0,bubbles:true,clientX:20,clientY:20}));
   node.dispatchEvent(new PointerEvent('pointercancel',{pointerId,bubbles:true}));
  });
  await page.mouse.move(x+40,y+40);await page.mouse.up();assert.equal(await count(),2);
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+25,y+25);
  await canvas.evaluate(node=>node.dispatchEvent(new PointerEvent('pointercancel',{pointerId:window.__figurePointer,bubbles:true})));
  await page.mouse.up();assert.equal(await count(),2,'A cancelled stroke is discarded');

  await page.getByRole('button',{name:'图像工具：文字',exact:true}).click();
  await page.getByRole('textbox',{name:'图像文字说明',exact:true}).fill('图中说明');
  await page.keyboard.press('ControlOrMeta+z');assert.equal(await count(),2,'Text input retains native undo');
  await page.getByRole('button',{name:'撤销图像批注',exact:true}).click();assert.equal(await count(),1);
  await page.getByRole('button',{name:'重做图像批注',exact:true}).click();assert.equal(await count(),2);
  await page.locator('.figure-editor').getByRole('button',{name:'完成',exact:true}).click();
  await page.locator('.figure-edit-entry').first().click();assert.equal(await count(),2);
  assert.equal(await page.evaluate(()=>JSON.stringify(window.reader.d.notebook)),source);
  assert.deepEqual(errors,[]);
  console.log(`✓ ${engine}: closed pen loop, stationary click, pointer isolation/cancellation, keyboard and button history, native text undo, reopen without source edits`);
 }finally{await browser.close();}
}
