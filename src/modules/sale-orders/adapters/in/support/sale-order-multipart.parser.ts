import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { isUUID, validateSync } from 'class-validator';
import { HttpSaveSaleOrderWithClientDto } from '../dtos/http-save-sale-order-with-client.dto';

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const PAYMENT_PHOTO_FIELD = /^paymentPhotos\[([^\]]+)\]$/;

export type ParsedSaleOrderMultipart = {
  data: HttpSaveSaleOrderWithClientDto;
  shippingPhoto?: Express.Multer.File;
  paymentPhotoByClientKey: Map<string, Express.Multer.File>;
};

export function parseSaleOrderMultipart(
  body: unknown,
  files: Express.Multer.File[] = [],
): ParsedSaleOrderMultipart {
  const data = validateData(parseData(body));
  const paymentKeys = new Set(
    (data.payments ?? []).map((payment) => payment.clientKey),
  );
  const paymentPhotoByClientKey = new Map<string, Express.Multer.File>();
  let shippingPhoto: Express.Multer.File | undefined;

  for (const file of files) {
    validateImage(file);

    if (file.fieldname === 'shippingPhoto') {
      if (shippingPhoto) {
        throw new BadRequestException(
          'No se puede repetir el archivo shippingPhoto',
        );
      }
      shippingPhoto = file;
      continue;
    }

    const match = PAYMENT_PHOTO_FIELD.exec(file.fieldname);
    if (!match) {
      throw new BadRequestException(
        `Campo de archivo no permitido: ${file.fieldname}`,
      );
    }

    const clientKey = match[1];
    if (!paymentKeys.has(clientKey)) {
      throw new BadRequestException(
        `No existe un pago con clientKey ${clientKey}`,
      );
    }
    if (paymentPhotoByClientKey.has(clientKey)) {
      throw new BadRequestException(
        `No se puede repetir la foto del pago ${clientKey}`,
      );
    }
    paymentPhotoByClientKey.set(clientKey, file);
  }

  return { data, shippingPhoto, paymentPhotoByClientKey };
}

function validateData(
  data: HttpSaveSaleOrderWithClientDto,
): HttpSaveSaleOrderWithClientDto {
  const dto = plainToInstance(HttpSaveSaleOrderWithClientDto, data);
  const errors = validateSync(dto);
  if (errors.length) {
    throw new BadRequestException('Los datos del pedido son invalidos');
  }

  const command = dto.client;
  if (!command || !['existing', 'create', 'update'].includes(command.mode)) {
    throw new BadRequestException('El modo del cliente es invalido');
  }
  if (
    (command.mode === 'existing' || command.mode === 'update') &&
    !isUUID(command.id)
  ) {
    throw new BadRequestException('El cliente seleccionado es invalido');
  }
  if (
    (command.mode === 'create' || command.mode === 'update') &&
    (!command.data || typeof command.data !== 'object')
  ) {
    throw new BadRequestException('Los datos del cliente son obligatorios');
  }

  return dto;
}

function parseData(body: unknown): HttpSaveSaleOrderWithClientDto {
  if (!body || typeof body !== 'object') {
    throw new BadRequestException('El cuerpo del pedido es invalido');
  }

  const raw = body as Record<string, unknown>;
  if (typeof raw.data !== 'string') {
    return raw as unknown as HttpSaveSaleOrderWithClientDto;
  }

  try {
    const parsed = JSON.parse(raw.data);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('invalid');
    }
    return parsed as HttpSaveSaleOrderWithClientDto;
  } catch {
    throw new BadRequestException('El campo data no contiene JSON valido');
  }
}

function validateImage(file: Express.Multer.File): void {
  if (!file?.buffer?.length) {
    throw new BadRequestException('La imagen esta vacia');
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
    throw new BadRequestException(
      'Solo se permiten imagenes JPEG, PNG o WEBP',
    );
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new BadRequestException('La imagen supera el limite de 15 MB');
  }
}
