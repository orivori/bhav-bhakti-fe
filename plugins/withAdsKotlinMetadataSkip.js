// Lets react-native-google-mobile-ads 16.5.0 compile with our Kotlin (2.1.20,
// from React Native 0.81.5's version catalog).
//
// The library pins play-services-ads 25.4.0, which Google built with Kotlin
// 2.3 (its .kotlin_module files carry metadata 2.3.0; 25.2.0 and older carry
// 2.2.0). A Kotlin 2.1 compiler reads metadata at most one version ahead, so
// :react-native-google-mobile-ads:compileReleaseKotlin failed with "Module was
// compiled with an incompatible version of Kotlin". The library's own fix,
// shipped from 17.0.0, is exactly this flag on its module only, when Kotlin is
// older than 2.3 ("This module consumes its public Java API, so older
// supported compilers may skip the metadata version check without affecting
// the app"). 17.x isn't an option here (a major API change), so this backports
// that fix through the root build.gradle.
//
// Scope: only the ads module's Kotlin compile tasks. No other module, no
// Kotlin version change, no change to the bytecode of play-services-ads.
// Remove this plugin when upgrading to react-native-google-mobile-ads 17+ or
// Kotlin 2.3+.
//
// /android is gitignored (Continuous Native Generation), so this must run on
// every prebuild - hence a config plugin, like withNotifications.js.
const { withProjectBuildGradle } = require('@expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');

const ADS_PROJECT_PATH = ':react-native-google-mobile-ads';

const GRADLE_BLOCK = `
// See plugins/withAdsKotlinMetadataSkip.js
def adsKotlinProject = findProject('${ADS_PROJECT_PATH}')
if (adsKotlinProject != null) {
  adsKotlinProject.tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
    compilerOptions.freeCompilerArgs.add('-Xskip-metadata-version-check')
  }
}`;

const withAdsKotlinMetadataSkip = (config) =>
  withProjectBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language !== 'groovy') {
      throw new Error('withAdsKotlinMetadataSkip: expected a Groovy android/build.gradle.');
    }
    modConfig.modResults.contents = mergeContents({
      tag: 'bhav-bhakti-ads-kotlin-metadata-skip',
      src: modConfig.modResults.contents,
      newSrc: GRADLE_BLOCK,
      anchor: /apply plugin: "com\.facebook\.react\.rootproject"/,
      offset: 1,
      comment: '//',
    }).contents;
    return modConfig;
  });

module.exports = withAdsKotlinMetadataSkip;
