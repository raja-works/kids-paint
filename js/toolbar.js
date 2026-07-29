/**
 * toolbar.js — Tool Selection & UI for Kids Paint
 * Wires up all toolbar buttons, color palette, brush size slider,
 * and action buttons to the drawing engine.
 * @module toolbar
 */

export class Toolbar {
  /**
   * @param {import('./canvas.js').DrawingEngine} engine
   * @param {import('./audio.js').AudioEngine} audio
   * @param {import('./storage.js').StorageManager} storage
   * @param {import('./image-processor.js').ImageProcessor} imageProcessor
   */
  constructor(engine, audio, storage, imageProcessor) {
    this.engine = engine;
    this.audio = audio;
    this.storage = storage;
    this.imageProcessor = imageProcessor;

    this.currentTool = 'pen';
    this.currentColor = '#1a1a2e';

    this._initToolButtons();
    this._initColorPalette();
    this._initBrushSize();
    this._initActionButtons();
    this._initSoundToggle();
    this._initGallery();
    this._initOutlineModal();
    this._initFileInputs();
    this._initConfirmModal();
  }

  // ─── Tool Buttons ───

  _initToolButtons() {
    const toolBtns = document.querySelectorAll('.tool-btn[data-tool]');
    toolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;

        if (tool === 'upload') {
          document.getElementById('file-upload').click();
          return;
        }

        this.currentTool = tool;
        this.engine.setTool(tool);

        // Update active state
        toolBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  // ─── Color Palette ───

  _initColorPalette() {
    const palette = document.getElementById('color-palette');
    const swatches = palette.querySelectorAll('.color-swatch');
    const customInput = document.getElementById('custom-color');

    swatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        const color = swatch.dataset.color;
        this._setColor(color);
        swatches.forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
      });
    });

    customInput.addEventListener('input', (e) => {
      const color = e.target.value;
      this._setColor(color);
      swatches.forEach(s => s.classList.remove('active'));
    });
  }

  _setColor(color) {
    this.currentColor = color;
    this.engine.setColor(color);

    // Update size preview color
    const preview = document.getElementById('size-preview');
    preview.style.background = color;
    preview.style.boxShadow = `0 0 8px ${color}40`;
  }

  // ─── Brush Size ───

  _initBrushSize() {
    const slider = document.getElementById('brush-size');
    const preview = document.getElementById('size-preview');

    const updatePreview = () => {
      const size = parseInt(slider.value);
      this.engine.setBrushSize(size);
      const displaySize = Math.max(4, Math.min(40, size));
      preview.style.width = `${displaySize}px`;
      preview.style.height = `${displaySize}px`;
    };

    slider.addEventListener('input', updatePreview);
    updatePreview();
  }

  // ─── Action Buttons ───

  _initActionButtons() {
    // Undo
    document.getElementById('btn-undo').addEventListener('click', () => {
      this.engine.undo();
    });

    // Redo
    document.getElementById('btn-redo').addEventListener('click', () => {
      this.engine.redo();
    });

    // Save
    document.getElementById('btn-save').addEventListener('click', () => {
      const canvas = this.engine.getCanvas();
      const name = `Painting ${new Date().toLocaleTimeString()}`;
      this.storage.save(canvas, name);
      this._showToast('Painting saved! 🎉');
    });

    // Download
    document.getElementById('btn-download').addEventListener('click', () => {
      const canvas = this.engine.getCanvas();
      this.storage.downloadAsImage(canvas, 'my-painting.png');
    });

    // Gallery
    document.getElementById('btn-gallery').addEventListener('click', () => {
      this._openGallery();
    });

    // New Canvas
    document.getElementById('btn-new').addEventListener('click', () => {
      this._showConfirmModal();
    });
  }

  // ─── Sound Toggle ───

  _initSoundToggle() {
    const btn = document.getElementById('btn-sound');
    btn.addEventListener('click', () => {
      const muted = !this.audio.isMuted();
      this.audio.setMuted(muted);
      btn.classList.toggle('muted', muted);
    });
  }

  // ─── Gallery Modal ───

  _initGallery() {
    const modal = document.getElementById('gallery-modal');
    const closeBtn = document.getElementById('btn-close-gallery');

    closeBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });

    // Load file button
    document.getElementById('btn-load-file').addEventListener('click', () => {
      document.getElementById('file-open').click();
    });
  }

  _openGallery() {
    const modal = document.getElementById('gallery-modal');
    const grid = document.getElementById('gallery-grid');
    const empty = document.getElementById('gallery-empty');

    const gallery = this.storage.getGallery();

    if (gallery.length === 0) {
      grid.classList.add('hidden');
      empty.classList.remove('hidden');
    } else {
      grid.classList.remove('hidden');
      empty.classList.add('hidden');

      grid.innerHTML = gallery.map(item => `
        <div class="gallery-item" data-id="${item.id}">
          <img src="${item.thumbnail}" alt="${item.name}">
          <div class="gallery-item-info">
            <div class="gallery-item-name">${item.name}</div>
            <div class="gallery-item-date">${new Date(item.timestamp).toLocaleDateString()}</div>
          </div>
          <button class="gallery-item-delete" data-delete-id="${item.id}" aria-label="Delete">&times;</button>
        </div>
      `).join('');

      // Load on click
      grid.querySelectorAll('.gallery-item').forEach(el => {
        el.addEventListener('click', (e) => {
          if (e.target.closest('.gallery-item-delete')) return;
          const id = el.dataset.id;
          const drawing = this.storage.load(id);
          if (drawing) {
            this._loadDataUrl(drawing.dataUrl);
            modal.classList.add('hidden');
          }
        });
      });

      // Delete buttons
      grid.querySelectorAll('.gallery-item-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.dataset.deleteId;
          this.storage.delete(id);
          this._openGallery(); // refresh
        });
      });
    }

    modal.classList.remove('hidden');
  }

  // ─── Outline Modal ───

  _initOutlineModal() {
    const modal = document.getElementById('outline-modal');
    const closeBtn = document.getElementById('btn-close-outline');
    const cancelBtn = document.getElementById('btn-cancel-outline');
    const useBtn = document.getElementById('btn-use-outline');
    const sensitivitySlider = document.getElementById('outline-sensitivity');
    const previewCanvas = document.getElementById('outline-preview-canvas');
    const previewCtx = previewCanvas.getContext('2d');

    this._outlineImageData = null;

    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });

    sensitivitySlider.addEventListener('input', () => {
      if (!this.imageProcessor) return;
      const sensitivity = parseInt(sensitivitySlider.value);
      const result = this.imageProcessor.adjustSensitivity(sensitivity);
      if (result) {
        this._outlineImageData = result;
        previewCanvas.width = result.width;
        previewCanvas.height = result.height;
        previewCtx.putImageData(result, 0, 0);
      }
    });

    useBtn.addEventListener('click', () => {
      if (this._outlineImageData) {
        this.engine.loadImageData(this._outlineImageData);
        modal.classList.add('hidden');
        this._showToast('Coloring page ready! 🎉');
      }
    });
  }

  async _openOutlineModal(file) {
    const modal = document.getElementById('outline-modal');
    const loading = document.getElementById('outline-loading');
    const previewCanvas = document.getElementById('outline-preview-canvas');
    const previewCtx = previewCanvas.getContext('2d');

    modal.classList.remove('hidden');
    loading.classList.remove('hidden');

    try {
      const drawCanvas = this.engine.getCanvas();
      const result = await this.imageProcessor.processImage(
        file,
        drawCanvas.width,
        drawCanvas.height,
        parseInt(document.getElementById('outline-sensitivity').value)
      );

      this._outlineImageData = result;
      previewCanvas.width = result.width;
      previewCanvas.height = result.height;
      previewCtx.putImageData(result, 0, 0);
    } catch (err) {
      console.error('Image processing failed:', err);
      this._showToast('Could not process image 😢');
      modal.classList.add('hidden');
    } finally {
      loading.classList.add('hidden');
    }
  }

  // ─── File Inputs ───

  _initFileInputs() {
    // Upload image for outline conversion
    document.getElementById('file-upload').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this._openOutlineModal(file);
        e.target.value = ''; // reset so same file can be re-selected
      }
    });

    // Open image file to continue drawing
    document.getElementById('file-open').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const img = await this.storage.loadImageFile(file);
          this.engine.loadImage(img);
          document.getElementById('gallery-modal').classList.add('hidden');
          this._showToast('Image loaded! 🖼️');
        } catch (err) {
          console.error('Failed to load image:', err);
          this._showToast('Could not load image 😢');
        }
        e.target.value = '';
      }
    });
  }

  // ─── Confirm New Canvas Modal ───

  _initConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    const cancelBtn = document.getElementById('btn-cancel-new');
    const confirmBtn = document.getElementById('btn-confirm-new');

    cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
    confirmBtn.addEventListener('click', () => {
      this.engine.clear();
      modal.classList.add('hidden');
      this._showToast('Fresh canvas ready! ✨');
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  }

  _showConfirmModal() {
    document.getElementById('confirm-modal').classList.remove('hidden');
  }

  // ─── Helper: Load data URL onto canvas ───

  _loadDataUrl(dataUrl) {
    const img = new Image();
    img.onload = () => {
      this.engine.loadImage(img);
    };
    img.src = dataUrl;
  }

  // ─── Toast notification ───

  _showToast(message) {
    // Remove any existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      background: rgba(26, 25, 48, 0.95);
      color: white;
      border-radius: 12px;
      font-family: 'Outfit', sans-serif;
      font-size: 15px;
      font-weight: 600;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      z-index: 200;
      animation: toast-in 0.3s cubic-bezier(0.22, 1, 0.36, 1);
      pointer-events: none;
    `;

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }
}
