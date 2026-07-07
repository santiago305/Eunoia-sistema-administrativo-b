import { BadRequestException } from '@nestjs/common';
import { parseSaleOrderMultipart } from './sale-order-multipart.parser';

const image = (
  fieldname: string,
  overrides: Partial<Express.Multer.File> = {},
) =>
  ({
    fieldname,
    originalname: 'proof.png',
    mimetype: 'image/png',
    size: 4,
    buffer: Buffer.from('test'),
    ...overrides,
  }) as Express.Multer.File;

describe('parseSaleOrderMultipart', () => {
  const data = {
    client: {
      mode: 'existing',
      id: '11111111-1111-4111-8111-111111111111',
    },
    workflowId: '22222222-2222-4222-8222-222222222222',
    items: [
      {
        quantity: 1,
        unitPrice: 10,
        total: 10,
        components: [
          {
            skuId: '33333333-3333-4333-8333-333333333333',
            quantity: 1,
            unitPrice: 10,
            total: 10,
          },
        ],
      },
    ],
    payments: [
      { clientKey: 'new-1', method: 'EFECTIVO', amount: 10 },
    ],
    removedAttachmentIds: ['44444444-4444-4444-8444-444444444444'],
  };

  it('accepts a JSON body without files', () => {
    const result = parseSaleOrderMultipart(data, []);

    expect(result.data).toEqual(data);
    expect(result.paymentPhotoByClientKey.size).toBe(0);
  });

  it('parses multipart data and maps files by stable payment client key', () => {
    const shippingPhoto = image('shippingPhoto');
    const paymentPhoto = image('paymentPhotos[new-1]');

    const result = parseSaleOrderMultipart(
      { data: JSON.stringify(data) },
      [shippingPhoto, paymentPhoto],
    );

    expect(result.shippingPhoto).toBe(shippingPhoto);
    expect(result.paymentPhotoByClientKey.get('new-1')).toBe(paymentPhoto);
  });

  it.each([
    [{ data: '{broken' }, [], 'JSON'],
    [
      { data: JSON.stringify(data) },
      [image('paymentPhotos[unknown]')],
      'unknown',
    ],
    [
      { data: JSON.stringify(data) },
      [image('paymentPhotos[new-1]'), image('paymentPhotos[new-1]')],
      'duplicate',
    ],
    [
      { data: JSON.stringify(data) },
      [image('other')],
      'other',
    ],
    [
      { data: JSON.stringify(data) },
      [image('shippingPhoto', { mimetype: 'application/pdf' })],
      'mime',
    ],
  ])('rejects invalid multipart input: %s', (body, files) => {
    expect(() =>
      parseSaleOrderMultipart(body, files as Express.Multer.File[]),
    ).toThrow(BadRequestException);
  });
});
