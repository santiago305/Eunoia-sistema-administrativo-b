import { ImageProcessor } from 'src/shared/application/ports/image-processor.port';

type PreparedUpload = {
  buffer: Buffer;
  extension: string;
  mimeType: string;
  sizeBytes: number;
};

const extensionFromName = (name: string) => {
  const raw = name.split('.').pop()?.toLowerCase() ?? '';
  return /^[a-z0-9]+$/.test(raw) ? raw : 'bin';
};

export const shouldConvertImageToWebp = (mimeType?: string | null) =>
  Boolean(mimeType?.startsWith('image/')) && mimeType !== 'image/png';

export const prepareImageForStorage = async (
  file: Express.Multer.File,
  imageProcessor: ImageProcessor,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    maxInputBytes?: number;
    maxInputPixels?: number;
    maxOutputBytes?: number;
  } = {},
): Promise<PreparedUpload> => {
  if (!shouldConvertImageToWebp(file.mimetype)) {
    return {
      buffer: file.buffer,
      extension: extensionFromName(file.originalname),
      mimeType: file.mimetype,
      sizeBytes: file.size,
    };
  }

  const processed = await imageProcessor.toWebp({
    buffer: file.buffer,
    ...options,
  });

  return {
    buffer: processed.buffer,
    extension: processed.extension,
    mimeType: processed.mimeType,
    sizeBytes: processed.sizeBytes,
  };
};
