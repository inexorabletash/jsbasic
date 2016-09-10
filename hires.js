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
      color = 0,
      context = element.getContext("2d");

  pixels.length = width * height;

  // Colors c/o USENET:
  // Date: Wed, 05 Sep 2007 01:04:20 +0200
  // From: Linards Ticmanis <ticmanis@gmx.de>
  // Newsgroups: comp.sys.apple2
  // Subject: Re: Double hires mode color artifacts
  // Message-ID: <46dde477$0$4527$9b4e6d93@newsspool3.arcor-online.net>

  COLORS = [
    '#000000', // Black 1
    '#2fbc1a', // Green
    '#d043e5', // Violet
    '#ffffff', // White 1
    '#000000', // Black 2
    '#d06a1a', // Orange
    '#2f95e5', // Medium Blue
    '#ffffff'  // White 2
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

    while (true) {
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
    last_x = x;
    last_y = y;

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
