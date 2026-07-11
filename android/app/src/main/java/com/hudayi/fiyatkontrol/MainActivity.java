package com.hudayi.fiyatkontrol;

import android.os.Bundle;
import androidx.appcompat.app.AlertDialog;
import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;

// GECICI TANI KODU - release-only aninda cokme sorununu arastirmak icin.
// Kok neden bulununca tamamen kaldirilacak (bkz. proguard-rules.pro,
// android/app/build.gradle ve .github/workflows/build.yml'deki ilgili
// gecici bisection degisiklikleri).
public class MainActivity extends BridgeActivity {

    private static final String CRASH_FILE_NAME = "fiyatla_crash_report.txt";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        installGlobalCrashHandler();

        try {
            super.onCreate(savedInstanceState);
        } catch (Throwable t) {
            String trace = stackTraceToString(t);
            writeCrashReport(trace);
            showCrashDialog(trace);
            return;
        }

        // super.onCreate() basariyla tamamlandi - onceki bir calistirmadan
        // (ornegin baska bir thread'de olusmus) kalan bir cokme raporu var mi
        // kontrol et.
        String pending = readAndClearPendingCrashReport();
        if (pending != null) {
            showCrashDialog(pending);
        }
    }

    private void installGlobalCrashHandler() {
        final Thread.UncaughtExceptionHandler previous = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            writeCrashReport(stackTraceToString(throwable));
            if (previous != null) {
                previous.uncaughtException(thread, throwable);
            } else {
                android.os.Process.killProcess(android.os.Process.myPid());
                System.exit(10);
            }
        });
    }

    private String stackTraceToString(Throwable t) {
        StringWriter sw = new StringWriter();
        t.printStackTrace(new PrintWriter(sw));
        return sw.toString();
    }

    private File crashFile() {
        File dir = getExternalFilesDir(null);
        if (dir == null) dir = getFilesDir();
        return new File(dir, CRASH_FILE_NAME);
    }

    private void writeCrashReport(String trace) {
        try (FileOutputStream out = new FileOutputStream(crashFile())) {
            out.write(trace.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            // Yazma da basarisiz olursa yapacak bir sey yok - sessizce gec,
            // asil oncelik uygulamanin cokmeye devam etmemesi.
        }
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
