import { documentsApi } from './api';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function uploadImage(file: File, type: string, maxDimension = 1600): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Select an image file.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Image must be smaller than 8 MB.');

  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('The selected image cannot be read.'));
      image.src = sourceUrl;
    });
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image processing is unavailable.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Image processing failed.')), 'image/jpeg', 0.78),
    );
    const upload = new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'photo'}.jpg`, { type: 'image/jpeg' });
    return documentsApi.uploadImage(upload, type);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
