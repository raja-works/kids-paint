/**
 * Procedural sound synthesis engine for drawing tools using the Web Audio API.
 * Designed for a kids paint app to be soothing, subtle, and responsive.
 */
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this._muted = false;
    
    // Pre-generated noise buffers
    this.buffers = {
      white: null,
      pink: null,
      brown: null
    };
    
    // Active nodes for the currently playing stroke sound
    this.strokeNodes = {
      source: null,
      filter: null,
      gain: null,
      lfo: null,
      lfoGain: null
    };
    
    this.isInitialized = false;
  }

  /**
   * Initialize the AudioContext and generate noise buffers.
   * Must be called inside a user interaction event handler (click/touch).
   */
  init() {
    if (this.isInitialized) return;
    
    // Create audio context lazily
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();
    
    // Set up master gain for muting support
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this._muted ? 0 : 1;
    this.masterGain.connect(this.ctx.destination);
    
    // Pre-generate noise buffers so they can be reused
    this._generateNoiseBuffers();
    
    this.isInitialized = true;
    
    // Resume context if suspended (browser autoplay policy)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
  
  /**
   * Generates white, pink, and brown noise buffers.
   * @private
   */
  _generateNoiseBuffers() {
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds duration
    
    this.buffers.white = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    this.buffers.pink = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    this.buffers.brown = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    
    const whiteData = this.buffers.white.getChannelData(0);
    const pinkData = this.buffers.pink.getChannelData(0);
    const brownData = this.buffers.brown.getChannelData(0);
    
    // State variables for noise generation algorithms
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    let lastBrownOut = 0;
    
    for (let i = 0; i < bufferSize; i++) {
      // 1. White noise: random values between -1 and 1
      const white = Math.random() * 2 - 1;
      whiteData[i] = white;
      
      // 2. Pink noise: Paul Kellet's refined filter method (~3dB/octave drop)
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      
      let pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      pinkData[i] = pink * 0.11; // Gain compensation
      b6 = white * 0.115926;
      
      // 3. Brown noise: integrated white noise with clamping/leaky integration
      let brown = (lastBrownOut + (0.02 * white)) / 1.02;
      brownData[i] = brown * 3.5; // Gain compensation
      lastBrownOut = brown;
    }
  }

  /**
   * Start a procedural sound for a drawing stroke.
   * @param {string} toolType - 'pen', 'pencil', 'brush', or 'eraser'
   * @param {number} speed - The speed of the stroke, normalized between 0 and 1
   */
  startStrokeSound(toolType, speed) {
    if (!this.isInitialized) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    
    this.stopStrokeSound(); // Clean up any currently playing stroke
    
    const now = this.ctx.currentTime;
    
    // Create base source node
    this.strokeNodes.source = this.ctx.createBufferSource();
    this.strokeNodes.source.loop = true;
    
    // Create master envelope for this stroke
    this.strokeNodes.gain = this.ctx.createGain();
    this.strokeNodes.gain.gain.setValueAtTime(0, now);
    this.strokeNodes.gain.connect(this.masterGain);
    
    // Create primary shaping filter
    this.strokeNodes.filter = this.ctx.createBiquadFilter();
    
    // Configure based on tool type
    switch (toolType) {
      case 'pen':
        this.strokeNodes.source.buffer = this.buffers.white;
        this.strokeNodes.filter.type = 'bandpass';
        this.strokeNodes.filter.frequency.value = 3000;
        this.strokeNodes.filter.Q.value = 1;
        
        this.strokeNodes.source.connect(this.strokeNodes.filter);
        this.strokeNodes.filter.connect(this.strokeNodes.gain);
        
        // Quick attack: 20ms
        this.strokeNodes.gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
        break;
        
      case 'pencil':
        this.strokeNodes.source.buffer = this.buffers.pink;
        this.strokeNodes.filter.type = 'highpass';
        this.strokeNodes.filter.frequency.value = 1500;
        
        // Amplitude modulation for scratchy texture
        this.strokeNodes.lfo = this.ctx.createOscillator();
        this.strokeNodes.lfo.type = 'sine';
        // Base frequency 15Hz, scales up to 30Hz with speed
        this.strokeNodes.lfo.frequency.value = 15 + (speed * 15); 
        
        this.strokeNodes.lfoGain = this.ctx.createGain();
        this.strokeNodes.lfoGain.gain.value = 0.5; // Depth of modulation
        this.strokeNodes.lfo.connect(this.strokeNodes.lfoGain.gain);
        
        this.strokeNodes.source.connect(this.strokeNodes.filter);
        this.strokeNodes.filter.connect(this.strokeNodes.lfoGain);
        this.strokeNodes.lfoGain.connect(this.strokeNodes.gain);
        
        this.strokeNodes.lfo.start(now);
        
        // Attack
        this.strokeNodes.gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
        break;
        
      case 'brush':
        this.strokeNodes.source.buffer = this.buffers.brown;
        this.strokeNodes.filter.type = 'lowpass';
        this.strokeNodes.filter.frequency.value = 800;
        
        this.strokeNodes.source.connect(this.strokeNodes.filter);
        this.strokeNodes.filter.connect(this.strokeNodes.gain);
        
        // Slow attack (100ms), volume scales with speed
        const brushVol = 0.05 + (speed * 0.1); 
        this.strokeNodes.gain.gain.linearRampToValueAtTime(brushVol, now + 0.1);
        break;
        
      case 'eraser':
        this.strokeNodes.source.buffer = this.buffers.white;
        this.strokeNodes.filter.type = 'bandpass';
        this.strokeNodes.filter.frequency.value = 2000;
        
        this.strokeNodes.source.connect(this.strokeNodes.filter);
        this.strokeNodes.filter.connect(this.strokeNodes.gain);
        
        // Gentle attack
        this.strokeNodes.gain.gain.linearRampToValueAtTime(0.06, now + 0.05);
        break;
        
      default: // Fallback
        this.strokeNodes.source.buffer = this.buffers.white;
        this.strokeNodes.source.connect(this.strokeNodes.gain);
        this.strokeNodes.gain.gain.linearRampToValueAtTime(0.05, now + 0.02);
    }
    
    this.strokeNodes.source.start(now);
  }

  /**
   * Update parameters of the ongoing stroke sound based on user movement speed.
   * @param {number} speed - The speed of the stroke, normalized between 0 and 1
   */
  updateStrokeSound(speed) {
    if (!this.isInitialized || !this.strokeNodes.source || !this.strokeNodes.gain) return;
    
    const now = this.ctx.currentTime;
    
    if (this.strokeNodes.lfo) {
      // Pencil: Modulate LFO frequency based on speed
      const targetFreq = 15 + (speed * 15);
      this.strokeNodes.lfo.frequency.linearRampToValueAtTime(targetFreq, now + 0.1);
    } else if (this.strokeNodes.source.buffer === this.buffers.brown) {
      // Brush: Scale volume based on speed
      const targetVol = 0.05 + (speed * 0.1);
      this.strokeNodes.gain.gain.linearRampToValueAtTime(targetVol, now + 0.1);
    }
  }

  /**
   * Fade out and completely stop the current stroke sound.
   */
  stopStrokeSound() {
    if (!this.isInitialized || !this.strokeNodes.source || !this.strokeNodes.gain) return;
    
    const now = this.ctx.currentTime;
    const { source, gain, lfo } = this.strokeNodes;
    
    // Determine release time based on active buffer/tool
    // Brush gets 200ms, others get 50ms
    const releaseTime = (source.buffer === this.buffers.brown) ? 0.2 : 0.05;
    
    // Apply release envelope
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + releaseTime);
    
    // Stop oscillators/sources slightly after the fade out completes
    const stopTime = now + releaseTime + 0.01;
    source.stop(stopTime);
    if (lfo) lfo.stop(stopTime);
    
    // Clear references to prevent re-stopping or updating dead nodes
    this.strokeNodes = {
      source: null,
      filter: null,
      gain: null,
      lfo: null,
      lfoGain: null
    };
  }

  /**
   * Play a one-shot pouring/splashing sound for a fill tool action.
   */
  playFillSound() {
    if (!this.isInitialized) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    
    const now = this.ctx.currentTime;
    
    const source = this.ctx.createBufferSource();
    source.buffer = this.buffers.brown;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1;
    
    // Filter frequency sweep: 200Hz to 800Hz over 800ms
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.linearRampToValueAtTime(800, now + 0.8);
    
    const gain = this.ctx.createGain();
    
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    // Amplitude envelope: Quick 50ms attack, slow 1.5s fade out
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gain.gain.linearRampToValueAtTime(0, now + 1.55);
    
    source.start(now);
    source.stop(now + 1.6); // Clean up after fade finishes
  }

  /**
   * Mute or unmute all sounds.
   * @param {boolean} muted 
   */
  setMuted(muted) {
    this._muted = !!muted;
    if (this.masterGain) {
      // Apply change immediately
      this.masterGain.gain.setValueAtTime(this._muted ? 0 : 1, this.ctx.currentTime);
    }
  }

  /**
   * Check if the engine is currently muted.
   * @returns {boolean}
   */
  isMuted() {
    return this._muted;
  }
}
