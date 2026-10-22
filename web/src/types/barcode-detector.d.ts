export {};

declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats?: string[] }) => {
      detect: (
        source: ImageBitmap | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
      ) => Promise<{ rawValue?: string }[]>;
    };
  }
}
