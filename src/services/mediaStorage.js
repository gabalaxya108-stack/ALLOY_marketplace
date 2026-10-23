// src/services/mediaStorage.js
// Alloy Multi-Format Portfolio Media Storage & Validation Service
// Handles JPG, PNG, WebP, GIF, MP4, WebM, MOV with size validation, progress simulation, and local/cloud persistence.

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';

export const SUPPORTED_MEDIA_TYPES = {
  // Images
  'image/jpeg': { ext: 'jpg', type: 'image', label: 'JPEG Image', maxBytes: 20 * 1024 * 1024 }, // 20MB
  'image/png': { ext: 'png', type: 'image', label: 'PNG Image', maxBytes: 25 * 1024 * 1024 },   // 25MB
  'image/webp': { ext: 'webp', type: 'image', label: 'WebP Image', maxBytes: 20 * 1024 * 1024 },
  'image/gif': { ext: 'gif', type: 'image', label: 'Animated GIF', maxBytes: 30 * 1024 * 1024 }, // 30MB
  
  // Videos
  'video/mp4': { ext: 'mp4', type: 'video', label: 'MP4 Video', maxBytes: 100 * 1024 * 1024 },   // 100MB
  'video/webm': { ext: 'webm', type: 'video', label: 'WebM Video', maxBytes: 100 * 1024 * 1024 },
  'video/quicktime': { ext: 'mov', type: 'video', label: 'QuickTime MOV', maxBytes: 100 * 1024 * 1024 },
  'video/x-msvideo': { ext: 'avi', type: 'video', label: 'AVI Video', maxBytes: 80 * 1024 * 1024 }
};

export const ACCEPTED_FILE_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
  '.mp4', '.webm', '.mov'
];

export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Validates a creative media file against supported MIME types and size constraints
 */
