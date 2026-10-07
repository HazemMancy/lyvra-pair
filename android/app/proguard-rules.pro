# Methods called from JavaScript through addJavascriptInterface.
-keepclassmembers class com.hazem.lyvra.MainActivity$Bridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
