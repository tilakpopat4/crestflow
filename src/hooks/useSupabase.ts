import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

// Collection to Table Mapping
const TABLE_MAP: Record<string, string> = {
  clients: 'clients',
  workItems: 'work_items',
  work_items: 'work_items',
  invoices: 'invoices',
  stickyNotes: 'sticky_notes',
  sticky_notes: 'sticky_notes',
  clientReviews: 'client_reviews',
  client_reviews: 'client_reviews',
  serviceRequests: 'service_requests',
  service_requests: 'service_requests',
  userProfiles: 'profiles',
  profiles: 'profiles',
  subscriptionPayments: 'subscription_payments',
  subscription_payments: 'subscription_payments',
  subscriptionWhitelist: 'subscription_whitelist',
  subscription_whitelist: 'subscription_whitelist',
  subscriptionPlans: 'subscription_plans',
  subscription_plans: 'subscription_plans',
};


// Date fields that are timestamps in ms in frontend but TIMESTAMPTZ/DATE in Postgres
const TIMESTAMP_FIELDS = new Set([
  'date',
  'createdAt',
  'updatedAt',
  'lastPaymentDate',
  'closedAt',
  'trialStartedAt',
  'trialEndsAt',
  'currentPeriodStart',
  'currentPeriodEnd',
]);

// Utility: Convert camelCase object to snake_case for PostgreSQL
export function toSnakeCase(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase);
  }
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    // Special handling for timestamp fields converted to ISO string
    let processedVal = val;
    if (TIMESTAMP_FIELDS.has(key) && typeof val === 'number') {
      processedVal = new Date(val).toISOString();
    } else if (typeof val === 'object' && val !== null && !Array.isArray(val) && !(val instanceof Date)) {
      processedVal = toSnakeCase(val);
    } else if (Array.isArray(val)) {
      processedVal = val.map(toSnakeCase);
    }

    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    result[snakeKey] = processedVal;
  }
  return result;
}

// Utility: Convert snake_case object to camelCase for React components
export function toCamelCase(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

    // Convert ISO date strings back to millisecond timestamps if they match timestamp fields
    let processedVal = val;
    if (TIMESTAMP_FIELDS.has(camelKey) && typeof val === 'string' && !isNaN(Date.parse(val))) {
      processedVal = new Date(val).getTime();
    } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      processedVal = toCamelCase(val);
    } else if (Array.isArray(val)) {
      processedVal = val.map(toCamelCase);
    }

    result[camelKey] = processedVal;
  }
  return result;
}

