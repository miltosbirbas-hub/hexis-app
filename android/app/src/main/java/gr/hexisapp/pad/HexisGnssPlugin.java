package gr.hexisapp.pad;

import android.Manifest;
import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.os.Build;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.lang.reflect.Method;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * HEXIS PAD — σύνδεση με δέκτες GNSS / laser μέσω Bluetooth SPP ή TCP και πελάτης NTRIP
 * που προωθεί τις διορθώσεις RTCM στον δέκτη.
 */
@CapacitorPlugin(
    name = "HexisGnss",
    permissions = {
        @Permission(strings = { Manifest.permission.BLUETOOTH_CONNECT }, alias = "bt31")
    }
)
public class HexisGnssPlugin extends Plugin {

    private static final UUID SPP = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    private final Map<String, Conn> conns = new ConcurrentHashMap<>();
    private volatile Ntrip ntrip = null;
    private volatile String lastGga = "";

    // ---------- Κανάλι σύνδεσης ----------
    private class Conn {
        final String channel;
        volatile boolean running = true;
        BluetoothSocket bt;
        Socket tcp;
        InputStream in;
        OutputStream out;
        Thread reader;
        String name = "";

        Conn(String channel) { this.channel = channel; }

        synchronized void write(byte[] data, int len) throws IOException {
            if (out != null) { out.write(data, 0, len); out.flush(); }
        }

        void close() {
            running = false;
            try { if (in != null) in.close(); } catch (Exception ignored) { }
            try { if (out != null) out.close(); } catch (Exception ignored) { }
            try { if (bt != null) bt.close(); } catch (Exception ignored) { }
            try { if (tcp != null) tcp.close(); } catch (Exception ignored) { }
        }

        void startReader() {
            reader = new Thread(() -> {
                byte[] buf = new byte[4096];
                StringBuilder line = new StringBuilder();
                try {
                    while (running) {
                        int n = in.read(buf);
                        if (n < 0) break;
                        for (int i = 0; i < n; i++) {
                            int b = buf[i] & 0xFF;
                            if (b == '\n' || b == '\r') {
                                if (line.length() > 0) { emitLine(line.toString()); line.setLength(0); }
                            } else if (b >= 32 && b < 127) {
                                if (line.length() < 400) line.append((char) b);
                            } else if (b == '$') {
                                line.setLength(0); line.append('$');
                            } else {
                                // δυαδικά δεδομένα (π.χ. RTCM/UBX) — αγνοούνται
                                if (line.length() > 0 && line.charAt(0) != '$') line.setLength(0);
                            }
                        }
                    }
                } catch (IOException e) {
                    if (running) status(channel, "error", "Η σύνδεση διακόπηκε: " + e.getMessage());
                }
                if (running) {
                    running = false;
                    conns.remove(channel);
                    JSObject o = new JSObject();
                    o.put("channel", channel); o.put("state", "disconnected"); o.put("reason", "lost");
                    notifyListeners("status", o);
                }
            }, "hexis-" + channel);
            reader.setDaemon(true);
            reader.start();
        }

        void emitLine(String s) {
            if ("gnss".equals(channel) && s.startsWith("$") && s.length() > 6 && s.substring(3, 6).equals("GGA")) lastGga = s;
            JSObject o = new JSObject();
            o.put("channel", channel);
            o.put("line", s);
            notifyListeners("nmea", o);
        }
    }

    private void status(String channel, String state, String msg) {
        JSObject o = new JSObject();
        o.put("channel", channel); o.put("state", state);
        if (msg != null) o.put("message", msg);
        notifyListeners("status", o);
    }

    private BluetoothAdapter adapter() {
        BluetoothManager bm = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        return bm != null ? bm.getAdapter() : BluetoothAdapter.getDefaultAdapter();
    }

    private boolean hasBtPermission() {
        if (Build.VERSION.SDK_INT >= 31) return getPermissionState("bt31") == PermissionState.GRANTED;
        return true;
    }

