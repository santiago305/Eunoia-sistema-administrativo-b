export const IMAGE_PROCESSOR = Symbol('IMAGE_PROCESSOR');

export interface ImageProcessor {
  toWebp(params: {
    buffer: Buffer;
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    maxInputBytes?: number;
    maxInputPixels?: number;
    maxOutputBytes?: number;
  }): Promise<{
    buffer: Buffer;
    extension: 'webp';
    mimeType: 'image/webp';
    width?: number;
    height?: number;
    sizeBytes: number;
  }>;
}
