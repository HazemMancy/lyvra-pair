plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Release signing comes from environment variables (set by CI from repository secrets),
// so no keystore or password is ever committed.
val keystorePath: String? = System.getenv("LYVRA_KEYSTORE")

android {
    namespace = "com.hazem.lyvra"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.hazem.lyvra"
        minSdk = 26
        targetSdk = 36
        versionCode = (System.getenv("LYVRA_VERSION_CODE") ?: "1").toInt()
        versionName = "1.0.0"
    }

    signingConfigs {
        if (keystorePath != null) {
            create("release") {
                storeFile = file(keystorePath)
                storePassword = System.getenv("LYVRA_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("LYVRA_KEY_ALIAS")
                keyPassword = System.getenv("LYVRA_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (keystorePath != null) signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

dependencies {
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("androidx.core:core-ktx:1.16.0")
}
