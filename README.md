# 🎨 Kids Paint

A fun, colorful, and intuitive paint application built for kids. Draw with different brushes, color outlined pictures, and hear satisfying sound effects — all in the browser with zero dependencies.

![HTML5](https://img.shields.io/badge/HTML5-Canvas-orange)
![CSS3](https://img.shields.io/badge/CSS3-Glassmorphism-blue)
![JavaScript](https://img.shields.io/badge/JavaScript-ES%20Modules-yellow)
![Dependencies](https://img.shields.io/badge/Dependencies-None-brightgreen)

---

## ✨ Features

### 🖊️ Drawing Tools
- **Pen** — Clean, solid strokes for precise drawing
- **Pencil** — Textured, slightly rough strokes that feel like real graphite
- **Brush** — Soft, painterly strokes with a watercolor feel
- **Eraser** — Remove any mistakes

### 🪣 Fill Bucket
- Tap any enclosed area to flood-fill it with color
- Respects drawn boundaries — paint stays inside the lines!
- Adjustable tolerance handles anti-aliased edges

### 📷 Photo → Coloring Page
- Upload any photo from your gallery
- Automatically converts it to a black-and-white outline
- Adjust the detail level with a sensitivity slider
- Color the outlines just like a real coloring book!

### 🔊 Immersive Sound Effects
- Each tool has a unique sound (pen writing, pencil scratching, brush sweeping)
- Fill bucket plays a satisfying paint-pouring sound
- All sounds are **procedurally synthesized** using the Web Audio API — no audio files needed
- Mute/unmute with one tap

### 💾 Save & Load
- Save drawings to an in-browser gallery (up to 10)
- Resume any saved painting later
- Download paintings as PNG files
- Open external image files to continue drawing on them

### 🎨 Premium UI
- Dark glassmorphism design with vibrant color palette
- Canvas cloth texture overlay for a realistic painting feel
- Micro-animations and satisfying button feedback
- Responsive layout — works on desktop and mobile
- Keyboard shortcuts for power users

---

## 🚀 Getting Started

### Prerequisites

- A modern web browser (Chrome, Safari, Firefox, Edge)
- Python 3 (for the local dev server) — or any static file server

### Start the Application

```bash
# Navigate to the project directory
cd /path/to/kids-paint

# Start a local server on port 8888
python3 -m http.server 8888
```

Open your browser and go to **http://localhost:8888**

> **Note:** The app uses ES Modules, so it must be served over HTTP. Opening `index.html` directly from the filesystem will not work.

### Stop the Application

Press `Ctrl + C` in the terminal where the server is running.

### Alternative Servers

You can use any static file server you prefer:

```bash
# Node.js (npx)
npx -y serve .

# PHP
php -S localhost:8888

# Ruby
ruby -run -ehttpd . -p8888
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|:---|:---|
| `P` | Pen tool |
| `L` | Pencil tool |
| `B` | Brush tool |
| `G` | Fill bucket |
| `E` | Eraser |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Ctrl/Cmd + S` | Save drawing |

---

## 📁 Project Structure

```
kids-paint/
├── index.html              # Main HTML — splash screen, canvas, toolbar, modals
├── style.css               # Design system — glassmorphism, animations, responsive
├── README.md               # This file
└── js/
    ├── app.js              # Entry point — initialization, sizing, keyboard shortcuts
    ├── canvas.js           # Drawing engine — pen, pencil, brush, eraser, undo/redo
    ├── toolbar.js          # UI controls — tool buttons, color palette, modals
    ├── audio.js            # Procedural sound synthesis via Web Audio API
    ├── flood-fill.js       # Iterative scanline flood fill algorithm
    ├── image-processor.js  # Sobel edge detection for photo → outline conversion
    └── storage.js          # LocalStorage gallery, PNG export, file loading
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|:---|:---|
| Structure | HTML5 (`<canvas>`, Pointer Events, File API) |
| Styling | Vanilla CSS (glassmorphism, CSS custom properties, responsive) |
| Logic | Vanilla JavaScript (ES Modules) |
| Audio | Web Audio API (procedural synthesis) |
| Fonts | [Outfit](https://fonts.google.com/specimen/Outfit) via Google Fonts |
| Dependencies | **None** |

---

## 📄 License

This project is open source and available for personal and educational use.
