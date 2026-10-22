import {
  BadRequestException,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import sharp from 'sharp';
import { MAX_UPLOAD_SIZE, UploadsService } from './uploads.service';

describe('UploadsService security boundaries', () => {
  function createPrisma() {
    return {
      upload: { findFirst: jest.fn(), findMany: jest.fn() },
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

  it('reconciles missing metadata files, orphan files, temp files and counters idempotently', async () => {
    const previousUploadDir = process.env.UPLOAD_DIR;
    const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'onay-upload-'));
    process.env.UPLOAD_DIR = uploadDir;
    const validFilename = '11111111-1111-4111-8111-111111111111.webp';
    const missingFilename = '22222222-2222-4222-8222-222222222222.webp';
    const orphanFilename = '33333333-3333-4333-8333-333333333333.webp';
    const tempFilename = '.upload-44444444-4444-4444-8444-444444444444.tmp';
    const unrelatedFilename = 'do-not-delete.txt';
    fs.writeFileSync(path.join(uploadDir, validFilename), Buffer.alloc(10));
    fs.writeFileSync(path.join(uploadDir, orphanFilename), Buffer.alloc(5));
    fs.writeFileSync(path.join(uploadDir, tempFilename), Buffer.alloc(5));
    fs.writeFileSync(path.join(uploadDir, unrelatedFilename), 'sentinel');

    try {
      const prisma = createPrisma();
      prisma.upload.findMany.mockResolvedValue([
        {
          id: 'valid',
          filename: validFilename,
          url: `/uploads/${validFilename}`,
          sizeBytes: 10,
          userId: 'user-a',
        },
        {
          id: 'missing',
          filename: missingFilename,
          url: `/uploads/${missingFilename}`,
          sizeBytes: 20,
          userId: 'user-a',
        },
        {
          id: 'traversal',
          filename: '../do-not-delete.txt',
          url: '/uploads/../do-not-delete.txt',
          sizeBytes: 8,
          userId: 'user-a',
        },
      ]);
      const tx = {
        upload: {
          deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
          groupBy: jest
            .fn()
            .mockResolvedValue([{ userId: 'user-a', _sum: { sizeBytes: 10 } }]),
          aggregate: jest.fn().mockResolvedValue({ _sum: { sizeBytes: 10 } }),
        },
        user: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
        uploadStorage: { upsert: jest.fn().mockResolvedValue({ id: 1 }) },
      };
      prisma.$transaction.mockImplementation(
        (callback: (value: typeof tx) => unknown) => callback(tx),
      );
      const service = new UploadsService(prisma as never);

      await expect(service.reconcileStorage()).resolves.toEqual({
        kept: 1,
        removedMetadata: 2,
        removedFiles: 2,
      });
      expect(fs.existsSync(path.join(uploadDir, validFilename))).toBe(true);
      expect(fs.existsSync(path.join(uploadDir, orphanFilename))).toBe(false);
      expect(fs.existsSync(path.join(uploadDir, tempFilename))).toBe(false);
      expect(
        fs.readFileSync(path.join(uploadDir, unrelatedFilename), 'utf8'),
      ).toBe('sentinel');
      expect(tx.upload.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['missing', 'traversal'] } },
      });
      expect(tx.user.updateMany).toHaveBeenCalledWith({
        data: { uploadBytes: 0n },
      });
      expect(tx.uploadStorage.upsert).toHaveBeenCalledWith({
        where: { id: 1 },
        create: { id: 1, usedBytes: 10n },
        update: { usedBytes: 10n },
      });

      prisma.upload.findMany.mockResolvedValueOnce([
        {
          id: 'valid',
          filename: validFilename,
          url: `/uploads/${validFilename}`,
          sizeBytes: 10,
          userId: 'user-a',
        },
      ]);
      await expect(service.reconcileStorage()).resolves.toEqual({
        kept: 1,
        removedMetadata: 0,
        removedFiles: 0,
      });
    } finally {
      if (previousUploadDir === undefined) delete process.env.UPLOAD_DIR;
      else process.env.UPLOAD_DIR = previousUploadDir;
      fs.rmSync(uploadDir, { recursive: true, force: true });
    }
  });

  it('unlinks a canonical symlink entry without following its target', async () => {
    const previousUploadDir = process.env.UPLOAD_DIR;
    process.env.UPLOAD_DIR = path.resolve('safe-upload-root');
    const filename = '11111111-1111-4111-8111-111111111111.webp';
    const prisma = createPrisma();
    prisma.upload.findMany.mockResolvedValue([]);
    jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);
    jest.spyOn(fs.promises, 'readdir').mockResolvedValue([
      {
        name: filename,
        isDirectory: () => false,
      },
    ] as never);
    jest.spyOn(fs.promises, 'lstat').mockResolvedValue({
      isFile: () => false,
      isDirectory: () => false,
      isSymbolicLink: () => true,
      size: 0,
    } as fs.Stats);
    const unlink = jest.spyOn(fs.promises, 'unlink').mockResolvedValue();
    const tx = {
      upload: {
        deleteMany: jest.fn(),
        groupBy: jest.fn().mockResolvedValue([]),
        aggregate: jest.fn().mockResolvedValue({ _sum: { sizeBytes: null } }),
      },
      user: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      uploadStorage: { upsert: jest.fn().mockResolvedValue({ id: 1 }) },
    };
    prisma.$transaction.mockImplementation(
      (callback: (value: typeof tx) => unknown) => callback(tx),
    );

    try {
      const service = new UploadsService(prisma as never);
      await service.reconcileStorage();
      expect(unlink).toHaveBeenCalledWith(
        path.join(path.resolve('safe-upload-root'), filename),
      );
    } finally {
      if (previousUploadDir === undefined) delete process.env.UPLOAD_DIR;
      else process.env.UPLOAD_DIR = previousUploadDir;
    }
  });

  it('deletes user files and decrements the global counter in one transaction', async () => {
    const prisma = createPrisma();
    const filename = '11111111-1111-4111-8111-111111111111.webp';
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'user-a' }]),
      upload: {
        findMany: jest.fn().mockResolvedValue([
          {
            filename,
            url: `/uploads/${filename}`,
            sizeBytes: 123,
            userId: 'user-a',
          },
        ]),
      },
      user: { delete: jest.fn().mockResolvedValue({ id: 'user-a' }) },
      uploadStorage: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    prisma.$transaction.mockImplementation(
      (callback: (value: typeof tx) => unknown) => callback(tx),
    );
    jest.spyOn(fs.promises, 'lstat').mockResolvedValue({
      isFile: () => true,
    } as fs.Stats);
    const unlink = jest.spyOn(fs.promises, 'unlink').mockResolvedValue();
    const service = new UploadsService(prisma as never);

    await expect(
      service.deleteUserWithUploads('user-a'),
    ).resolves.toBeUndefined();
    expect(unlink).toHaveBeenCalledTimes(1);
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: 'user-a' } });
    expect(tx.uploadStorage.updateMany).toHaveBeenCalledWith({
      where: { id: 1, usedBytes: { gte: 123n } },
      data: { usedBytes: { decrement: 123n } },
    });
  });

  it('keeps the user transaction recoverable and signals a filesystem failure', async () => {
    const prisma = createPrisma();
    const filename = '11111111-1111-4111-8111-111111111111.webp';
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'user-a' }]),
      upload: {
        findMany: jest.fn().mockResolvedValue([
          {
            filename,
            url: `/uploads/${filename}`,
            sizeBytes: 123,
            userId: 'user-a',
          },
        ]),
      },
      user: { delete: jest.fn() },
      uploadStorage: { updateMany: jest.fn() },
    };
    prisma.$transaction.mockImplementation(
      (callback: (value: typeof tx) => unknown) => callback(tx),
    );
    jest
      .spyOn(fs.promises, 'lstat')
      .mockRejectedValue(Object.assign(new Error('disk'), { code: 'EIO' }));
    const service = new UploadsService(prisma as never);

    await expect(
      service.deleteUserWithUploads('user-a'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(tx.user.delete).not.toHaveBeenCalled();
    expect(tx.uploadStorage.updateMany).not.toHaveBeenCalled();
  });
});