    // ---------- Συζευγμένες συσκευές ----------
    @PluginMethod
    public void listPaired(PluginCall call) {
        if (!hasBtPermission()) { requestPermissionForAlias("bt31", call, "listPermCb"); return; }
        doList(call);
    }

    @PermissionCallback
    private void listPermCb(PluginCall call) {
        if (!hasBtPermission()) { call.reject("Δεν δόθηκε άδεια Bluetooth"); return; }
        doList(call);
    }

    @SuppressLint("MissingPermission")
    private void doList(PluginCall call) {
        BluetoothAdapter a = adapter();
        JSArray arr = new JSArray();
        if (a != null && a.isEnabled()) {
            Set<BluetoothDevice> set = a.getBondedDevices();
            if (set != null) for (BluetoothDevice d : set) {
                JSObject o = new JSObject();
                o.put("name", d.getName() == null ? "" : d.getName());
                o.put("address", d.getAddress());
                arr.put(o);
            }
        }
        JSObject r = new JSObject();
        r.put("devices", arr);
        r.put("enabled", a != null && a.isEnabled());
        call.resolve(r);
    }

    // ---------- Σύνδεση ----------
    @PluginMethod
    public void connect(PluginCall call) {
        String type = call.getString("type", "bt");
        if ("bt".equals(type) && !hasBtPermission()) { requestPermissionForAlias("bt31", call, "connectPermCb"); return; }
        doConnect(call);
    }

    @PermissionCallback
    private void connectPermCb(PluginCall call) {
        if (!hasBtPermission()) { call.reject("Δεν δόθηκε άδεια Bluetooth"); return; }
        doConnect(call);
    }

    private void doConnect(final PluginCall call) {
        final String channel = call.getString("channel", "gnss");
        final String type = call.getString("type", "bt");
        final String address = call.getString("address", "");
        final String host = call.getString("host", "");
        final int port = call.getInt("port", 0);
        Conn old = conns.remove(channel);
        if (old != null) old.close();
        new Thread(() -> {
            Conn c = new Conn(channel);
            try {
                status(channel, "connecting", null);
                if ("tcp".equals(type)) {
                    Socket s = new Socket();
                    s.connect(new InetSocketAddress(host, port), 8000);
                    s.setTcpNoDelay(true);
                    c.tcp = s; c.in = s.getInputStream(); c.out = s.getOutputStream(); c.name = host + ":" + port;
                } else {
                    c.bt = openBt(address);
                    c.in = c.bt.getInputStream(); c.out = c.bt.getOutputStream();
                    c.name = address;
                }
                conns.put(channel, c);
                c.startReader();
                JSObject o = new JSObject();
                o.put("channel", channel); o.put("state", "connected"); o.put("name", c.name);
                notifyListeners("status", o);
                call.resolve(o);
            } catch (Exception e) {
                c.close();
                status(channel, "error", e.getMessage());
                call.reject("Αποτυχία σύνδεσης: " + e.getMessage());
            }
        }, "hexis-connect").start();
    }

    @SuppressLint("MissingPermission")
    private BluetoothSocket openBt(String address) throws IOException {
        BluetoothAdapter a = adapter();
        if (a == null) throw new IOException("Η συσκευή δεν έχει Bluetooth");
        if (!a.isEnabled()) throw new IOException("Το Bluetooth είναι κλειστό");
        BluetoothDevice d = a.getRemoteDevice(address);
        try { a.cancelDiscovery(); } catch (Exception ignored) { }
        IOException last = null;
        // 1) ασφαλές SPP 2) μη ασφαλές SPP 3) απευθείας κανάλι 1 (παλιοί δέκτες)
        for (int attempt = 0; attempt < 3; attempt++) {
            BluetoothSocket s = null;
            try {
                if (attempt == 0) s = d.createRfcommSocketToServiceRecord(SPP);
                else if (attempt == 1) s = d.createInsecureRfcommSocketToServiceRecord(SPP);
                else {
                    Method m = d.getClass().getMethod("createRfcommSocket", int.class);
                    s = (BluetoothSocket) m.invoke(d, 1);
                }
                s.connect();
                return s;
            } catch (Exception e) {
                last = e instanceof IOException ? (IOException) e : new IOException(e.getMessage());
                try { if (s != null) s.close(); } catch (Exception ignored) { }
            }
        }
        throw last != null ? last : new IOException("Αποτυχία Bluetooth");
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        String channel = call.getString("channel", "gnss");
        Conn c = conns.remove(channel);
        if (c != null) c.close();
        call.resolve();
    }

