package ci.ecftech.edusphere;

import static org.junit.Assert.*;
import android.content.Intent;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

@RunWith(AndroidJUnit4.class)
public class NativeConfigurationTest {
    @Test
    public void configurationCheckCrossesNativeBridgeWithoutCrashing() throws Exception {
        var instrumentation = InstrumentationRegistry.getInstrumentation();
        var context = instrumentation.getTargetContext();
        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        MainActivity activity = (MainActivity) instrumentation.startActivitySync(intent);
        try {
            assertNotNull(activity.getBridge().getPlugin("NativeConfiguration"));
            boolean expected = NativeConfigurationPlugin.hasPushConfiguration(context);
            String value = "null";
            for (int attempt = 0; attempt < 100; attempt++) {
                CountDownLatch latch = new CountDownLatch(1);
                AtomicReference<String> result = new AtomicReference<>();
                activity.runOnUiThread(() -> activity.getBridge().getWebView().evaluateJavascript(
                    "(function(){if(window.Capacitor && window.Capacitor.Plugins.NativeConfiguration && !window.__configurationStarted){window.__configurationStarted=true;window.Capacitor.Plugins.NativeConfiguration.getStatus().then(s=>window.__configurationResult=s.pushConfigured).catch(()=>window.__configurationResult='error');}return window.__configurationResult;})()",
                    v -> { result.set(v); latch.countDown(); }
                ));
                assertTrue("WebView callback timed out", latch.await(5, TimeUnit.SECONDS));
                value = result.get();
                if ("true".equals(value) || "false".equals(value) || "\"error\"".equals(value)) break;
                Thread.sleep(100);
            }
            assertEquals(Boolean.toString(expected), value);
            assertFalse(activity.isFinishing());
        } finally {
            activity.runOnUiThread(activity::finish);
        }
    }
}
