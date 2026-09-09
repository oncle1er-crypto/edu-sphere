package ci.ecftech.edusphere;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Reads generated Firebase resources without initializing Firebase. */
@CapacitorPlugin(name = "NativeConfiguration")
public class NativeConfigurationPlugin extends Plugin {
    static boolean hasPushConfiguration(Context context) {
        for (String name : new String[] { "google_app_id", "gcm_defaultSenderId", "google_api_key" }) {
            int id = context.getResources().getIdentifier(name, "string", context.getPackageName());
            if (id == 0 || context.getString(id).trim().isEmpty()) return false;
        }
        return true;
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("pushConfigured", hasPushConfiguration(getContext()));
        call.resolve(result);
    }
    @PluginMethod
    public void openUpdateDownload(PluginCall call) {
        String url = call.getString("url", "");
        if (!url.matches("https://gs-laprovidence\\.lovable\\.app/android/releases/la-providence-[0-9]+\\.[0-9]+\\.[0-9]+-[0-9]+\\.apk")) {
            call.reject("Adresse de téléchargement non autorisée.");
            return;
        }
        try {
            getActivity().startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
            call.resolve();
        } catch (RuntimeException error) {
            call.reject("Aucun navigateur disponible pour télécharger la mise à jour.");
        }
    }
}
