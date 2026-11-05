import assert from 'node:assert/strict';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.NOTEBOOK_BASE||'http://127.0.0.1:5182';

for(const [engine,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:900,height:650},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/downloads/machine-learning.html?demo');await page.waitForFunction(()=>window.reader?.fontsCalibrated);

  // Enter is the margin's add-note action, not a request to turn the page.
  const index=await page.evaluate(()=>reader.pageIndex);
  await page.locator('[data-note-region=right]').focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.activeElement?.matches('.workspace-note textarea'));
  assert.equal(await page.evaluate(()=>reader.pageIndex),index);
  assert.equal(await page.locator('.workspace-note').count(),1);
  const note=page.locator('.workspace-note');await note.locator('textarea').fill('这段批注用于检查展开和收起。\n'.repeat(12));
  await page.locator('.settings-entry').click();await page.getByRole('button',{name:'完成',exact:true}).click();
  assert.equal(await note.getAttribute('data-collapsed'),'true');
  await note.getByRole('button',{name:'展开便条',exact:true}).click();assert.equal(await note.getAttribute('data-collapsed'),'false');
  await note.getByRole('button',{name:'收起便条',exact:true}).click();assert.equal(await note.getAttribute('data-collapsed'),'true');

  // A selected value has no work to apply. Language changes retain the user's
  // position inside settings instead of folding and moving the controls.
  await page.evaluate(()=>{const render=reader.render.bind(reader);window.__controlRenders=0;reader.render=(...args)=>{window.__controlRenders++;return render(...args);};});
  await page.locator('.settings-entry').click();
  await page.getByRole('radiogroup',{name:'版式',exact:true}).getByRole('radio',{checked:true}).click();
  assert.equal(await page.evaluate(()=>window.__controlRenders),0);
  await page.locator('.settings-advanced>summary').click();
  await page.getByRole('radiogroup',{name:'界面语言',exact:true}).getByRole('radio',{name:'English',exact:true}).click();
  await page.getByRole('heading',{name:'Reading settings',exact:true}).waitFor();
  assert.equal(await page.locator('.settings-advanced').evaluate(n=>n.open),true);
  assert.equal(await page.evaluate(()=>document.activeElement.textContent),'English');
  await page.getByRole('radiogroup',{name:'Language',exact:true}).getByRole('radio',{name:'中文',exact:true}).click();
  await page.getByRole('heading',{name:'阅读设置',exact:true}).waitFor();
  await page.keyboard.press('Escape');await page.locator('.reader-settings').waitFor({state:'detached'});

  // Exercise and import select fields use the same enhancer. Put a long list
  // near the viewport edge, including a disabled option between two choices.
  await page.evaluate(()=>{
   reader.profile.direction='vertical';reader.setImmersive(true);
   const fixture=document.createElement('div');fixture.id='controls-fixture';fixture.style='position:fixed;bottom:12px;left:20px;z-index:500';
   const select=document.createElement('select');select.setAttribute('aria-label','控件检查');
   for(let i=0;i<20;i++){const option=document.createElement('option');option.value=String(i);option.textContent='选项 '+i;option.disabled=i===1;select.append(option);}
   fixture.append(select);document.body.append(fixture);
  });
  const trigger=page.getByRole('combobox',{name:'控件检查',exact:true});await trigger.click();
  const list=page.locator('#controls-fixture .paper-choice-list');
  const bounds=await list.evaluate(n=>{const r=n.getBoundingClientRect();return{top:r.top,bottom:r.bottom,height:innerHeight};});
  assert.ok(bounds.top>=12&&bounds.bottom<=bounds.height-12,JSON.stringify(bounds));
  const before=await page.evaluate(()=>reader.pageIndex);
  await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'选项 2');
  await page.keyboard.press('End');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'选项 19');
  await page.keyboard.press('Home');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'选项 0');
  await page.keyboard.press('PageDown');assert.equal(await page.evaluate(()=>reader.pageIndex),before);
  await page.keyboard.press('Escape');assert.equal(await trigger.getAttribute('aria-expanded'),'false');
  assert.equal(await page.evaluate(()=>reader.immersive),true);assert.ok(await trigger.evaluate(n=>n===document.activeElement));
  await trigger.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  assert.equal(await page.locator('#controls-fixture select').inputValue(),'2');
  await trigger.click();await page.evaluate(()=>document.dispatchEvent(new Event('scroll')));
  assert.equal(await trigger.getAttribute('aria-expanded'),'false');
  assert.deepEqual(errors,[]);
  console.log(`✓ ${engine}: margin keyboard action, long notes, settings focus/no-op, fitted choice menu, disabled options and isolated reader shortcuts`);
 }finally{await browser.close();}
}
