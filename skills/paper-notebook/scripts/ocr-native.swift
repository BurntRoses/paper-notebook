import Foundation
import AppKit
import PDFKit
import Vision

struct Line: Codable { var text:String; var confidence:Float; var bounds:[Double] }
struct SourcePage: Codable { var page:Int; var method:String; var rawText:String; var correctedText:String=""; var uncertain:[String]; var lines:[Line]; var status:String="review" }
func recognize(_ image:CGImage,_ page:Int) throws -> SourcePage {
 let request=VNRecognizeTextRequest();request.recognitionLevel = .accurate
 request.recognitionLanguages=["zh-Hans","en-US"];request.usesLanguageCorrection=false
 try VNImageRequestHandler(cgImage:image,options:[:]).perform([request])
 let rows=(request.results ?? []).compactMap { item -> Line? in
  guard let text=item.topCandidates(1).first else{return nil};let b=item.boundingBox
  return Line(text:text.string,confidence:text.confidence,bounds:[b.origin.x,b.origin.y,b.width,b.height])
 }.sorted { a,b in abs(a.bounds[1]-b.bounds[1])>0.012 ? a.bounds[1]>b.bounds[1] : a.bounds[0]<b.bounds[0] }
 return SourcePage(page:page,method:"Apple Vision OCR",rawText:rows.map{$0.text}.joined(separator:"\n"),uncertain:rows.filter{$0.confidence<0.8}.map{$0.text},lines:rows)
}
let args=CommandLine.arguments
if args.count<2 {fputs("Input file required\n",stderr);exit(2)}
let url=URL(fileURLWithPath:args[1]);var pages:[SourcePage]=[]
do {
 if url.pathExtension.lowercased()=="pdf" {
  guard let pdf=PDFDocument(url:url) else {throw NSError(domain:"OCR",code:1,userInfo:[NSLocalizedDescriptionKey:"Cannot read PDF"])}
  for i in 0..<pdf.pageCount {guard let page=pdf.page(at:i) else{continue}
   let raw=page.string ?? ""
   if raw.trimmingCharacters(in:.whitespacesAndNewlines).count>20 {
    pages.append(SourcePage(page:i+1,method:"PDF text layer",rawText:raw,uncertain:[],lines:[]))
   } else {
    let bounds=page.bounds(for:.mediaBox),scale=1800/max(bounds.width,bounds.height),size=NSSize(width:bounds.width*scale,height:bounds.height*scale)
    let image=page.thumbnail(of:size,for:.mediaBox)
    guard let cg=image.cgImage(forProposedRect:nil,context:nil,hints:nil) else {throw NSError(domain:"OCR",code:2,userInfo:[NSLocalizedDescriptionKey:"Cannot render page \(i+1)"])}
    pages.append(try recognize(cg,i+1))
   }
  }
 } else {
  guard let image=NSImage(contentsOf:url),let cg=image.cgImage(forProposedRect:nil,context:nil,hints:nil) else {throw NSError(domain:"OCR",code:3,userInfo:[NSLocalizedDescriptionKey:"Cannot read image"])}
  pages=[try recognize(cg,1)]
 }
 let encoder=JSONEncoder();encoder.outputFormatting=[.prettyPrinted,.sortedKeys];let data=try encoder.encode(pages);FileHandle.standardOutput.write(data)
} catch {fputs("\(error.localizedDescription)\n",stderr);exit(1)}
