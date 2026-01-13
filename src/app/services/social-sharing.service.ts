import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SocialSharingService {
  constructor() {}

  /**
   * Generate a shareable image with book cover + quote using Canvas
   */
  generateShareImage(
    bookTitle: string,
    bookCover: string,
    quote: string = 'Khám phá tri thức tại Thư viện THCS Phương Tú'
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 630; // Facebook optimal size
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject('Canvas context not available');
        return;
      }

      // Background gradient
      const gradient = ctx.createLinearGradient(
        0,
        0,
        canvas.width,
        canvas.height
      );
      gradient.addColorStop(0, '#0f172a');
      gradient.addColorStop(1, '#1e293b');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Load book cover image
      const coverImg = new Image();
      coverImg.crossOrigin = 'anonymous';
      coverImg.src = bookCover || '/assets/placeholder-book.png';

      coverImg.onload = () => {
        // Draw book cover (left side)
        const coverWidth = 350;
        const coverHeight = 500;
        const coverX = 80;
        const coverY = (canvas.height - coverHeight) / 2;

        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;
        ctx.drawImage(coverImg, coverX, coverY, coverWidth, coverHeight);
        ctx.shadowBlur = 0;

        // Draw text area (right side)
        const textX = coverX + coverWidth + 60;
        const textWidth = canvas.width - textX - 80;

        // Book title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial, sans-serif';
        this.wrapText(ctx, bookTitle, textX, 150, textWidth, 60);

        // Quote/Description
        ctx.fillStyle = '#94a3b8';
        ctx.font = '28px Arial, sans-serif';
        this.wrapText(ctx, quote, textX, 300, textWidth, 40);

        // Footer branding
        ctx.fillStyle = '#3b82f6';
        ctx.font = 'bold 24px Arial, sans-serif';
        ctx.fillText('📚 Thư viện THCS Phương Tú', textX, canvas.height - 80);

        // Convert to data URL
        resolve(canvas.toDataURL('image/png'));
      };

      coverImg.onerror = () => {
        // Fallback: Generate without image
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 52px Arial';
        this.wrapText(ctx, bookTitle, 100, 250, canvas.width - 200, 70);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '32px Arial';
        this.wrapText(ctx, quote, 100, 400, canvas.width - 200, 50);

        resolve(canvas.toDataURL('image/png'));
      };
    });
  }

  /**
   * Helper: Wrap text to fit within width
   */
  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  }

  /**
   * Share on Facebook
   */
  shareOnFacebook(bookTitle: string, url: string) {
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      url
    )}&quote=${encodeURIComponent(bookTitle)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
  }

  /**
   * Share on Twitter/X
   */
  shareOnTwitter(bookTitle: string, url: string) {
    const text = `Đang đọc sách hay: ${bookTitle} 📚`;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      text
    )}&url=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
  }

  /**
   * Download generated image
   */
  downloadImage(dataUrl: string, filename: string) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  }
}
