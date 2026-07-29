/**
 * app.js — Entry Point for Kids Paint
 * Initializes all modules and handles the splash screen.
 * @module app
 */

import { DrawingEngine } from './canvas.js';
import { AudioEngine } from './audio.js';
import { FloodFill } from './flood-fill.js';
import { ImageProcessor } from './image-processor.js';
import { StorageManager } from './storage.js';
import { Toolbar } from './toolbar.js';

class KidsPaintApp {
  constructor() {
    this.audio = new AudioEngine();
    this.floodFill = new FloodFill();
    this.imageProcessor = new ImageProcessor();
    this.storage = new StorageManager();

    this._initSplash();
  }

  /** Set up splash screen with "Let's Paint!" button */
  _initSplash() {
    const splash = document.getElementById('splash-screen');
    const startBtn = document.getElementById('btn-start');

    startBtn.addEventListener('click', () => {
      // Initialize audio context on user gesture
      this.audio.init();

      // Animate splash out
      splash.classList.add('exiting');
      setTimeout(() => {
        splash.classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        this._initApp();
      }, 500);
    });
  }

  /** Initialize the main application */
  _initApp() {
    const canvasEl = document.getElementById('drawing-canvas');
    const canvasArea = document.getElementById('canvas-area');

    // Calculate canvas size to fit the available area
    const { width, height } = this._calculateCanvasSize(canvasArea);

    // Initialize drawing engine
    this.engine = new DrawingEngine(canvasEl, this.audio, this.floodFill);
    this.engine.init(width, height);

    // Initialize toolbar
    this.toolbar = new Toolbar(
      this.engine,
      this.audio,
      this.storage,
      this.imageProcessor
    );

    // Handle window resize
    this._initResize(canvasArea);

    // Keyboard shortcuts
    this._initKeyboard();
  }

  /** Calculate optimal canvas size for the area */
  _calculateCanvasSize(container) {
    const rect = container.getBoundingClientRect();
    const padding = 24; // var(--space-md) * 2
    const maxWidth = rect.width - padding;
    const maxHeight = rect.height - padding;

    // Use a 4:3 aspect ratio, fitted within the container
    const targetRatio = 4 / 3;
    let width, height;

    if (maxWidth / maxHeight > targetRatio) {
      // Container is wider — constrain by height
      height = Math.floor(maxHeight);
      width = Math.floor(height * targetRatio);
    } else {
      // Container is taller — constrain by width
      width = Math.floor(maxWidth);
      height = Math.floor(width / targetRatio);
    }

    // Ensure minimum size
    width = Math.max(320, width);
    height = Math.max(240, height);

    return { width, height };
  }

  /** Handle window resize */
  _initResize(canvasArea) {
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const { width, height } = this._calculateCanvasSize(canvasArea);
        this.engine.resize(width, height);
      }, 250);
    });
  }

  /** Keyboard shortcuts */
  _initKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.engine.undo();
      }

      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y = Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        this.engine.redo();
      }

      // Ctrl/Cmd + S = Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        document.getElementById('btn-save').click();
      }

      // Tool shortcuts
      switch (e.key) {
        case 'p': document.querySelector('[data-tool="pen"]')?.click(); break;
        case 'l': document.querySelector('[data-tool="pencil"]')?.click(); break;
        case 'b': document.querySelector('[data-tool="brush"]')?.click(); break;
        case 'g': document.querySelector('[data-tool="fill"]')?.click(); break;
        case 'e': document.querySelector('[data-tool="eraser"]')?.click(); break;
      }
    });
  }
}

// Launch the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new KidsPaintApp();
});
