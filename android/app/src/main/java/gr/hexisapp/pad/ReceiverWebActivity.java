package gr.hexisapp.pad;

import android.app.Activity;
import android.content.Context;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.webkit.HttpAuthHandler;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

/**
 * HEXIS PAD — η σελίδα ρυθμίσεων του δέκτη (μέσω του Wi-Fi του) μέσα στην εφαρμογή.
 * Η διεργασία δένεται προσωρινά στο Wi-Fi του δέκτη ώστε η σελίδα να ανοίγει ενώ τα δεδομένα κινητής μένουν ανοιχτά.
 */
public class ReceiverWebActivity extends Activity {
    static volatile Network boundNet = null;
    private WebView web;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        String url = getIntent().getStringExtra("url");
        String hint = getIntent().getStringExtra("hint");
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm != null && boundNet != null && Build.VERSION.SDK_INT >= 23) cm.bindProcessToNetwork(boundNet);
        } catch (Exception ignored) { }

        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setBackgroundColor(Color.WHITE);
        LinearLayout bar = new LinearLayout(this); bar.setOrientation(LinearLayout.HORIZONTAL); bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setBackgroundColor(Color.parseColor("#0052cc")); bar.setPadding(16, 12, 16, 12);
        Button back = new Button(this); back.setText("✕  Κλείσιμο"); back.setTextColor(Color.WHITE); back.setBackgroundColor(Color.parseColor("#1f6feb")); back.setTextSize(16);
        back.setOnClickListener(v -> finish());
        TextView title = new TextView(this); title.setText("Σελίδα δέκτη"); title.setTextColor(Color.WHITE); title.setTextSize(18); title.setPadding(24, 0, 0, 0);
        bar.addView(back); bar.addView(title);
        root.addView(bar, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));
        if (hint != null && !hint.isEmpty()) {
            TextView h = new TextView(this); h.setText(hint); h.setTextSize(15); h.setTextColor(Color.parseColor("#08101f")); h.setBackgroundColor(Color.parseColor("#fff4d6")); h.setPadding(24, 16, 24, 16);
            root.addView(h, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));
        }
        ProgressBar pb = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal); pb.setMax(100);
        root.addView(pb, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 8));
        web = new WebView(this);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setUseWideViewPort(true);
        web.getSettings().setLoadWithOverviewMode(true);
        web.getSettings().setBuiltInZoomControls(true);
        web.getSettings().setDisplayZoomControls(false);
        web.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        web.setWebChromeClient(new WebChromeClient() { @Override public void onProgressChanged(WebView v, int p) { pb.setProgress(p); pb.setVisibility(p >= 100 ? View.GONE : View.VISIBLE); } });
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) { return false; }
            @Override public void onReceivedSslError(WebView v, SslErrorHandler h, SslError e) { h.proceed(); } // τοπική συσκευή με αυτο-υπογεγραμμένο πιστοποιητικό
            @Override public void onReceivedHttpAuthRequest(WebView v, HttpAuthHandler h, String host, String realm) { h.proceed("admin", "admin"); }
        });
        root.addView(web, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));
        setContentView(root);
        web.loadUrl(url != null ? url : "http://192.168.10.12/");
    }

    @Override
    public void onBackPressed() { if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed(); }

    @Override
    protected void onDestroy() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm != null && Build.VERSION.SDK_INT >= 23) cm.bindProcessToNetwork(null);
        } catch (Exception ignored) { }
        try { if (web != null) web.destroy(); } catch (Exception ignored) { }
        super.onDestroy();
    }
}
