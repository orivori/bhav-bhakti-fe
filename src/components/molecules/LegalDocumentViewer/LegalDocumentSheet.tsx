import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, LayoutChangeEvent } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/atoms';
import { designSystemTheme } from '@/styles/designSystemTheme';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useI18nStore } from '@/shared/stores/i18nStore';
import { LEGAL_DOCUMENT_TITLES, LegalDocType } from '@/shared/config/legalDocuments';
import { LegalDocumentContent } from './LegalDocumentContent';

// Kept as one source of truth with the snapPoints string below - both must
// agree, since the explicit content height computed from this is what
// actually works around BottomSheetView's layout limitation (see the height
// comment further down).
const SNAP_FRACTION = 0.48;

interface LegalDocumentSheetProps {
  // Null while the sheet is closed/between presentations - the caller is
  // responsible for calling .present()/.dismiss() on this ref AND updating
  // this prop together (see phone-login.tsx), same two-piece pattern as
  // other sheets in this app that need to know which content to show.
  docType: LegalDocType | null;
}

// Bottom-sheet presentation mode for LegalDocumentViewer - reuses the same
// @gorhom/bottom-sheet pattern already established by CounterSheet/QueueSheet/
// MoreTargetsSheet, dismissible via backdrop tap or swipe-down (both free
// from BottomSheetModal itself, no hand-built Pressable/gesture logic needed).
export const LegalDocumentSheet = forwardRef<BottomSheetModal, LegalDocumentSheetProps>(
  ({ docType }, ref) => {
    const { language } = useI18nStore();
    // A local ref drives the actual BottomSheetModal so the header's close
    // button can call .dismiss() on itself directly, regardless of how the
    // parent's forwarded ref is shaped - same pattern as MoreTargetsSheet.tsx.
    const sheetRef = useRef<BottomSheetModal>(null);
    useImperativeHandle(ref, () => sheetRef.current as BottomSheetModal);
    const [headerHeight, setHeaderHeight] = useState(0);
    const handleHeaderLayout = useCallback((event: LayoutChangeEvent) => {
      setHeaderHeight(event.nativeEvent.layout.height);
    }, []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.5}
          pressBehavior="close"
        />
      ),
      []
    );

    const title = docType ? LEGAL_DOCUMENT_TITLES[docType][language === 'hi' ? 'hi' : 'en'] : '';

    return (
      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing={false}
        // A genuine partial "quick glance" sheet, not near-full-screen - the
        // full document is always one tap away via Profile's full-screen
        // LegalDocumentViewer route if the user wants to read the whole thing.
        snapPoints={[`${SNAP_FRACTION * 100}%`]}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handleIndicator}
        backgroundStyle={styles.sheetBackground}
        // Lets the WebView's own internal page scroll own 100% of touches
        // over the content area, instead of fighting the sheet's own pan
        // gesture for them. Checked the documented "standard" fix first
        // (wrapping content in NativeViewGestureHandler with
        // disallowInterruption) - gorhom's own troubleshooting docs recommend
        // it generally, but real user reports (gorhom/react-native-bottom-sheet
        // #494/#499) show it specifically does NOT reliably resolve this for
        // WebView on Android (WebView isn't a react-native-gesture-handler-
        // aware view the way BottomSheetScrollView/FlatList's RN ScrollView
        // is - there's no built-in wrapper for arbitrary native content).
        // enableContentPanningGesture is the library's own official escape
        // hatch for exactly this case (public prop, defaults to true) -
        // disabling it removes the sheet's pan gesture from the content area
        // entirely, while leaving three other ways to dismiss fully intact
        // and independent of it: the drag handle strip at the top
        // (enableHandlePanningGesture defaults to true, unaffected), the
        // backdrop tap (pressBehavior="close" above), and the explicit X
        // button in the header.
        enableContentPanningGesture={false}
      >
        <View style={styles.header} onLayout={handleHeaderLayout}>
          <Text weight="semibold" numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => sheetRef.current?.dismiss()}
          >
            <Ionicons name="close" size={24} color={designSystemTheme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Explicit numeric height, NOT flex:1 - BottomSheetView's own
            container style (@gorhom/bottom-sheet's source) is
            `position: 'absolute', top/left/right: 0` with NO `bottom`, which
            leaves flex:1 with nothing reliable to resolve against under a
            fixed (non-dynamic) snap point. This is why the WebView loaded
            successfully (onLoadEnd fired) but never visibly painted - it
            almost certainly received zero/near-zero real layout height.
            Every other BottomSheetView usage in this codebase
            (CounterSheet/MoreTargetsSheet) pairs it with
            enableDynamicSizing (content dictates the sheet's height, so this
            never comes up); QueueSheet uses a fixed snapPoint like this one
            but with BottomSheetFlatList instead, which is built to fill a
            fixed height reliably. This is the only fixed-snapPoint +
            BottomSheetView combination in the app, hence the new bug class.
            Computed from the same SNAP_FRACTION as snapPoints below, minus
            the header's real measured height (0 until first layout - the
            loading spinner already covers that first-frame gap). */}
        <BottomSheetView
          style={[
            styles.content,
            { height: Math.max(Dimensions.get('window').height * SNAP_FRACTION - headerHeight, 0) },
          ]}
        >
          {/* Keyed on docType so switching documents (close "Terms", reopen
              "Privacy") fully remounts LegalDocumentContent rather than reusing
              the same instance with new props - resets its loading/error state
              and the navigation-pin ref (see LegalDocumentContent.tsx) cleanly
              per document, instead of carrying stale state across documents. */}
          {docType && <LegalDocumentContent key={docType} docType={docType} />}
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

LegalDocumentSheet.displayName = 'LegalDocumentSheet';

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: designSystemTheme.colors.surface,
    borderTopLeftRadius: goldenTempleTheme.borderRadius.xl,
    borderTopRightRadius: goldenTempleTheme.borderRadius.xl,
  },
  handleIndicator: {
    backgroundColor: '#D9D9D9',
    width: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: goldenTempleTheme.spacing.lg,
    paddingBottom: goldenTempleTheme.spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: designSystemTheme.fontSizes.cardTitle,
    // The shared Text atom's default variant ('body', since none is passed
    // here) sets lineHeight:20 for its own default fontSize:14 - this
    // overrides fontSize to 20 (cardTitle) but, since Text.tsx applies the
    // caller's own `style` prop LAST (after variantStyles), nothing here was
    // resetting that now-mismatched lineHeight:20 back up to match. A 20px
    // font in a 20px line box clips descenders (the 'y' in "Policy") -
    // confirmed exactly matching the reported screenshot. Explicit here so
    // it can't silently drift out of sync with fontSize again.
    lineHeight: 26,
    color: designSystemTheme.colors.textPrimary,
    marginRight: goldenTempleTheme.spacing.sm,
  },
  content: {
    flex: 1,
    // Left/right inset so the document doesn't run edge-to-edge in the
    // sheet - matches the header's own paddingHorizontal for visual
    // alignment (title/close button line up with the content below).
    // Scoped to this style only (not LegalDocumentContent itself), so the
    // full-screen route stays edge-to-edge, unaffected.
    paddingHorizontal: goldenTempleTheme.spacing.lg,
  },
});
