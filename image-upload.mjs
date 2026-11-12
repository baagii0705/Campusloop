// Prepare camera photos locally. Keep animations and already-small files intact.
export async function optimizeListingImage(file, {maxDimension=1600, quality=0.82, minBytes=200*1024}={}) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size <= minBytes) return file;
  const url = URL.createObjectURL(file);
  let canvas;
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
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


// Never replace or delete originals. A thumbnail failure must not discard a valid upload.
export async function uploadListingImageWithCard(bucket, path, file) {
  const original = await bucket.upload(path, file, {contentType:file.type, upsert:false});
  if (original.error) throw original.error;
  if (file.type === 'image/gif') return; // Keep animation on the original path.
  try {
    const card = await optimizeListingImage(file, {maxDimension:720, quality:0.76, minBytes:0});
    const result = await bucket.upload(path+'_card', card, {contentType:card.type, upsert:false});
    if (result.error) console.warn('Card image unavailable; the original remains available.');
  } catch {
    console.warn('Card image unavailable; the original remains available.');
  }
}
