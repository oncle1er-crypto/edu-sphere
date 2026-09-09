package ci.ecftech.edusphere;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeConfigurationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
