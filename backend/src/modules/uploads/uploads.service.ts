import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class UploadsService {
  private storagePath: string;

  constructor(private configService: ConfigService) {
    this.storagePath = this.configService.get('STORAGE_PATH', './uploads');
  }

  async saveFile(
    file: Express.Multer.File,
    subfolder = 'general',
  ): Promise<{ url: string; filename: string }> {
    const destDir = path.join(this.storagePath, subfolder);
    await fs.mkdir(destDir, { recursive: true });

    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.originalname}`;
    const filePath = path.join(destDir, uniqueName);
    await fs.writeFile(filePath, file.buffer);

    const url = `/uploads/${subfolder}/${uniqueName}`;
    return { url, filename: uniqueName };
  }

  async deleteFile(url: string): Promise<void> {
    const filePath = path.join(this.storagePath, url.replace('/uploads/', ''));
    await fs.unlink(filePath).catch(() => {});
  }
}
