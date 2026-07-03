// 用 PDFKit 渲染每页 + Vision OCR（中/日/繁/英），把扫描 PDF 的文字打到 stdout。
// 用法: ocr-pdf <pdf路径> [最大页数]
import Foundation
import PDFKit
import Vision
import CoreGraphics

let args = CommandLine.arguments
guard args.count >= 2 else {
  FileHandle.standardError.write("usage: ocr-pdf <pdf> [maxPages]\n".data(using: .utf8)!)
  exit(2)
}
let url = URL(fileURLWithPath: args[1])
let maxPages = args.count >= 3 ? (Int(args[2]) ?? 300) : 300
guard let doc = PDFDocument(url: url) else { exit(1) }
let pageCount = min(doc.pageCount, maxPages)
let langs = ["zh-Hans", "zh-Hant", "ja", "en"]

var output = ""
for i in 0..<pageCount {
  autoreleasepool {
    guard let page = doc.page(at: i) else { return }
    let rect = page.bounds(for: .mediaBox)
    let scale: CGFloat = 2.0
    let w = Int(rect.width * scale)
    let h = Int(rect.height * scale)
    guard w > 0, h > 0,
      let ctx = CGContext(
        data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
    else { return }
    ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
    ctx.fill(CGRect(x: 0, y: 0, width: w, height: h))
    ctx.scaleBy(x: scale, y: scale)
    page.draw(with: .mediaBox, to: ctx)
    guard let cg = ctx.makeImage() else { return }

    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    req.recognitionLanguages = langs
    req.usesLanguageCorrection = true
    let handler = VNImageRequestHandler(cgImage: cg, options: [:])
    do { try handler.perform([req]) } catch { return }
    if let results = req.results {
      for obs in results {
        if let top = obs.topCandidates(1).first { output += top.string + "\n" }
      }
    }
  }
}
print(output)
