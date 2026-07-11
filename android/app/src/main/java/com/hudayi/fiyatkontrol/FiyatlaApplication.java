package com.hudayi.fiyatkontrol;

import android.app.Application;
import android.content.Context;

import java.io.File;
import java.io.FileOutputStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;

// GECICI TANI KODU - release-only aninda cokme sorununu arastirmak icin.
// Kok neden bulununca tamamen kaldirilacak (bkz. MainActivity.java,
// AndroidManifest.xml'deki android:name referansi).
//
// Onceki iki deneme (MainActivity.onCreate() icinde try/catch ve
// ApplicationExitInfo kontrolu) hicbir zaman tetiklenmedi - kullanici hala
// sadece Android'in kendi sistem "uygulama durduruldu" dialogunu goruyor,
// benim ozel dialogum hic cikmiyor. Bu, cokmenin MainActivity.onCreate()'e
// hic ulasmadigini gosteriyor - muhtemelen Firebase'in AndroidManifest'e
// otomatik eklenen ContentProvider'lari (FirebaseInitProvider vb.)
// Application.onCreate()'ten bile once calisiyor ve orada cokuyor.
//
// attachBaseContext(), tum surecin en erken hook'u - herhangi bir
// ContentProvider.onCreate()'ten once calisir. Buraya konan bir
// Thread.setDefaultUncaughtExceptionHandler, Java seviyesinde yakalanabilir
// HERHANGI bir noktadaki cokmeyi (ContentProvider init dahil) yakalar.
public class FiyatlaApplication extends Application {

    static final String CRASH_FILE_NAME = "fiyatla_crash_report.txt";

    @Override
    protected void attachBaseContext(Context base) {
        super.attachBaseContext(base);
        installGlobalCrashHandler(base);
    }

    private void installGlobalCrashHandler(final Context context) {
        final Thread.UncaughtExceptionHandler previous = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            String trace = "[FiyatlaApplication.attachBaseContext - en erken global handler yakaladi]\n"
                    + stackTraceToString(throwable);
            writeCrashReport(context, trace);
            if (previous != null) {
                previous.uncaughtException(thread, throwable);
            } else {
                android.os.Process.killProcess(android.os.Process.myPid());
                System.exit(10);
            }
        });
    }

    private static String stackTraceToString(Throwable t) {
        StringWriter sw = new StringWriter();
        t.printStackTrace(new PrintWriter(sw));
        return sw.toString();
    }

    static void writeCrashReport(Context context, String trace) {
        try {
            File dir = context.getExternalFilesDir(null);
            if (dir == null) dir = context.getFilesDir();
            File f = new File(dir, CRASH_FILE_NAME);
            try (FileOutputStream out = new FileOutputStream(f)) {
                out.write(trace.getBytes(StandardCharsets.UTF_8));
            }
        } catch (Exception e) {
            // Yazma da basarisiz olursa yapacak bir sey yok - sessizce gec,
            // asil oncelik uygulamanin cokmeye devam etmemesi.
        }
    }
}
