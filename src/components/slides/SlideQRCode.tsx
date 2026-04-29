import { QRCodeSVG } from 'qrcode.react';
import styles from './SlideQRCode.module.css';

export type QRPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'inline';

type QRSize = 'sm' | 'md' | 'lg';

interface SlideQRCodeProps {
  /** URL to encode. */
  url: string;
  /** Optional small label rendered above the QR (defaults to "Scan to follow along"). */
  label?: string;
  /** Whether to show the URL string under the code. Default true. */
  showUrl?: boolean;
  /** Corner placement, or 'inline' to render in normal document flow. Default 'bottom-right'. */
  position?: QRPosition;
  /** Visual size. Default 'md'. */
  size?: QRSize;
}

/**
 * QR code card for slides.
 *
 * - `position="inline"` renders in document flow (e.g. inside an `<Overlay>`).
 * - Any corner position floats it absolutely over the slide.
 *
 * Visible at all viewport sizes when `inline`; corner-placed cards are hidden
 * below 768px so audience phones don't display a self-scan.
 */
export function SlideQRCode({
  url,
  label = 'Scan to follow along',
  showUrl = true,
  position = 'bottom-right',
  size = 'md',
}: SlideQRCodeProps) {
  return (
    <div
      className={styles.wrap}
      data-position={position}
      data-size={size}
      aria-label={`QR code for ${url}`}
    >
      <span className={styles.label}>{label}</span>
      <QRCodeSVG
        className={styles.qr}
        value={url}
        level="M"
        bgColor="#ffffff"
        fgColor="#0a0a0a"
        marginSize={2}
      />
      {showUrl && <span className={styles.url}>{url.replace(/^https?:\/\//, '')}</span>}
    </div>
  );
}
