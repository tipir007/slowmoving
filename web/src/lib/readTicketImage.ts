import { decodeBarcode, type DecodedBarcode } from "./barcode";

export async function detectBarcodesFromFile(file: File): Promise<DecodedBarcode[]> {
  const Detector = window.BarcodeDetector;
  if (!Detector) return [];
  const bmp = await createImageBitmap(file);
  try {
    const detector = new Detector({
      formats: ["code_128", "code_39", "code_93", "qr_code", "codabar"],
    });
    const codes = await detector.detect(bmp);
    return codes
      .map((c) => (c.rawValue || "").trim())
      .filter(Boolean)
      .map(decodeBarcode);
  } catch {
    return [];
  } finally {
    bmp.close();
  }
}

export async function ocrFromFile(file: File): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const { data } = await worker.recognize(file);
    return (data.text || "").trim();
  } finally {
    await worker.terminate();
  }
}
