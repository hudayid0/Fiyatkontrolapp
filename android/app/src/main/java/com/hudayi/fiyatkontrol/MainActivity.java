package com.hudayi.fiyatkontrol;

import android.app.ActivityManager;
import android.app.ApplicationExitInfo;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import androidx.appcompat.app.AlertDialog;
import com.getcapacitor.BridgeActivity;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.util.List;

// GECICI TANI KODU - release-only aninda cokme sorununu arastirmak icin.
// Kok neden bulununca tamamen kaldirilacak (bkz. FiyatlaApplication.java,
// proguard-rules.pro, android/app/build.gradle'daki ilgili gecici
// bisection degisiklikleri).
//
// Onceki iki deneme (bu sinifin kendi try/catch + Thread.setDefaultUncaughtExceptionHandler'i)
// dialog GOSTEREMEDI - kullanici sadece Android'in kendi sistem "uygulama
// durduruldu" dialogunu gordu. Bu, cokmenin MainActivity.onCreate()'e hic
// ulasmadigini gosteriyor - muhtemelen Firebase'in otomatik eklenen
// ContentProvider'lari Application.onCreate()'ten bile once cokuyor. Global
// exception handler artik FiyatlaApplication.attachBaseContext()'te (surecin
// en erken hook'u) kuruluyor. Burada hala iki mekanizma var:
//   1) ActivityManager.getHistoricalProcessExitReasons() (API 30+) - OS
//      seviyesinde kayitli, native cokmeler dahil, bir SONRAKI acilista okur.
//   2) super.onCreate() etrafinda try/catch - eger cokme burada, Java
//      tarafindan yakalanabilir bir noktadaysa, AYNI launch'ta hemen gosterir.
public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Once, OS'nin bir onceki process cikisi hakkinda ne kaydettigine
        // bak - bu THIS launch'in cokup cokmeyeceginden bagimsiz, onceki
        // (muhtemelen cokmus) calistirmayla ilgili bilgi.
        checkPreviousProcessExitReason();

        try {
            super.onCreate(savedInstanceState);
        } catch (Throwable t) {
            String trace = "[Throwable Bridge/Activity onCreate() sirasinda yakalandi]\n" + stackTraceToString(t);
            FiyatlaApplication.writeCrashReport(this, trace);
            showCrashDialog(trace);
            return;
        }

        // super.onCreate() basariyla tamamlandi - baska bir yerde (ornegin
        // FiyatlaApplication'daki global handler'da) olusmus ve dosyaya
        // yazilmis bekleyen bir cokme raporu var mi kontrol et.
        String pending = readAndClearPendingCrashReport();
        if (pending != null) {
            showCrashDialog(pending);
        }
    }

    private void checkPreviousProcessExitReason() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            return; // getHistoricalProcessExitReasons API 30+ gerektirir
        }
        try {
            ActivityManager am = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
            if (am == null) return;
            List<ApplicationExitInfo> infos = am.getHistoricalProcessExitReasons(null, 0, 5);
            if (infos == null || infos.isEmpty()) return;

            ApplicationExitInfo latest = infos.get(0);
            int reason = latest.getReason();
            if (reason != ApplicationExitInfo.REASON_CRASH
                    && reason != ApplicationExitInfo.REASON_CRASH_NATIVE
                    && reason != ApplicationExitInfo.REASON_ANR) {
                return;
            }

            StringBuilder sb = new StringBuilder();
            sb.append("[ActivityManager.getHistoricalProcessExitReasons sonucu]\n");
            sb.append("Reason code: ").append(reason).append(" (").append(reasonName(reason)).append(")\n");
            sb.append("Description: ").append(latest.getDescription()).append("\n");
            sb.append("Timestamp: ").append(latest.getTimestamp()).append("\n");
            sb.append("Importance: ").append(latest.getImportance()).append("\n\n");

            InputStream traceStream = latest.getTraceInputStream();
            if (traceStream != null) {
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                byte[] buf = new byte[4096];
                int n;
                while ((n = traceStream.read(buf)) != -1) {
                    baos.write(buf, 0, n);
                }
                traceStream.close();
                sb.append(baos.toString("UTF-8"));
            } else {
                sb.append("(traceInputStream null - bu cikis turu icin trace kaydedilmemis)");
            }

            String report = sb.toString();
            FiyatlaApplication.writeCrashReport(this, report);
            showCrashDialog(report);
        } catch (Throwable t) {
            // Best-effort tani araci - burada patlarsa normal akisi bozmasin.
        }
    }

    private String reasonName(int reason) {
        switch (reason) {
            case ApplicationExitInfo.REASON_CRASH: return "REASON_CRASH";
            case ApplicationExitInfo.REASON_CRASH_NATIVE: return "REASON_CRASH_NATIVE";
            case ApplicationExitInfo.REASON_ANR: return "REASON_ANR";
            default: return "other:" + reason;
        }
    }

    private String stackTraceToString(Throwable t) {
        StringWriter sw = new StringWriter();
        t.printStackTrace(new PrintWriter(sw));
        return sw.toString();
    }

    private File crashFile() {
        File dir = getExternalFilesDir(null);
        if (dir == null) dir = getFilesDir();
        return new File(dir, FiyatlaApplication.CRASH_FILE_NAME);
    }

    private String readAndClearPendingCrashReport() {
        File f = crashFile();
        if (!f.exists()) return null;
        try {
            byte[] data = new byte[(int) f.length()];
            try (FileInputStream in = new FileInputStream(f)) {
                in.read(data);
            }
            f.delete();
            return new String(data, StandardCharsets.UTF_8);
        } catch (Exception e) {
            return null;
        }
    }

    private void showCrashDialog(String trace) {
        try {
            new AlertDialog.Builder(this)
                    .setTitle("GECICI TANI: Cokme yakalandi")
                    .setMessage(trace)
                    .setPositiveButton("Tamam", (dialog, which) -> dialog.dismiss())
                    .setCancelable(true)
                    .show();
        } catch (Throwable ignored) {
            // Dialog gosterilemedi (ornegin pencere henuz hazir degilse) -
            // rapor yine de dosyaya yazildi, bir sonraki acilista gosterilir.
        }
    }
}
