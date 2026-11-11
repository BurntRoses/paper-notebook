import type {NotebookDocument} from '../model/types';
import {reviewContent} from '../model/content-review';
export function reviewTemplate(d:NotebookDocument,sourceSHA256:string,rulesSHA256:string){
 const content=reviewContent(d),findings=[...content.writing.warnings,...content.teaching.warnings];
 return {sourceSHA256,rulesSHA256,chapters:d.notebook.chapters.map(c=>({chapterId:c.id,writing:'',teaching:'',facts:'',brief:''})),decisions:[...new Map(findings.map(w=>[w.rule+'\0'+w.location,{rule:w.rule,location:w.location,decision:''}])).values()],browser:{inspected:false,reason:''}};
}
/** This records a source-bound editorial review; it does not infer semantic truth. */
export function checkDeliveryReview(d:NotebookDocument,review:ReturnType<typeof reviewTemplate>,sourceSHA256:string,rulesSHA256:string,artifactSHA256:string){
 if(review.sourceSHA256!==sourceSHA256||review.rulesSHA256!==rulesSHA256)throw new Error('Editorial review is stale: source or mandatory writing rules changed.');
 for(const c of d.notebook.chapters){const entry=review.chapters?.find(v=>v.chapterId===c.id);for(const key of ['writing','teaching','facts','brief'] as const)if(!entry?.[key]?.trim())throw new Error(`${c.id}.${key}: record the actual editorial finding before delivery`);}
 const expected=reviewTemplate(d,sourceSHA256,rulesSHA256);
 for(const finding of expected.decisions)if(!review.decisions?.some(v=>v.rule===finding.rule&&v.location===finding.location&&v.decision?.trim()))throw new Error(`${finding.location}: review finding ${finding.rule} needs a decision`);
 const browser=review.browser as {inspected:boolean;reason?:string;artifactSHA256?:string;sourceSHA256?:string;issues?:unknown[];viewports?:unknown[];checkedSheets?:number;expectedSheets?:number};
 if(browser.inspected){if(browser.artifactSHA256!==artifactSHA256||browser.sourceSHA256!==sourceSHA256||!Array.isArray(browser.issues)||browser.issues.length||!browser.viewports?.length||!browser.checkedSheets||browser.checkedSheets!==browser.expectedSheets)throw new Error('Browser inspection is stale, incomplete, or contains layout failures.');}
 else if(!browser.reason?.trim())throw new Error('Record why browser inspection could not run.');
 return {deliveryReady:true,editorialReview:'recorded',browserInspected:browser.inspected,sourceSHA256,rulesSHA256,artifactSHA256,browser};
}
