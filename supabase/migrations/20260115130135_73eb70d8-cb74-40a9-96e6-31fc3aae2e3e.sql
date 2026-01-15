-- Create app_settings table for system configurations
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid REFERENCES public.churches(id) ON DELETE CASCADE NOT NULL,
  setting_key varchar(100) NOT NULL,
  setting_value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(church_id, setting_key)
);

-- Create sync_history table for sync logs
CREATE TABLE public.sync_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid REFERENCES public.churches(id) ON DELETE CASCADE NOT NULL,
  user_id uuid,
  integration_id uuid NOT NULL,
  integration_type varchar(50) NOT NULL,
  records_inserted int DEFAULT 0,
  records_updated int DEFAULT 0,
  records_skipped int DEFAULT 0,
  status varchar(20) DEFAULT 'success',
  error_message text,
  sync_type varchar(20) DEFAULT 'manual',
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_app_settings_church ON public.app_settings(church_id);
CREATE INDEX idx_sync_history_church ON public.sync_history(church_id);
CREATE INDEX idx_sync_history_created ON public.sync_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for app_settings
CREATE POLICY "Admins can manage app settings"
ON public.app_settings FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) AND
  church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND
  church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can view app settings from their church"
ON public.app_settings FOR SELECT
USING (church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid()));

-- RLS policies for sync_history
CREATE POLICY "Admins and Tesoureiros can view sync history"
ON public.sync_history FOR SELECT
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'tesoureiro'::app_role)) AND
  church_id IN (SELECT church_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Service role can insert sync history"
ON public.sync_history FOR INSERT
WITH CHECK (true);

-- Trigger for updated_at on app_settings
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();