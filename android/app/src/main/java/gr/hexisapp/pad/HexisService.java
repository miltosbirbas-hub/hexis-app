package gr.hexisapp.pad;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

import androidx.core.app.NotificationCompat;

/**
 * HEXIS PAD — υπηρεσία προσκηνίου: όσο υπάρχει σύνδεση με δέκτη / NTRIP / καταγραφή,
 * το Android δεν σταματά την εφαρμογή (κλήση, άλλη εφαρμογή, σβηστή οθόνη).
 */
public class HexisService extends Service {
    static final String CH = "hexis_pad_conn";
    static final int ID = 7101;
    private PowerManager.WakeLock wl;

    static void start(Context ctx, String text) {
        try {
            Intent i = new Intent(ctx, HexisService.class);
            i.putExtra("text", text);
            if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(i); else ctx.startService(i);
        } catch (Exception ignored) { }
    }

    static void stop(Context ctx) {
        try { ctx.stopService(new Intent(ctx, HexisService.class)); } catch (Exception ignored) { }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String text = intent != null && intent.getStringExtra("text") != null ? intent.getStringExtra("text") : "Σύνδεση με δέκτη ενεργή";
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm != null && nm.getNotificationChannel(CH) == null) {
            NotificationChannel c = new NotificationChannel(CH, "Σύνδεση δέκτη", NotificationManager.IMPORTANCE_LOW);
            c.setDescription("Η εφαρμογή συνεχίζει να δουλεύει στο παρασκήνιο (π.χ. κατά τη διάρκεια κλήσης)");
            c.setShowBadge(false);
            nm.createNotificationChannel(c);
        }
        Intent open = new Intent(this, MainActivity.class);
        open.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        PendingIntent pi = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification n = new NotificationCompat.Builder(this, CH)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("HEXIS PAD")
            .setContentText(text)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(pi)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build();
        try {
            if (Build.VERSION.SDK_INT >= 29) startForeground(ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE);
            else startForeground(ID, n);
        } catch (Exception e) {
            try { startForeground(ID, n); } catch (Exception ignored) { }
        }
        if (wl == null) {
            try {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "hexispad:conn");
                wl.setReferenceCounted(false);
                wl.acquire(12 * 60 * 60 * 1000L);
            } catch (Exception ignored) { }
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        try { if (wl != null && wl.isHeld()) wl.release(); } catch (Exception ignored) { }
        wl = null;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
