//
// High Resolution Graphics (HiRes) Emulation
//

// This variation does not rely on a canvas element with the same dimensions
// as the pixel buffer; instead, it paints pixels on the canvas using rectangles.
// This works even if the underlying canvas implementation does not support
// scaling (e.g. fallbacks for IE using VML or Flash)

// Usage:
//
//   var hires = new HiRes( element, width, height )
//   hires.clear( [color_index] )
//   hires.setColor( color_index )
//   hires.plot( x, y )
//   hires.plot_to( x, x )
//   hires.getPixel( x, x ) // for "HSCRN"
//   hires.show( bool )
//   { width: w, height: h } = hires.getScreenSize()

function HiRes(element, width, height) {
  var COLORS, // Apple II to HTML color table
      last_x = 0,
      last_y = 0,
      pixels = [],
      color = 7,
      context = element.getContext("2d");

  pixels.length = width * height;

  // From: Apple ][ Colors at MROB
  // https://mrob.com/pub/xapple2/colors.html

  COLORS = [
    '#000000', // 0 = Black 1
    '#14f53c', // 1 = Green
    '#ff44fd', // 2 = Purple
    '#ffffff', // 3 = White 1
    '#000000', // 4 = Black 2
    '#ff6a3c', // 5 = Orange
    '#14cffd', // 6 = Medium Blue
    '#ffffff'  // 7 = White 2
  ];

  this.clear = function(opt_color) {
    var i;
    context.clearRect(0, 0, element.width, element.height);
    pixels = [];
    pixels.length = width * height;
    if (arguments.length >= 1) {
      context.fillStyle = COLORS[opt_color];
      context.fillRect(0, 0, element.width, element.height);
      for (i = 0; i < pixels.length; i += 1) {
        pixels[i] = opt_color;
      }
    }
  };


  this.setColor = function(newColor) {
    color = Math.floor(newColor) % COLORS.length;
  };


  function drawPixel(x, y) {
    var sx = element.width / width,
        sy = element.height / height;
    context.fillRect((x * sx)|0, (y * sy)|0, sx|0, sy|0);
    pixels[x + y * width] = color;
  }

  this.plot = function(x, y) {
    context.fillStyle = COLORS[color];
    drawPixel(x, y);

    last_x = x;
    last_y = y;

  };

  this.plot_to = function(x, y) {
    var x0 = last_x, y0 = last_y, x1 = x, y1 = y,
        dx = Math.abs(x1 - x0),
        dy = Math.abs(y1 - y0),
        sx = (x0 < x1) ? 1 : -1,
        sy = (y0 < y1) ? 1 : -1,
        err = dx - dy,
        e2;

    last_x = x;
    last_y = y;

    for (;;) {
      this.plot(x0, y0);

      if (x0 === x1 && y0 === y1) { return; }
      e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  };

  this.getPixel = function(x, y) {
    return pixels[y * width + x] >>> 0;
  };

  this.getScreenSize = function() {
    return { width: width, height: height };
  };

  this.show = function(state) {
    element.style.visibility = state ? "visible" : "hidden";
  };
}
