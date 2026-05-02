import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEcoleId } from "./useEcoleId";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export interface NotificationParent {
  id: string;
  ecole_id: string;
  eleve_id: string;
  type: string;
  canal: string;
  message: string | null;
  destinataire: string | null;
  envoye_par: string | null;
  date_envoi: string;
  created_at: string;
}

export function useNotificationsParents() {
  const { ecoleId } = useEcoleId();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationParent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!ecoleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications_parents" as any)
      .select("*")
      .eq("ecole_id", ecoleId)
      .order("date_envoi", { ascending: false })
      .limit(200);
    if (error) console.error(error);
    setNotifications((data as any as NotificationParent[]) ?? []);
    setLoading(false);
  }, [ecoleId]);

  const sendNotification = useCallback(async (params: {
    eleve_id: string;
    type: string;
    canal: string;
    message: string;
    destinataire: string;
  }) => {
    if (!ecoleId || !user) return false;
    const { error } = await supabase
      .from("notifications_parents" as any)
      .insert({
        ...params,
        ecole_id: ecoleId,
        envoye_par: user.id,
      } as any);
    if (error) { toast.error("Erreur envoi notification"); console.error(error); return false; }
    toast.success("Notification envoyée");
    await fetchNotifications();
    return true;
  }, [ecoleId, user, fetchNotifications]);

  return { notifications, loading, fetchNotifications, sendNotification };
}