    @PluginMethod
    public void write(PluginCall call) {
        String channel = call.getString("channel", "gnss");
        String data = call.getString("data", "");
        Conn c = conns.get(channel);
        if (c == null) { call.reject("Δεν υπάρχει σύνδεση στο κανάλι " + channel); return; }
        try {
            byte[] b = Base64.decode(data, Base64.DEFAULT);
            c.write(b, b.length);
            call.resolve();
        } catch (Exception e) { call.reject(e.getMessage()); }
    }

    // ---------- NTRIP ----------
    private class Ntrip extends Thread {
        final String host, mount, user, pass; final int port;
        volatile boolean running = true;
        volatile Socket sock;
        long bytes = 0;

        Ntrip(String host, int port, String mount, String user, String pass) {
            super("hexis-ntrip");
            this.host = host; this.port = port; this.mount = mount; this.user = user; this.pass = pass;
            setDaemon(true);
        }

        void ev(String state, String msg) {
            JSObject o = new JSObject();
            o.put("state", state); o.put("bytes", bytes);
            if (msg != null) o.put("message", msg);
            notifyListeners("ntrip", o);
        }

        void halt() { running = false; try { if (sock != null) sock.close(); } catch (Exception ignored) { } }

        @Override
        public void run() {
            int backoff = 2000;
            while (running) {
                try {
                    ev("connecting", host + ":" + port + "/" + mount);
                    Socket s = new Socket();
                    s.connect(new InetSocketAddress(host, port), 10000);
                    s.setSoTimeout(30000);
                    sock = s;
                    OutputStream out = s.getOutputStream();
                    InputStream in = s.getInputStream();
                    String auth = Base64.encodeToString((user + ":" + pass).getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
                    String req = "GET /" + mount + " HTTP/1.0\r\n" +
                        "User-Agent: NTRIP HexisPad/1.0\r\n" +
                        "Host: " + host + "\r\n" +
                        "Accept: */*\r\n" +
                        "Authorization: Basic " + auth + "\r\n" +
                        "Connection: close\r\n\r\n";
                    out.write(req.getBytes(StandardCharsets.US_ASCII)); out.flush();
                    String header = readHeader(in);
                    String first = header.split("\r?\n")[0];
                    if (first.contains("401")) { ev("error", "Λάθος χρήστης ή κωδικός (401)"); running = false; break; }
                    if (first.startsWith("SOURCETABLE")) { ev("error", "Λάθος mountpoint — ο caster επέστρεψε λίστα"); running = false; break; }
                    if (!first.contains("200")) { ev("error", "Απάντηση caster: " + first); throw new IOException(first); }
                    ev("connected", null);
                    backoff = 2000;
                    long lastGgaSent = 0, lastEv = 0;
                    byte[] buf = new byte[4096];
                    while (running) {
                        long now = System.currentTimeMillis();
                        if (now - lastGgaSent > 10000 && lastGga.length() > 10) {
                            out.write((lastGga + "\r\n").getBytes(StandardCharsets.US_ASCII)); out.flush();
                            lastGgaSent = now;
                        }
                        int n;
                        try { n = in.read(buf); } catch (java.net.SocketTimeoutException te) { throw new IOException("Δεν έρχονται διορθώσεις (timeout)"); }
                        if (n < 0) throw new IOException("Ο caster έκλεισε τη σύνδεση");
                        bytes += n;
                        Conn g = conns.get("gnss");
                        if (g != null) { try { g.write(buf, n); } catch (IOException ignored) { } }
                        if (now - lastEv > 1000) { lastEv = now; ev("data", null); }
                    }
                } catch (Exception e) {
                    if (!running) break;
                    ev("error", e.getMessage() + " — επανασύνδεση…");
                    try { Thread.sleep(backoff); } catch (InterruptedException ignored) { }
                    backoff = Math.min(backoff * 2, 30000);
                } finally {
                    try { if (sock != null) sock.close(); } catch (Exception ignored) { }
                }
            }
            ev("stopped", null);
        }
    }

