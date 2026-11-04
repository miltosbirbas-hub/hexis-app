package gr.hexisapp.pad;

import android.os.Bundle;
import android.os.Build;
import android.view.WindowManager;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HexisGnssPlugin.class);
        super.onCreate(savedInstanceState);
        // Η οθόνη μένει αναμμένη στο πεδίο
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        // Η μηχανή της σελίδας μένει σε προτεραιότητα και όταν η εφαρμογή δεν φαίνεται (π.χ. κατά τη διάρκεια κλήσης)
        try {
            if (Build.VERSION.SDK_INT >= 26 && getBridge() != null && getBridge().getWebView() != null)
                getBridge().getWebView().setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, false);
        } catch (Exception ignored) { }
    }

    @Override
    public void onPause() {
        super.onPause();
        // να μη σταματούν οι χρονομετρητές της σελίδας στο παρασκήνιο
        try { if (getBridge() != null && getBridge().getWebView() != null) getBridge().getWebView().resumeTimers(); } catch (Exception ignored) { }
    }
}
