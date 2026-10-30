import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {blankDocument} from '../src/model/types';
import {checkStudyMarks,inspectStudyMarks} from '../src/model/study-quality';
import {verifyBundledReader} from '../src/io/reader-proof';
import {scriptJSON} from '../src/model/document';
import {parseDocument} from '../src/model/document';
import {authoredAnnotations} from '../src/model/study';
import {exportMarkdown,importText} from '../src/io/markdown';

test('authored bold and font colours remain source typography through Markdown and private exports',()=>{
 const d=blankDocument(),page=d.notebook.chapters[0].pages[0];
 page.blocks=[{id:'typography',type:'prose',text:'模型参数在独立检验之前固定。',study:{marks:[{text:'模型参数',kind:'bold'},{text:'模型参数',kind:'red',color:'#285f9e'},{text:'独立检验',kind:'underline'}]}}];
 const source=JSON.stringify(d.notebook),round=importText(exportMarkdown(parseDocument(d).document)).document;
 assert.deepEqual(round.notebook,d.notebook);
 const annotations=authoredAnnotations(round,page.id);
 assert.deepEqual(annotations.map(a=>a.kind),['bold','red','underline']);assert.equal(annotations[1].color,'#285f9e');
 const report=checkStudyMarks(round);assert.deepEqual(report.typography,{bold:1,coloredText:1,missingBoldPages:[],missingColorPages:[]});
 assert.equal(JSON.stringify(d.notebook),source);assert.equal(d.userState.annotations.length,0);
});

test('authored mark checks reject empty or invalid emphasis without changing source',()=>{
 const document=blankDocument();assert.equal(checkStudyMarks(document).required,false);
 document.notebook.chapters[0].pages[0].blocks=[{id:'lesson',type:'prose',text:'参数固定后再预测。结论已经核验。'}];
 const before=JSON.stringify(document);
 assert.throws(()=>checkStudyMarks(document),/No authored study marks/);
 assert.equal(inspectStudyMarks(document).valid,false);
 assert.equal(checkStudyMarks(document,true).required,false);assert.equal(JSON.stringify(document),before);
 document.notebook.chapters[0].pages[0].blocks[0].study={marks:[{text:'参数',kind:'circle'},{text:'固定后',kind:'dots'},{text:'已经核验',kind:'check'}]};
 const report=checkStudyMarks(document);assert.equal(report.total,3);assert.deepEqual(report.byKind,{circle:1,dots:1,check:1});
 document.notebook.chapters[0].pages[0].blocks[0].study.marks![0].text='标题里才有的词';
 assert.throws(()=>checkStudyMarks(document),/must match actual block text/);
 assert.throws(()=>checkStudyMarks(document,true),/must match actual block text/);
});

test('Python builds and both reader verifiers enforce the same mark policy',()=>{
 const dir=mkdtempSync(join(tmpdir(),'paper-study-quality-')),template=readFileSync('tests/fixtures/reader-template.html','utf8');
 try{
  writeFileSync(join(dir,'template.html'),template);
  const document=blankDocument();document.notebook.chapters[0].pages[0].blocks=[{id:'lesson',type:'prose',text:'参数固定后再预测。结论已经核验。'}];
  const source=join(dir,'source.json'),output=join(dir,'output');
  const build=(args:string[]=[])=>spawnSync('python3',['skills/paper-notebook/scripts/build_reader.py',source,'--out',output,'--template',join(dir,'template.html'),'--schema','schemas/notebook.schema.json','--notices','THIRD_PARTY_NOTICES.txt',...args],{encoding:'utf8'});
  const verify=(html:string,args:string[]=[])=>{
   writeFileSync(join(dir,'candidate.html'),html);
   return spawnSync('python3',['skills/paper-notebook/scripts/verify_reader.py',join(dir,'candidate.html'),'--template',join(dir,'template.html'),'--source',source,...args],{encoding:'utf8'});
  };
  const embed=()=>template.replace('>null</script>','>'+scriptJSON(document)+'</script>');
  writeFileSync(source,JSON.stringify(document));
  assert.notEqual(build().status,0);assert.equal(existsSync(output),false);
  assert.notEqual(verify(embed()).status,0);assert.throws(()=>verifyBundledReader(embed(),template,document),/No authored study marks/);
  assert.equal(build(['--allow-unmarked']).status,0);assert.equal(verify(embed(),['--allow-unmarked']).status,0);
  assert.equal(verifyBundledReader(embed(),template,document,true).studyMarks.required,false);
  document.notebook.chapters[0].pages[0].blocks[0].study={marks:[{text:'参数',kind:'circle'},{text:'固定后',kind:'dots'},{text:'已经核验',kind:'check'}]};
  writeFileSync(source,JSON.stringify(document));
  assert.equal(build().status,0);const python=verify(embed());assert.equal(python.status,0,python.stderr);
  assert.deepEqual(JSON.parse(python.stdout).studyMarks,verifyBundledReader(embed(),template,document).studyMarks);
  document.notebook.chapters[0].pages[0].blocks[0].study.marks![0].text='不存在';writeFileSync(source,JSON.stringify(document));
  assert.notEqual(build().status,0);assert.notEqual(verify(embed()).status,0);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
