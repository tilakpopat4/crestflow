import React from 'react';
import ReactDOMServer from 'react-dom/server';
import QRCode from 'qrcode';
import { QRCodeSVG } from 'qrcode.react';

export function buildUpiPaymentUri(
  upiId: string,
  payeeName: string,
  amount: number,
  transactionNote: string = 'Invoice Payment'
): string {
  const cleanUpiId = upiId.trim().replace(/\s+/g, '');
  if (!cleanUpiId) return '';

  // Clean payee name and note (sanitize characters for clean URL encoding)
  const cleanName = payeeName.replace(/[^\w\s.-]/g, '').trim() || 'Payee';
  const cleanNote = transactionNote.replace(/#/g, '').replace(/[^\w\s.-]/g, '').trim() || 'Invoice Payment';

  // Format amount: include &am= if amount > 0
  let amountQuery = '';
  if (typeof amount === 'number' && !isNaN(amount) && amount > 0) {
    const formattedAmount = Number.isInteger(amount) ? amount.toString() : amount.toFixed(2);
    amountQuery = `&am=${formattedAmount}`;
  }

  // NPCI canonical UPI URI string format: upi://pay?pa=<UPI_ID>&pn=<NAME>&tn=<NOTE>&am=<AMOUNT>&cu=INR
  return `upi://pay?pa=${cleanUpiId}&pn=${encodeURIComponent(cleanName)}&tn=${encodeURIComponent(cleanNote)}${amountQuery}&cu=INR`;
}

export function generateUpiQrCodeSvg(
  upiId: string,
  payeeName: string,
  amount: number,
  transactionNote: string = 'Invoice Payment',
  size: number = 110
): string {
  const upiUri = buildUpiPaymentUri(upiId, payeeName, amount, transactionNote);
  if (!upiUri) return '';

  try {
    return ReactDOMServer.renderToString(
      React.createElement(QRCodeSVG, {
        value: upiUri,
        size: size,
        level: 'M',
        includeMargin: true,
        bgColor: '#ffffff',
        fgColor: '#000000'
      })
    );
  } catch (err) {
    console.warn('Failed to generate QRCodeSVG string:', err);
    return '';
  }
}

export async function generateUpiQrCodeDataUrl(
  upiId: string,
  payeeName: string,
  amount: number,
  transactionNote: string = 'Invoice Payment'
): Promise<{ pngDataUrl: string; canvas: HTMLCanvasElement | null }> {
  const upiUri = buildUpiPaymentUri(upiId, payeeName, amount, transactionNote);
  if (!upiUri) return { pngDataUrl: '', canvas: null };

  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      canvas.style.width = '110px';
      canvas.style.height = '110px';
      canvas.style.display = 'block';

      const qrLib = (QRCode as any).toCanvas ? QRCode : (QRCode as any).default;
      if (qrLib && typeof qrLib.toCanvas === 'function') {
        qrLib.toCanvas(
          canvas,
          upiUri,
          {
            width: 300,
            margin: 1,
            errorCorrectionLevel: 'M',
            color: { dark: '#000000', light: '#ffffff' }
          },
          (err: any) => {
            if (!err) {
              const pngDataUrl = canvas.toDataURL('image/png');
              if (pngDataUrl && pngDataUrl.length > 100) {
                return resolve({ pngDataUrl, canvas });
              }
            }
            tryToDataUrlFallback();
          }
        );
        return;
      }
    } catch (e) {
      console.warn('toCanvas attempt failed:', e);
    }

    tryToDataUrlFallback();

    function tryToDataUrlFallback() {
      try {
        const qrLib = (QRCode as any).toDataURL ? QRCode : (QRCode as any).default;
        if (qrLib && typeof qrLib.toDataURL === 'function') {
          qrLib.toDataURL(
            upiUri,
            {
              width: 300,
              margin: 1,
              errorCorrectionLevel: 'M',
              color: { dark: '#000000', light: '#ffffff' }
            },
            (err: any, url: string) => {
              if (!err && url && url.length > 100) {
                resolve({ pngDataUrl: url, canvas: null });
              } else {
                resolve({ pngDataUrl: '', canvas: null });
              }
            }
          );
          return;
        }
      } catch (e) {
        console.warn('toDataURL fallback failed:', e);
      }
      resolve({ pngDataUrl: '', canvas: null });
    }
  });
}