export function validateMediaFile(file) {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  // Check file extension as fallback if MIME is generic (e.g. application/octet-stream or video/quicktime)
  const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
  let mime = file.type?.toLowerCase();

  if (!mime || mime === 'application/octet-stream') {
    if (ext === '.mov') mime = 'video/quicktime';
    else if (ext === '.mp4') mime = 'video/mp4';
    else if (ext === '.webm') mime = 'video/webm';
    else if (ext === '.webp') mime = 'image/webp';
    else if (ext === '.png') mime = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
    else if (ext === '.gif') mime = 'image/gif';
  }

  const spec = SUPPORTED_MEDIA_TYPES[mime];

  if (!spec && !ACCEPTED_FILE_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported format (${file.name}). Please upload JPG, PNG, WebP, GIF, MP4, WebM, or MOV.`
    };
  }

  const maxBytes = spec ? spec.maxBytes : 50 * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `File exceeds maximum allowed size of ${formatBytes(maxBytes)} (current: ${formatBytes(file.size)}).`
    };
  }

  const isVideo = mime.startsWith('video/') || ['.mp4', '.webm', '.mov'].includes(ext);
  const mediaType = isVideo ? 'video' : 'image';

  return {
    valid: true,
    mimeType: mime,
    mediaType,
    ext,
    error: null
  };
}

/**
 * Uploads a creative media file to Supabase Storage or persistent local storage
 * Supports onProgress callbacks (0-100%)
 */
export async function uploadPortfolioMedia(file, creatorId = 'creator-1', onProgress = null) {
  const validation = validateMediaFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const timestamp = Date.now();
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `portfolio/${creatorId}/${timestamp}_${cleanName}`;

  if (onProgress) onProgress(15);

  // 1. Try Supabase Storage if configured
  if (isSupabaseConfigured() && supabase) {
    try {
      if (onProgress) onProgress(35);
      const { data, error } = await supabase.storage
        .from('portfolio-media')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (!error && data) {
        if (onProgress) onProgress(85);
        const { data: urlData } = supabase.storage
          .from('portfolio-media')
          .getPublicUrl(path);

        if (urlData?.publicUrl) {
          if (onProgress) onProgress(100);
          return {
            id: `media-${timestamp}`,
            url: urlData.publicUrl,
            storagePath: path,
            storageType: 'supabase',
            name: file.name,
            size: file.size,
            mimeType: validation.mimeType,
            mediaType: validation.mediaType,
            isCover: false
          };
        }
      }
    } catch (err) {
      console.warn('[Alloy Storage] Supabase bucket upload failed, using local persistent fallback:', err);
    }
  }

  // 2. High-performance durable local media persistence (IndexedDB & Data URI)
  if (onProgress) onProgress(50);
  await new Promise(r => setTimeout(r, 60));
  if (onProgress) onProgress(80);
  await new Promise(r => setTimeout(r, 60));

  let objectUrl = null;
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    try {
      objectUrl = URL.createObjectURL(file);
    } catch (e) {}
  }

  // For durable cross-session survival without server, generate data URI for files <= 15MB
  let dataUrl = null;
  if (file.size <= 15 * 1024 * 1024 && typeof FileReader !== 'undefined') {
    try {
      dataUrl = await readFileAsDataUrl(file);
    } catch (e) {}
  }

  // Persistent reference that never decays on browser reload
  const durableUrl = dataUrl || `alloy-media://${path}`;
  const displayUrl = dataUrl || objectUrl || durableUrl;

  // Cache in IndexedDB for cross-session survival
  try {
    await saveToLocalMediaCache(`media-${timestamp}`, {
      file,
      storagePath: path,
      name: file.name,
      type: file.type,
      size: file.size,
      creatorId,
      dataUrl
    });
  } catch (e) {}

  if (onProgress) onProgress(100);

  return {
    id: `media-${timestamp}`,
    url: displayUrl,
    previewUrl: objectUrl || displayUrl,
    durableUrl,
    storagePath: path,
    storageBucket: 'portfolio-media',
    storageType: dataUrl ? 'local-durable' : 'local-indexeddb',
    name: file.name,
    size: file.size,
    mimeType: validation.mimeType,
    mediaType: validation.mediaType,
    isCover: false
  };
}

/**
 * Safely converts a File to base64 Data URL for persistent storage
 */
export function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    if (typeof FileReader === 'undefined' || !file) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

// Lightweight IndexedDB helper for persisting local blobs across page refreshes
const DB_NAME = 'alloy_portfolio_media_v1';
const STORE_NAME = 'media_blobs';

export function getDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject('No indexedDB');
    }
    const request = window.indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveToLocalMediaCache(id, payload) {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const record = payload instanceof File
      ? { id, file: payload, name: payload.name, type: payload.type, size: payload.size, timestamp: Date.now() }
      : { id, timestamp: Date.now(), ...payload };
    store.put(record);
  } catch (e) {
    // Graceful fallback
  }
}

export async function getFromLocalMediaCache(id) {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

export async function removeFromLocalMediaCache(idOrPath) {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(idOrPath);
      resolve(true);
    });
  } catch (e) {
    return false;
  }
}

/**
 * Resolves a media item or storage path to an active, renderable URL.
 * Supports public/private models and on-demand signed URL generation for private media.
 */
