//
// TTY Emulation
//

// Usage:
//
//   tty = new TTY( screen_element, keyboard_element );
//   tty.clearScreen()
//   tty.clearEOL()
//   tty.clearEOS()
//   tty.cursorLeft()
//   tty.cursorRight()
//   tty.cursorUp()
//   tty.cursorDown()
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

function TTY(screenElement, keyboardElement) {

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
      cell.elem.className = 'jsb-chr jsb-chr' + String(byte);
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

  this.reset = function reset() {
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
    tbody = document.createElement('tbody');
    styleElem = tbody;

    styleElem.classList.add(screenWidth === 40 ? 'jsb-40col' : 'jsb-80col');
    if (firmwareActive) { styleElem.classList.add('jsb-active'); }

    for (y = 0; y < screenHeight; y += 1) {
      tr = document.createElement('tr');
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
    cursorElement.className = 'jsb-chr jsb-chr-cursor jsb-chr255';
    self.setCursorPosition(0, 0);
  }

  this.clearScreen = function clearScreen() {
    var x, y;
    cursorX = self.textWindow.left;
    cursorY = self.textWindow.top;
    for (y = self.textWindow.top; y < self.textWindow.top + self.textWindow.height; y += 1) {
      for (x = self.textWindow.left; x < self.textWindow.left + self.textWindow.width; x += 1) {
        setCellChar(x, y, 0x20);
      }
    }
  };


  this.clearEOL = function clearEOL() {
    var x;
    for (x = cursorX; x < self.textWindow.left + self.textWindow.width; x += 1) {
      setCellChar(x, cursorY, 0x20);
    }
  };

  // Clears from the cursor position to the end of the window
  this.clearEOS = function clearEOS() {
    var x, y;
    for (x = cursorX; x < self.textWindow.left + self.textWindow.width; x += 1) {
      setCellChar(x, cursorY, 0x20);
    }
    for (y = cursorY + 1; y < self.textWindow.top + self.textWindow.height; y += 1) {
      for (x = self.textWindow.left; x < self.textWindow.left + self.textWindow.width; x += 1) {
        setCellChar(x, y, 0x20);
      }
    }
  };

  this.setFirmwareActive = function setFirmwareActive(active) {
    if (active !== firmwareActive)
      init(active, 24, active ? 80 : 40);
  };

  this.isFirmwareActive = function isFirmwareActive() {
    return firmwareActive;
  };

  this.isAltCharset = function isAltCharset() {
    return mousetext;
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

  this.scrollScreen = function scrollScreen() {
    scrollUp();
  };

  this.setTextStyle = function setTextStyle(style) {
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

  this.cursorDown = function cursorDown() {
    cursorY += 1;
    if (cursorY >= self.textWindow.top + self.textWindow.height) {
      cursorY = self.textWindow.top + self.textWindow.height - 1;
      if (self.autoScroll) {
        self.scrollScreen();
      }
    }
    updateCursor();
  };

  this.cursorLeft = function cursorLeft() {
    cursorX -= 1;
    if (cursorX < self.textWindow.left) {
      cursorX += self.textWindow.width;
      cursorY -= 1;
      if (cursorY < self.textWindow.top) {
        cursorY = self.textWindow.top;
      }
    }
    updateCursor();
  };

  this.cursorUp = function cursorUp() {
    cursorY -= 1;
    if (cursorY < self.textWindow.top) {
      cursorY = self.textWindow.top;
    }
    updateCursor();
  };


  this.cursorRight = function cursorRight() {
    cursorX += 1;
    if (cursorX >= self.textWindow.left + self.textWindow.width) {
      cursorX = self.textWindow.left;
      self.cursorDown();
    }
    updateCursor();
  };

  // Hookable
  this.writeChar = function writeChar(c) {
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
      case 7: // (BEL) bell - handled by index hook
        // no-op
        break;

      case 8: // (BS) backspace
        self.cursorLeft();
        break;

      case 9:
        break;

      case 10: // (LF) line feed
        self.cursorDown();
        break;

      case 11: // (VT) clear EOS
        if (firmwareActive) {
          self.clearEOS();
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
        self.cursorDown();
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
        self.cursorRight();
        break;
    }
  };

  // Hookable
  this.writeString = function writeString(s) {
    var i;
    for (i = 0; i < s.length; i += 1) {
      this.writeChar(s.charAt(i));
    }
  };

  this.getScreenSize = function getScreenSize() {
    return { width: screenWidth, height: screenHeight };
  };

  this.getCursorPosition = function getCursorPosition() {
    return { x: cursorX, y: cursorY };
  };

  this.setCursorPosition = function setCursorPosition(x, y) {
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

  this.showCursor = function showCursor() {
    cursorVisible = true;
    cursorInterval = setInterval(function() {
      cursorState = !cursorState;
      updateCursor();
    }, 500);
  };

  this.hideCursor = function hideCursor() {
    clearInterval(cursorInterval);
    cursorVisible = false;
    updateCursor();

  };

  this.splitScreen = function splitScreen(splitAt) {
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

    switch (e.code) {

      // Non-Printables
      case 'Backspace': return 127;
      case 'Tab': return 9; // NOTE: Blocked elsewhere, for web page accessibility
      case 'Enter': return 13;
      case 'Escape': return 27;
      case 'ArrowLeft': return 8;
      case 'ArrowUp': return 11;
      case 'ArrowRight': return 21;
      case 'ArrowDown': return 10;
      case 'Delete': return 127;
      case 'Clear': return 24; // ctrl-X - used on the IIgs

        // Numeric
      case 'Numpad0': return 0x30;
      case 'Numpad1': return 0x31;
      case 'Numpad2': return 0x32;
      case 'Numpad3': return 0x33;
      case 'Numpad4': return 0x34;
      case 'Numpad5': return 0x35;
      case 'Numpad6': return 0x36;
      case 'Numpad7': return 0x37;
      case 'Numpad8': return 0x38;
      case 'Numpad9': return 0x39;

      case 'Digit0':
      case 'Digit1':
      case 'Digit2':
      case 'Digit3':
      case 'Digit4':
      case 'Digit5':
      case 'Digit6':
      case 'Digit7':
      case 'Digit8':
      case 'Digit9':
        var digit = e.code.substring(5);
        if (e.ctrlKey) {
          if (e.shiftKey) {
            switch (digit) {
              case '2': return 0; // ctrl-@
              case '6': return 30; // ctrl-^
            }
          }
          return (void 0);
        } else if (e.shiftKey) {
          return ')!@#$%^&*('.charCodeAt(ord(digit) - ord('0'));
        } else {
          return ord(digit);
        }

        // Alphabetic
      case 'KeyA':
      case 'KeyB':
      case 'KeyC':
      case 'KeyD':
      case 'KeyE':
      case 'KeyF':
      case 'KeyG':
      case 'KeyH':
      case 'KeyI':
      case 'KeyJ':
      case 'KeyK':
      case 'KeyL':
      case 'KeyM':
      case 'KeyN':
      case 'KeyO':
      case 'KeyP':
      case 'KeyQ':
      case 'KeyR':
      case 'KeyS':
      case 'KeyT':
      case 'KeyU':
      case 'KeyV':
      case 'KeyW':
      case 'KeyX':
      case 'KeyY':
      case 'KeyZ':
        var letter = e.code.substring(3);
        if (e.ctrlKey) {
          return ord(letter) - 0x40; // Control keys, Apple II-style
        } else if (capsLock || e.shiftKey) {
          return ord(letter); // Upper case
        } else {
          return ord(letter) + 0x20; // Lower case
        }

        // Symbol and Punctuation
      case 'Space': return ord(' ');
      case 'Semicolon': return e.shiftKey ? ord(':') : ord(';');
      case 'Equal': return e.shiftKey ? ord('+') : ord('=');
      case 'Comma': return e.shiftKey ? ord('<') : ord(',');
      case 'Minus': return e.ctrlKey ? 31 : e.shiftKey ? ord('_') : ord('-');
      case 'Period': return e.shiftKey ? ord('>') : ord('.');
      case 'Slash': return e.shiftKey ? ord('?') : ord('/');
      case 'Backquote': return e.shiftKey ? ord('~') : ord('`');
      case 'BracketLeft': return e.ctrlKey ? 27 : e.shiftKey ? ord('{') : ord('[');
      case 'Backslash': return e.ctrlKey ? 28 : e.shiftKey ? ord('|') : ord('\\');
      case 'BracketRight': return e.ctrlKey ? 29 : e.shiftKey ? ord('}') : ord(']');
      case 'Quote': return e.shiftKey ? ord('"') : ord('\'');

        // Apple IIgs Keyboard
      case 'NumpadClear': return 24;
      case 'NumpadAdd': return ord('+');
      case 'NumpadSubtract': return ord('-');
      case 'NumpadMultiply': return ord('*');
      case 'NumpadDivide': return ord('/');
      case 'NumpadDecimal': return ord('.');
      case 'NumpadEnter': return 13;
      default:
        break;
    }

    return -1;
  }

  function isBrowserKey(e) {
    return e.code === 'Tab' || e.code === 'F5' || e.metaKey;
  }


  // Internal
  function handleKeyDown(e) {
    if (!e.code || isBrowserKey(e))
      return true;

    var handled = false, code;

    switch (e.code) {

      case 'CapsLock':
        capsLock = !capsLock;
        handled = true;
        break;

      // Used as paddle buttons (0=Open Apple, 1=Solid Apple)
      case 'AltLeft':
      case 'Home': buttonState[0] = 255; handled = true; break;
      case 'AltRight':
      case 'End': buttonState[1] = 255; handled = true; break;
      case 'PageUp': buttonState[2] = 255; handled = true; break;
      case 'Shift':
      case 'ShiftLeft':
      case 'ShiftRight':
      buttonState[2] = 255; handled = true; break;
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
    if (!e.code || isBrowserKey(e))
      return true;

    var handled = false,
        code;

    switch (e.code) {

      case 'CapsLock':
        handled = true;
        break;

      // Used as paddle buttons (0=Open Apple, 1=Solid Apple)
      case 'AltLeft':
      case 'Home': buttonState[0] = 0; handled = true; break;
      case 'AltRight':
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


  this.getButtonState = function getButtonState(btn) {
    return buttonState[btn];
  };


  this.focus = function focus() {
    keyboardElement.focus();
  };


  // Hookable
  this.readLine = function readLine(callback, prompt) {
    self.writeString(prompt);

    lineCallback = callback;
    self.showCursor();
    self.focus();
  };


  // Hookable
  this.readChar = function readChar(callback) {
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


  this.getKeyboardRegister = function getKeyboardRegister() {
    self.focus();
    return keyboardRegister;
  };


  this.clearKeyboardStrobe = function clearKeyboardStrobe() {
    keyboardRegister = keyboardRegister & 0x7f;
    return keyboardRegister | (keyDown ? 0x80 : 0x00);
  };


  //
  // Constructor Logic
  //


  init(false, 24, 40);

  keyboardElement.addEventListener('keydown', handleKeyDown);
  keyboardElement.addEventListener('keyup', handleKeyUp);

  setInterval(function blinkFlash() {
    styleElem.classList.toggle('jsb-flash');
  }, 250);
}
