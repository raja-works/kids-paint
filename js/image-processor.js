/**
 * @module ImageProcessor
 * Converts images into coloring page outlines.
 */

export class ImageProcessor {
  constructor() {
    /** @type {Uint8Array|null} */
    this._cachedBlurredData = null;
    /** @type {number} */
    this._width = 0;
    /** @type {number} */
    this._height = 0;
  }

  /**
   * Convert an image file to a coloring page outline.
   * @param {File} file - The image file from file input
   * @param {number} canvasWidth - Target canvas width
   * @param {number} canvasHeight - Target canvas height  
   * @param {number} sensitivity - Edge detection sensitivity 0-100 (default 50)
   * @returns {Promise<ImageData>} - The processed outline as ImageData
   */
  async processImage(file, canvasWidth, canvasHeight, sensitivity = 50) {
    if (!file) {
      throw new Error("No image file provided for processing.");
    }

    // 1. Load image
    const img = await this._loadImage(file);

    // 2. Scale to fit
    const canvas = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(canvasWidth, canvasHeight)
      : document.createElement('canvas');

    if (canvas.width === undefined) {
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error("Failed to get 2D canvas context.");
    }

    // Fill white background for letterboxing
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Calculate dimensions to maintain aspect ratio (object-fit: contain)
    const scale = Math.min(canvasWidth / img.width, canvasHeight / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (canvasWidth - w) / 2;
    const y = (canvasHeight - h) / 2;

    ctx.drawImage(img, x, y, w, h);

    const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);

    // 3. Grayscale conversion
    const grayscale = this._toGrayscale(imgData);

    // 4. Gaussian blur
    const blurred = this._gaussianBlur(grayscale, canvasWidth, canvasHeight);

    // Cache the blurred grayscale data for adjustSensitivity (Steps 5-7)
    this._cachedBlurredData = blurred;
    this._width = canvasWidth;
    this._height = canvasHeight;

    return this.adjustSensitivity(sensitivity);
  }

  /**
   * Adjust sensitivity on already-loaded image data without re-uploading.
   * @param {number} sensitivity - 0-100
   * @returns {ImageData|null}
   */
  adjustSensitivity(sensitivity) {
    if (!this._cachedBlurredData) {
      return null;
    }

    // 5. Sobel edge detection
    const magnitudes = this._sobel(this._cachedBlurredData, this._width, this._height);

    // 6 & 7. Thresholding and Result
    return this._threshold(magnitudes, this._width, this._height, sensitivity);
  }

  /**
   * Loads a File into an HTMLImageElement
   * @param {File} file 
   * @returns {Promise<HTMLImageElement>}
   * @private
   */
  _loadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Failed to decode image."));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error("Failed to read image file."));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Converts ImageData to a flat Uint8Array of grayscale values.
   * @param {ImageData} imgData 
   * @returns {Uint8Array}
   * @private
   */
  _toGrayscale(imgData) {
    const data = imgData.data;
    const gray = new Uint8Array(data.length / 4);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    return gray;
  }

  /**
   * Applies a 5x5 Gaussian blur.
   * @param {Uint8Array} data 
   * @param {number} width 
   * @param {number} height 
   * @returns {Uint8Array}
   * @private
   */
  _gaussianBlur(data, width, height) {
    const kernel = [
      1,  4,  7,  4, 1,
      4, 16, 26, 16, 4,
      7, 26, 41, 26, 7,
      4, 16, 26, 16, 4,
      1,  4,  7,  4, 1
    ];
    const weightSum = 273;
    const result = new Uint8Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;

        for (let ky = -2; ky <= 2; ky++) {
          for (let kx = -2; kx <= 2; kx++) {
            const ny = Math.min(Math.max(y + ky, 0), height - 1);
            const nx = Math.min(Math.max(x + kx, 0), width - 1);
            
            const val = data[ny * width + nx];
            const weight = kernel[(ky + 2) * 5 + (kx + 2)];
            sum += val * weight;
          }
        }
        
        result[y * width + x] = sum / weightSum;
      }
    }

    return result;
  }

  /**
   * Applies 3x3 Sobel operator for edge detection.
   * @param {Uint8Array} data 
   * @param {number} width 
   * @param {number} height 
   * @returns {Float32Array}
   * @private
   */
  _sobel(data, width, height) {
    const result = new Float32Array(width * height);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const p00 = data[(y - 1) * width + (x - 1)];
        const p01 = data[(y - 1) * width + x];
        const p02 = data[(y - 1) * width + (x + 1)];
        const p10 = data[y * width + (x - 1)];
        const p12 = data[y * width + (x + 1)];
        const p20 = data[(y + 1) * width + (x - 1)];
        const p21 = data[(y + 1) * width + x];
        const p22 = data[(y + 1) * width + (x + 1)];

        const gx = -p00 + p02 - 2 * p10 + 2 * p12 - p20 + p22;
        const gy = -p00 - 2 * p01 - p02 + p20 + 2 * p21 + p22;

        result[y * width + x] = Math.sqrt(gx * gx + gy * gy);
      }
    }

    return result;
  }

  /**
   * Applies thresholding to magnitude values to create black outlines on a white background.
   * @param {Float32Array} magnitudes 
   * @param {number} width 
   * @param {number} height 
   * @param {number} sensitivity 
   * @returns {ImageData}
   * @private
   */
  _threshold(magnitudes, width, height, sensitivity) {
    // Determine ImageData class to use based on environment
    let imgData;
    if (typeof ImageData !== 'undefined') {
      imgData = new ImageData(width, height);
    } else {
      // Fallback if somehow missing
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      imgData = ctx.createImageData(width, height);
    }
    
    const data = imgData.data;

    // Map sensitivity: 0 -> 200 threshold, 100 -> 20 threshold
    const threshold = 200 - (Math.min(Math.max(sensitivity, 0), 100) / 100) * 180;

    for (let i = 0; i < magnitudes.length; i++) {
      const mag = magnitudes[i];
      // Pixels above threshold become black edges (0), otherwise white background (255)
      const color = mag > threshold ? 0 : 255;

      const idx = i * 4;
      data[idx] = color;       // R
      data[idx + 1] = color;   // G
      data[idx + 2] = color;   // B
      data[idx + 3] = 255;     // Alpha (fully opaque)
    }

    return imgData;
  }
}