export async function resolveMediaUrl(mediaItemOrPath, options = {}) {
  if (!mediaItemOrPath) return '';
  const item = typeof mediaItemOrPath === 'string' ? { url: mediaItemOrPath, storagePath: mediaItemOrPath } : mediaItemOrPath;
  const currentUrl = item.url || '';

  // Already a permanent remote URL or data URL
  if (currentUrl.startsWith('https://') || currentUrl.startsWith('http://') || currentUrl.startsWith('data:')) {
    // If it's a Supabase storage path and marked private, we can request a signed URL if requested
    if (options.isPrivate && isSupabaseConfigured() && supabase && item.storagePath) {
      try {
        const { data } = await supabase.storage.from('portfolio-media').createSignedUrl(item.storagePath, options.expiresIn || 3600);
        if (data?.signedUrl) return data.signedUrl;
      } catch (e) {}
    }
    return currentUrl;
  }

  // If Supabase path
  if (isSupabaseConfigured() && supabase && (item.storagePath || currentUrl.startsWith('portfolio/'))) {
    const path = item.storagePath || currentUrl;
    if (options.isPrivate) {
      try {
        const { data } = await supabase.storage.from('portfolio-media').createSignedUrl(path, options.expiresIn || 3600);
        if (data?.signedUrl) return data.signedUrl;
      } catch (e) {}
    }
    const { data } = supabase.storage.from('portfolio-media').getPublicUrl(path);
    if (data?.publicUrl) return data.publicUrl;
  }

  // If local / IndexedDB entry or expired blob
  if (item.id || currentUrl.startsWith('blob:') || currentUrl.startsWith('alloy-media://')) {
    const cached = await getFromLocalMediaCache(item.id || item.storagePath);
    if (cached) {
      if (cached.dataUrl) return cached.dataUrl;
      if (cached.file && typeof URL !== 'undefined' && URL.createObjectURL) {
        return URL.createObjectURL(cached.file);
      }
    }
    // If cache lookup failed, fallback to durable reference if currentUrl is an expired transient blob
    if (currentUrl.startsWith('blob:') && item.durableUrl && !item.durableUrl.startsWith('blob:')) {
      return item.durableUrl;
    }
  }

  return (currentUrl && !currentUrl.startsWith('blob:')) ? currentUrl : (item.durableUrl || '');
}

/**
 * Rehydrates a portfolio project's media items so that no expired blob: URLs remain broken.
 */
export async function rehydrateProjectMedia(project) {
  if (!project) return project;
  const mediaList = Array.isArray(project.media) ? [...project.media] : [];
  const rehydratedMedia = [];

  for (const m of mediaList) {
    if (!m) continue;
    let freshUrl = m.url;
    if (!freshUrl || freshUrl.startsWith('blob:') || freshUrl.startsWith('alloy-media://')) {
      freshUrl = await resolveMediaUrl(m);
    }
    rehydratedMedia.push({
      ...m,
      url: freshUrl || m.durableUrl || m.url
    });
  }

  let finalImage = project.image;
  if (!finalImage || finalImage.startsWith('blob:') || finalImage.startsWith('alloy-media://')) {
    const cover = rehydratedMedia.find(m => m.isCover) || rehydratedMedia[0];
    finalImage = cover?.url || await resolveMediaUrl(finalImage) || project.image;
  }

  let finalVideo = project.video;
  if (finalVideo && (finalVideo.startsWith('blob:') || finalVideo.startsWith('alloy-media://'))) {
    const vid = rehydratedMedia.find(m => m.mediaType === 'video' || m.mimeType?.startsWith('video/'));
    finalVideo = vid?.url || await resolveMediaUrl(finalVideo) || project.video;
  }

  return {
    ...project,
    media: rehydratedMedia,
    image: finalImage,
    video: finalVideo
  };
}

/**
 * Batch rehydrates an array of projects.
 */
export async function rehydratePortfolioProjects(projects = []) {
  if (!Array.isArray(projects)) return [];
  return Promise.all(projects.map(p => rehydrateProjectMedia(p)));
}

/**
 * Deletes portfolio media from cloud or local storage, strictly enforcing creator ownership.
 */
export async function deletePortfolioMedia(storagePath, creatorId) {
  if (!storagePath || !creatorId) {
    throw new Error('storagePath and creatorId are required to delete portfolio media.');
  }

  // Strict ownership enforcement: media must reside in the creator's isolated namespace
  const expectedPrefix = `portfolio/${creatorId}/`;
  if (!storagePath.startsWith(expectedPrefix) && !storagePath.startsWith(`local://${creatorId}_`)) {
    throw new Error(`Unauthorized: Cannot modify or delete media belonging to another creator (expected namespace ${expectedPrefix}).`);
  }

  // 1. Remove from Supabase Storage if configured
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.storage.from('portfolio-media').remove([storagePath]);
    } catch (err) {
      console.warn('[Alloy Storage] Cloud media removal error:', err);
    }
  }

  // 2. Remove from local cache
  await removeFromLocalMediaCache(storagePath);

  return { success: true, path: storagePath };
}
