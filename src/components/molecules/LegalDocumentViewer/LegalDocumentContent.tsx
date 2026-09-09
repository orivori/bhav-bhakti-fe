import React, { useCallback, useRef, useState } from 'react';
import { View, ActivityIndicator, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/atoms';
import { useI18nStore } from '@/shared/stores/i18nStore';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { LEGAL_DOCUMENT_URLS, LegalDocType } from '@/shared/config/legalDocuments';

interface LegalDocumentContentProps {
  docType: LegalDocType;
}

// Shared WebView core used by both presentation modes (full-screen route and
// bottom-sheet) - loading/offline/error handling lives here once, not
// duplicated between LegalDocumentViewer and LegalDocumentSheet.
export function LegalDocumentContent({ docType }: LegalDocumentContentProps) {
  const { language } = useI18nStore();
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  // Bumped on retry to force a fresh <WebView> mount rather than relying on
  // reload() alone, which can no-op on some Android WebView versions after a
  // hard network-level failure.
  const [reloadKey, setReloadKey] = useState(0);

  const url = LEGAL_DOCUMENT_URLS[docType];

  // Pins the WebView to the SPECIFIC page that was opened, not just the same
  // domain (the previous guard only checked navState.url.includes('orivori.com'),
  // which let a user tap through to any other page on the site). Left null
  // until the initial navigation/redirect chain settles - this deliberately
  // lets an unknown number of legitimate redirects happen first (an https
  // upgrade, a www/non-www redirect, a CMS canonical-URL redirect) rather
  // than hardcoding an assumption about exactly what the target URL resolves
  // to; only once real content has actually loaded does this lock in and
  // start blocking further navigation (in-page nav links, footer links to
  // other site pages, etc.) away from that resolved page.
  const pinnedUrlRef = useRef<string | null>(null);
  const normalize = (u: string) => u.split(/[?#]/)[0].replace(/\/+$/, '');

  // Tagged, greppable diagnostic logging (kept in, not stripped for
  // production - it's one line per lifecycle event, not spammy) - the last
  // bug report needed exactly this ("does onLoadEnd ever fire?") and there
  // was no way to answer it without a live device in hand. If a future
  // report says the document is still blank, check logcat/Metro for
  // "[LegalDocumentContent]" first before touching this component again.
  const handleLoadStart = useCallback(() => {
    console.log(`[LegalDocumentContent] onLoadStart docType=${docType} url=${url}`);
    setIsLoading(true);
    setHasError(false);
  }, [docType, url]);

  const handleLoadEnd = useCallback(() => {
    console.log(`[LegalDocumentContent] onLoadEnd docType=${docType}`);
    setIsLoading(false);
  }, [docType]);

  const handleError = useCallback((event: any) => {
    console.log(`[LegalDocumentContent] onError docType=${docType}`, event?.nativeEvent);
    setIsLoading(false);
    setHasError(true);
  }, [docType]);

  // WebView's onHttpError also fires for a 404/500 response from the actual
  // page (a load that technically "succeeds" at the network level but isn't
  // the document) - treated identically to a hard network error here, since
  // neither case leaves anything useful on screen for the user.
  const handleHttpError = useCallback((event: any) => {
    console.log(`[LegalDocumentContent] onHttpError docType=${docType}`, event?.nativeEvent);
    setIsLoading(false);
    setHasError(true);
  }, [docType]);

  const handleRetry = useCallback(() => {
    pinnedUrlRef.current = null;
    setHasError(false);
    setIsLoading(true);
    setReloadKey((key) => key + 1);
  }, []);

  // Pins the WebView to the exact resolved page - deliberately reactive
  // (onNavigationStateChange + stopLoading), NOT via onShouldStartLoadWithRequest.
  //
  // onShouldStartLoadWithRequest was tried first and reverted: its Android
  // native implementation (RNCWebViewClient#shouldOverrideUrlLoading) blocks
  // the WebView thread waiting for a synchronous round-trip back from this
  // exact JS handler, via one of two different code paths depending on an
  // isJsDebugging check (getJavaScriptContextHolder().get() == 0). The
  // "normal" path self-heals on a 250ms timeout (fails open, allows the
  // load) - not the risk. The OTHER path - taken whenever that JS-context
  // check reads true, which is a known false-positive under Hermes +
  // New Architecture/Bridgeless on some react-native-webview versions, and
  // this app IS on New Architecture (app.config.js/gradle.properties both
  // have newArchEnabled: true) - has NO timeout at all: native immediately
  // blocks its own default load and depends entirely on this JS handler's
  // response completing a round-trip back to explicitly call loadUrl(). Any
  // hiccup in that round-trip under this app's architecture leaves the page
  // genuinely stuck loading forever, not just delayed - a real, sourced risk
  // (confirmed by reading the actual installed native source, not just
  // GitHub issues), not worth carrying for a guard this reactive approach
  // already provides without it.
  const handleNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    if (navState.loading) return;

    if (!pinnedUrlRef.current) {
      // Initial load (and any redirect chain) just settled - lock onto
      // wherever it actually landed.
      pinnedUrlRef.current = normalize(navState.url);
      console.log(`[LegalDocumentContent] pinned docType=${docType} pinnedUrl=${pinnedUrlRef.current}`);
      return;
    }

    // A later navigation away from the pinned page (in-page nav link,
    // footer link to another site page, etc.) - stop it before it replaces
    // the pinned document.
    if (normalize(navState.url) !== pinnedUrlRef.current) {
      console.log(`[LegalDocumentContent] blocked navigation away from pin: ${navState.url}`);
      webViewRef.current?.stopLoading();
    }
  }, [docType]);

  return (
    <View style={styles.container}>
      {!hasError && (
        <WebView
          key={reloadKey}
          ref={webViewRef}
          source={{ uri: url }}
          style={styles.webview}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          onHttpError={handleHttpError}
          onNavigationStateChange={handleNavigationStateChange}
          startInLoadingState={false}
          // Android-only: a WebView rendered inside a view that's actively
          // being transform-animated (exactly what a bottom sheet's slide-up
          // is) can render fully blank on Android's hardware compositor -
          // this is the documented fix (default layerType is 'none', i.e.
          // hardware). Confirmed as the real cause here: the same
          // LegalDocumentContent renders correctly in the full-screen route
          // (a plain pushed screen, no transform animation), only the
          // bottom-sheet presentation was blank.
          androidLayerType={Platform.OS === 'android' ? 'software' : undefined}
        />
      )}

      {isLoading && !hasError && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={goldenTempleTheme.colors.primary.DEFAULT} />
        </View>
      )}

      {hasError && (
        <View style={styles.overlay}>
          <Ionicons name="cloud-offline-outline" size={48} color={goldenTempleTheme.colors.text.secondary} />
          <Text variant="body" color="secondary" align="center" style={styles.errorText}>
            {language === 'hi'
              ? 'यह दस्तावेज़ लोड नहीं हो सका। कृपया अपना इंटरनेट कनेक्शन जांचें और पुनः प्रयास करें।'
              : "This document couldn't be loaded. Please check your internet connection and try again."}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.7}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text variant="body" weight="semibold" style={styles.retryButtonText}>
              {language === 'hi' ? 'पुनः प्रयास करें' : 'Retry'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: goldenTempleTheme.colors.background,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: goldenTempleTheme.spacing.xl,
    backgroundColor: goldenTempleTheme.colors.background,
    gap: goldenTempleTheme.spacing.md,
  },
  errorText: {
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: goldenTempleTheme.spacing.xs,
    backgroundColor: goldenTempleTheme.colors.primary.DEFAULT,
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingVertical: goldenTempleTheme.spacing.sm,
    borderRadius: goldenTempleTheme.borderRadius.md,
    marginTop: goldenTempleTheme.spacing.xs,
  },
  retryButtonText: {
    color: '#fff',
  },
});
