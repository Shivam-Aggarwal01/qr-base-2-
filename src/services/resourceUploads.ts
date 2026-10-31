import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, storage } from '../firebase';

export async function uploadResourceImage(assetId: string, file: File): Promise<string> {
  if (!auth.currentUser) {
    throw new Error('Sign in before uploading a resource image.');
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Resource images must be 5 MB or smaller.');
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const imageRef = ref(storage, `resources/${assetId}/${Date.now()}-${safeName}`);
  await uploadBytes(imageRef, file, { contentType: file.type });
  return getDownloadURL(imageRef);
}
