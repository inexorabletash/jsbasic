//
// Applesoft BASIC in Javascript
// TTY Emulation
//

// Copyright (C) 2009-2011 Joshua Bell
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Usage:
//
//   tty = new TTY( screen_element, keyboard_element, bell );
//   tty.clearScreen()
//   tty.scrollScreen()
//   tty.setTextStyle( textStyle )
//   { width: w, height: h } = tty.getScreenSize()
//   { x: x, y: y } = tty.getCursorPosition()
//   tty.setFirmwareActive( bool )
//   tty.setCursorPosition( x, y )
//   tty.showCursor()
//   tty.hideCursor()
//   tty.focus()
//
//  This just calls writeChar() in a loop; no need to hook it
//   tty.writeString( string )
//
//  The following can be hooked:
//   tty.readLine( callback_function, prompt )
//   tty.readChar( callback_function )
//   tty.writeChar( c )
//
//   tty.TEXT_STYLE_NORMAL  = 0
//   tty.TEXT_STYLE_INVERSE = 1
//   tty.TEXT_STYLE_FLASH   = 2
//
// Example:
//
//   <script>
//      tty = new TTY( document.getElementById( 'screen' ), document.getElementById( 'keyboard' ), 80, 24 );
//   </script>
//   <style>
//      #screen { font-size: 10pt; font-family: monospace; font-weight: bold; background-color: black; color: #80ff80; }
//      .normal  { background-color: #000000; color: #80ff80; }
//      .inverse { background-color: #80ff80; color: #000000; }
//   </style>
//   <div id="screen" tabindex="0"></div>

/*global getClassList*/ // from polyfill.js
/*global identifyKey */ // From keyboard.js

