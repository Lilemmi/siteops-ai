# Add project specific ProGuard rules here.
# Keep React Native / Hermes entry points intact while releasing with minifyEnabled.

-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.siteopsai.** { *; }

-dontwarn com.facebook.react.**
-dontwarn com.facebook.hermes.**
