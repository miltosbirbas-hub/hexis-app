package gr.hexisapp.pad;

import android.Manifest;
import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothSocket;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothProfile;
import android.content.Context;
import android.content.Intent;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileOutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.provider.DocumentsContract;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.annotation.ActivityCallback;
import java.util.ArrayList;
import java.util.Locale;
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
        @Permission(strings = { Manifest.permission.BLUETOOTH_CONNECT }, alias = "bt31"),
        @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "mic")
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
        BluetoothGatt gatt;                     // σύνδεση BLE (σειριακή μεταφορά πάνω από Bluetooth Low Energy)
        BluetoothGattCharacteristic bleRx;
        volatile int bleMtu = 23;
        private final StringBuilder line = new StringBuilder();
        InputStream in;
        OutputStream out;
        Thread reader;
        String name = "";
        volatile long bytesIn = 0, linesIn = 0;
        volatile long lastRealGga = 0;
        private boolean synth = false;
        // θέση από δυαδικά/ειδικά πρωτόκολλα (Unicore, NovAtel, u-blox) όταν ο δέκτης δεν στέλνει NMEA
        final GnssDecoder dec = new GnssDecoder(l -> {
            if (System.currentTimeMillis() - lastRealGga < 3000) return; // υπάρχει κανονικό NMEA — δεν διπλασιάζουμε
            synth = true; try { emitLine(l); } finally { synth = false; }
        });

        Conn(String channel) { this.channel = channel; }

        @SuppressLint("MissingPermission")
        synchronized void write(byte[] data, int len) throws IOException {
            if (gatt != null) {
                if (bleRx == null) throw new IOException("BLE: χωρίς κανάλι εγγραφής");
                int chunk = Math.max(20, bleMtu - 3);
                boolean noResp = (bleRx.getProperties() & BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE) != 0;
                bleRx.setWriteType(noResp ? BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE : BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT);
                for (int o = 0; o < len; o += chunk) {
                    byte[] part = java.util.Arrays.copyOfRange(data, o, Math.min(len, o + chunk));
                    bleRx.setValue(part);
                    boolean ok = false;
                    for (int k = 0; k < 20 && !ok; k++) { ok = gatt.writeCharacteristic(bleRx); if (!ok) { try { Thread.sleep(25); } catch (InterruptedException ignored) { } } }
                    try { Thread.sleep(noResp ? 15 : 40); } catch (InterruptedException ignored) { }
                }
                return;
            }
            if (out != null) { out.write(data, 0, len); out.flush(); }
        }

        void close() {
            running = false;
            try { if (in != null) in.close(); } catch (Exception ignored) { }
            try { if (out != null) out.close(); } catch (Exception ignored) { }
            try { if (bt != null) bt.close(); } catch (Exception ignored) { }
            try { if (tcp != null) tcp.close(); } catch (Exception ignored) { }
            try { if (gatt != null) { gatt.disconnect(); gatt.close(); } } catch (Exception ignored) { }
        }

        // κοινή επεξεργασία εισερχόμενων bytes (κλασικό Bluetooth, TCP, BLE)
        void onBytes(byte[] buf, int n) {
            bytesIn += n;
            if ("gnss".equals(channel)) { try { dec.feed(buf, n); } catch (Exception ignored) { } }
            ByteArrayOutputStream sn = sniff;
            if (sn != null && "gnss".equals(channel) && sn.size() < 4096) { synchronized (sn) { sn.write(buf, 0, Math.min(n, 4096 - sn.size())); } }
            if ("gnss".equals(channel) && rawOut != null) {
                try { rawOut.write(buf, 0, n); rawBytes += n; } catch (Exception ignored) { }
            }
            synchronized (line) {
                for (int i = 0; i < n; i++) {
                    int b = buf[i] & 0xFF;
                    if (b == '\n' || b == '\r') {
                        if (line.length() > 0) { linesIn++; emitLine(line.toString()); line.setLength(0); }
                    } else if (b >= 32 && b < 127) {
                        if (line.length() < 400) line.append((char) b);
                    } else if (b == '$') {
                        line.setLength(0); line.append('$');
                    } else {
                        if (line.length() > 0 && line.charAt(0) != '$') line.setLength(0);
                    }
                }
            }
        }

        void startReader() {
            reader = new Thread(() -> {
                byte[] buf = new byte[4096];
                try {
                    while (running) {
                        int n = in.read(buf);
                        if (n < 0) break;
                        onBytes(buf, n);
                    }
                } catch (IOException e) {
                    if (running) status(channel, "error", "Η σύνδεση διακόπηκε: " + e.getMessage());
                }
                if (running) {
                    running = false;
                    conns.remove(channel);
                    // η υπηρεσία μένει: η αυτόματη επανασύνδεση γίνεται και στο παρασκήνιο
                    JSObject o = new JSObject();
                    o.put("channel", channel); o.put("state", "disconnected"); o.put("reason", "lost");
                    notifyListeners("status", o);
                }
            }, "hexis-" + channel);
            reader.setDaemon(true);
            reader.start();
        }

        long lastGgaEmit = 0, lastAttEmit = 0, lastHashEmit = 0;
        void emitLine(String s) {
            if ("gnss".equals(channel) && diagAll) { JSObject o = new JSObject(); o.put("channel", channel); o.put("line", s); notifyListeners("nmea", o); return; }
            if ("gnss".equals(channel) && s.startsWith("#BEST")) { if (System.currentTimeMillis() - lastRealGga >= 3000) dec.ascii(s); return; }
            if ("gnss".equals(channel) && s.startsWith("$") && s.length() > 6) {
                String t = s.substring(3, 6);
                if (t.equals("GGA") && !synth) lastRealGga = System.currentTimeMillis();
                if (t.equals("GGA")) { lastGga = s; long now = System.currentTimeMillis(); if (now - lastGgaEmit < 95) return; lastGgaEmit = now; }
                // προς την οθόνη μόνο ό,τι χρειάζεται — προστασία από «πλημμύρα» δεδομένων στα 10–20 Hz
                else if (t.equals("GSV")) { String[] f = s.split(",", 4); if (f.length < 3 || !"1".equals(f[2])) return; }
                else if (s.startsWith("$P") || t.equals("HPD") || t.equals("HPR")) {
                    // στάση/κλίση από IMU δέκτη (PASHR, PSAT HPR, PTNL AVR, HPD): έως 5 Hz
                    long now = System.currentTimeMillis(); if (now - lastAttEmit < 190) return; lastAttEmit = now;
                }
                else if (!(t.equals("GST") || t.equals("GSA") || t.equals("RMC") || t.equals("VTG") || t.equals("HDT") || t.equals("TIT"))) return;
            }
            if ("gnss".equals(channel) && s.startsWith("#")) {
                // μηνύματα κατάστασης κλίσης τύπου Unicore (#SLANT…): έως 2 Hz, τα υπόλοιπα όχι
                if (!s.startsWith("#SLANT")) return;
                long now = System.currentTimeMillis(); if (now - lastHashEmit < 450) return; lastHashEmit = now;
            }
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
        if (("bt".equals(type) || "ble".equals(type)) && !hasBtPermission()) { requestPermissionForAlias("bt31", call, "connectPermCb"); return; }
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
                    Socket s = localSocket();
                    s.connect(new InetSocketAddress(host, port), 8000);
                    s.setTcpNoDelay(true);
                    c.tcp = s; c.in = s.getInputStream(); c.out = s.getOutputStream(); c.name = host + ":" + port;
                } else if ("ble".equals(type)) {
                    conns.put(channel, c);
                    openBle(c, address);
                    c.name = address + " (BLE)";
                } else {
                    c.bt = openBt(address);
                    c.in = c.bt.getInputStream(); c.out = c.bt.getOutputStream();
                    c.name = address;
                }
                conns.put(channel, c);
                if (c.gatt == null) c.startReader();
                updateService();
                JSObject o = new JSObject();
                o.put("channel", channel); o.put("state", "connected"); o.put("name", c.name);
                notifyListeners("status", o);
                call.resolve(o);
            } catch (Exception e) {
                c.close();
                conns.remove(channel, c);
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


    // ---------- Bluetooth Low Energy: σειριακή μεταφορά (UART) που χρησιμοποιούν πολλοί δέκτες ----------
    private static final String[][] BLE_UART = {
        // { service, notify (δέκτης → κινητό), write (κινητό → δέκτης) }
        { "6e400001-b5a3-f393-e0a9-e50e24dcca9e", "6e400003-b5a3-f393-e0a9-e50e24dcca9e", "6e400002-b5a3-f393-e0a9-e50e24dcca9e" }, // Nordic UART
        { "49535343-fe7d-4ae5-8fa9-9fafd205e455", "49535343-1e4d-4bd9-ba61-23c647249616", "49535343-8841-43f4-a8d4-ecbe34729bb3" }, // Microchip/ISSC
        { "2456e1b9-26e2-8f83-e744-f34f01e9d701", "2456e1b9-26e2-8f83-e744-f34f01e9d703", "2456e1b9-26e2-8f83-e744-f34f01e9d703" }, // u-blox SPS
        { "0000ffe0-0000-1000-8000-00805f9b34fb", "0000ffe1-0000-1000-8000-00805f9b34fb", "0000ffe1-0000-1000-8000-00805f9b34fb" }, // HM-10 / CC254x
        { "0000fff0-0000-1000-8000-00805f9b34fb", "0000fff1-0000-1000-8000-00805f9b34fb", "0000fff2-0000-1000-8000-00805f9b34fb" },
    };
    private static final UUID CCCD = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");

    @SuppressLint("MissingPermission")
    private void openBle(final Conn c, String address) throws IOException {
        BluetoothAdapter a = adapter();
        if (a == null) throw new IOException("Η συσκευή δεν έχει Bluetooth");
        if (!a.isEnabled()) throw new IOException("Το Bluetooth είναι κλειστό");
        BluetoothDevice d = a.getRemoteDevice(address);
        final java.util.concurrent.CountDownLatch ready = new java.util.concurrent.CountDownLatch(1);
        final String[] err = { null };
        BluetoothGattCallback cb = new BluetoothGattCallback() {
            @Override public void onConnectionStateChange(BluetoothGatt g, int st, int state) {
                if (state == BluetoothProfile.STATE_CONNECTED) { g.discoverServices(); }
                else if (state == BluetoothProfile.STATE_DISCONNECTED) {
                    if (ready.getCount() > 0) { err[0] = "BLE: η σύνδεση απέτυχε (" + st + ")"; ready.countDown(); }
                    else if (c.running) {
                        c.running = false; conns.remove(c.channel);
                        JSObject o = new JSObject(); o.put("channel", c.channel); o.put("state", "disconnected"); o.put("reason", "lost"); notifyListeners("status", o);
                    }
                }
            }
            @Override public void onServicesDiscovered(BluetoothGatt g, int st) {
                BluetoothGattCharacteristic tx = null, rx = null;
                for (String[] k : BLE_UART) {
                    BluetoothGattService sv = g.getService(UUID.fromString(k[0]));
                    if (sv != null) { tx = sv.getCharacteristic(UUID.fromString(k[1])); rx = sv.getCharacteristic(UUID.fromString(k[2])); if (tx != null) break; }
                }
                if (tx == null) { // γενική αναζήτηση: πρώτο κανάλι ειδοποιήσεων εκτός των τυπικών υπηρεσιών
                    for (BluetoothGattService sv : g.getServices()) {
                        String u = sv.getUuid().toString();
                        if (u.startsWith("00001800") || u.startsWith("00001801") || u.startsWith("0000180a") || u.startsWith("0000180f") || u.startsWith("00001805")) continue;
                        for (BluetoothGattCharacteristic ch : sv.getCharacteristics()) {
                            int p = ch.getProperties();
                            if (tx == null && (p & (BluetoothGattCharacteristic.PROPERTY_NOTIFY | BluetoothGattCharacteristic.PROPERTY_INDICATE)) != 0) tx = ch;
                            if (rx == null && (p & (BluetoothGattCharacteristic.PROPERTY_WRITE | BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE)) != 0) rx = ch;
                        }
                        if (tx != null) break;
                    }
                }
                if (tx == null) { err[0] = "BLE: δεν βρέθηκε κανάλι δεδομένων"; ready.countDown(); return; }
                c.bleRx = rx;
                g.setCharacteristicNotification(tx, true);
                BluetoothGattDescriptor ds = tx.getDescriptor(CCCD);
                if (ds != null) {
                    boolean ind = (tx.getProperties() & BluetoothGattCharacteristic.PROPERTY_NOTIFY) == 0;
                    ds.setValue(ind ? BluetoothGattDescriptor.ENABLE_INDICATION_VALUE : BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);
                    if (!g.writeDescriptor(ds)) ready.countDown();
                } else ready.countDown();
            }
            @Override public void onDescriptorWrite(BluetoothGatt g, BluetoothGattDescriptor ds, int st) {
                ready.countDown();
                try { g.requestMtu(247); } catch (Exception ignored) { }
            }
            @Override public void onMtuChanged(BluetoothGatt g, int mtu, int st) { if (st == BluetoothGatt.GATT_SUCCESS) c.bleMtu = mtu; }
            @Override public void onCharacteristicChanged(BluetoothGatt g, BluetoothGattCharacteristic ch) {
                byte[] v = ch.getValue(); if (v != null && v.length > 0) c.onBytes(v, v.length);
            }
            @Override public void onCharacteristicChanged(BluetoothGatt g, BluetoothGattCharacteristic ch, byte[] v) {
                if (v != null && v.length > 0) c.onBytes(v, v.length);
            }
        };
        c.gatt = Build.VERSION.SDK_INT >= 23 ? d.connectGatt(getContext(), false, cb, BluetoothDevice.TRANSPORT_LE) : d.connectGatt(getContext(), false, cb);
        try { if (!ready.await(15, java.util.concurrent.TimeUnit.SECONDS)) err[0] = "BLE: δεν απάντησε ο δέκτης"; } catch (InterruptedException e) { err[0] = "BLE: διακοπή"; }
        if (err[0] != null) { try { c.gatt.disconnect(); c.gatt.close(); } catch (Exception ignored) { } c.gatt = null; throw new IOException(err[0]); }
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        String channel = call.getString("channel", "gnss");
        Conn c = conns.remove(channel);
        if (c != null) c.close();
        updateService();
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
                    Socket s = internetSocket();
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
        updateService();
        call.resolve();
    }

    @PluginMethod
    public void ntripStop(PluginCall call) {
        if (ntrip != null) { ntrip.halt(); ntrip = null; }
        updateService();
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
            try (Socket s = internetSocket()) {
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
            try { deliver(readUri(u, mime)); } catch (Exception e) {
                JSObject o = new JSObject(); o.put("channel", "file"); o.put("state", "error"); o.put("message", "Άνοιγμα αρχείου: " + e.getMessage());
                notifyListeners("status", o);
            }
        }, "hexis-open").start();
    }


    private JSObject readUri(Uri u, String mime) throws Exception {
        String name = "αρχείο";
        try (Cursor c = getContext().getContentResolver().query(u, null, null, null, null)) {
            if (c != null && c.moveToFirst()) { int i = c.getColumnIndex(OpenableColumns.DISPLAY_NAME); if (i >= 0) name = c.getString(i); }
        } catch (Exception ignored) { }
        if ("αρχείο".equals(name) && u.getLastPathSegment() != null) name = u.getLastPathSegment();
        if (mime == null) { try { mime = getContext().getContentResolver().getType(u); } catch (Exception ignored) { } }
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        try (InputStream in = getContext().getContentResolver().openInputStream(u)) {
            byte[] buf = new byte[65536]; int n;
            while (in != null && (n = in.read(buf)) > 0) { b.write(buf, 0, n); if (b.size() > 80_000_000) throw new IOException("Πολύ μεγάλο αρχείο"); }
        }
        JSObject f = new JSObject();
        f.put("name", name); f.put("mime", mime == null ? "" : mime);
        f.put("data", Base64.encodeToString(b.toByteArray(), Base64.NO_WRAP));
        return f;
    }

    // ---------- Επιλογή αρχείου: ανοίγει κατευθείαν στις «Λήψεις» ----------
    @PluginMethod
    public void pickFile(PluginCall call) {
        Intent it = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        it.addCategory(Intent.CATEGORY_OPENABLE);
        it.setType("*/*");
        if (Build.VERSION.SDK_INT >= 26) {
            try { it.putExtra(DocumentsContract.EXTRA_INITIAL_URI, Uri.parse("content://com.android.externalstorage.documents/document/primary%3ADownload")); } catch (Exception ignored) { }
        }
        startActivityForResult(call, it, "pickResult");
    }

    @ActivityCallback
    private void pickResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != android.app.Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) { call.resolve(new JSObject()); return; }
        final Uri u = result.getData().getData();
        new Thread(() -> {
            try { call.resolve(readUri(u, null)); } catch (Exception e) { call.reject("Άνοιγμα αρχείου: " + e.getMessage()); }
        }, "hexis-pick").start();
    }

    // ---------- Φωνητικές εντολές (συνεχής ακρόαση) και φωνητική επιβεβαίωση ----------
    private SpeechRecognizer sr = null;
    private volatile boolean listening = false;
    private String voiceLang = "el-GR";
    private int voiceSeq = 0;
    private final Handler main = new Handler(Looper.getMainLooper());
    private TextToSpeech tts = null;
    private boolean ttsReady = false;

    @PluginMethod
    public void voiceStart(PluginCall call) {
        voiceLang = call.getString("lang", "el-GR");
        if (getPermissionState("mic") != PermissionState.GRANTED) { requestPermissionForAlias("mic", call, "micPermCb"); return; }
        startVoice(call);
    }

    @PermissionCallback
    private void micPermCb(PluginCall call) {
        if (getPermissionState("mic") != PermissionState.GRANTED) { call.reject("Δεν δόθηκε άδεια μικροφώνου"); return; }
        startVoice(call);
    }

    private void startVoice(PluginCall call) {
        if (!SpeechRecognizer.isRecognitionAvailable(getContext())) { call.reject("Η συσκευή δεν έχει υπηρεσία αναγνώρισης φωνής (Google)"); return; }
        listening = true;
        main.post(this::listenOnce);
        call.resolve();
    }

    private void voiceEv(String type, String text, boolean partial) {
        JSObject o = new JSObject(); o.put("type", type); o.put("text", text == null ? "" : text); o.put("partial", partial); o.put("seq", voiceSeq);
        notifyListeners("voice", o);
    }

    private void listenOnce() {
        if (!listening) return;
        try {
            if (sr == null) {
                sr = SpeechRecognizer.createSpeechRecognizer(getContext());
                sr.setRecognitionListener(new RecognitionListener() {
                    public void onReadyForSpeech(Bundle b) { voiceEv("ready", null, false); }
                    public void onBeginningOfSpeech() { }
                    public void onRmsChanged(float v) { }
                    public void onBufferReceived(byte[] b) { }
                    public void onEndOfSpeech() { }
                    public void onEvent(int t, Bundle b) { }
                    public void onPartialResults(Bundle b) {
                        ArrayList<String> r = b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        if (r != null && !r.isEmpty()) voiceEv("text", android.text.TextUtils.join(" | ", r), true);
                    }
                    public void onResults(Bundle b) {
                        ArrayList<String> r = b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        if (r != null && !r.isEmpty()) voiceEv("text", android.text.TextUtils.join(" | ", r), false);
                        restart(150);
                    }
                    public void onError(int e) {
                        if (e == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) { listening = false; voiceEv("error", "Δεν υπάρχει άδεια μικροφώνου", false); return; }
                        restart(e == SpeechRecognizer.ERROR_RECOGNIZER_BUSY || e == SpeechRecognizer.ERROR_CLIENT ? 1200 : 250);
                    }
                });
            }
            voiceSeq++;
            Intent it = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            it.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            it.putExtra(RecognizerIntent.EXTRA_LANGUAGE, voiceLang);
            it.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            it.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
            it.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
            it.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getContext().getPackageName());
            sr.startListening(it);
        } catch (Exception ex) {
            try { if (sr != null) sr.destroy(); } catch (Exception ignored) { }
            sr = null; restart(1500);
        }
    }

    private void restart(long ms) {
        if (!listening) return;
        main.postDelayed(() -> { try { if (sr != null) sr.cancel(); } catch (Exception ignored) { } listenOnce(); }, ms);
    }

    @PluginMethod
    public void voiceStop(PluginCall call) {
        listening = false;
        main.post(() -> { try { if (sr != null) { sr.cancel(); sr.destroy(); } } catch (Exception ignored) { } sr = null; });
        call.resolve();
    }

    @PluginMethod
    public void speak(PluginCall call) {
        final String text = call.getString("text", "");
        final String lang = call.getString("lang", "el-GR");
        call.resolve();
        main.post(() -> {
            try {
                if (tts == null) {
                    tts = new TextToSpeech(getContext(), st -> { ttsReady = st == TextToSpeech.SUCCESS; if (ttsReady) say(text, lang); });
                } else if (ttsReady) say(text, lang);
            } catch (Exception ignored) { }
        });
    }

    private void say(String text, String lang) {
        try {
            android.media.AudioManager am = (android.media.AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            if (am != null && (am.getMode() == android.media.AudioManager.MODE_IN_CALL || am.getMode() == android.media.AudioManager.MODE_IN_COMMUNICATION || am.getMode() == android.media.AudioManager.MODE_RINGTONE)) return; // όχι φωνή μέσα σε κλήση
            tts.setLanguage(Locale.forLanguageTag(lang));
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "hexis");
        } catch (Exception ignored) { }
    }


    // ---------- Υπηρεσία προσκηνίου: λειτουργία στο παρασκήνιο (κλήση, άλλη εφαρμογή) ----------
    private boolean svcOn = false;
    private synchronized void updateService() {
        boolean need = !conns.isEmpty() || ntrip != null || rawOut != null;
        try {
            if (need) {
                StringBuilder t = new StringBuilder();
                if (conns.containsKey("gnss")) t.append("Δέκτης συνδεδεμένος");
                if (conns.containsKey("base")) t.append(t.length() > 0 ? " · " : "").append("Βάση");
                if (conns.containsKey("laser")) t.append(t.length() > 0 ? " · " : "").append("Laser");
                if (ntrip != null) t.append(t.length() > 0 ? " · " : "").append("NTRIP");
                if (rawOut != null) t.append(t.length() > 0 ? " · " : "").append("Static σε εξέλιξη");
                HexisService.start(getContext(), t.length() > 0 ? t.toString() : "Σε λειτουργία");
                svcOn = true;
            } else if (svcOn) { HexisService.stop(getContext()); svcOn = false; }
        } catch (Exception ignored) { }
    }

    @PluginMethod
    public void notifPermission(PluginCall call) {
        // Android 13+: άδεια ειδοποιήσεων ώστε να φαίνεται η ειδοποίηση «HEXIS PAD σε λειτουργία»
        if (Build.VERSION.SDK_INT >= 33 && getActivity() != null &&
            androidx.core.content.ContextCompat.checkSelfPermission(getContext(), "android.permission.POST_NOTIFICATIONS") != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            try { androidx.core.app.ActivityCompat.requestPermissions(getActivity(), new String[] { "android.permission.POST_NOTIFICATIONS" }, 7102); } catch (Exception ignored) { }
        }
        call.resolve();
    }

    // ---------- Static: καταγραφή όλων των δεδομένων του δέκτη (για μεταγενέστερη επεξεργασία) ----------
    private volatile OutputStream rawOut = null;

    // ---------- Διάγνωση: δείγμα των ακατέργαστων δεδομένων του δέκτη ----------
    private volatile ByteArrayOutputStream sniff = null;
    private volatile boolean diagAll = false;

    @PluginMethod
    public void sniff(final PluginCall call) {
        final int ms = Math.max(500, Math.min(10000, call.getInt("ms", 3000)));
        new Thread(() -> {
            ByteArrayOutputStream b = new ByteArrayOutputStream();
            sniff = b; diagAll = true;
            try { Thread.sleep(ms); } catch (InterruptedException ignored) { }
            sniff = null; diagAll = false;
            byte[] d; synchronized (b) { d = b.toByteArray(); }
            StringBuilder hex = new StringBuilder(), asc = new StringBuilder();
            for (int i = 0; i < d.length; i++) {
                int v = d[i] & 0xFF;
                if (i < 512) { hex.append(String.format("%02X", v)); hex.append(i % 16 == 15 ? '\n' : ' '); }
                if (v == 10 || v == 13) asc.append('\n'); else asc.append(v >= 32 && v < 127 ? (char) v : '·');
            }
            JSObject o = new JSObject();
            o.put("n", d.length); o.put("hex", hex.toString()); o.put("ascii", asc.length() > 3000 ? asc.substring(0, 3000) : asc.toString());
            o.put("b64", Base64.encodeToString(d, Base64.NO_WRAP));
            call.resolve(o);
        }, "hexis-sniff").start();
    }
    private volatile long rawBytes = 0;
    private File rawFile = null;
    private String rawName = null;

    @PluginMethod
    public void rawLogStart(PluginCall call) {
        try {
            if (rawOut != null) { try { rawOut.close(); } catch (Exception ignored) { } rawOut = null; }
            rawName = call.getString("name", "static.gnss").replaceAll("[\\\\/:*?\"<>|]", "_");
            File dir = new File(getContext().getExternalFilesDir(null), "Static"); dir.mkdirs();
            rawFile = new File(dir, rawName);
            rawBytes = 0;
            rawOut = new java.io.BufferedOutputStream(new FileOutputStream(rawFile), 65536);
            updateService();
            call.resolve();
        } catch (Exception e) { call.reject("Καταγραφή static: " + e.getMessage()); }
    }

    @PluginMethod
    public void rawLogStatus(PluginCall call) {
        JSObject o = new JSObject(); o.put("bytes", rawBytes); o.put("on", rawOut != null); call.resolve(o);
    }

    @PluginMethod
    public void rawLogStop(PluginCall call) {
        new Thread(() -> {
            JSObject o = new JSObject();
            try {
                OutputStream r = rawOut; rawOut = null;
                if (r != null) { r.flush(); r.close(); }
                updateService();
                o.put("bytes", rawBytes);
                if (rawFile == null || !rawFile.exists()) { call.resolve(o); return; }
                o.put("file", rawFile.getAbsolutePath());
                // αντίγραφο στα Έγγραφα/HEXIS PAD/Static — ορατό από τη Διαχείριση αρχείων και τον υπολογιστή
                String shown = null;
                try {
                    if (Build.VERSION.SDK_INT >= 29) {
                        android.content.ContentValues cv = new android.content.ContentValues();
                        cv.put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, rawName);
                        cv.put(android.provider.MediaStore.MediaColumns.MIME_TYPE, "application/octet-stream");
                        cv.put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH, "Documents/HEXIS PAD/Static");
                        Uri dst = getContext().getContentResolver().insert(android.provider.MediaStore.Files.getContentUri("external"), cv);
                        if (dst != null) {
                            try (InputStream in = new java.io.FileInputStream(rawFile); OutputStream out = getContext().getContentResolver().openOutputStream(dst)) {
                                byte[] b = new byte[65536]; int n; while ((n = in.read(b)) > 0) out.write(b, 0, n);
                            }
                            shown = "Documents/HEXIS PAD/Static/" + rawName;
                        }
                    } else {
                        File d = new File(android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOCUMENTS), "HEXIS PAD/Static"); d.mkdirs();
                        File f = new File(d, rawName);
                        try (InputStream in = new java.io.FileInputStream(rawFile); OutputStream out = new FileOutputStream(f)) {
                            byte[] b = new byte[65536]; int n; while ((n = in.read(b)) > 0) out.write(b, 0, n);
                        }
                        shown = "Documents/HEXIS PAD/Static/" + rawName;
                    }
                } catch (Exception ignored) { }
                o.put("path", shown != null ? shown : rawFile.getAbsolutePath());
                call.resolve(o);
            } catch (Exception e) { call.reject("Καταγραφή static: " + e.getMessage()); }
        }, "hexis-raw").start();
    }

    @PluginMethod
    public void shareFile(PluginCall call) {
        try {
            File f = new File(call.getString("file", ""));
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
            Intent it = new Intent(Intent.ACTION_SEND);
            it.setType("application/octet-stream");
            it.putExtra(Intent.EXTRA_STREAM, uri);
            it.putExtra(Intent.EXTRA_SUBJECT, f.getName());
            it.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent ch = Intent.createChooser(it, f.getName()); ch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(ch);
            call.resolve();
        } catch (Exception e) { call.reject("Κοινή χρήση: " + e.getMessage()); }
    }


    // ---------- Δίκτυα: internet από όπου υπάρχει (4G/5G αν το Wi-Fi δεν έχει), δέκτης μέσω Wi-Fi ----------
    private android.net.Network internetNetwork() {
        try {
            if (Build.VERSION.SDK_INT < 23) return null;
            android.net.ConnectivityManager cm = (android.net.ConnectivityManager) getContext().getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm == null) return null;
            android.net.Network act = cm.getActiveNetwork();
            android.net.NetworkCapabilities ac = act != null ? cm.getNetworkCapabilities(act) : null;
            if (ac != null && ac.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_VALIDATED)) return null; // το κανονικό δίκτυο έχει internet
            for (android.net.Network n : cm.getAllNetworks()) {
                android.net.NetworkCapabilities c = cm.getNetworkCapabilities(n);
                if (c != null && c.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_INTERNET) && c.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_VALIDATED)) return n;
            }
        } catch (Exception ignored) { }
        return null;
    }
    private Socket internetSocket() {
        try { android.net.Network n = internetNetwork(); if (n != null) return n.getSocketFactory().createSocket(); } catch (Exception ignored) { }
        return new Socket();
    }
    private Socket localSocket() {
        try {
            if (Build.VERSION.SDK_INT >= 23) {
                android.net.ConnectivityManager cm = (android.net.ConnectivityManager) getContext().getSystemService(Context.CONNECTIVITY_SERVICE);
                if (cm != null) for (android.net.Network n : cm.getAllNetworks()) {
                    android.net.NetworkCapabilities c = cm.getNetworkCapabilities(n);
                    if (c != null && c.hasTransport(android.net.NetworkCapabilities.TRANSPORT_WIFI)) return n.getSocketFactory().createSocket();
                }
            }
        } catch (Exception ignored) { }
        return new Socket();
    }

    @PluginMethod
    public void netState(PluginCall call) {
        JSObject o = new JSObject();
        try {
            android.net.ConnectivityManager cm = (android.net.ConnectivityManager) getContext().getSystemService(Context.CONNECTIVITY_SERVICE);
            boolean inet = false, wifi = false, wifiInet = false, cell = false;
            if (cm != null && Build.VERSION.SDK_INT >= 23) for (android.net.Network n : cm.getAllNetworks()) {
                android.net.NetworkCapabilities c = cm.getNetworkCapabilities(n); if (c == null) continue;
                boolean v = c.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_VALIDATED);
                if (c.hasTransport(android.net.NetworkCapabilities.TRANSPORT_WIFI)) { wifi = true; if (v) wifiInet = true; }
                if (c.hasTransport(android.net.NetworkCapabilities.TRANSPORT_CELLULAR)) cell = true;
                if (v) inet = true;
            }
            o.put("internet", inet); o.put("wifi", wifi); o.put("wifiInternet", wifiInet); o.put("cellular", cell);
        } catch (Exception e) { o.put("internet", true); }
        call.resolve(o);
    }

    private void deliver(JSObject f) {
        pendingFile = f;
        if (hasListeners("fileOpen")) { notifyListeners("fileOpen", f); pendingFile = null; }
    }

    // ---------- Ενημέρωση εφαρμογής: λήψη νέου APK και άνοιγμα εγκατάστασης ----------
    @PluginMethod
    public void installUpdate(final PluginCall call) {
        final String url = call.getString("url", "");
        if (url.isEmpty()) { call.reject("Χωρίς διεύθυνση"); return; }
        new Thread(() -> {
            try {
                String u = url; HttpURLConnection c = null;
                for (int i = 0; i < 6; i++) {
                    android.net.Network inet = internetNetwork();
                    c = (HttpURLConnection) (inet != null ? inet.openConnection(new URL(u)) : new URL(u).openConnection());
                    c.setInstanceFollowRedirects(false); c.setConnectTimeout(15000); c.setReadTimeout(30000);
                    int code = c.getResponseCode();
                    if (code >= 300 && code < 400) { u = c.getHeaderField("Location"); c.disconnect(); continue; }
                    if (code != 200) throw new IOException("HTTP " + code);
                    break;
                }
                File dir = new File(getContext().getCacheDir(), "update"); dir.mkdirs();
                File f = new File(dir, "HEXIS_PAD.apk");
                long total = c.getContentLengthLong(), done = 0, lastEv = 0;
                try (InputStream in = c.getInputStream(); FileOutputStream out = new FileOutputStream(f)) {
                    byte[] buf = new byte[65536]; int n;
                    while ((n = in.read(buf)) > 0) {
                        out.write(buf, 0, n); done += n;
                        long now = System.currentTimeMillis();
                        if (now - lastEv > 500) { lastEv = now; JSObject o = new JSObject(); o.put("done", done); o.put("total", total); notifyListeners("updateProgress", o); }
                    }
                }
                Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
                Intent it = new Intent(Intent.ACTION_VIEW);
                it.setDataAndType(uri, "application/vnd.android.package-archive");
                it.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(it);
                call.resolve();
            } catch (Exception e) { call.reject("Ενημέρωση: " + e.getMessage()); }
        }, "hexis-update").start();
    }

    @PluginMethod
    public void connStats(PluginCall call) {
        Conn c = conns.get(call.getString("channel", "gnss"));
        JSObject o = new JSObject();
        o.put("connected", c != null); o.put("bytes", c != null ? c.bytesIn : 0); o.put("lines", c != null ? c.linesIn : 0);
        o.put("format", c != null ? c.dec.format : "");
        call.resolve(o);
    }

    @PluginMethod
    public void openBtSettings(PluginCall call) {
        try {
            Intent it = new Intent(android.provider.Settings.ACTION_BLUETOOTH_SETTINGS);
            it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(it);
            call.resolve();
        } catch (Exception e) { call.reject("Ρυθμίσεις Bluetooth: " + e.getMessage()); }
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
        try { HexisService.stop(getContext()); } catch (Exception ignored) { }
        listening = false;
        try { if (sr != null) sr.destroy(); } catch (Exception ignored) { }
        try { if (tts != null) tts.shutdown(); } catch (Exception ignored) { }
        super.handleOnDestroy();
    }
}
