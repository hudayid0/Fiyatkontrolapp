# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ============================================================
# Capacitor core
# Plugin methods are invoked via reflection based on the
# @CapacitorPlugin/@PluginMethod annotations, so both the
# annotated classes/methods and the Bridge/Plugin base classes
# must survive shrinking and renaming.
# ============================================================
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * {
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.annotation.Permission <methods>;
    @com.getcapacitor.PluginMethod public <methods>;
}
-keep public class * extends com.getcapacitor.Plugin { *; }
-keep class com.getcapacitor.** { *; }

# ============================================================
# @capacitor/app
# ============================================================
-keep class com.capacitorjs.plugins.app.** { *; }

# ============================================================
# @capacitor/local-notifications
# TimedNotificationPublisher, NotificationDismissReceiver and
# LocalNotificationRestoreReceiver are looked up by fully
# qualified class name from AndroidManifest.xml (BroadcastReceiver
# components) and from serialized Intent extras - if R8 renames or
# strips them, scheduled notifications silently stop firing at
# runtime even though the build succeeds.
# ============================================================
-keep class com.capacitorjs.plugins.localnotifications.** { *; }

# ============================================================
# @capacitor/status-bar
# ============================================================
-keep class com.capacitorjs.plugins.statusbar.** { *; }

# ============================================================
# @capacitor-community/admob + underlying Google Mobile Ads SDK
# ============================================================
-keep class com.getcapacitor.community.admob.** { *; }
-keep class com.google.android.gms.ads.** { *; }
-keep interface com.google.android.gms.ads.** { *; }

# ============================================================
# @capacitor-firebase/crashlytics + underlying Firebase Crashlytics SDK
# Keep exception types and source/line info so crash reports stay
# symbolicated, and keep the plugin bridge so JS-triggered crash
# logging keeps working.
# ============================================================
-keep class io.capawesome.capacitorjs.plugins.firebase.crashlytics.** { *; }
-keep class com.google.firebase.crashlytics.** { *; }
-keepattributes SourceFile,LineNumberTable
-keepattributes *Annotation*
-keep public class * extends java.lang.Exception

# ============================================================
# @capacitor-firebase/analytics + underlying Firebase Analytics SDK
# ============================================================
-keep class io.capawesome.capacitorjs.plugins.firebase.analytics.** { *; }
-keep class com.google.firebase.analytics.** { *; }

# ============================================================
# @capacitor/background-runner
# TimedNotificationPublisher is looked up by fully qualified class
# name from AndroidManifest.xml (BroadcastReceiver, same reflection
# risk as @capacitor/local-notifications' own publisher). The plugin
# also bundles its own embedded JS engine (android-js-engine-release.aar)
# for running the background runner script - keep it wholesale.
# ============================================================
-keep class io.ionic.backgroundrunner.** { *; }

# ============================================================
# @capacitor/filesystem + @capacitor/share
# ============================================================
-keep class com.capacitorjs.plugins.filesystem.** { *; }
-keep class com.capacitorjs.plugins.share.** { *; }