export function useSupabase<T extends { id: string }>(collectionName: string, userId?: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tableName = TABLE_MAP[collectionName] || collectionName;
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    if (!userId) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // profiles table uses 'id' instead of 'user_id'
      const filterCol = tableName === 'profiles' ? 'id' : 'user_id';
      const { data: rows, error: fetchErr } = await supabase
        .from(tableName)
        .select('*')
        .eq(filterCol, userId);

      if (fetchErr) throw fetchErr;

      const camelRows = (rows || []).map((row) => toCamelCase(row) as T);
      setData(camelRows);
    } catch (err: any) {
      console.error(`[Supabase Error] Failed to fetch ${tableName}:`, err);
      setError(err?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [tableName, userId]);

  useEffect(() => {
    fetchData();

    if (!userId) return;

    // Setup unique Realtime subscription channel per subscriber instance to avoid collisions
    const filterCol = tableName === 'profiles' ? 'id' : 'user_id';
    const uniqueId = Math.random().toString(36).slice(2, 9);
    const channelName = `realtime:${tableName}:${userId}:${uniqueId}`;

    let channel: RealtimeChannel | null = null;
    try {
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: tableName,
            filter: `${filterCol}=eq.${userId}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newItem = toCamelCase(payload.new) as T;
              setData((prev) => {
                const exists = prev.some((item) => item.id === newItem.id);
                if (exists) return prev;
                return [newItem, ...prev];
              });
            } else if (payload.eventType === 'UPDATE') {
              const updatedItem = toCamelCase(payload.new) as T;
              setData((prev) =>
                prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
              );
            } else if (payload.eventType === 'DELETE') {
              const deletedId = (payload.old as any)?.id;
              if (deletedId) {
                setData((prev) => prev.filter((item) => item.id !== deletedId));
              }
            }
          }
        )
        .subscribe((status, err) => {
          if (err) {
            console.warn(`[Supabase Realtime] Channel ${channelName} status:`, status, err);
          }
        });

      channelRef.current = channel;
    } catch (realtimeErr) {
      console.warn(`[Supabase Realtime] Setup error for ${tableName}:`, realtimeErr);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel).catch(() => {});
        if (channelRef.current === channel) {
          channelRef.current = null;
        }
      }
    };
  }, [tableName, userId, fetchData]);

  // Insert or Update Item
  const addOrUpdateItem = async (item: T) => {
    if (!userId) return;
    try {
      const snakeObj = toSnakeCase({ ...item, userId });
      // If table is profiles, id is userId
      if (tableName === 'profiles') {
        snakeObj.id = userId;
      }

      let { error: upsertErr } = await supabase
        .from(tableName)
        .upsert(snakeObj, { onConflict: 'id' });

      // Self-healing fallback: if PostgreSQL schema cache doesn't have reels/sub_clients or new subscription columns yet, retry without them
      if (upsertErr && upsertErr.message && (upsertErr.message.includes('column') || upsertErr.message.includes('schema cache'))) {
        const fallbackObj = { ...snakeObj };
        delete fallbackObj.reels;
        delete fallbackObj.deliverables;
        delete fallbackObj.sub_clients;
        delete fallbackObj.subscription_status;
        delete fallbackObj.subscription_plan;
        delete fallbackObj.trial_started_at;
        delete fallbackObj.trial_ends_at;
        delete fallbackObj.current_period_start;
        delete fallbackObj.current_period_end;
        delete fallbackObj.last_payment_id;
        delete fallbackObj.last_payment_amount;
        const retry = await supabase.from(tableName).upsert(fallbackObj, { onConflict: 'id' });
        upsertErr = retry.error;
      }

      if (upsertErr) throw upsertErr;

      // Optimistic state update
      setData((prev) => {
        const index = prev.findIndex((i) => i.id === item.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = item;
          return updated;
        }
        return [item, ...prev];
      });
    } catch (err: any) {
      console.error(`[Supabase Error] Failed to save in ${tableName}:`, err);
      throw err;
    }
  };

  // Remove Item
  const removeItem = async (id: string) => {
    if (!userId) return;
    try {
      const { error: deleteErr } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (deleteErr) throw deleteErr;

      // Optimistic state update
      setData((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      console.error(`[Supabase Error] Failed to delete from ${tableName}:`, err);
      throw err;
    }
  };

  // Batch Replace All / Bulk Upsert
  const batchReplaceAll = async (items: T[]) => {
    if (!userId || items.length === 0) return;
    try {
      const snakeItems = items.map((item) => toSnakeCase({ ...item, userId }));
      let { error: batchErr } = await supabase
        .from(tableName)
        .upsert(snakeItems, { onConflict: 'id' });

      // Self-healing fallback for batch writes
      if (batchErr && batchErr.message && (batchErr.message.includes('column') || batchErr.message.includes('schema cache'))) {
        const fallbackItems = snakeItems.map((item: any) => {
          const c = { ...item };
          delete c.reels;
          delete c.deliverables;
          delete c.sub_clients;
          return c;
        });
        const retry = await supabase.from(tableName).upsert(fallbackItems, { onConflict: 'id' });
        batchErr = retry.error;
      }

      if (batchErr) throw batchErr;

      setData(items);
    } catch (err: any) {
      console.error(`[Supabase Error] Failed batch upsert in ${tableName}:`, err);
      throw err;
    }
  };

  return { data, loading, error, addOrUpdateItem, removeItem, batchReplaceAll, refetch: fetchData };
}
