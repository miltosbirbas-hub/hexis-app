package gr.hexisapp.pad;

import java.util.Locale;

/**
 * HEXIS PAD — ανάγνωση θέσης από δημοσιευμένα πρωτόκολλα δεκτών όταν ο δέκτης δεν στέλνει NMEA:
 *  · Unicore / NovAtel δυαδικό BESTPOS (42) / BESTNAV (2118)  — sync AA 44 12 / AA 44 B5
 *  · Unicore / NovAtel κείμενο  #BESTPOSA / #BESTNAVA
 *  · u-blox UBX NAV-PVT (0x01 0x07)                          — sync B5 62
 * Η θέση μετατρέπεται σε NMEA GGA + GST, ώστε η υπόλοιπη εφαρμογή να δουλεύει αμετάβλητη.
 */
public class GnssDecoder {
    public interface Sink { void line(String nmea); }

    private final Sink sink;
    private final byte[] buf = new byte[16384];
    private int len = 0;
    public volatile String format = "";   // τελευταίο αναγνωρισμένο πρωτόκολλο (για διάγνωση)

    public GnssDecoder(Sink sink) { this.sink = sink; }

    // ---------- δυαδικά ----------
    public void feed(byte[] data, int n) {
        if (n <= 0) return;
        if (len + n > buf.length) { // υπερχείλιση: κρατάμε τα τελευταία bytes
            int keep = Math.max(0, buf.length - n);
            System.arraycopy(buf, len - Math.min(len, keep), buf, 0, Math.min(len, keep));
            len = Math.min(len, keep);
        }
        System.arraycopy(data, 0, buf, len, Math.min(n, buf.length - len));
        len += Math.min(n, buf.length);
        parse();
    }

    private void parse() {
        int i = 0;
        while (i < len - 1) {
            int b0 = buf[i] & 0xFF, b1 = buf[i + 1] & 0xFF;
            if (b0 == 0xAA && b1 == 0x44 && i + 2 < len && ((buf[i + 2] & 0xFF) == 0x12 || (buf[i + 2] & 0xFF) == 0xB5)) {
                int used = novatel(i); if (used == 0) break; i += used; continue; // 0 = λείπουν bytes
            }
            if (b0 == 0xB5 && b1 == 0x62) { int used = ubx(i); if (used == 0) break; i += used; continue; }
            i++;
        }
        if (i > 0) { System.arraycopy(buf, i, buf, 0, len - i); len -= i; }
    }

    /** επιστρέφει πόσα bytes καταναλώθηκαν (1 για άκυρο πλαίσιο), 0 αν χρειάζονται κι άλλα */
    private int novatel(int s) {
        boolean unicore = (buf[s + 2] & 0xFF) == 0xB5;
        int hdr, msgId, msgLen, week; long ms;
        if (unicore) {
            if (len - s < 24) return 0;
            hdr = 24; msgId = u16(s + 4); msgLen = u16(s + 6); week = u16(s + 10); ms = u32(s + 12);
        } else {
            if (len - s < 28) return 0;
            hdr = buf[s + 3] & 0xFF; if (hdr < 28 || hdr > 64) return 1;
            msgId = u16(s + 4); msgLen = u16(s + 8); week = u16(s + 14); ms = u32(s + 16);
        }
        if (msgLen > 4000) return 1;
        int total = hdr + msgLen + 4;
        if (len - s < total) return 0;
        long crc = crc32(buf, s, hdr + msgLen);
        if (crc != u32(s + hdr + msgLen)) return 1;
        if ((msgId == 42 || msgId == 2118 || msgId == 1429) && msgLen >= 66) {
            int p = s + hdr;
            int solStat = (int) u32(p), posType = (int) u32(p + 4);
            double lat = f64(p + 8), lon = f64(p + 16), hgt = f64(p + 24);
            float und = f32(p + 32), sLat = f32(p + 40), sLon = f32(p + 44), sHgt = f32(p + 48);
            float diffAge = f32(p + 56);
            int sv = buf[p + 65] & 0xFF; // satellites used in solution
            int q = solStat != 0 ? 0 : quality(posType);
            format = unicore ? "Unicore BESTNAV/BESTPOS (δυαδικό)" : "NovAtel BESTPOS (δυαδικό)";
            emit(gpsToUtc(week, ms), lat, lon, hgt, und, q, sv, diffAge, sLat, sLon, sHgt);
        }
        return total;
    }

