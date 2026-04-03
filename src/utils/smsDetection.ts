import * as Clipboard from 'expo-clipboard';

export class SMSDetectionService {

  /**
   * Check if clipboard OTP detection is available (always true)
   */
  static async checkSMSAvailability(): Promise<boolean> {
    // Simplified - we only use clipboard detection which is always available
    return true;
  }

  /**
   * Extract OTP from SMS text using comprehensive patterns
   */
  static extractOTPFromText(text: string): string | null {
    if (!text) return null;

    // Clean the text - remove extra spaces and normalize
    const cleanText = text.replace(/\s+/g, ' ').trim();

    // Enhanced OTP patterns (ordered by priority/specificity)
    const patterns = [
      // Bhav Bhakti specific patterns
      /bhav\s*bhakti.*?(\d{6})/gi,
      /your.*?bhav\s*bhakti.*?code.*?(\d{6})/gi,

      // Common OTP service patterns
      /OTP[:\s]*(\d{4,6})/gi, // OTP: 123456
      /verification[:\s]*code[:\s]*(\d{4,6})/gi, // verification code: 123456
      /your[:\s]*code[:\s]*(\d{4,6})/gi, // your code: 123456
      /code[:\s]*(\d{4,6})/gi, // code: 123456
      /(\d{4,6})[:\s]*is[:\s]*your.*?code/gi, // 123456 is your code
      /(\d{4,6})[:\s]*is[:\s]*your.*?otp/gi, // 123456 is your otp

      // Pattern with context words
      /login.*?(\d{6})/gi, // login code 123456
      /verify.*?(\d{6})/gi, // verify with 123456
      /authentication.*?(\d{6})/gi, // authentication code 123456

      // Standalone 6-digit codes (least priority as they can be false positives)
      /\b(\d{6})\b/g, // 6-digit OTP
      /\b(\d{4})\b/g, // 4-digit OTP
    ];

    for (const pattern of patterns) {
      const matches = pattern.exec(cleanText);
      if (matches && matches[1]) {
        const digits = matches[1];
        // Prefer 6-digit codes over 4-digit for most OTP services
        if (digits.length === 6 || (digits.length === 4 && !cleanText.match(/\b(\d{6})\b/))) {
          console.log(`📱 OTP extracted using pattern: ${pattern.source}`);
          return digits;
        }
      }
    }

    return null;
  }

  /**
   * Start OTP detection via clipboard monitoring
   */
  static async startSMSListener(
    onOTPReceived: (otp: string) => void
  ): Promise<() => void> {
    console.log('🔍 Starting clipboard-based OTP detection...');

    // Start clipboard monitoring (works on both iOS and Android)
    const clipboardCleanup = await this.startClipboardMonitoring(
      (otp) => {
        console.log('📋 OTP auto-detected from clipboard:', otp);
        onOTPReceived(otp);
      },
      2000, // Check every 2 seconds
      120000 // Monitor for 2 minutes
    );

    console.log('📱 Using clipboard monitoring for OTP detection');

    // Return cleanup function
    return () => {
      console.log('🔍 Stopping OTP detection services');
      clipboardCleanup();
    };
  }

  /**
   * Request clipboard permissions (always available)
   */
  static async requestSMSPermissions(): Promise<boolean> {
    // Clipboard access doesn't require permissions
    return true;
  }

  /**
   * Auto-fill OTP from clipboard (iOS/Android)
   * This is a fallback method for iOS and enhanced Android detection
   */
  static async checkClipboardForOTP(): Promise<string | null> {
    try {
      const clipboardText = await Clipboard.getStringAsync();
      if (clipboardText) {
        const extractedOTP = this.extractOTPFromText(clipboardText);
        if (extractedOTP) {
          console.log('OTP detected from clipboard:', extractedOTP);
          return extractedOTP;
        }
      }
      return null;
    } catch (error) {
      console.warn('Clipboard check failed:', error);
      return null;
    }
  }

  /**
   * Periodic clipboard monitoring for OTP detection
   */
  static async startClipboardMonitoring(
    onOTPFound: (otp: string) => void,
    intervalMs: number = 1000,
    maxDuration: number = 60000 // 1 minute
  ): Promise<() => void> {
    let isMonitoring = true;
    let lastClipboardContent = '';

    const checkClipboard = async () => {
      if (!isMonitoring) return;

      try {
        const currentContent = await Clipboard.getStringAsync();

        // Only check if clipboard content changed
        if (currentContent && currentContent !== lastClipboardContent) {
          lastClipboardContent = currentContent;
          const otp = this.extractOTPFromText(currentContent);

          if (otp) {
            console.log('📋 OTP detected from clipboard:', otp);
            onOTPFound(otp);
            isMonitoring = false; // Stop monitoring after finding OTP
            return;
          }
        }
      } catch (error) {
        console.warn('Clipboard monitoring error:', error);
      }
    };

    // Start monitoring
    const interval = setInterval(checkClipboard, intervalMs);

    // Stop monitoring after max duration
    const timeout = setTimeout(() => {
      isMonitoring = false;
      clearInterval(interval);
    }, maxDuration);

    // Return cleanup function
    return () => {
      isMonitoring = false;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }
}
