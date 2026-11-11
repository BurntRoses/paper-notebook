import {pagesOf,textOf,type NotebookDocument} from './types';
import {readerFields} from './editorial-metrics';
/** Counts and declared bundled-font ranges, not an assertion about host fallback fonts. */
export function buildMetrics(d:NotebookDocument,template=''){
 const pages=pagesOf(d),blocks=pages.flatMap(p=>p.blocks),ranges:[number,number][]=[];
 for(const face of template.match(/@font-face\s*\{[^{}]*\}/g)||[])if(/font-family:\s*["']?StudyHand\b/.test(face))for(const hit of (face.match(/unicode-range:\s*([^;}]+)/i)?.[1]||'').matchAll(/U\+([\da-f]+)(?:-([\da-f]+))?/gi))ranges.push([parseInt(hit[1],16),parseInt(hit[2]||hit[1],16)]);
 const locations=new Map<string,string[]>();for(const p of pages){const fields=[[p.id,p.title],...p.cues?.map(c=>[c.id,c.text] as string[])||[],...p.blocks.flatMap(b=>[[b.id,textOf(b)],...readerFields(b).map(([k,v])=>[b.id+'.'+k,v])])];for(const [loc,value] of fields)for(const c of new Set(value))if(!/\s/.test(c)&&ranges.length&&!ranges.some(([lo,hi])=>c.codePointAt(0)!>=lo&&c.codePointAt(0)!<=hi))locations.set(c,[...new Set([...(locations.get(c)||[]),loc])]);}
 return {statistics:{pages:pages.length,blocks:blocks.length,characters:blocks.reduce((s,b)=>s+textOf(b).length,0),figures:blocks.filter(b=>['image','diagram','chart'].includes(b.type)).length,tables:blocks.filter(b=>b.type==='comparison').length,marks:blocks.reduce((s,b)=>s+(b.study?.marks?.length||0),0)},
 capacity:{limits:{pages:500,blocks:5000},warnings:[...(pages.length>=400?[{kind:'pages',used:pages.length,limit:500,action:'Split the source into volumes before the 500-page limit.'}]:[]),...(blocks.length>=4000?[{kind:'blocks',used:blocks.length,limit:5000,action:'Split the source into volumes before the 5000-block limit.'}]:[])]},
 fonts:{checked:!!ranges.length,basis:'Bundled StudyHand unicode-range; uncovered characters use system fallback, not proven missing glyphs.',fallbackCharacters:[...locations].map(([character,locations])=>({character,codePoint:'U+'+character.codePointAt(0)!.toString(16).toUpperCase().padStart(4,'0'),locations}))}};
}
