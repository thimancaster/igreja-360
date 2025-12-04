-- Add DELETE policy to notifications table so users can dismiss their notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (user_id = auth.uid());