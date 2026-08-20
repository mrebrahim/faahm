const { withMainApplication, withAppDelegate } = require('@expo/config-plugins');

/**
 * Force RTL at the NATIVE layer, on both platforms.
 *
 * Calling `I18nManager.forceRTL(true)` from JavaScript sets a flag that
 * React Native only reads at startup — so the very first launch after
 * install renders left-to-right, and only a restart fixes it. For an
 * Arabic-only app that's a broken first impression for every new user.
 *
 * Doing it natively writes the preference before React Native reads it,
 * so the app is RTL from the first frame of the first launch.
 *
 * `expo prebuild` regenerates the native projects on every build, which
 * is why this is a config plugin instead of a hand edit — a hand edit
 * would be wiped by the next `--clean` run.
 */

const ANDROID_IMPORT = 'import com.facebook.react.modules.i18nmanager.I18nUtil';
const ANDROID_CALL = `    // Arabic-only app: lock the layout direction before React Native
    // reads it, so the first launch is RTL rather than the second.
    I18nUtil.getInstance().apply {
      allowRTL(applicationContext, true)
      forceRTL(applicationContext, true)
    }`;

function withAndroidForceRtl(config) {
  return withMainApplication(config, (cfg) => {
    let src = cfg.modResults.contents;

    if (cfg.modResults.language !== 'kt') {
      // Expo SDK 51 generates Kotlin. If a future template switches back
      // to Java, fail loudly rather than silently skipping RTL.
      throw new Error(
        `[with-force-rtl] expected MainApplication.kt, got .${cfg.modResults.language}`
      );
    }

    if (!src.includes(ANDROID_IMPORT)) {
      src = src.replace(
        /^(package .*\n)/m,
        `$1\n${ANDROID_IMPORT}\n`
      );
    }

    if (!src.includes('forceRTL(applicationContext, true)')) {
      // Insert at the top of onCreate, before React Native initialises.
      src = src.replace(
        /(override fun onCreate\(\) \{\n\s*super\.onCreate\(\)\n)/,
        `$1${ANDROID_CALL}\n`
      );
    }

    cfg.modResults.contents = src;
    return cfg;
  });
}

const IOS_IMPORT = '#import <React/RCTI18nUtil.h>';
const IOS_CALL = `  // Arabic-only app — see plugins/with-force-rtl.js.
  [[RCTI18nUtil sharedInstance] setAllowRTL:YES];
  [[RCTI18nUtil sharedInstance] setForceRTL:YES];`;

function withIosForceRtl(config) {
  return withAppDelegate(config, (cfg) => {
    let src = cfg.modResults.contents;

    if (!src.includes(IOS_IMPORT)) {
      src = src.replace(/^(#import "AppDelegate\.h"\n)/m, `$1${IOS_IMPORT}\n`);
    }

    if (!src.includes('setForceRTL:YES')) {
      src = src.replace(
        /(didFinishLaunchingWithOptions:\(NSDictionary \*\)launchOptions\n\{\n)/,
        `$1${IOS_CALL}\n`
      );
    }

    cfg.modResults.contents = src;
    return cfg;
  });
}

module.exports = function withForceRTL(config) {
  return withIosForceRtl(withAndroidForceRtl(config));
};