    private int ubx(int s) {
        if (len - s < 6) return 0;
        int cls = buf[s + 2] & 0xFF, id = buf[s + 3] & 0xFF, n = u16(s + 4);
        if (n > 2000) return 1;
        if (len - s < 8 + n) return 0;
        int a = 0, b = 0;
        for (int k = s + 2; k < s + 6 + n; k++) { a = (a + (buf[k] & 0xFF)) & 0xFF; b = (b + a) & 0xFF; }
        if (a != (buf[s + 6 + n] & 0xFF) || b != (buf[s + 7 + n] & 0xFF)) return 1;
        if (cls == 0x01 && id == 0x07 && n >= 92) {
            int p = s + 6;
            int hh = buf[p + 8] & 0xFF, mi = buf[p + 9] & 0xFF, ss = buf[p + 10] & 0xFF;
            int fixType = buf[p + 20] & 0xFF, flags = buf[p + 21] & 0xFF, sv = buf[p + 23] & 0xFF;
            double lon = i32(p + 24) * 1e-7, lat = i32(p + 28) * 1e-7;
            double hEll = i32(p + 32) / 1000.0, hMsl = i32(p + 36) / 1000.0;
            double hAcc = u32(p + 40) / 1000.0, vAcc = u32(p + 44) / 1000.0;
            int carr = (flags >> 6) & 3;
            int q = (fixType < 2 || (flags & 1) == 0) ? 0 : carr == 2 ? 4 : carr == 1 ? 5 : ((flags & 2) != 0 ? 2 : 1);
            format = "u-blox UBX NAV-PVT";
            double t = hh * 3600 + mi * 60 + ss;
            emit(t, lat, lon, hMsl, (float) (hEll - hMsl), q, sv, Float.NaN, (float) (hAcc / Math.sqrt(2)), (float) (hAcc / Math.sqrt(2)), (float) vAcc);
        }
        return 8 + n;
    }

    // ---------- κείμενο #BESTPOSA / #BESTNAVA ----------
    public boolean ascii(String s) {
        if (!(s.startsWith("#BESTPOSA") || s.startsWith("#BESTNAVA") || s.startsWith("#BESTGNSSPOSA"))) return false;
        try {
            int semi = s.indexOf(';'); if (semi < 0) return true;
            String[] h = s.substring(1, semi).split(",");
            String body = s.substring(semi + 1); int star = body.indexOf('*'); if (star > 0) body = body.substring(0, star);
            String[] f = body.split(",");
            int week = h.length > 5 ? Integer.parseInt(h[5].trim()) : 0;
            double sec = h.length > 6 ? Double.parseDouble(h[6].trim()) : 0;
            boolean ok = "SOL_COMPUTED".equals(f[0].trim());
            int q = ok ? qualityName(f[1].trim()) : 0;
            double lat = Double.parseDouble(f[2]), lon = Double.parseDouble(f[3]), hgt = Double.parseDouble(f[4]);
            float und = Float.parseFloat(f[5]);
            float sLat = Float.parseFloat(f[7]), sLon = Float.parseFloat(f[8]), sHgt = Float.parseFloat(f[9]);
            float age = Float.parseFloat(f[11]);
            int sv = f.length > 14 ? Integer.parseInt(f[14].trim()) : 0;
            format = s.startsWith("#BESTNAVA") ? "Unicore BESTNAVA (κείμενο)" : "BESTPOSA (κείμενο)";
            emit(gpsToUtc(week, (long) Math.round(sec * 1000)), lat, lon, hgt, und, q, sv, age, sLat, sLon, sHgt);
        } catch (Exception ignored) { }
        return true;
    }