    private static String readHeader(InputStream in) throws IOException {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        int prev3 = 0, prev2 = 0, prev1 = 0;
        while (b.size() < 8192) {
            int c = in.read();
            if (c < 0) break;
            b.write(c);
            if (c == '\n' && prev1 == '\r' && prev2 == '\n' && prev3 == '\r') break;
            // NTRIP v1: «ICY 200 OK\r\n» και μετά δεδομένα
            if (c == '\n' && b.size() < 40 && new String(b.toByteArray(), StandardCharsets.US_ASCII).startsWith("ICY 200")) break;
            prev3 = prev2; prev2 = prev1; prev1 = c;
        }
        return new String(b.toByteArray(), StandardCharsets.ISO_8859_1);
    }

    @PluginMethod
    public void ntripStart(PluginCall call) {
        if (ntrip != null) { ntrip.halt(); ntrip = null; }
        String host = call.getString("host", "");
        int port = call.getInt("port", 2101);
        String mount = call.getString("mount", "");
        String gga = call.getString("gga", "");
        if (gga != null && gga.length() > 10) lastGga = gga;
        if (host.isEmpty() || mount.isEmpty()) { call.reject("Λείπει host ή mountpoint"); return; }
        ntrip = new Ntrip(host, port, mount, call.getString("user", ""), call.getString("pass", ""));
        ntrip.start();
        call.resolve();
    }

    @PluginMethod
    public void ntripStop(PluginCall call) {
        if (ntrip != null) { ntrip.halt(); ntrip = null; }
        call.resolve();
    }

    @PluginMethod
    public void ntripSetGGA(PluginCall call) {
        String g = call.getString("gga", "");
        if (g != null && g.length() > 10) lastGga = g;
        call.resolve();
    }

