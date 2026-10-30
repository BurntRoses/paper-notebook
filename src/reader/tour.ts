import { button, el } from '../ui/dom';
import type { NotebookDocument } from '../model/types';
interface TourHost {d:NotebookDocument;rightSidebarOpen:boolean;profile:{bottomNotes?:boolean};showVisualPage:()=>void;render:()=>void;showExport:()=>void}
let endTour:(()=>void)|undefined;
export function startReaderTour(host:TourHost,root:HTMLElement){
 endTour?.();host.rightSidebarOpen=true;host.profile.bottomNotes=true;host.render();host.showVisualPage();
 const card=el('aside','reader-tour');card.setAttribute('aria-label','操作教程');card.setAttribute('role','region');
 const progress=el('small','tour-progress'),title=el('strong'),text=el('p'),status=el('span','tour-status');status.setAttribute('aria-live','polite');
 let step=0,baseline=host.d.userState.notes.length,markCount=host.d.userState.annotations.length;
 const steps=[
  ['图像批注','.lesson-figure','点击图像可放大，并添加圈注、箭头或文字。'],
  ['页边便条','.paper-notes','双击右栏空白处添加便条。圆形色块切换底色，第一个为透明色；长便条可展开。'],
  ['文字标记','.reader-content','选中文字可加粗或圈注。“更多”中可添加书签或疑问，右上角的书签图标可查看收录内容。'],
  ['底栏批注','.paper-bottom','双击底栏空白处添加便条。顶部的批注栏按钮可分别开关右栏和底栏。'],
  ['下载离线 HTML','.reader-files:not(.margin-controls)','文件菜单可下载含批注的离线 HTML。阅读设置中可查看功能介绍和操作教程。']
 ];
 const clean=()=>root.querySelectorAll('.tour-target').forEach(n=>n.classList.remove('tour-target'));
 const finish=()=>{clearInterval(tick);clean();card.remove();endTour=undefined;};endTour=finish;
 const next=button('下一步',()=>{if(step===steps.length-1){finish();return;}step++;baseline=host.d.userState.notes.length;markCount=host.d.userState.annotations.length;show();},'primary');
 const previous=button('上一步',()=>{step=Math.max(0,step-1);show();},'quiet');
 const show=()=>{clean();const [heading,selector,description]=steps[step];progress.textContent=`操作教程 · ${step+1} / ${steps.length}`;title.textContent=heading;text.textContent=description;status.textContent='';previous.disabled=step===0;next.textContent=next.title=step===steps.length-1?'完成':'下一步';next.setAttribute('aria-label',next.title);const target=root.querySelector(selector)||root.querySelector('.reader-content');target?.classList.add('tour-target');};
 const tick=window.setInterval(()=>{if(!card.isConnected){finish();return;}if((step===1||step===3)&&host.d.userState.notes.length>baseline&&host.d.userState.notes.at(-1)?.text)status.textContent='已添加便条';if(step===2&&host.d.userState.annotations.length>markCount)status.textContent='已添加标记';},350);
 const actions=el('div','tour-actions');actions.append(button('结束教程',finish,'quiet'),previous,next);card.append(progress,title,text,status,actions);document.body.append(card);show();
}
