import * as OpenCC from "opencc-js";

// 把繁体/日文汉字、全半角、空格、大小写归一到同一形式，便于跨字形/OCR 噪声匹配。
type Conv = (s: string) => string;
let jp2cn: Conv | null = null;
let t2cn: Conv | null = null;

function ensure() {
  if (!t2cn) {
    jp2cn = OpenCC.Converter({ from: "jp", to: "cn" }) as Conv;
    t2cn = OpenCC.Converter({ from: "t", to: "cn" }) as Conv;
  }
}

export function normalize(s: string): string {
  if (!s) return "";
  ensure();
  try {
    return t2cn!(jp2cn!(s.normalize("NFKC")))
      .replace(/\s+/g, "")
      .toLowerCase();
  } catch {
    return s.replace(/\s+/g, "").toLowerCase();
  }
}
