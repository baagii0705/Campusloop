// Prepare camera photos locally. Keep animations and already-small files intact.
export async function optimizeListingImage(file) {
  if (!['image/jpeg', 'image/png'].includes(file.type) || file.size <= 200 * 1024) return file;
  const url = URL.createObjectURL(file);
  let canvas;
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.82));
    if (!blob || blob.size >= file.size) return file;
    const extension = blob.type === 'image/webp' ? 'webp' : 'png';
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.' + extension, {
      type: blob.type, lastModified: file.lastModified
    });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
    if (canvas) { canvas.width = 0; canvas.height = 0; }
  }
}
