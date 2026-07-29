/**
 * canvas.js — Drawing Engine for Kids Paint
 * Handles all canvas drawing operations including pen, pencil, brush, eraser tools.
 * Uses Pointer Events for unified mouse + touch input.
 * @module canvas
 */

export class DrawingEngine {
  /**
   * @param {HTMLCanvasElement} canvasEl
   * @param {import('./audio.js').AudioEngine} audioEngine
   * @param {import('./flood-fill.js').FloodFill} floodFill
   */
  constructor(canvasEl, audioEngine, floodFill) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d', { willReadFrequently: true });
    this.audio = audioEngine;
    this.floodFill = floodFill;

    // Drawing state
    this.isDrawing = false;
    this.currentTool = 'pen';
    this.currentColor = '#1a1a2e';
    this.brushSize = 8;
    this.lastX = 0;
    this.lastY = 0;
    this.lastTime = 0;
    this.velocity = 0;

    // Undo/Redo
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 30;

    // Bind events
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onPointerLeave = this._onPointerLeave.bind(this);

    this._attachEvents();
  }

  /** Resize canvas to fit container */
  resize(width, height) {
    // Save current drawing
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

    this.canvas.width = width;
    this.canvas.height = height;

    // Restore drawing
    this._fillWhite();
    this.ctx.putImageData(imageData, 0, 0);
  }

  /** Set canvas to specific dimensions and clear */
  init(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this._fillWhite();
    this._saveState();
  }

  /** Set the active tool */
  setTool(tool) {
    this.currentTool = tool;
    this._updateCursor();
  }

  /** Set the drawing color */
  setColor(color) {
    this.currentColor = color;
  }

  /** Set brush size */
  setBrushSize(size) {
    this.brushSize = size;
  }

  /** Clear canvas */
  clear() {
    this._fillWhite();
    this._saveState();
  }

  /** Undo last action */
  undo() {
    if (this.undoStack.length <= 1) return false;
    const current = this.undoStack.pop();
    this.redoStack.push(current);
    const prev = this.undoStack[this.undoStack.length - 1];
    this.ctx.putImageData(prev, 0, 0);
    return true;
  }

  /** Redo last undone action */
  redo() {
    if (this.redoStack.length === 0) return false;
    const state = this.redoStack.pop();
    this.undoStack.push(state);
    this.ctx.putImageData(state, 0, 0);
    return true;
  }

  /** Load an image onto the canvas */
  loadImage(img) {
    this._fillWhite();
    // Fit image maintaining aspect ratio
    const scale = Math.min(
      this.canvas.width / img.width,
      this.canvas.height / img.height
    );
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (this.canvas.width - w) / 2;
    const y = (this.canvas.height - h) / 2;
    this.ctx.drawImage(img, x, y, w, h);
    this._saveState();
  }

  /** Load ImageData directly onto the canvas */
  loadImageData(imageData) {
    this._fillWhite();
    this.ctx.putImageData(imageData, 0, 0);
    this._saveState();
  }

  /** Get the canvas element */
  getCanvas() {
    return this.canvas;
  }

  // ─── Private Methods ───

  _attachEvents() {
    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    this.canvas.addEventListener('pointermove', this._onPointerMove);
    this.canvas.addEventListener('pointerup', this._onPointerUp);
    this.canvas.addEventListener('pointerleave', this._onPointerLeave);
    this.canvas.addEventListener('pointercancel', this._onPointerUp);

    // Prevent context menu on long press
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  _getCanvasPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  _onPointerDown(e) {
    e.preventDefault();
    this.canvas.setPointerCapture(e.pointerId);

    const pos = this._getCanvasPos(e);

    // Handle fill tool
    if (this.currentTool === 'fill') {
      this._doFloodFill(Math.round(pos.x), Math.round(pos.y));
      return;
    }

    this.isDrawing = true;
    this.lastX = pos.x;
    this.lastY = pos.y;
    this.lastTime = performance.now();
    this.velocity = 0;

    // Start audio
    this.audio.startStrokeSound(this.currentTool, 0.3);

    // Draw a dot for single clicks
    this._drawSegment(pos.x, pos.y, pos.x, pos.y, 0.3);
  }

  _onPointerMove(e) {
    if (!this.isDrawing) return;
    e.preventDefault();

    const pos = this._getCanvasPos(e);
    const now = performance.now();
    const dt = now - this.lastTime;

    // Calculate velocity (0-1)
    const dx = pos.x - this.lastX;
    const dy = pos.y - this.lastY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = dt > 0 ? dist / dt : 0;
    this.velocity = Math.min(1, speed / 3); // normalize

    // Draw
    this._drawSegment(this.lastX, this.lastY, pos.x, pos.y, this.velocity);

    // Update audio
    this.audio.updateStrokeSound(this.velocity);

    this.lastX = pos.x;
    this.lastY = pos.y;
    this.lastTime = now;
  }

  _onPointerUp(e) {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.audio.stopStrokeSound();
    this._saveState();
  }

  _onPointerLeave(e) {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.audio.stopStrokeSound();
    this._saveState();
  }

  _drawSegment(x1, y1, x2, y2, speed) {
    const ctx = this.ctx;
    const size = this.brushSize;

    switch (this.currentTool) {
      case 'pen':
        this._drawPen(ctx, x1, y1, x2, y2, size);
        break;
      case 'pencil':
        this._drawPencil(ctx, x1, y1, x2, y2, size);
        break;
      case 'brush':
        this._drawBrush(ctx, x1, y1, x2, y2, size, speed);
        break;
      case 'eraser':
        this._drawEraser(ctx, x1, y1, x2, y2, size);
        break;
    }
  }

  /** Pen — Clean solid strokes */
  _drawPen(ctx, x1, y1, x2, y2, size) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = this.currentColor;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  /** Pencil — Textured, slightly rough strokes */
  _drawPencil(ctx, x1, y1, x2, y2, size) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const steps = Math.max(1, Math.floor(dist / 2));

    // Draw multiple thin lines with slight offsets to simulate graphite
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = this.currentColor;
      ctx.globalAlpha = 0.3 + Math.random() * 0.2;
      ctx.lineWidth = size * (0.3 + Math.random() * 0.4);

      ctx.beginPath();
      ctx.moveTo(x1 + (Math.random() - 0.5) * size * 0.3, y1 + (Math.random() - 0.5) * size * 0.3);

      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const mx = x1 + (x2 - x1) * t + (Math.random() - 0.5) * size * 0.2;
        const my = y1 + (y2 - y1) * t + (Math.random() - 0.5) * size * 0.2;
        ctx.lineTo(mx, my);
      }

      ctx.stroke();
    }

    ctx.restore();
  }

  /** Brush — Soft, painterly strokes with stamped circles */
  _drawBrush(ctx, x1, y1, x2, y2, size, speed) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const spacing = Math.max(1, size * 0.15);
    const steps = Math.max(1, Math.ceil(dist / spacing));

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const cx = x1 + (x2 - x1) * t;
      const cy = y1 + (y2 - y1) * t;

      // Vary radius slightly for natural feel
      const radius = size * (0.4 + Math.random() * 0.15);

      // Radial gradient stamp
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, this._hexToRgba(this.currentColor, 0.25));
      grad.addColorStop(0.5, this._hexToRgba(this.currentColor, 0.12));
      grad.addColorStop(1, this._hexToRgba(this.currentColor, 0));

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /** Eraser — Removes drawn content */
  _drawEraser(ctx, x1, y1, x2, y2, size) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.lineWidth = size * 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();

    // Re-draw erased area as white (so it's visible on export)
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();
  }

  /** Flood fill at (x, y) */
  _doFloodFill(x, y) {
    if (x < 0 || x >= this.canvas.width || y < 0 || y >= this.canvas.height) return;

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const fillColor = this._hexToRgbaArray(this.currentColor);

    const result = this.floodFill.fill(imageData, x, y, fillColor, 30);
    this.ctx.putImageData(result, 0, 0);

    // Play pour sound
    this.audio.playFillSound();
    this._saveState();
  }

  /** Save current canvas state for undo */
  _saveState() {
    const state = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.undoStack.push(state);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    // Clear redo stack on new action
    this.redoStack = [];
  }

  /** Fill the canvas with white */
  _fillWhite() {
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  /** Update CSS cursor based on current tool */
  _updateCursor() {
    const cursorClasses = ['cursor-pen', 'cursor-pencil', 'cursor-brush', 'cursor-eraser', 'cursor-fill'];
    this.canvas.classList.remove(...cursorClasses);

    if (this.currentTool === 'upload') return;
    this.canvas.classList.add(`cursor-${this.currentTool}`);
  }

  /** Convert hex color to rgba string */
  _hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /** Convert hex color to [R, G, B, A] array */
  _hexToRgbaArray(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b, 255];
  }
}