    @PluginMethod
    public void ntripSourcetable(final PluginCall call) {
        final String host = call.getString("host", "");
        final int port = call.getInt("port", 2101);
        final String user = call.getString("user", "");
        final String pass = call.getString("pass", "");
        new Thread(() -> {
            try (Socket s = new Socket()) {
                s.connect(new InetSocketAddress(host, port), 10000);
                s.setSoTimeout(15000);
                String auth = Base64.encodeToString((user + ":" + pass).getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
                String req = "GET / HTTP/1.0\r\nUser-Agent: NTRIP HexisPad/1.0\r\nHost: " + host + "\r\n" +
                    (user.isEmpty() ? "" : "Authorization: Basic " + auth + "\r\n") + "\r\n";
                s.getOutputStream().write(req.getBytes(StandardCharsets.US_ASCII));
                InputStream in = s.getInputStream();
                ByteArrayOutputStream b = new ByteArrayOutputStream();
                byte[] buf = new byte[8192]; int n;
                while ((n = in.read(buf)) > 0) {
                    b.write(buf, 0, n);
                    if (b.size() > 2_000_000) break;
                    if (new String(buf, 0, n, StandardCharsets.ISO_8859_1).contains("ENDSOURCETABLE")) break;
                }
                String txt = new String(b.toByteArray(), StandardCharsets.ISO_8859_1);
                JSArray arr = new JSArray();
                for (String ln : txt.split("\r?\n")) {
                    if (!ln.startsWith("STR;")) continue;
                    String[] f = ln.split(";", -1);
                    JSObject o = new JSObject();
                    o.put("name", f.length > 1 ? f[1] : "");
                    o.put("id", f.length > 2 ? f[2] : "");
                    o.put("format", f.length > 3 ? f[3] : "");
                    o.put("lat", f.length > 9 ? f[9] : "");
                    o.put("lon", f.length > 10 ? f[10] : "");
                    arr.put(o);
                }
                JSObject r = new JSObject();
                r.put("mounts", arr);
                call.resolve(r);
            } catch (Exception e) {
                call.reject("Sourcetable: " + e.getMessage());
            }
        }, "hexis-srctable").start();
    }

    // ---------- Αρχεία από άλλες εφαρμογές («Άνοιγμα με» / «Κοινή χρήση») ----------
    private JSObject pendingFile = null;

    @Override
    public void load() {
        try { if (getActivity() != null) handleIntent(getActivity().getIntent()); } catch (Exception ignored) { }
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        Uri uri = null;
        String action = intent.getAction();
        if (Intent.ACTION_VIEW.equals(action)) uri = intent.getData();
        else if (Intent.ACTION_SEND.equals(action)) {
            Object o = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (o instanceof Uri) uri = (Uri) o;
            else {
                String txt = intent.getStringExtra(Intent.EXTRA_TEXT);
                if (txt != null && txt.length() > 0) {
                    JSObject f = new JSObject();
                    f.put("name", "Κοινόχρηστο κείμενο.txt"); f.put("mime", "text/plain");
                    f.put("data", Base64.encodeToString(txt.getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP));
                    deliver(f);
                }
                return;
            }
        }
        if (uri == null) return;
        final Uri u = uri;
        final String mime = intent.getType();
        new Thread(() -> {
            try {
                String name = "αρχείο";
                try (Cursor c = getContext().getContentResolver().query(u, null, null, null, null)) {
                    if (c != null && c.moveToFirst()) { int i = c.getColumnIndex(OpenableColumns.DISPLAY_NAME); if (i >= 0) name = c.getString(i); }
                } catch (Exception ignored) { }
                if ("αρχείο".equals(name) && u.getLastPathSegment() != null) name = u.getLastPathSegment();
                ByteArrayOutputStream b = new ByteArrayOutputStream();
                try (InputStream in = getContext().getContentResolver().openInputStream(u)) {
                    byte[] buf = new byte[65536]; int n;
                    while (in != null && (n = in.read(buf)) > 0) { b.write(buf, 0, n); if (b.size() > 80_000_000) throw new IOException("Πολύ μεγάλο αρχείο"); }
                }
                JSObject f = new JSObject();
                f.put("name", name); f.put("mime", mime == null ? "" : mime);
                f.put("data", Base64.encodeToString(b.toByteArray(), Base64.NO_WRAP));
                deliver(f);
            } catch (Exception e) {
                JSObject o = new JSObject(); o.put("channel", "file"); o.put("state", "error"); o.put("message", "Άνοιγμα αρχείου: " + e.getMessage());
                notifyListeners("status", o);
            }
        }, "hexis-open").start();
    }

    private void deliver(JSObject f) {
        pendingFile = f;
        if (hasListeners("fileOpen")) { notifyListeners("fileOpen", f); pendingFile = null; }
    }

    @PluginMethod
    public void getPendingFile(PluginCall call) {
        JSObject r = pendingFile != null ? pendingFile : new JSObject();
        pendingFile = null;
        call.resolve(r);
    }

    @Override
    protected void handleOnDestroy() {
        for (Conn c : conns.values()) c.close();
        conns.clear();
        if (ntrip != null) ntrip.halt();
        super.handleOnDestroy();
    }
}
