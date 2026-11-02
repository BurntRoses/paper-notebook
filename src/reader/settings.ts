import type {NotebookDocument,Page,ReaderPresentation} from '../model/types';
import {button,checkbox,el,input,label,modal,select} from '../ui/dom';
import {setLocale} from '../ui/i18n';
import {paperStyles,resolvePaperStyle} from './paper-styles';

interface SettingsHost{
 d:NotebookDocument;profile:ReaderPresentation;page:Page;rightSidebarOpen:boolean;zoom:number;en:boolean;
 anchor:()=>{pageId:string;blockId?:string;sheet?:number;textOffset?:number;top:number};
 render:(anchor?:ReturnType<SettingsHost['anchor']>)=>void;
 fitPages:()=>void;editor:{paint:()=>void};refreshAppearance:()=>void;remember:()=>void;showGuide:()=>void;
}

export function showReaderSettings(host:SettingsHost){
 const existing=document.querySelector<HTMLDialogElement>('.reader-settings');if(existing){existing.close();return;}
 const t=(zh:string,en:string)=>host.en?en:zh,m=modal(t('阅读设置','Reading settings'),'',{modal:false});
 m.dialog.classList.add('reader-settings');m.dialog.setAttribute('aria-modal','false');
 const trigger=document.querySelector('.settings-entry');trigger?.setAttribute('aria-expanded','true');
 const outside=(e:PointerEvent)=>{if(!m.dialog.contains(e.target as Node)&&!(e.target as HTMLElement).closest('.settings-entry'))m.close();};
 const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!e.defaultPrevented&&!m.dialog.querySelector('[aria-expanded=true]')){e.preventDefault();m.close();}};
 document.addEventListener('pointerdown',outside);m.dialog.addEventListener('keydown',escape);
 m.dialog.addEventListener('close',()=>{document.removeEventListener('pointerdown',outside);document.querySelector('.settings-entry')?.setAttribute('aria-expanded','false');host.remember();});
 const change=<K extends keyof ReaderPresentation>(key:K,value:ReaderPresentation[K])=>{
  const anchor=host.anchor();host.profile[key]=value;
  if(['theme','paperStyle','transition','motion'].includes(key))host.refreshAppearance();else host.render(anchor);
 };
 const section=(name:string)=>{const block=el('section','settings-section');block.append(el('h3','',name));m.body.append(block);return block;};
 const row=(...fields:HTMLElement[])=>{const node=el('div','settings-row');node.append(...fields);return node;};
 const reading=section(t('阅读','Reading'));
 reading.append(row(
  label(t('版式','Layout'),select([['auto',t('自适应','Automatic')],['single',t('单页','Single page')],['spread',t('双页','Two pages')],['scroll',t('连续','Continuous')]],host.profile.layout,v=>change('layout',v as ReaderPresentation['layout']))),
  label(t('纸张方向','Paper orientation'),select([['auto',t('适应窗口','Fit window')],['portrait',t('竖版','Portrait')],['landscape',t('横版','Landscape')]],host.profile.pageShape||'auto',v=>change('pageShape',v as ReaderPresentation['pageShape'])))
 ),row(
  label(t('正文字体','Reading font'),select([['hand',t('文楷','Handwritten')],['serif',t('宋体 / 衬线','Serif')],['sans',t('黑体 / 无衬线','Sans serif')]],host.profile.font||'hand',v=>change('font',v as ReaderPresentation['font']))),
  label(t('行距','Line spacing'),select([['1.85','1.85'],['2.05','2.05'],['2.25','2.25']],String(host.profile.lineSpacing||2.05),v=>change('lineSpacing',Number(v) as ReaderPresentation['lineSpacing'])))
 ));
 const size=input(String(host.d.userState.preferences.fontSize));size.type='range';size.min='14';size.max='36';size.step='1';
 const sizeValue=el('output','settings-size-value',size.value);sizeValue.setAttribute('aria-live','polite');
 size.oninput=()=>sizeValue.textContent=size.value;size.onchange=()=>{const a=host.anchor();host.d.userState.preferences.fontSize=Number(size.value);host.render(a);};
 const sizeField=label(t('字号','Text size'),size);sizeField.classList.add('settings-size');sizeField.append(sizeValue);reading.append(sizeField);
 const margins=row(
  label(t('右侧批注栏','Right margin'),checkbox(host.rightSidebarOpen,v=>{const a=host.anchor();host.rightSidebarOpen=v;host.render(a);})),
  label(t('底部批注栏','Bottom margin'),checkbox(host.profile.bottomNotes!==false,v=>change('bottomNotes',v)))
 );margins.classList.add('settings-toggles');reading.append(margins);

 const paper=section(t('纸张','Paper')),paperHeading=paper.querySelector('h3')!,paperStatus=el('output','settings-paper-status');paperStatus.setAttribute('aria-live','polite');
 const paperHead=el('div','settings-section-head');paperHead.append(paperHeading,paperStatus);paper.prepend(paperHead);
 const palette=el('div','paper-palette');palette.setAttribute('role','radiogroup');palette.setAttribute('aria-label',t('纸张样式','Paper style'));
 const choices:HTMLButtonElement[]=[];
 const sync=()=>{
  const selected=host.profile.paperStyle||'auto',actual=resolvePaperStyle(selected,host.page.subject);
  paperStatus.textContent=(selected==='auto'?t('自动 · ','Auto · '):'')+(paperStyles.find(p=>p.id===actual)?.[host.en?'en':'zh']||'');
  for(const b of choices){const checked=b.dataset.style===selected;b.setAttribute('aria-checked',String(checked));b.tabIndex=checked?0:-1;}
 };
 for(const [index,preset] of paperStyles.entries()){
  const name=host.en?preset.en:preset.zh;
  const b=button(name,()=>{change('paperStyle',preset.id);sync();},'paper-preset','');b.dataset.style=preset.id;b.setAttribute('role','radio');
  const sample=el('span','paper-sample');sample.dataset.paperStyle=resolvePaperStyle(preset.id,host.page.subject);sample.setAttribute('aria-hidden','true');sample.append(el('span','sample-lines'));
  b.append(sample,el('span','paper-preset-name',preset.id==='auto'?t('自动','Auto'):name));
  b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();const next=e.key==='Home'?0:e.key==='End'?choices.length-1:(index+(['ArrowLeft','ArrowUp'].includes(e.key)?-1:1)+choices.length)%choices.length;choices[next].click();choices[next].focus();});
  choices.push(b);palette.append(b);
 }sync();paper.append(palette);
 const theme=row(label(t('明暗模式','Appearance'),select([['paper-light',t('日间','Day')],['paper-night',t('夜间','Night')]],host.profile.theme,v=>change('theme',v as ReaderPresentation['theme']))));theme.classList.add('settings-theme');paper.append(theme);

 const advanced=el('details','settings-advanced'),summary=el('summary','',t('更多设置','More settings'));advanced.append(summary);
 const advancedBody=el('div','settings-advanced-body');advancedBody.append(row(
  label(t('翻页效果','Transition'),select([['cover',t('覆盖','Cover')],['slide',t('滑动','Slide')],['turn',t('仿真','Simulated page')],['none',t('无动画','None')]],host.profile.transition||'cover',v=>change('transition',v as ReaderPresentation['transition']))),
  label(t('翻页方向','Page direction'),select([['horizontal',t('左右','Horizontal')],['vertical',t('上下','Vertical')]],host.profile.direction,v=>change('direction',v as ReaderPresentation['direction'])))
 ),row(
  label(t('阅读缩放','Reading zoom'),select([['1',t('适应纸面','Fit paper')],['1.25','125%'],['1.5','150%'],['2','200%']],String(host.zoom),v=>{host.zoom=Number(v);host.fitPages();host.editor.paint();})),
  label(t('界面语言','Interface language'),select([['zh','中文'],['en','English']],host.en?'en':'zh',v=>{const a=host.anchor();host.d.userState.preferences.language=v as 'zh'|'en';setLocale(v as 'zh'|'en');m.dialog.addEventListener('close',()=>{host.render(a);showReaderSettings(host);},{once:true});m.close();} ))
 ),label(t('减少动态','Reduce motion'),checkbox(host.profile.motion==='reduced',v=>change('motion',v?'reduced':'full'))));
 advanced.append(advancedBody);m.body.append(advanced);
 m.foot.append(button(t('功能介绍','Features'),()=>{m.close();host.showGuide();},'settings-help'),button(t('完成','Done'),m.close,'primary'));
}