function TTY(screenElement, keyboardElement, bell) {
  /*jslint browser: true, white: false, bitwise: false */


  // Constants


  this.TEXT_STYLE_NORMAL = 0;
  this.TEXT_STYLE_INVERSE = 1;
  this.TEXT_STYLE_FLASH = 2;


  // Internal Fields


  // For references to "this" within callbacks and closures
  var self = this,

  // Display
        cursorX = 0,
        cursorY = 0,
        cursorVisible = false,
        cursorElement = null,
        styleElem,
        screenGrid,
        screenRow = [],
        splitPos = 0,
        screenWidth,
        screenHeight,
        curStyle = this.TEXT_STYLE_NORMAL,
        cursorState = true,
        cursorInterval,
        firmwareActive = true, // 80-column firmware
        mousetext = false,

  // Input
        lineCallback,
        charCallback,
        inputBuffer = [],
        keyboardRegister = 0,
        keyDown = false,
        capsLock = true, // Caps lock state is tracked unique to the TTY
        buttonState = [0, 0, 0, 0];

  this.autoScroll = true;



  //
  // Display
  //

  function setCellByte(x, y, byte) {
    var cell = screenGrid[x + screenWidth * y];
    if (cell && cell.byte !== byte) {
      cell.byte = byte;
      cell.elem.className = 'a2c a2c' + String(byte);
    }
  }

  // Apple II Character Generator (byte->character map)
  // 0x00-0x1F = INVERSE @ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_
  // 0x20-0x3F = INVERSE  !"#$%&'()*+,-./0123456789:;<=>?
  // 0x40-0x5F = FLASH   @ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_  (80-col firmware active: mousetext symbols)
  // 0x60-0x7F = FLASH    !"#$%&'()*+,-./0123456789:;<=>?  (80-col firmware active: inverse lowercase)
  // 0x80-0x9F = NORMAL  @ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_
  // 0xA0-0xBF = NORMAL   !"#$%&'()*+,-./0123456789:;<=>?
  // 0xC0-0xDF = NORMAL  @ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_
  // 0xE0-0xFF = NORMAL  `abcdefghijklmnopqrstuvwxyz{|}~


  function setCellChar(x, y, c) {
    var byte;

    if (c > 0xff) {
      // Extension characters
      byte = c;
    } else {
      // Lock to 7-bit; Control characters should be filtered already
      c = (c >>> 0) & 0x7f;

      if (firmwareActive) {
        if (curStyle === self.TEXT_STYLE_INVERSE) {
          if (0x20 <= c && c < 0x40) { byte = c; }
          else if (0x40 <= c && c < 0x60) { byte = c - (mousetext ? 0 : 0x40); }
          else if (0x60 <= c && c < 0x80) { byte = c; }
        } else if (curStyle === self.TEXT_STYLE_FLASH) {
          if (0x20 <= c && c < 0x40) { byte = c + 0x40; }
          else if (0x40 <= c && c < 0x60) { byte = c - 0x40; }
          else if (0x60 <= c && c < 0x80) { byte = c; }
        } else {
          if (0x20 <= c && c < 0x40) { byte = c + 0x80; }
          else if (0x40 <= c && c < 0x60) { byte = c + 0x80; }
          else if (0x60 <= c && c < 0x80) { byte = c + 0x80; }
        }
      } else {
        if (curStyle === self.TEXT_STYLE_INVERSE) {
          if (0x20 <= c && c < 0x40) { byte = c; }
          else if (0x40 <= c && c < 0x60) { byte = c - 0x40; }
          else if (0x60 <= c && c < 0x80) { byte = c - 0x40; } // no inverse lowercase
        } else if (curStyle === self.TEXT_STYLE_FLASH) {
          if (0x20 <= c && c < 0x40) { byte = c + 0x40; }
          else if (0x40 <= c && c < 0x60) { byte = c; }
          else if (0x60 <= c && c < 0x80) { byte = c; } // no lowercase flash
        } else {
          if (0x20 <= c && c < 0x40) { byte = c + 0x80; }
          else if (0x40 <= c && c < 0x60) { byte = c + 0x80; }
          else if (0x60 <= c && c < 0x80) { byte = c + 0x80; }
        }
      }
    }
    setCellByte(x, y, byte);
  }

  this.reset = function _reset() {
    this.hideCursor();
    lineCallback = undefined;
    charCallback = undefined;

    inputBuffer = [];
    keyboardRegister = 0;
    buttonState = [0, 0, 0, 0];

  }; // reset

  function init(active, rows, columns) {
    firmwareActive = active;
    screenWidth = columns;
    screenHeight = rows;

    // Reset parameters
    self.textWindow = {};
    self.textWindow.left = 0;
    self.textWindow.top = 0;
    self.textWindow.width = screenWidth;
    self.textWindow.height = screenHeight;
    self.setTextStyle(self.TEXT_STYLE_NORMAL);

    // Build character cell grid
    var x, y, table, tbody, tr, td;
    screenGrid = [];
    screenGrid.length = screenWidth * screenHeight;

    table = document.createElement('table');
    table.className = 'tty_table';

    tbody = document.createElement('tbody');
    styleElem = tbody;

    getClassList(styleElem).add(screenWidth === 40 ? 'tty_40col' : 'tty_80col');
    if (firmwareActive) { getClassList(styleElem).add('active'); }

    for (y = 0; y < screenHeight; y += 1) {
      tr = document.createElement('tr');
      tr.className = 'tty_tr';
      tr.style.visibility = (y < splitPos) ? "hidden" : "";
      screenRow[y] = tr;

      for (x = 0; x < screenWidth; x += 1) {
        td = document.createElement('td');
        screenGrid[screenWidth * y + x] = {
          elem: td
        };
        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    screenElement.innerHTML = "";
    screenElement.appendChild(table);

    self.clearScreen();

    // Create cursor
    cursorElement = document.createElement('span');
    cursorElement.className = 'a2c a2c-cursor a2c255';
    self.setCursorPosition(0, 0);
  }

  this.clearScreen = function _clearScreen() {
    var x, y;
    cursorX = self.textWindow.left;
    cursorY = self.textWindow.top;
    for (y = self.textWindow.top; y < self.textWindow.top + self.textWindow.height; y += 1) {
      for (x = self.textWindow.left; x < self.textWindow.left + self.textWindow.width; x += 1) {
        setCellChar(x, y, 0x20);
      }
    }
  };


  this.clearEOL = function _clearEOL() {
    var x;
    for (x = cursorX; x < self.textWindow.left + self.textWindow.width; x += 1) {
      setCellChar(x, cursorY, 0x20);
    }
  };


  this.setFirmwareActive = function _setFirmwareActive(active) {
    init(active, 24, active ? 80 : 40);
  };


  function scrollUp() {
    var x, y, cell;

    for (y = self.textWindow.top; y < self.textWindow.top + self.textWindow.height - 1; y += 1) {
      for (x = self.textWindow.left; x < self.textWindow.left + self.textWindow.width; x += 1) {

        cell = screenGrid[x + screenWidth * (y + 1)];
        setCellByte(x, y, cell.byte);
      }
    }

    y = self.textWindow.top + (self.textWindow.height - 1);
    for (x = self.textWindow.left; x < self.textWindow.left + self.textWindow.width; x += 1) {
      setCellChar(x, y, 0x20);
    }
  }

  function scrollDown() {
    var x, y, cell;

    for (y = self.textWindow.top + self.textWindow.height - 1; y > self.textWindow.top; y -= 1) {
      for (x = self.textWindow.left; x < self.textWindow.left + self.textWindow.width; x += 1) {

        cell = screenGrid[x + screenWidth * (y - 1)];
        setCellByte(x, y, cell.byte);
      }
    }

    y = self.textWindow.top;
    for (x = self.textWindow.left; x < self.textWindow.left + self.textWindow.width; x += 1) {
      setCellChar(x, y, 0x20);
    }
  }

  this.scrollScreen = function _scrollScreen() {
    scrollUp();
  };

  this.setTextStyle = function _setTextStyle(style) {
    curStyle = style;
  };

  // Internal
  function updateCursor() {
    if (cursorVisible && cursorState) {
      var elem = screenGrid[cursorY * screenWidth + cursorX].elem;
      if (elem !== cursorElement.parentNode) {
        elem.appendChild(cursorElement);
      }
    } else if (cursorElement.parentNode) {
      cursorElement.parentNode.removeChild(cursorElement);
    }
  }

  // Internal
  function lineFeed() {
    cursorY += 1;
    if (cursorY >= self.textWindow.top + self.textWindow.height) {
      cursorY = self.textWindow.top + self.textWindow.height - 1;

      if (self.autoScroll) {
        self.scrollScreen();
      }
    }

    updateCursor();
  }

  // Internal
  function advanceCursor() {
    // Advance the cursor
    cursorX += 1;

    if (cursorX >= self.textWindow.left + self.textWindow.width) {
      cursorX = self.textWindow.left;
      lineFeed();
    }

    updateCursor();
  }

  // Hookable
  this.writeChar = function _writeChar(c) {
    var code = c.charCodeAt(0),
            x, y;

    switch (code) {
      case 0:
      case 1:
      case 2:
      case 3:
      case 4: // DOS hook takes care of CHR$(4)
      case 5:
      case 6:
        // no-op
        break;

      case 7: // (BEL) bell
        if (bell) {
          bell();
        }
        break;

      case 8: // (BS) backspace
        cursorX -= 1;
        if (cursorX < self.textWindow.left) {
          cursorX += self.textWindow.width;
          cursorY -= 1;
          if (cursorY < self.textWindow.top) {
            cursorY = self.textWindow.top;
          }
        }
        break;

      case 9:
        break;

      case 10: // (LF) line feed
        lineFeed();
        break;

      case 11: // (VT) clear EOS
        if (firmwareActive) {
          // Clears from the cursor position to the end of the window
          for (x = cursorX; x < self.textWindow.left + self.textWindow.width; x += 1) {
            setCellChar(x, cursorY, 0x20);
          }
          for (y = cursorY + 1; y < self.textWindow.top + self.textWindow.height; y += 1) {
            for (x = self.textWindow.left; x < self.textWindow.left + self.textWindow.width; x += 1) {
              setCellChar(x, y, 0x20);
            }
          }
        }
        break;

      case 12: // (FF) clear
        if (firmwareActive) {
          // move cursor to upper left and clear window
          self.clearScreen();
        }
        break;

      case 13: // (CR) return
        cursorX = self.textWindow.left;
        lineFeed();
        break;

      case 14: // (SO) normal
        if (firmwareActive) {
          curStyle = self.TEXT_STYLE_NORMAL;
        }
        break;

      case 15: // (SI) inverse
        if (firmwareActive) {
          curStyle = self.TEXT_STYLE_INVERSE;
        }
        break;

      case 16:
        break;

      case 17: // (DC1) 40-column
        if (firmwareActive) {
          // set display to 40 columns
          init(true, 24, 40);
        }
        break;

      case 18: // (DC2) 80-column
        if (firmwareActive) {
          // set display to 80 columns
          init(true, 24, 80);
        }
        break;

      case 19: // (DC3) stop list
      case 20:
        break;

      case 21: // (NAK) quit
        if (firmwareActive) {
          // deactivate, home, clear screen
          init(false, 24, 40);
        }
        break;

      case 22: // (SYN) scroll down
        if (firmwareActive) {
          // scroll display down, leaving cursor
          scrollDown();
        }
        break;

      case 23: // (ETB) scroll up
        if (firmwareActive) {
          // scroll display up, leaving cursor
          scrollUp();
        }
        break;

      case 24: // (CAN) disable mousetext
        if (firmwareActive) {
          // http://www.umich.edu/~archive/apple2/technotes/tn/mous/TN.MOUS.006
          mousetext = false;
        }
        break;

      case 25: // (EM) home
        if (firmwareActive) {
          // Moves cursor to upper-left corner of window (but doesn't clear)
          cursorX = self.textWindow.left;
          cursorY = self.textWindow.top;
        }
        break;

      case 26: // (SUB) clear line
        if (firmwareActive) {
          // Clears the line the cursor position is on
          for (x = 0; x < self.textWindow.width; x += 1) {
            setCellChar(self.textWindow.left + x, cursorY, 0x20);
          }
        }
        break;

      case 27: // (ESC) enable mousetext
        if (firmwareActive) {
          // http://www.umich.edu/~archive/apple2/technotes/tn/mous/TN.MOUS.006
          mousetext = true;
        }
        break;

      case 28: // (FS) fwd. space
        if (firmwareActive) {
          // Moves cursor position one space to the right; from right edge
          // of window, moves it to left end of line below
          cursorX += 1;
          if (cursorX > (self.textWindow.left + self.textWindow.width)) {
            cursorX -= self.textWindow.width;
            cursorY += 1;
            if (cursorY > self.textWindow.top + self.textWindow.height) {
              cursorY = self.textWindow.top + self.textWindow.height;
            }
          }
        }
        break;

      case 29: // (GS) clear EOL
        if (firmwareActive) {
          // Clear line rom cursor position to the right edge of the window
          self.clearEOL();
        }
        break;

      case 30: // RS - gotoXY (not supported from BASIC)
      case 31:
        break;

      default:
        setCellChar(cursorX, cursorY, code);
        advanceCursor();
        break;
    }
  };

  // Hookable
  this.writeString = function _writeString(s) {
    var i;
    for (i = 0; i < s.length; i += 1) {
      this.writeChar(s.charAt(i));
    }
  };

  this.getScreenSize = function _getScreenSize() {
    return { width: screenWidth, height: screenHeight };
  };

  this.getCursorPosition = function _getCursorPosition() {
    return { x: cursorX, y: cursorY };
  };

  this.setCursorPosition = function _setCursorPosition(x, y) {
    if (x !== undefined) {
      x = Math.min(Math.max(Math.floor(x), 0), screenWidth - 1);
    } else {
      x = cursorX;
    }

    if (y !== undefined) {
      y = Math.min(Math.max(Math.floor(y), 0), screenHeight - 1);
    } else {
      y = cursorY;
    }

    if (x === cursorX && y === cursorY) {
      // no-op
      return;
    }

    cursorX = x;
    cursorY = y;
    updateCursor();
  };

  this.showCursor = function _showCursor() {
    cursorVisible = true;
    cursorInterval = setInterval(function() {
      cursorState = !cursorState;
      updateCursor();
    }, 500);
  };

  this.hideCursor = function _hideCursor() {
    clearInterval(cursorInterval);
    cursorVisible = false;
    updateCursor();

  };

  this.splitScreen = function _splitScreen(splitAt) {
    splitPos = splitAt;

    var y;

    for (y = 0; y < screenHeight; y += 1) {
      screenRow[y].style.visibility = (y < splitPos) ? "hidden" : "";
    }

  };


  //
  // Input
  //


  // Internal
  function onKey(code) {
    var cb, c, s;

    keyboardRegister = code | 0x80;

    if (charCallback) {
      keyboardRegister = keyboardRegister & 0x7f;

      cb = charCallback;
      charCallback = undefined;
      self.hideCursor();
      cb(String.fromCharCode(code));
    } else if (lineCallback) {
      keyboardRegister = keyboardRegister & 0x7f;

      if (code >= 32 && code <= 127) {
        c = String.fromCharCode(code);
        inputBuffer.push(c);
        self.writeChar(c); // echo
      } else {
        switch (code) {
          case 8:  // Left Arrow
            if (inputBuffer.length > 0) {
              inputBuffer.pop();
              self.setCursorPosition(Math.max(self.getCursorPosition().x - 1, 0), self.getCursorPosition().y);
            }
            break;

          case 13: // Enter
            // Respond to INPUT callback, if defined
            s = inputBuffer.join("");
            inputBuffer = [];
            self.writeString("\r");

            cb = lineCallback;
            lineCallback = undefined;
            self.hideCursor();
            cb(s);
            break;
        }
      }
    }
    // else: nothing - key stays in the keyboard register

  } // onKey

  function toAppleKey(e) {

    function ord(c) { return c.charCodeAt(0); }

    switch (e.keyName) {

      // Non-Printables
      case 'Backspace': return 127;
      case 'Tab': return 9; // NOTE: Blocked elsewhere, for web page accessibility
      case 'Enter': return 13;
      case 'Escape': return 27;
      case 'Left': return 8;
      case 'Up': return 11;
      case 'Right': return 21;
      case 'Down': return 10;
      case 'Delete': return 127;
      case 'Clear': return 24; // ctrl-X - used on the IIgs

        // Numeric
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        if (e.keyLocation === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD) {
          // Numpad, presumably - allow but nothing special
          return ord(e.keyName);
        } else if (e.ctrlKey) {
          if (e.shiftKey) {
            switch (e.keyName) {
              case '2': return 0; // ctrl-@
              case '6': return 30; // ctrl-^
            }
          }
          return;
        } else if (e.shiftKey) {
          return ')!@#$%^&*('.charCodeAt(ord(e.keyName) - ord('0'));
        } else {
          return ord(e.keyName);
        }

        // Alphabetic
      case 'A':
      case 'B':
      case 'C':
      case 'D':
      case 'E':
      case 'F':
      case 'G':
      case 'H':
      case 'I':
      case 'J':
      case 'K':
      case 'L':
      case 'M':
      case 'N':
      case 'O':
      case 'P':
      case 'Q':
      case 'R':
      case 'S':
      case 'T':
      case 'U':
      case 'V':
      case 'W':
      case 'X':
      case 'Y':
      case 'Z':
        if (e.ctrlKey) {
          return ord(e.keyName) - 64; // Control keys, Apple II-style
        } else if (capsLock || e.shiftKey) {
          return ord(e.keyName); // Upper case
        } else {
          return ord(e.keyName) + 32; // Lower case
        }

        // Symbol and Punctuation
      case 'Spacebar': return ord(' ');
      case 'Semicolon': return e.shiftKey ? ord(':') : ord(';');
      case 'Equals': return e.shiftKey ? ord('+') : ord('=');
      case 'Comma': return e.shiftKey ? ord('<') : ord(',');
      case 'Minus': return e.ctrlKey ? 31 : e.shiftKey ? ord('_') : ord('-');
      case 'Period': return e.shiftKey ? ord('>') : ord('.');
      case 'Solidus': return e.shiftKey ? ord('?') : ord('/');
      case 'Grave': return e.shiftKey ? ord('~') : ord('`');
      case 'LeftSquareBracket': return e.ctrlKey ? 27 : e.shiftKey ? ord('{') : ord('[');
      case 'Backslash': return e.ctrlKey ? 28 : e.shiftKey ? ord('|') : ord('\\');
      case 'RightSquareBracket': return e.ctrlKey ? 29 : e.shiftKey ? ord('}') : ord(']');
      case 'Apostrophe': return e.shiftKey ? ord('"') : ord('\'');

        // not present on Apple II keyboard
      default:
        break;
    }

    return -1;
  }

  function isBrowserKey(e) {
    return e.keyName === 'Tab' || e.keyName === 'F5' || e.metaKey;
  }


  // Internal
  function handleKeyDown(e) {
    identifyKey(e);

    if (!e.keyName || isBrowserKey(e)) {
      return true;
    }

    var handled = false, code;

    switch (e.keyName) {

      case 'CapsLock':
        capsLock = !capsLock;
        handled = true;
        break;

      // Used as paddle buttons (0=Open Apple, 1=Solid Apple)
      case 'Home': buttonState[0] = 255; handled = true; break;
      case 'End': buttonState[1] = 255; handled = true; break;
      case 'PageUp': buttonState[2] = 255; handled = true; break;
      case 'Shift': buttonState[2] = 255; handled = true; break;
      case 'PageDown': buttonState[3] = 255; handled = true; break;

      default:
        code = toAppleKey(e);
        if (code !== -1) {
          keyDown = true;
          onKey(code);
          handled = true;
        }
        break;
    }

    if (handled) {
      e.stopPropagation();
      e.preventDefault();
    }

    return !handled;
  }


  // Internal
  function handleKeyUp(e) {
    identifyKey(e);

    if (!e.keyName || isBrowserKey(e)) {
      return true;
    }

    var handled = false,
            code;

    switch (e.keyName) {

      case 'CapsLock':
        handled = true;
        break;

      // Used as paddle buttons (0=Open Apple, 1=Solid Apple)
      case 'Home': buttonState[0] = 0; handled = true; break;
      case 'End': buttonState[1] = 0; handled = true; break;
      case 'PageUp': buttonState[2] = 0; handled = true; break;
      case 'Shift': buttonState[2] = 0; handled = true; break;
      case 'PageDown': buttonState[3] = 0; handled = true; break;

      default:
        code = toAppleKey(e);
        if (code !== -1) {
          keyDown = false;
          handled = true;
        }
        break;
    }

    if (handled) {
      e.stopPropagation();
      e.preventDefault();
    }

    return !handled;
  }


  this.getButtonState = function _getButtonState(btn) {
    return buttonState[btn];
  };


  this.focus = function _focus() {
    keyboardElement.focus();
  };


  // Hookable
  this.readLine = function _readLine(callback, prompt) {
    self.writeString(prompt);

    lineCallback = callback;
    self.showCursor();
    self.focus();
  };


  // Hookable
  this.readChar = function _readChar(callback) {
    // If there is a key ready, deliver it immediately
    if (keyboardRegister & 0x80) {
      keyboardRegister = keyboardRegister & 0x7f;

      // Non-blocking return
      setTimeout(function() { callback(String.fromCharCode(keyboardRegister)); }, 0);
    } else {
      charCallback = callback;
      self.showCursor();
      self.focus();
    }
  };


  this.getKeyboardRegister = function _getKeyboardRegister() {
    return keyboardRegister;
  };


  this.clearKeyboardStrobe = function _clearKeyboardStrobe() {
    keyboardRegister = keyboardRegister & 0x7f;
    return keyboardRegister | (keyDown ? 0x80 : 0x00);
  };


  //
  // Constructor Logic
  //


  init(false, 24, 40);

  window.addEvent(keyboardElement, 'keydown', handleKeyDown);
  window.addEvent(keyboardElement, 'keyup', handleKeyUp);

  setInterval(function _blinkFlash() {
    window.getClassList(styleElem).toggle('flash');
  }, 250);
}


