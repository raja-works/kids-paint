export class FloodFill {
  /**
   * Perform flood fill on canvas image data.
   * @param {ImageData} imageData - The canvas image data (from getImageData)
   * @param {number} startX - X coordinate of click
   * @param {number} startY - Y coordinate of click
   * @param {Array<number>} fillColor - [R, G, B, A] fill color (0-255 each)
   * @param {number} tolerance - Color matching tolerance (0-255, default 30)
   * @returns {ImageData} - Modified image data with fill applied
   */
  fill(imageData, startX, startY, fillColor, tolerance = 30) {
    const { width, height, data } = imageData;

    startX = Math.floor(startX);
    startY = Math.floor(startY);

    // Handle edge cases: clicking outside canvas bounds
    if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
      return imageData;
    }

    const startPos = (startY * width + startX) * 4;
    const targetR = data[startPos];
    const targetG = data[startPos + 1];
    const targetB = data[startPos + 2];
    const targetA = data[startPos + 3];

    // Helper to check if a pixel matches the target color within tolerance
    const colorMatch = (pos) => {
      const r = data[pos];
      const g = data[pos + 1];
      const b = data[pos + 2];
      const a = data[pos + 3];

      // Alpha channel: treat pixels with alpha < 10 as transparent/white background
      if (a < 10 && targetA < 10) return true;
      if (a < 10 || targetA < 10) return false;

      return (
        Math.abs(r - targetR) <= tolerance &&
        Math.abs(g - targetG) <= tolerance &&
        Math.abs(b - targetB) <= tolerance
      );
    };

    // If target color matches fill color (within tolerance), return immediately (already filled)
    const targetIsTransparent = targetA < 10;
    const fillIsTransparent = fillColor[3] < 10;
    
    let targetMatchesFill = false;
    if (targetIsTransparent && fillIsTransparent) {
      targetMatchesFill = true;
    } else if (!targetIsTransparent && !fillIsTransparent) {
      targetMatchesFill = 
        Math.abs(targetR - fillColor[0]) <= tolerance &&
        Math.abs(targetG - fillColor[1]) <= tolerance &&
        Math.abs(targetB - fillColor[2]) <= tolerance;
    }

    if (targetMatchesFill) {
      return imageData;
    }

    // Visited/processed tracking mechanism
    const visited = new Uint8Array(width * height);
    
    // Stack of seed points
    const stack = [[startX, startY]];

    while (stack.length > 0) {
      const [x, y] = stack.pop();

      // If already visited by another span, skip
      if (visited[y * width + x]) continue;

      // Move left from the seed
      let leftX = x;
      while (leftX >= 0 && !visited[y * width + leftX] && colorMatch((y * width + leftX) * 4)) {
        leftX--;
      }
      leftX++;

      // Move right from the seed
      let rightX = x;
      while (rightX < width && !visited[y * width + rightX] && colorMatch((y * width + rightX) * 4)) {
        rightX++;
      }
      rightX--;

      let spanAboveAdded = false;
      let spanBelowAdded = false;

      // Fill the entire horizontal span with fillColor
      for (let cx = leftX; cx <= rightX; cx++) {
        const pixelIdx = y * width + cx;
        const pos = pixelIdx * 4;

        data[pos] = fillColor[0];
        data[pos + 1] = fillColor[1];
        data[pos + 2] = fillColor[2];
        data[pos + 3] = fillColor[3];
        visited[pixelIdx] = 1;

        // Scan row above for contiguous runs of pixels
        if (y > 0) {
          const aboveIdx = (y - 1) * width + cx;
          const matchAbove = !visited[aboveIdx] && colorMatch(aboveIdx * 4);
          if (matchAbove && !spanAboveAdded) {
            stack.push([cx, y - 1]);
            spanAboveAdded = true;
          } else if (!matchAbove && spanAboveAdded) {
            spanAboveAdded = false;
          }
        }

        // Scan row below for contiguous runs of pixels
        if (y < height - 1) {
          const belowIdx = (y + 1) * width + cx;
          const matchBelow = !visited[belowIdx] && colorMatch(belowIdx * 4);
          if (matchBelow && !spanBelowAdded) {
            stack.push([cx, y + 1]);
            spanBelowAdded = true;
          } else if (!matchBelow && spanBelowAdded) {
            spanBelowAdded = false;
          }
        }
      }
    }

    return imageData;
  }
}
