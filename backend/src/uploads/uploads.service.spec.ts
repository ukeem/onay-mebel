import {
  BadRequestException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import * as fs from 'fs';
import sharp from 'sharp';
import { MAX_UPLOAD_SIZE, UploadsService } from './uploads.service';

describe('UploadsService security boundaries', () => {
  function createPrisma() {
    return {
      upload: { findFirst: jest.fn() },
      $transaction: jest.fn(),
    };
  }

  afterEach(() => jest.restoreAllMocks());

  it('rejects traversal and non-canonical upload URLs', async () => {
    const service = new UploadsService(createPrisma() as never);
    await expect(
      service.deleteFile('/uploads/../victim.webp', 'user-a'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not reveal or delete another user upload', async () => {
    const prisma = createPrisma();
    prisma.upload.findFirst.mockResolvedValue(null);
    const unlink = jest.spyOn(fs.promises, 'unlink');
    const service = new UploadsService(prisma as never);

    await expect(
      service.deleteFile(
        '/uploads/11111111-1111-4111-8111-111111111111.webp',
        'user-a',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(unlink).not.toHaveBeenCalled();
  });

  it('removes owned metadata even when the file is already missing', async () => {
    const prisma = createPrisma();
    prisma.upload.findFirst.mockResolvedValue({
      url: '/uploads/11111111-1111-4111-8111-111111111111.webp',
      filename: '11111111-1111-4111-8111-111111111111.webp',
      userId: 'user-a',
      sizeBytes: 123,
    });
    jest
      .spyOn(fs.promises, 'unlink')
      .mockRejectedValue(
        Object.assign(new Error('missing'), { code: 'ENOENT' }),
      );
    const tx = {
      upload: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      user: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      uploadStorage: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    prisma.$transaction.mockImplementation(
      (callback: (value: typeof tx) => unknown) => callback(tx),
    );
    const service = new UploadsService(prisma as never);

    await expect(
      service.deleteFile(
        '/uploads/11111111-1111-4111-8111-111111111111.webp',
        'user-a',
      ),
    ).resolves.toBeUndefined();
    expect(tx.upload.deleteMany).toHaveBeenCalledWith({
      where: {
        url: '/uploads/11111111-1111-4111-8111-111111111111.webp',
        userId: 'user-a',
      },
    });
  });

  it('removes an owned file and its quota metadata', async () => {
    const prisma = createPrisma();
    prisma.upload.findFirst.mockResolvedValue({
      url: '/uploads/11111111-1111-4111-8111-111111111111.webp',
      filename: '11111111-1111-4111-8111-111111111111.webp',
      userId: 'user-a',
      sizeBytes: 123,
    });
    const unlink = jest.spyOn(fs.promises, 'unlink').mockResolvedValue();
    const tx = {
      upload: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      user: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      uploadStorage: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    prisma.$transaction.mockImplementation(
      (callback: (value: typeof tx) => unknown) => callback(tx),
    );
    const service = new UploadsService(prisma as never);

    await expect(
      service.deleteFile(
        '/uploads/11111111-1111-4111-8111-111111111111.webp',
        'user-a',
      ),
    ).resolves.toBeUndefined();
    expect(unlink).toHaveBeenCalledTimes(1);
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'user-a' },
      data: { uploadBytes: { decrement: 123n } },
    });
  });

  it('rejects oversized files before image decoding or database writes', async () => {
    const prisma = createPrisma();
    const service = new UploadsService(prisma as never);
    const file = {
      size: MAX_UPLOAD_SIZE + 1,
      originalname: 'large.png',
      mimetype: 'image/png',
      buffer: Buffer.alloc(0),
    } as Express.Multer.File;

    await expect(service.saveFile(file, 'user-a')).rejects.toBeInstanceOf(
      PayloadTooLargeException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not write a file when the user storage quota is exhausted', async () => {
    const prisma = createPrisma();
    const tx = {
      uploadStorage: {
        upsert: jest.fn().mockResolvedValue({ id: 1, usedBytes: 0n }),
      },
      user: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };
    prisma.$transaction.mockImplementation(
      (callback: (value: typeof tx) => unknown) => callback(tx),
    );
    const writeFile = jest.spyOn(fs.promises, 'writeFile');
    const service = new UploadsService(prisma as never);
    const png = await sharp({
      create: {
        width: 1,
        height: 1,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    await expect(
      service.saveFile(
        {
          size: png.length,
          originalname: 'small.png',
          mimetype: 'image/png',
          buffer: png,
        } as Express.Multer.File,
        'user-a',
      ),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
    expect(writeFile).not.toHaveBeenCalled();
  });
});
