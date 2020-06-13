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


  // From: Apple ][ Colors at MROB
  // https://mrob.com/pub/xapple2/colors.html

  COLORS = [
    '#000000', //  0 = Black
    '#e31e60', //  1 = Deep Red
    '#604ebd', //  2 = Dark Blue
    '#ff44fd', //  3 = Purple
    '#00a360', //  4 = Dark Green
    '#9c9c9c', //  5 = Gray 1
    '#14cffd', //  6 = Medium Blue
    '#d0c3ff', //  7 = Light Blue
    '#607203', //  8 = Brown
    '#ff6a3c', //  9 = Orange
    '#9c9c9c', // 10 = Gray 2
    '#ffa0d0', // 11 = Pink
    '#14f53c', // 12 = Light Green
    '#d0dd8d', // 13 = Yellow
    '#72ffd0', // 14 = Aquamarine
    '#ffffff'  // 15 = White
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
