export type BlockType = 'prose'|'concept'|'steps'|'example'|'comparison'|'formula'|'code'|'quote'|'image'|'diagram'|'chart'|'callout'|'checklist'|'exercise';
export interface Item { id: string; text: string }
export interface FormulaParameter { symbol:string; name:string; description:string }
export interface DiagramNode { id: string; label: string; x?: number; y?: number; shape?:'rounded'|'rectangle'|'circle'|'ellipse'|'diamond'|'hexagon'|'pill'|'document'|'cylinder' }
export type StudyMarkKind='highlight'|'underline'|'circle'|'wave'|'box'|'bracket'|'check'|'star'|'dots';
export interface StudyPresentation {visual?:'plain'|'blackboard'|'extract'|'sketch';role?:'definition'|'intuition'|'derivation'|'example'|'evidence'|'takeaway'|'recall';frame?:'auto'|'plain'|'pencil'|'tape'|'double'|'margin';label?:string;aside?:string;explanations?:{text:string;note:string}[];tone?:'blue'|'red'|'olive'|'gold';marks?:{text:string;kind:StudyMarkKind;color?:string;seed?:number}[]}
export interface FigureLayout {size?:'small'|'medium'|'wide'|'full';ratio?:'auto'|'1:1'|'4:3'|'3:2'|'16:9'|'3:4';align?:'left'|'center'|'right';style?:'sketch'|'precise'}
export interface Block {
  id: string; type: BlockType | string; title?: string; text?: string;
  study?:StudyPresentation; figure?:FigureLayout;
  items?: Item[]; steps?: Item[]; prompt?: string; result?: string;
  columns?: string[]; rows?: string[][]; latex?: string; language?: string;
  parameters?:FormulaParameter[];
  align?: ('left'|'center'|'right')[]; keepTogether?:boolean;
  chartType?:'scatter'|'line'|'bar';xLabel?:string;yLabel?:string;series?:{id:string;label:string;points:{x:number;y:number;label?:string}[]}[];
  sourceRefs?: { sourceId: string; locator?: string }[]; verification?: string;
  assetId?: string; caption?: string; alt?: string; attribution?: string;
  nodes?: DiagramNode[]; edges?: { from: string; to: string; label?: string }[];
  tone?: string; question?: string; questionType?: 'single'|'multiple'|'truefalse'|'matching'|'subjective';
  options?: Item[]; solution?: string[]; pairs?: { id: string; left: string; right: string }[];
  explanation?: string; points?: number; [key: string]: unknown;
}
export type PaperShape='landscape'|'portrait';
export interface ObjectFrame {x:number;y:number;width:number;height?:number;z:number;sheet?:number}
export interface PaperSettings {ruling?:'lined'|'grid'|'dots'|'blank';lineHeight?:number}
export type PagePlacements=Partial<Record<PaperShape,Record<string,ObjectFrame>>>;
export interface Page { id: string; title: string; subtitle?: string; subject?:'general'|'stem'|'literature'|'business'|'code'; layout?: 'reading'|'cornell'|'grid'|'exam'|'free'; paper?:PaperSettings; placements?:PagePlacements; blocks: Block[]; cues?: {id:string;text:string;blockId?:string}[]; summary?:string }
export interface Chapter { id: string; title: string; pages: Page[] }
export interface Source { id: string; title: string; url?: string; locator?: string; status?: string }
export interface Asset { id: string; name: string; data: string; mime: string; source?: string; license?: string; originalAssetId?: string; verified?: boolean; width?:number; height?:number }
export interface Selector { blockId: string; start: number; end: number; exact: string; prefix: string; suffix: string }
export interface Annotation { id: string; kind: StudyMarkKind|'bold'|'red'|'strike'|'arrow'|'freehand'; selectors: Selector[]; color: string; width: number; seed: number; pageId: string; points?: number[][]; status?: 'resolved'|'ambiguous'|'orphaned'|'needs-placement'; coordinateSpace?:'legacy-width'|'normalized-page'; originalPoints?:number[][]; sourceSize?:{width:number;height:number}; shape?:PaperShape; sheet?:number; tool?:'pencil'|'pen'|'marker'|'arrow'; attachedBlockId?:string; blockFrame?:{x:number;y:number;width:number;height:number}; migration?:string }
export type MaterialId = 'butter'|'rose'|'sage'|'lilac'|'kraft'|'glassine';
export interface Note { id: string; pageId: string; blockId?: string; selector?: Selector; anchors?:{pageId:string;selector:Selector}[]; title: string; text: string; back: string; material: MaterialId; seed: number; x: number; y: number; z: number; face: 'front'|'back'; attached: boolean; collapsed: boolean; surface: 'page'|'desk'; width?:number;height?:number;sheet?:number;positions?:Partial<Record<PaperShape,ObjectFrame>> }
export interface Bookmark { id: string; pageId: string; blockId?: string; selector?: Selector; kind: 'page'|'text'; label?: string; sheet?:number; createdAt?: string }
export interface Doubt { id: string; pageId: string; selector: Selector; anchors?:{pageId:string;selector:Selector}[]; question: string; category?:'unclear'|'verify'|'question'; status: 'open'|'resolved'; answerNotebookId?: string; answerPageId?: string }
export interface Answer { selected: string[]; text?: string; matches?: Record<string,string>; submitted: boolean }
export interface ReadingAnchor {pageId:string;blockId?:string;offset:number;sheet?:number;textOffset?:number}
export type TimerDisplay = 'digital'|'dial'|'minimal'|'focus';
export type ReaderLayout = 'auto'|'single'|'spread'|'scroll';
export type ReaderDirection = 'horizontal'|'vertical';
export interface ReaderPresentation { layout: ReaderLayout; direction: ReaderDirection; sidebar: 'open'|'collapsed'; theme: 'paper-light'|'paper-night'; motion: 'full'|'reduced'; font?:'hand'|'serif'|'sans';lineSpacing?:1.65|1.85|2.05; pageShape?:'auto'|'portrait'|'landscape'; transition?:'turn'|'cover'|'slide'|'fade'|'none' }
export interface ReaderSidebarItem { id:string; pageId:string; blockId?:string; kind:'chapter'|'page'|'formula'|'diagram'|'exercise'|'question'; label:string; count?:number }
export interface Preferences { language: 'zh'|'en'; desk: 'oak'|'felt'|'night'; showDesk: boolean; motion: boolean; texture: number; reading: 'pages'|'scroll'; direction: 'horizontal'|'vertical'; spread: boolean; fontSize: number; weatherCity: string; weatherEnabled: boolean; penColor: string; penWidth: number; penTexture: 'pencil'|'marker'|'ink'; timerDisplay: TimerDisplay; timerEnd?: number; timerRemaining: number; timerRunning: boolean }
export interface StudyBrief {languageStyle?:string;difficulty?:string;priorKnowledge?:string;horizon?:'short'|'long';materialFidelity?:'strict'|'guided'|'open';scope?:string;termPolicy?:string; goal: string; level: string; minutes: number; materials: string[]; exercises: boolean; language: string; route: 'quick'|'systematic'|'deep'|'practice'|'review'; imagePolicy: 'original'|'programmatic'|'redraw' }
export interface NotebookDocument {
  schemaVersion: '1.0.0';
  notebook: { id: string; revision: number; title: string; subtitle?: string; author?: string; language: string; goals: string[]; sources: Source[]; chapters: Chapter[]; parent?: { notebookId: string; pageId?: string }; brief?: StudyBrief };
  userState: { layouts?:Record<string,PagePlacements>; updatedAt: string; lastPageId: string; readingAnchor?:ReadingAnchor; notes: Note[]; annotations: Annotation[]; dismissedStudyMarks?:string[]; doubts: Doubt[]; answers: Record<string,Answer>; checks: Record<string,boolean>; bookmarks: (string|Bookmark)[]; readingPositions: Record<string,number>; preferences: Preferences };
  assets: Asset[]; extensions: Record<string,unknown>;
}
export interface MaterialProfile { id: MaterialId; name: string; color: string; stiffness: number; damping: number; opacity: number; thickness: number; attachment: 'glue'|'clip'|'tape'|'hole' }
export const materials: MaterialProfile[] = [
  {id:'butter',name:'麦黄方贴',color:'#f1d77f',stiffness:.55,damping:.91,opacity:1,thickness:.14,attachment:'glue'},
  {id:'rose',name:'灰粉撕条',color:'#e9b7a7',stiffness:.48,damping:.9,opacity:1,thickness:.1,attachment:'clip'},
  {id:'sage',name:'鼠尾草卡片',color:'#c1cba6',stiffness:.92,damping:.86,opacity:1,thickness:.3,attachment:'tape'},
  {id:'lilac',name:'雾紫旗签',color:'#d3c1d8',stiffness:.42,damping:.92,opacity:.95,thickness:.09,attachment:'glue'},
  {id:'kraft',name:'牛皮任务签',color:'#cda773',stiffness:.8,damping:.87,opacity:1,thickness:.25,attachment:'hole'},
  {id:'glassine',name:'薄纸摘录',color:'#eee7c9',stiffness:.22,damping:.94,opacity:.82,thickness:.06,attachment:'tape'}
];
export const defaultPreferences = (): Preferences => ({ language:'zh',desk:'oak',showDesk:true,motion: !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches,texture:.48,reading:'pages',direction:'horizontal',spread:false,fontSize:18,weatherCity:'',weatherEnabled:false,penColor:'#6c7355',penWidth:2,penTexture:'pencil',timerDisplay:'digital',timerRemaining:25*60,timerRunning:false });
export const uid = (prefix='id') => `${prefix}-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;
export function userState(pageId=''): NotebookDocument['userState'] { return {updatedAt:new Date().toISOString(),lastPageId:pageId,notes:[],annotations:[],doubts:[],answers:{},checks:{},bookmarks:[],readingPositions:{},preferences:defaultPreferences()}; }
export const pagesOf = (d: NotebookDocument) => d.notebook.chapters.flatMap(c=>c.pages);
export const blocksOf = (d: NotebookDocument) => pagesOf(d).flatMap(p=>p.blocks);
export function blankDocument(): NotebookDocument { const id=uid('page');return {schemaVersion:'1.0.0',notebook:{id:uid('notebook'),revision:1,title:'结构化学习笔记',language:'zh-CN',goals:[],sources:[],chapters:[{id:uid('chapter'),title:'学习内容',pages:[{id,title:'导入教程',layout:'cornell',blocks:[]}]}]},userState:userState(id),assets:[],extensions:{}}; }
export const parameterText=(p:FormulaParameter)=>p.name+'：'+p.description;
export function textOf(b: Block): string { if(b.type==='comparison')return [...(b.columns||[]),...(b.rows||[]).flat()].join('\n');return [b.text||b.question||b.prompt||b.latex||'',...(b.items||b.steps||[]).map(i=>i.text),b.result||'',...(b.parameters||[]).map(parameterText)].filter(Boolean).join('\n'); }
