let cachedWorkLogsFolderId: string | null = null;

/**
 * Clears the cached "Work Logs" folder ID (useful on disconnect or tests).
 */
export function clearWorkLogsFolderCache(): void {
  cachedWorkLogsFolderId = null;
}

/**
 * Searches for or creates a dedicated "Work Logs" folder in the user's Google Drive.
 */
export async function getOrCreateWorkLogsFolder(token: string): Promise<string> {
  if (cachedWorkLogsFolderId) {
    return cachedWorkLogsFolderId;
  }

  const query = encodeURIComponent(
    "name = 'Work Logs' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
  );
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&spaces=drive`;

  try {
    const searchRes = await fetch(searchUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (searchRes.ok) {
      const data = (await searchRes.json()) as { files?: Array<{ id: string; name: string }> };
      if (data.files && data.files.length > 0 && data.files[0]?.id) {
        cachedWorkLogsFolderId = data.files[0].id;
        return cachedWorkLogsFolderId;
      }
    }
  } catch (err) {
    console.warn('Could not query existing Work Logs folder:', err);
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      name: 'Work Logs',
      mimeType: 'application/vnd.google-apps.folder',
      description: 'CrestFlow Work Logs deliverable folder',
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text().catch(() => '');
    throw new Error(`Failed to create 'Work Logs' folder on Google Drive: ${errText || createRes.statusText}`);
  }

  const folderData = (await createRes.json()) as { id: string };
  cachedWorkLogsFolderId = folderData.id;
  return cachedWorkLogsFolderId;
}
