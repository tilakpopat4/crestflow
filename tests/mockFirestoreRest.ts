export function parseMockFirestoreValue(val: any): any {
  if (!val) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return val.doubleValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) return (val.arrayValue.values || []).map(parseMockFirestoreValue);
  if ('mapValue' in val) {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      res[k] = parseMockFirestoreValue(v);
    }
    return res;
  }
  return null;
}

export function toMockFirestoreValue(v: any): any {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toMockFirestoreValue) } };
  if (typeof v === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, val] of Object.entries(v)) {
      if (val !== undefined) fields[k] = toMockFirestoreValue(val);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}

export function fieldsToObj(fields: Record<string, any> | undefined): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields || {})) {
    out[k] = parseMockFirestoreValue(v);
  }
  return out;
}

export function objToFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v !== undefined) fields[k] = toMockFirestoreValue(v);
  }
  return fields;
}

export function listCollectionResponse(map: Map<string, any>, collectionName: string): Response {
  const documents: any[] = [];
  for (const [id, docObj] of map.entries()) {
    documents.push({
      name: `projects/test-project/databases/(default)/documents/${collectionName}/${id}`,
      fields: objToFields(docObj),
    });
  }
  return new Response(JSON.stringify({ documents }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function handleCollectionDoc(
  map: Map<string, any>,
  docId: string,
  init?: RequestInit,
  urlStr = ''
): Response {
  const method = (init?.method || 'GET').toUpperCase();
  if (method === 'DELETE') {
    map.delete(docId);
    return new Response('{}', { status: 200 });
  }
  if (method === 'PATCH' || method === 'POST') {
    if (urlStr.includes('currentDocument.exists=false') && map.has(docId)) {
      return new Response(JSON.stringify({ error: { code: 409, status: 'ALREADY_EXISTS', message: 'Precondition failed' } }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const body = JSON.parse((init?.body as string) || '{}');
    const existing = map.get(docId) || {};
    const next = { ...existing, ...fieldsToObj(body.fields) };
    map.set(docId, next);
    return new Response(JSON.stringify({ name: docId, fields: objToFields(next) }), { status: 200 });
  }
  const existing = map.get(docId);
  if (!existing) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify({ name: docId, fields: objToFields(existing) }), { status: 200 });
}

export function handleCommitRequest(
  writes: any[],
  getStoreForPath: (docPath: string) => { map: Map<string, any>; id: string }
): Response {
  for (const w of writes) {
    const fullName: string = w?.update?.name || w?.delete || '';
    const rel = fullName.split('/documents/')[1] || '';
    const { map, id } = getStoreForPath(rel);
    if (w?.currentDocument?.exists === false && map.has(id)) {
      return new Response(
        JSON.stringify({ error: { code: 409, status: 'ALREADY_EXISTS', message: `Document ${rel} already exists` } }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (w?.currentDocument?.exists === true && !map.has(id)) {
      return new Response(
        JSON.stringify({ error: { code: 412, status: 'FAILED_PRECONDITION', message: `Document ${rel} missing` } }),
        { status: 412, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  for (const w of writes) {
    const fullName: string = w?.update?.name || w?.delete || '';
    const rel = fullName.split('/documents/')[1] || '';
    const { map, id } = getStoreForPath(rel);
    if (w.delete) {
      map.delete(id);
    } else if (w.update) {
      const existing = map.get(id) || {};
      map.set(id, { ...existing, ...fieldsToObj(w.update.fields) });
    }
  }
  return new Response(JSON.stringify({ writeResults: writes.map(() => ({})) }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
