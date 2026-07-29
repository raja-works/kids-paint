/**
 * StorageManager - Save/load persistence module for kids-paint application.
 * Manages saving drawings to localStorage, retrieving gallery items,
 * exporting canvas to PNG, and loading image files into HTMLImageElement.
 */
export class StorageManager {
  /**
   * Creates an instance of StorageManager.
   * @param {string} [storageKey='kids-paint-gallery'] - LocalStorage key for storing drawing gallery.
   */
  constructor(storageKey = 'kids-paint-gallery') {
    this.storageKey = storageKey;
    this.maxItems = 10;
  }

  /**
   * Save a canvas drawing to localStorage gallery.
   * @param {HTMLCanvasElement} canvas - The drawing canvas
   * @param {string} [name] - Optional name for the drawing
   * @returns {string} - The ID of the saved drawing
   */
  save(canvas, name) {
    if (!canvas || typeof canvas.toDataURL !== 'function') {
      throw new Error('StorageManager.save: A valid HTMLCanvasElement must be provided.');
    }

    const dataUrl = canvas.toDataURL('image/png');

    // Create 150x100 thumbnail canvas
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 150;
    thumbCanvas.height = 100;
    const ctx = thumbCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(canvas, 0, 0, 150, 100);
    }
    const thumbnail = thumbCanvas.toDataURL('image/png');

    const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `painting-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const drawingName = name || 'Untitled Painting';

    const newEntry = {
      id,
      name: drawingName,
      dataUrl,
      thumbnail,
      timestamp: Date.now()
    };

    let gallery = this.getGallery();
    
    // Add new entry and sort descending by timestamp
    gallery.unshift(newEntry);
    gallery.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // Limit gallery to 10 items — remove oldest if exceeding limit
    if (gallery.length > this.maxItems) {
      gallery = gallery.slice(0, this.maxItems);
    }

    // Try saving to localStorage with quota handling
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(gallery));
      return id;
    } catch (e) {
      console.warn('StorageManager.save: LocalStorage quota exceeded or error occurred. Attempting to free space.', e);
      // Attempt quota recovery by trimming oldest items until save succeeds
      while (gallery.length > 1) {
        gallery.pop(); // Remove oldest item
        try {
          localStorage.setItem(this.storageKey, JSON.stringify(gallery));
          return id;
        } catch (retryErr) {
          // Continue trimming
        }
      }
      console.error('StorageManager.save: Failed to save drawing even after clearing old drawings.', e);
      throw new Error('Unable to save drawing: LocalStorage storage quota exceeded.');
    }
  }

  /**
   * Get all saved drawings as an array of objects.
   * @returns {Array<{id: string, name: string, thumbnail: string, dataUrl: string, timestamp: number}>}
   */
  getGallery() {
    try {
      const rawData = localStorage.getItem(this.storageKey);
      if (!rawData) {
        return [];
      }
      const parsed = JSON.parse(rawData);
      if (!Array.isArray(parsed)) {
        console.warn(`StorageManager.getGallery: Corrupted data at key "${this.storageKey}". Resetting.`);
        return [];
      }

      // Filter out invalid records and sort descending by timestamp (newest first)
      return parsed
        .filter(item => item && typeof item === 'object' && item.id)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } catch (e) {
      console.error('StorageManager.getGallery: Failed to parse gallery JSON from localStorage', e);
      return [];
    }
  }

  /**
   * Load a specific drawing by ID.
   * @param {string} id
   * @returns {{id: string, name: string, dataUrl: string, timestamp: number}|null}
   */
  load(id) {
    if (!id) return null;
    const gallery = this.getGallery();
    const item = gallery.find(entry => entry.id === id);
    if (!item) return null;

    return {
      id: item.id,
      name: item.name,
      dataUrl: item.dataUrl,
      timestamp: item.timestamp
    };
  }

  /**
   * Delete a drawing by ID.
   * @param {string} id
   * @returns {boolean}
   */
  delete(id) {
    if (!id) return false;
    try {
      const gallery = this.getGallery();
      const initialLength = gallery.length;
      const filtered = gallery.filter(entry => entry.id !== id);

      if (filtered.length === initialLength) {
        return false;
      }

      localStorage.setItem(this.storageKey, JSON.stringify(filtered));
      return true;
    } catch (e) {
      console.error(`StorageManager.delete: Error deleting drawing with id "${id}"`, e);
      return false;
    }
  }

  /**
   * Get the most recent drawing.
   * @returns {{id: string, name: string, dataUrl: string, timestamp: number}|null}
   */
  getLatest() {
    const gallery = this.getGallery();
    if (gallery.length === 0) return null;

    const item = gallery[0];
    return {
      id: item.id,
      name: item.name,
      dataUrl: item.dataUrl,
      timestamp: item.timestamp
    };
  }

  /**
   * Download the canvas as a PNG file.
   * @param {HTMLCanvasElement} canvas
   * @param {string} [filename='my-painting.png']
   */
  downloadAsImage(canvas, filename = 'my-painting.png') {
    if (!canvas || typeof canvas.toDataURL !== 'function') {
      console.error('StorageManager.downloadAsImage: Invalid canvas element provided.');
      return;
    }
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = filename || 'my-painting.png';
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('StorageManager.downloadAsImage: Download failed', e);
    }
  }

  /**
   * Load an image file and return it as an HTMLImageElement.
   * @param {File} file
   * @returns {Promise<HTMLImageElement>}
   */
  async loadImageFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('StorageManager.loadImageFile: No file provided.'));
        return;
      }

      const reader = new FileReader();

      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('StorageManager.loadImageFile: Failed to load image element from source.'));
        img.src = event.target.result;
      };

      reader.onerror = () => {
        reject(new Error('StorageManager.loadImageFile: Failed to read file data.'));
      };

      reader.readAsDataURL(file);
    });
  }
}
