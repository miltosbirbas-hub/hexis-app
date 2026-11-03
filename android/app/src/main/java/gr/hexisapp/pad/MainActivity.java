package gr.hexisapp.pad;

import android.os.Bundle;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HexisGnssPlugin.class);
        super.onCreate(savedInstanceState);
        // Η οθόνη μένει αναμμένη στο πεδίο
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }
}
