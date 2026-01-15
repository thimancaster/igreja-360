import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AppSettings {
  sync_enabled: boolean;
  sync_interval_hours: number;
  last_auto_sync: string | null;
}

const DEFAULT_SETTINGS: AppSettings = {
  sync_enabled: false,
  sync_interval_hours: 6,
  last_auto_sync: null,
};

export function useAppSettings() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const churchId = profile?.church_id;

  const { data: settings, isLoading } = useQuery({
    queryKey: ['app-settings', churchId],
    queryFn: async () => {
      if (!churchId) return DEFAULT_SETTINGS;

      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value')
        .eq('church_id', churchId);

      if (error) {
        console.error('Error fetching app settings:', error);
        return DEFAULT_SETTINGS;
      }

      const settingsMap: Record<string, string> = {};
      data?.forEach((row) => {
        settingsMap[row.setting_key] = row.setting_value;
      });

      return {
        sync_enabled: settingsMap['sync_enabled'] === 'true',
        sync_interval_hours: parseInt(settingsMap['sync_interval_hours'] || '6', 10),
        last_auto_sync: settingsMap['last_auto_sync'] || null,
      };
    },
    enabled: !!churchId,
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      if (!churchId) throw new Error('Church ID not found');

      const { error } = await supabase
        .from('app_settings')
        .upsert(
          {
            church_id: churchId,
            setting_key: key,
            setting_value: value,
          },
          {
            onConflict: 'church_id,setting_key',
          }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings', churchId] });
    },
    onError: (error) => {
      console.error('Error updating setting:', error);
      toast.error('Erro ao salvar configuração');
    },
  });

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const updates: Promise<void>[] = [];

    if (newSettings.sync_enabled !== undefined) {
      updates.push(
        updateSettingMutation.mutateAsync({
          key: 'sync_enabled',
          value: String(newSettings.sync_enabled),
        })
      );
    }

    if (newSettings.sync_interval_hours !== undefined) {
      updates.push(
        updateSettingMutation.mutateAsync({
          key: 'sync_interval_hours',
          value: String(newSettings.sync_interval_hours),
        })
      );
    }

    await Promise.all(updates);
    toast.success('Configurações salvas com sucesso');
  };

  return {
    settings: settings || DEFAULT_SETTINGS,
    isLoading,
    updateSettings,
    isUpdating: updateSettingMutation.isPending,
  };
}
