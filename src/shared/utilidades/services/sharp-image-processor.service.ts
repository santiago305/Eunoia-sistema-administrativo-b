import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { ImageProcessingError } from 'src/shared/application/errors/image-processing.error';
import { ImageProcessor } from 'src/shared/application/ports/image-processor.port';

@Injectable()
export class SharpImageProcessorService implements ImageProcessor {
  async toWebp(params: {
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
  }> {
    if (!params.buffer || params.buffer.length === 0) {
      throw new ImageProcessingError('El archivo de imagen esta vacio');
    }

    if (params.maxInputBytes && params.buffer.length > params.maxInputBytes) {
      throw new ImageProcessingError('La imagen excede el tamano maximo permitido');
    }

    try {
      const pipeline = sharp(params.buffer, {
        failOn: 'error',
        limitInputPixels: params.maxInputPixels ?? 40_000_000, // ~40MP
      }).rotate();

      const metadata = await pipeline.metadata();
      if (!metadata.format) {
        throw new ImageProcessingError('El archivo no es una imagen valida');
      }

      if (params.maxInputPixels && metadata.width && metadata.height) {
        const pixels = metadata.width * metadata.height;
        if (pixels > params.maxInputPixels) {
          throw new ImageProcessingError('La imagen excede las dimensiones maximas permitidas');
        }
      }

      if (params.maxWidth || params.maxHeight) {
        pipeline.resize({
          width: params.maxWidth,
          height: params.maxHeight,
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      const output = await pipeline
        .webp({ quality: params.quality ?? 80 })
        .toBuffer();

      if (params.maxOutputBytes && output.length > params.maxOutputBytes) {
        throw new ImageProcessingError('La imagen procesada excede el tamano permitido');
      }

      const outputMeta = await sharp(output).metadata();

      return {
        buffer: output,
        extension: 'webp',
        mimeType: 'image/webp',
        width: outputMeta.width,
        height: outputMeta.height,
        sizeBytes: output.length,
      };
    } catch (error) {
      if (error instanceof ImageProcessingError) {
        throw error;
      }

      throw new ImageProcessingError('No se pudo procesar la imagen');
    }
  }
}
