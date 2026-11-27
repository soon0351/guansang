export interface PreparedImage {
  dataUrl: string;
  base64: string;
  mimeType: string;
  width: number;
  height: number;
}

const MAX_DIMENSION = 1280;

/**
 * Resizes and compresses a user-selected image file to a clean JPEG/WebP payload
 * suitable for fast upload and high-fidelity Gemini vision & portrait generation.
 */
export function prepareUploadedImage(file: File): Promise<PreparedImage> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('이미지 파일(JPG, PNG, WebP)만 업로드할 수 있습니다.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : '';
      if (!src) {
        reject(new Error('이미지 데이터를 불러올 수 없습니다.'));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('지원되지 않거나 손상된 이미지 파일입니다.'));
      img.onload = () => {
        let targetW = img.naturalWidth;
        let targetH = img.naturalHeight;

        if (targetW > MAX_DIMENSION || targetH > MAX_DIMENSION) {
          const ratio = Math.min(MAX_DIMENSION / targetW, MAX_DIMENSION / targetH);
          targetW = Math.round(targetW * ratio);
          targetH = Math.round(targetH * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('브라우저 캔버스 초기화에 실패했습니다.'));
          return;
        }

        ctx.fillStyle = '#F8F4EA';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);

        const mimeType = 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, 0.9);
        const base64 = dataUrl.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

        resolve({
          dataUrl,
          base64,
          mimeType,
          width: targetW,
          height: targetH,
        });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