    // ---------- έξοδος NMEA ----------
    private void emit(double tUtc, double lat, double lon, double hMsl, float und, int q, int sv, float age, float sLat, float sLon, float sHgt) {
        if (Double.isNaN(lat) || Double.isNaN(lon) || (lat == 0 && lon == 0)) q = 0;
        String t = hms(tUtc);
        StringBuilder g = new StringBuilder("GNGGA,").append(t).append(',');
        if (q > 0) {
            g.append(dm(Math.abs(lat), 2)).append(',').append(lat >= 0 ? 'N' : 'S').append(',')
             .append(dm(Math.abs(lon), 3)).append(',').append(lon >= 0 ? 'E' : 'W').append(',');
        } else g.append(",,,,");
        g.append(q).append(',').append(String.format(Locale.US, "%02d", Math.min(sv, 99))).append(",,")
         .append(q > 0 ? String.format(Locale.US, "%.4f", hMsl) : "").append(",M,")
         .append(q > 0 && !Float.isNaN(und) ? String.format(Locale.US, "%.4f", und) : "").append(",M,")
         .append(!Float.isNaN(age) && age > 0 && q >= 2 ? String.format(Locale.US, "%.1f", age) : "").append(",0000");
        // πρώτα η ακρίβεια (GST), μετά η θέση (GGA): η εφαρμογή «κλείνει» την εποχή με το GGA
        if (q > 0 && !Float.isNaN(sLat) && !Float.isNaN(sLon)) {
            double rms = Math.sqrt(sLat * sLat + sLon * sLon);
            sink.line(cs(String.format(Locale.US, "GNGST,%s,%.3f,%.3f,%.3f,0.0,%.3f,%.3f,%.3f", t, rms, Math.max(sLat, sLon), Math.min(sLat, sLon), sLat, sLon, Float.isNaN(sHgt) ? 0f : sHgt)));
        }
        sink.line(cs(g.toString()));
    }

    static int quality(int posType) {
        switch (posType) {
            case 48: case 49: case 50: case 56: return 4;          // L1_INT, WIDE_INT, NARROW_INT, INS_RTKFIXED
            case 32: case 33: case 34: case 55: return 5;          // L1_FLOAT, IONOFREE_FLOAT, NARROW_FLOAT, INS_RTKFLOAT
            case 17: case 18: case 54: return 2;                   // PSRDIFF, WAAS, INS_PSRDIFF
            case 16: case 53: case 19: return 1;                   // SINGLE, INS_PSRSP, PROPAGATED
            default: return posType == 0 ? 0 : 1;
        }
    }
    static int qualityName(String n) {
        if (n.endsWith("_INT") || n.equals("INS_RTKFIXED")) return 4;
        if (n.endsWith("_FLOAT") || n.equals("INS_RTKFLOAT")) return 5;
        if (n.equals("PSRDIFF") || n.equals("WAAS") || n.equals("SBAS") || n.equals("INS_PSRDIFF")) return 2;
        if (n.equals("NONE")) return 0;
        return 1;
    }

    static double gpsToUtc(int week, long ms) { double t = (ms / 1000.0) - 18; t = ((t % 86400) + 86400) % 86400; return t; }
    static String hms(double t) { int h = (int) (t / 3600), m = (int) ((t % 3600) / 60); double s = t - h * 3600 - m * 60; return String.format(Locale.US, "%02d%02d%05.2f", h, m, s); }
    static String dm(double v, int degDigits) { int d = (int) v; double m = (v - d) * 60; return String.format(Locale.US, "%0" + degDigits + "d%011.8f", d, m); }
    static String cs(String body) { int x = 0; for (int i = 0; i < body.length(); i++) x ^= body.charAt(i); return "$" + body + String.format("*%02X", x); }

    private int u16(int i) { return (buf[i] & 0xFF) | ((buf[i + 1] & 0xFF) << 8); }
    private long u32(int i) { return ((long) (buf[i] & 0xFF)) | ((long) (buf[i + 1] & 0xFF) << 8) | ((long) (buf[i + 2] & 0xFF) << 16) | ((long) (buf[i + 3] & 0xFF) << 24); }
    private int i32(int i) { return (int) u32(i); }
    private float f32(int i) { return Float.intBitsToFloat((int) u32(i)); }
    private double f64(int i) { return Double.longBitsToDouble(u32(i) | (u32(i + 4) << 32)); }

    private static final long[] T = new long[256];
    static { for (int n = 0; n < 256; n++) { long c = n; for (int k = 0; k < 8; k++) c = (c & 1) != 0 ? 0xEDB88320L ^ (c >>> 1) : c >>> 1; T[n] = c; } }
    static long crc32(byte[] d, int off, int n) { long c = 0; for (int i = 0; i < n; i++) c = T[(int) ((c ^ d[off + i]) & 0xFF)] ^ (c >>> 8); return c & 0xFFFFFFFFL; }
}
