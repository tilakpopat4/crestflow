import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getOrCreateWorkLogsFolder,
  clearWorkLogsFolderCache,
} from '../src/lib/driveService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

describe('Google Drive Work Logs Folder & Multi-File Upload Suite', () => {
  beforeEach(() => {
    clearWorkLogsFolderCache();
  });

  it('reuses existing "Work Logs" folder when found in Google Drive', async () => {
    const calls: Array<{ url: string; method: string }> = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = input.toString();
      calls.push({ url, method: init?.method || 'GET' });
      if (url.includes('drive/v3/files?q=')) {
        return new Response(
          JSON.stringify({ files: [{ id: 'folder_existing_123', name: 'Work Logs' }] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const folderId = await getOrCreateWorkLogsFolder('test_token_1');
    assert.equal(folderId, 'folder_existing_123');
    assert.equal(calls.length, 1);
    assert.ok(decodeURIComponent(calls[0].url).includes("name = 'Work Logs'"));
    assert.ok(decodeURIComponent(calls[0].url).includes("application/vnd.google-apps.folder"));

    // Second call uses in-memory cache without another network request
    const cachedId = await getOrCreateWorkLogsFolder('test_token_1');
    assert.equal(cachedId, 'folder_existing_123');
    assert.equal(calls.length, 1);
  });

  it('creates a new "Work Logs" folder when none exists', async () => {
    let createdPayload: any = null;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = input.toString();
      if (url.includes('drive/v3/files?q=')) {
        return new Response(JSON.stringify({ files: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url === 'https://www.googleapis.com/drive/v3/files' && init?.method === 'POST') {
        createdPayload = JSON.parse(String(init.body));
        return new Response(JSON.stringify({ id: 'folder_new_456', name: 'Work Logs' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const folderId = await getOrCreateWorkLogsFolder('test_token_2');
    assert.equal(folderId, 'folder_new_456');
    assert.equal(createdPayload?.name, 'Work Logs');
    assert.equal(createdPayload?.mimeType, 'application/vnd.google-apps.folder');
  });

  it('sets parents: [folderId] in upload metadata and supports multiple file selection in UI', () => {
    const driveServiceSrc = fs.readFileSync(path.join(ROOT, 'src/lib/driveService.ts'), 'utf8');
    const modalSrc = fs.readFileSync(path.join(ROOT, 'src/components/GoogleDriveUploadModal.tsx'), 'utf8');
    const dropZoneSrc = fs.readFileSync(path.join(ROOT, 'src/components/drive/DriveDropZone.tsx'), 'utf8');

    assert.ok(driveServiceSrc.includes('metadata.parents = [folderId]'), 'Upload metadata must set parents to Work Logs folder');
    assert.ok(driveServiceSrc.includes('uploadMultipleFilesToGoogleDrive'), 'driveService must export multi-file uploader');
    assert.ok(dropZoneSrc.includes('multiple'), 'File input must allow multiple file selection');
    assert.ok(modalSrc.includes('uploadMultipleFilesToGoogleDrive'), 'Modal must use multi-file uploader');
  });

  it('keeps all modified and new Drive files within 300-line limit (AGENTS.md)', () => {
    const filesToCheck = [
      'src/lib/driveService.ts',
      'src/lib/driveFolder.ts',
      'src/components/GoogleDriveUploadModal.tsx',
      'src/components/drive/DriveFileList.tsx',
      'src/components/drive/DriveSuccessCard.tsx',
      'src/components/drive/DriveApiHelpCard.tsx',
      'src/components/drive/DriveUploadProgress.tsx',
      'src/components/drive/DriveConnectionBanner.tsx',
      'src/components/drive/DriveWorkItemFields.tsx',
      'src/components/drive/DriveDropZone.tsx',
    ];
    for (const rel of filesToCheck) {
      const lineCount = fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n').length;
      assert.ok(lineCount <= 300, `${rel} has ${lineCount} lines (exceeds 300 line limit)`);
    }
  });
});
