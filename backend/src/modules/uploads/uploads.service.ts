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
    // Only allow simple, alphanumeric subfolder names; anything else (e.g.
    // "..", absolute paths, nested paths) falls back to "general". This
    // prevents path traversal via the client-supplied folder parameter.
    const safeFolder = /^[a-z0-9_-]+$/i.test(subfolder) ? subfolder : 'general';

    const destDir = path.join(this.storagePath, safeFolder);
    await fs.mkdir(destDir, { recursive: true });

    // Use only the basename and strip path separators from the original
    // filename so crafted names ("../../x") cannot escape destDir.
    const safeBase =
      path
        .basename(file.originalname)
        .replace(/[\\/]/g, '-')
        .replace(/^\.+/, '')
        .slice(0, 120) || 'file';

    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeBase}`;
    const filePath = path.join(destDir, uniqueName);
    await fs.writeFile(filePath, file.buffer);

    const url = `/uploads/${safeFolder}/${uniqueName}`;
    return { url, filename: uniqueName };
  }

  async deleteFile(url: string): Promise<void> {
    if (!url || !url.startsWith('/uploads/')) return;
    const relative = url.slice('/uploads/'.length);
    const parts = relative.split('/');
    if (parts.length !== 2 || !/^[a-z0-9_-]+$/i.test(parts[0])) return;
    if (parts[1].includes('/') || parts[1].includes('\\') || parts[1] === '..')
      return;
    const resolvedRoot = path.resolve(this.storagePath);
    const filePath = path.resolve(this.storagePath, parts[0], parts[1]);
    if (!filePath.startsWith(resolvedRoot + path.sep)) return;
    await fs.unlink(filePath).catch(() => {});
  }
}
