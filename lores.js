//
// Low Resolution Graphics (LoRes) Emulation
//

// Usage:
//
//   var lores = new LoRes( element, width, height )
//   lores.clear()
//   lores.setColor( color_index )
//   lores.plot( x, y )
//   lores.hlin( x1, x2, y )
//   lores.vlin( x1, x2, y )
//   lores.show( bool )
//   color_index = lores.getPixel( x, y )
//   { width: w, height: h } = lores.getScreenSize()

function LoRes(element, width, height) {

  var COLORS, // Apple II to HTML color table
      loresPixel = [], // element references
      pixels = [], // color values
      color = 0; // current color

  // Colors c/o USENET:
  // Date: Wed, 05 Sep 2007 01:04:20 +0200
  // From: Linards Ticmanis <ticmanis@gmx.de>
  // Newsgroups: comp.sys.apple2
  // Subject: Re: Double hires mode color artifacts
  // Message-ID: <46dde477$0$4527$9b4e6d93@newsspool3.arcor-online.net>

  COLORS = [
    '#000000', // Black
    '#901740', // Deep Red
    '#402ca5', // Dark Blue
    '#d043e5', // Purple
    '#006940', // Dark Green
    '#808080', // Gray 1
    '#2f95e5', // Medium Blue
    '#bfabff', // Light Blue
    '#402400', // Brown        // WAS #405400, error pointed out by MJM
    '#d06a1a', // Orange
    '#808080', // Gray 2
    '#ff96bf', // Pink
    '#2fbc1a', // Light Green
    '#bfd35a', // Yellow
    '#6fe8bf', // Aquamarine
    '#ffffff'  // White
  ];

  function init() {
    var x, y, table, tbody, tr, td;

    pixels = [];
    pixels.length = width * height;
    loresPixel = [];
    loresPixel.length = width * height;

    table = document.createElement('table');

    tbody = document.createElement('tbody');
    for (y = 0; y < height; y += 1) {
      tr = document.createElement('tr');
      for (x = 0; x < width; x += 1) {
        td = document.createElement('td');
        td.style.backgroundColor = 'black';

        loresPixel[y * width + x] = td;
        pixels[y * width + x] = 0;

        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    element.innerHTML = "";
    element.appendChild(table);
  }

  this.clear = function() {
    var x, y, pixel;
    for (y = 0; y < height; y += 1) {
      for (x = 0; x < width; x += 1) {
        pixel = loresPixel[y * width + x];
        pixel.style.backgroundColor = "black";
        pixels[y * width + x] = 0;
      }
    }

  };

  this.setColor = function(newColor) {
    color = Math.floor(newColor) % COLORS.length;
  };

  function plot(x, y) {
    var pixel = loresPixel[y * width + x];
    if (pixel) {
      pixel.style.backgroundColor = COLORS[color];
      pixels[y * width + x] = color;
    }
  }

  this.plot = function(x, y) {
    plot(x, y);
  };

  this.getPixel = function(x, y) {
    if (0 <= x && x < width &&
            0 <= y && y < height) {

      return pixels[y * width + x];
    } else {
      return 0;
    }
  };

  this.hlin = function(x1, x2, y) {
    var x;
    if (x1 > x2) {
      x = x1;
      x1 = x2;
      x2 = x;
    }

    for (x = x1; x <= x2; x += 1) {
      plot(x, y);
    }
  };

  this.vlin = function(y1, y2, x) {
    var y;
    if (y1 > y2) {
      y = y1;
      y1 = y2;
      y2 = y;
    }

    for (y = y1; y <= y2; y += 1) {
      plot(x, y);
    }
  };

  this.getScreenSize = function() {
    return { width: width, height: height };
  };

  this.show = function(state) {
    element.style.visibility = state ? "visible" : "hidden";

  };

  //----------------------------------------------------------------------
  // Constructor Logic
  //----------------------------------------------------------------------

  init();
}


