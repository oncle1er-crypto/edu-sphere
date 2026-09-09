import { useEffect, useRef, useState } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useEcoles } from "@/context/EcoleContext";
import { supabase } from "@/integrations/supabase/client";

const NativeConfiguration = registerPlugin<{
  getStatus(): Promise<{ pushConfigured: boolean }>;
}>("NativeConfiguration");

const isSafeInternalPath = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("/") && !value.startsWith("//");

/** Relie la session Web à l'app Android native, sans effet dans le navigateur. */
export function NativePushNotifications() {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const { user } = useAuth();
  const { currentEcoleId } = useEcoles();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;

    let disposed = false;
    const cleanups: Array<() => Promise<void>> = [];

    let registered = false;
    const initialization = (async () => {
      const { pushConfigured } = await NativeConfiguration.getStatus();
      if (disposed || !pushConfigured) return;

      const [{ PushNotifications }, { StatusBar, Style }] = await Promise.all([
        import("@capacitor/push-notifications"),
        import("@capacitor/status-bar"),
      ]);

      if (disposed) return;
      await StatusBar.setBackgroundColor({ color: "#7f1734" });
      await StatusBar.setStyle({ style: Style.Light });
      await PushNotifications.createChannel({
        id: "providence_generales",
        name: "Notifications La Providence",
        description: "Informations importantes de l'établissement",
        importance: 5,
        visibility: 1,
        vibration: true,
      });

      const registration = await PushNotifications.addListener("registration", ({ value }) => {
        if (!disposed) setToken(value);
      });
      cleanups.push(() => registration.remove());

      const registrationError = await PushNotifications.addListener("registrationError", (error) => {
        console.error("Échec de l'inscription aux notifications Android", error);
        toast.error("Les notifications Android n'ont pas pu être activées.");
      });
      cleanups.push(() => registrationError.remove());

      const received = await PushNotifications.addListener("pushNotificationReceived", (notification) => {
        toast(notification.title || "La Providence", {
          description: notification.body || "Vous avez reçu une nouvelle notification.",
        });
      });
      cleanups.push(() => received.remove());

      const action = await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
        const path = notification.data?.route;
        if (!disposed && isSafeInternalPath(path)) navigateRef.current(path);
      });
      cleanups.push(() => action.remove());

      if (disposed) return;
      let permission = await PushNotifications.checkPermissions();
      if (!disposed && permission.receive === "prompt") {
        permission = await PushNotifications.requestPermissions();
      }
      if (!disposed && permission.receive === "granted") {
        await PushNotifications.register();
        registered = true;
      }
    })().catch((error) => {
      console.error("Initialisation Android impossible", error);
    });

    return () => {
      disposed = true;
      void initialization.then(async () => {
        await Promise.allSettled(cleanups.map((remove) => remove()));
        if (registered) {
          const { PushNotifications } = await import("@capacitor/push-notifications");
          await PushNotifications.unregister();
        }
      }).catch((error) => console.error("Arrêt des notifications Android impossible", error));
    };
  }, [user?.id]);

  useEffect(() => {
    if (!token || !user?.id || !currentEcoleId) return;

    void (supabase.rpc as any)("enregistrer_appareil_notification", {
      _token: token,
      _ecole_id: currentEcoleId,
      _plateforme: "android",
    }).then(({ error }: { error?: { message: string } | null }) => {
      if (error) console.error("Enregistrement du téléphone impossible", error.message);
    });
  }, [token, user?.id, currentEcoleId]);

  return null;
}
