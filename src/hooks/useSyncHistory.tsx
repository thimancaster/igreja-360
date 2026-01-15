import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SyncHistoryEntry {
  id: string;
  church_id: string;
  user_id: string | null;
  integration_id: string;
  integration_type: string;
  records_inserted: number;
  records_updated: number;
  records_skipped: number;
  status: string;
  error_message: string | null;
  sync_type: string;
  created_at: string;
}

interface UseSyncHistoryOptions {
  limit?: number;
  syncType?: 'manual' | 'automatic' | 'all';
  status?: 'success' | 'error' | 'partial' | 'all';
}

export function useSyncHistory(options: UseSyncHistoryOptions = {}) {
  const { profile } = useAuth();
  const churchId = profile?.church_id;
  const { limit = 50, syncType = 'all', status = 'all' } = options;

  const { data: history, isLoading, refetch } = useQuery({
    queryKey: ['sync-history', churchId, limit, syncType, status],
    queryFn: async () => {
      if (!churchId) return [];

      let query = supabase
        .from('sync_history')
        .select('*')
        .eq('church_id', churchId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (syncType !== 'all') {
        query = query.eq('sync_type', syncType);
      }

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching sync history:', error);
        return [];
      }

      return data as SyncHistoryEntry[];
    },
    enabled: !!churchId,
  });

  const totals = history?.reduce(
    (acc, entry) => ({
      inserted: acc.inserted + (entry.records_inserted || 0),
      updated: acc.updated + (entry.records_updated || 0),
      skipped: acc.skipped + (entry.records_skipped || 0),
      totalSyncs: acc.totalSyncs + 1,
      successCount: acc.successCount + (entry.status === 'success' ? 1 : 0),
      errorCount: acc.errorCount + (entry.status === 'error' ? 1 : 0),
    }),
    { inserted: 0, updated: 0, skipped: 0, totalSyncs: 0, successCount: 0, errorCount: 0 }
  ) || { inserted: 0, updated: 0, skipped: 0, totalSyncs: 0, successCount: 0, errorCount: 0 };

  return {
    history: history || [],
    isLoading,
    refetch,
    totals,
  };
}
