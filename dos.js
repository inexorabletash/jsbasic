//
// DOS Emulation

// Usage:
//   var dos = new DOS( tty )    // hooks tty's writeChar/readChar/readLine
//   dos.reset()                 // Close all open buffers

function DOS(tty) {

  var DOSErrors = {
    LANGUAGE_NOT_AVAILABLE: [1, "Language not available"],
    RANGE_ERROR: [2, 'Range error'],
    WRITE_PROTECTED: [4, 'Write protected'],
    END_OF_DATA: [5, 'End of data'],
    FILE_NOT_FOUND: [6, 'File not found'],
    VOLUME_MISMATCH: [7, 'Volume mismatch'],
    IO_ERROR: [8, 'I/O error'],
    DISK_FULL: [9, 'Disk full'],
    FILE_LOCKED: [10, 'File locked'],
    INVALID_OPTION: [11, 'Invalid option'],
    NO_BUFFERS_AVAILABLE: [12, 'No buffers available'],
    FILE_TYPE_MISMATCH: [13, 'File type mismatch'],
    PROGRAM_TOO_LARGE: [14, 'Program too large'],
    NOT_DIRECT_COMMAND: [15, 'Not direct command'],

    // Re-used
    SYNTAX_ERROR: [16, "Syntax error"]
  },

      STORAGE_PREFIX = 'vfs/',

      // For MON/NOMON
      MON_I = 1,
      MON_C = 2,
      MON_O = 4,

      // Original versions of hooked I/O routines
      tty_readLine,
      tty_readChar,
      tty_writeChar,

      // Hooked I/O routines
      hooked_readLine,
      hooked_readChar,
      hooked_writeChar,

      // character output state
      commandBuffer = "",
      commandMode = false,

      // I/O buffers
      buffers = {},
      activebuffer = null,
      mode = "",

      // other state
      monico = 0;

  function doserror(msg) {
    throw new basic.RuntimeError(msg[1], msg[0]);
  }

  // Internal - crack arguments e.g. ",S6,D1"
  function parseArgs(str, opts) {
    str = str || '';
    opts = opts || '';

    // Set these to zero so they're always defined when passed into command handlers
    var args = {
      V: 0, // Volume
      D: 0, // Drive
      S: 0, // Slot
      L: 0, // Length
      R: 0, // Record/Relative
      B: 0, // Byte
      A: 0, // Address
      C: undefined, // Echo Commands
      I: undefined, // Echo Input
      O: undefined  // Echo Output
    };

    var m;
    while ((m = str.match(/^,?\s*([VDSLRBACIO])\s*([0-9]+|\$[0-9A-Fa-f]+)?\s*([\x20-\x7E]*)/))) {
      if (opts.indexOf(m[1]) === -1) {
        doserror(DOSErrors.INVALID_OPTION);
      }
      args[m[1]] = Number(m[2]);
      str = m[3];
    }

    if (str.length > 0) {
      doserror(DOSErrors.INVALID_OPTION);
    }

    return args;
  }



  //----------------------------------------------------------------------
  // Browser-side VFS
  //----------------------------------------------------------------------

  function vfs_set(key, value) {
    return window.localStorage.setItem(STORAGE_PREFIX + key, encodeURIComponent(value));
  }
  function vfs_get(key) {
    var item = window.localStorage.getItem(STORAGE_PREFIX + key);
    return item !== null ? decodeURIComponent(item) : null;
  }
  function vfs_remove(key) {
    return window.localStorage.removeItem(STORAGE_PREFIX + key);
  }


  //----------------------------------------------------------------------
  // Implementation
  //----------------------------------------------------------------------

  this.reset = function reset() {
    buffers = {};
    activebuffer = null;
    mode = "";
  };

  function unlink(filename) {
    var item = vfs_get(filename);

    if (item === null) {
      doserror(DOSErrors.FILE_NOT_FOUND);
    }

    vfs_remove(filename);
  }

  function rename(oldname, newname) {
    var item = vfs_get(oldname);

    if (item === null) {
      doserror(DOSErrors.FILE_NOT_FOUND);
    }

    vfs_remove(oldname);
    vfs_set(newname, item);
  }

  function open(filename, recordlength) {
    if (recordlength === 0) {
      // Sequential access
      recordlength = 1;
    }

    // Peek in the VFS cache first
    var file = vfs_get(filename),
            req, url, async;
    if (file === null) {
      // Not cached - do a synchronous XmlHttpRequest for the file here
      req = new XMLHttpRequest();
      url = "vfs/" + encodeURIComponent(filename.replace(/\./g, '_')) + ".txt";
      async = false;
      req.open("GET", url, async);
      req.send(null);
      if (req.status === 200 || req.status === 0) { // 0 for file:// protocol
        file = req.responseText.replace(/\r\n/g, "\r");
        vfs_set(filename, file);
      }
    }

    // Create a buffer for the file
    buffers[filename] = {
      file: file,
      recordlength: recordlength,
      recordnum: 0,
      filepointer: 0
    };
  }

  function append(filename, recordlength) {
    // Normal open logic
    open(filename, recordlength);

    if (!Object.prototype.hasOwnProperty.call(buffers, filename)) {
      doserror(DOSErrors.FILE_NOT_FOUND);
    }

    var buf = buffers[filename];

    // Then seek to the end of the file
    buf.filepointer = buf.file.length;
    buf.recordnum = Math.floor(buf.filepointer / buf.recordlength);
  }

  function close(filename) {
    var buf, fn;

    // If not specified, close all buffers
    if (!filename) {
      for (fn in buffers) {
        if (Object.prototype.hasOwnProperty.call(buffers, fn)) {
          close(fn);
        }
      }
      return;
    }

    buf = buffers[filename];
    if (buf) {
      // flush changes to "disk"
      vfs_set(filename, buf.file);

      delete buffers[filename];
      if (buf === activebuffer) {
        activebuffer = null;
        mode = "";
      }
    }
  }

  function read(filename, recordnum, bytenum) {
    var buf = buffers[filename];
    if (!buf) {
      // Open file if no such named buffer, but don't create it
      open(filename, 0);
      buf = buffers[filename];
    }

    if (buf.file === null) {
      doserror(DOSErrors.FILE_NOT_FOUND);
    }

    // Set the file position
    buf.recordnum = recordnum;
    buf.filepointer = buf.recordlength * recordnum + bytenum;

    // Set the active buffer into read mode
    activebuffer = buf;
    mode = "r";
  }

  function write(filename, recordnum, bytenum) {
    var buf = buffers[filename];
    if (!buf) {
      // Must open the file before writing
      doserror(DOSErrors.FILE_NOT_FOUND);
    }

    if (buf.file === null) {
      // If we still don't have it, create in VFS if necessary
      vfs_set(filename, '');
      buf.file = '';
    }

    // Set up the file position
    buf.recordnum = recordnum;
    if (buf.recordlength > 1) {
      buf.filepointer = buf.recordlength * recordnum;
    }
    buf.filepointer += bytenum;

    // Set the active buffer into write mode
    activebuffer = buf;
    mode = "w";
  }

  function position(filename, records) {
    var buf = buffers[filename];
    if (!buf) {
      // Open file if no such named buffer, but don't create it
      open(filename, 0, false);
      buf = buffers[filename];
    }

    // Set up the file position
    buf.recordnum += records;
    buf.filepointer += buf.recordlength * records;

  }

  //----------------------------------------------------------------------
  // Command Dispatch
  //----------------------------------------------------------------------
  function executeCommand(command) {
    // Delegate to various commands
    // http://www.xs4all.nl/~fjkraan/comp/apple2faq/app2doscmdfaq.html
    // http://www.textfiles.com/apple/ANATOMY/

    var filename, filename2, args, slot;

    if (monico & MON_C && tty) {
      tty.writeString(command + "\r");
    }

    var m;
    if ((m = command.match(/^MON([\x20-\x7E]*)/))) {
      // MON[,C][,I][,O]                 Traces DOS 3.3 commands ('Commands', 'Input' and 'Output')
      args = parseArgs(m[1], 'ICO');

      if (args.I !== undefined) {
        monico |= MON_I;
      }
      if (args.C !== undefined) {
        monico |= MON_C;
      }
      if (args.O !== undefined) {
        monico |= MON_O;
      }

    } else if ((m = command.match(/^NOMON([\x20-\x7E]*)/))) {
      // NOMON[,C][,I][,O]               Cancels tracing of DOS 3.3 commands ('Commands', 'Input' and 'Output')
      args = parseArgs(m[1], 'ICO');
      if (args.I !== undefined) {
        monico &= ~MON_I;
      }
      if (args.C !== undefined) {
        monico &= ~MON_C;
      }
      if (args.O !== undefined) {
        monico &= ~MON_O;
      }
    } else if ((m = command.match(/^OPEN\s*([\x20-\x2B\x2D-\x7E]+)(,[\x20-\x7E]*)?/))) {
      // OPEN filename[,Llen]            Opens a text file.
      filename = m[1];
      args = parseArgs(m[2], 'L');
      open(filename, args.L);
    } else if ((m = command.match(/^APPEND\s*([\x20-\x2B\x2D-\x7E]+)(,[\x20-\x7E]*)?/))) {
      // APPEND filename                 Appends to a text file.
      filename = m[1];
      args = parseArgs(m[2]);
      append(filename, args.L);
    } else if ((m = command.match(/^CLOSE\s*([\x20-\x2B\x2D-\x7E]+)?(,[\x20-\x7E]*)?/))) {
      // CLOSE [filename]                Closes specified (or all) open text files.
      filename = m[1];
      close(filename);
    } else if ((m = command.match(/^POSITION\s*([\x20-\x2B\x2D-\x7E]+)(,[\x20-\x7E]*)?/))) {
      // POSITION filename[,Rnum]        Advances position in text file.
      filename = m[1];
      args = parseArgs(m[2], 'R');
      position(filename, args.R);
    } else if ((m = command.match(/^READ\s*([\x20-\x2B\x2D-\x7E]+)(,[\x20-\x7E]*)?/))) {
      // READ filename[,Rnum][,Bbyte]    Reads from a text file.
      filename = m[1];
      args = parseArgs(m[2], 'RB');
      read(filename, args.R, args.B);
    } else if ((m = command.match(/^WRITE\s*([\x20-\x2B\x2D-\x7E]+)(,[\x20-\x7E]*)?/))) {
      // WRITE filename[,Rnum][,Bbyte]   Writes to a text file.
      filename = m[1];
      args = parseArgs(m[2], 'RB');
      write(filename, args.R, args.B);
    } else if ((m = command.match(/^DELETE\s*([\x20-\x2B\x2D-\x7E]+)(,[\x20-\x7E]*)?/))) {
      // DELETE filename                 Delete a file
      filename = m[1];
      args = parseArgs(m[2]);
      unlink(filename);
    } else if ((m = command.match(/^RENAME\s*([\x20-\x2B\x2D-\x7E]+),\s*([\x20-\x2B\x2D-\x7E]+)(,[\x20-\x7E]*)?/))) {
      // RENAME filename,filename        Rename a file
      filename = m[1];
      filename2 = m[2];
      args = parseArgs(m[3]);
      rename(filename, filename2);
    } else if ((m = command.match(/^PR#\s*([\x20-\x2B\x2D-\x7E]+)(,[\x20-\x7E]*)?/))) {
      // PR# slot                        Direct output to slot
      slot = Number(m[1]);
      args = parseArgs(m[2]);
      if (slot === 0) {
        if (tty.setFirmwareActive) { tty.setFirmwareActive(false); }
        hooked_writeChar = tty_writeChar;
      } else if (slot === 3) {
        if (tty.setFirmwareActive) { tty.setFirmwareActive(true); }
        hooked_writeChar = tty_writeChar;
      } else if (slot === 4) {
        hooked_writeChar = clock_writeChar;
      } else {
        doserror(DOSErrors.RANGE_ERROR);
      }
    } else if ((m = command.match(/^IN#\s*([\x20-\x2B\x2D-\x7E]+)(,[\x20-\x7E]*)?/))) {
      // IN# slot                        Direct input to slot
      slot = Number(m[1]);
      args = parseArgs(m[2]);
      if (slot === 0 || slot === 3) {
        hooked_readLine = tty_readLine;
        hooked_readChar = tty_readChar;
      } else if (slot === 4) {
        hooked_readLine = clock_readLine;
        hooked_readChar = clock_readChar;
      } else {
        doserror(DOSErrors.RANGE_ERROR);
      }
    } else if ((m = command.match(/^$/))) {
      // Null command - terminates a READ/WRITE, but doesn't CLOSE
      // (leaves record length intact on open buffer)
      activebuffer = null;
      mode = "";
    } else {
      doserror(DOSErrors.SYNTAX_ERROR);
    }
  }


  //----------------------------------------------------------------------
  // Install TTY Hooks
  //----------------------------------------------------------------------
  tty_readLine = tty.readLine;
  tty_readChar = tty.readChar;
  tty_writeChar = tty.writeChar;

  hooked_readLine = tty_readLine;
  hooked_readChar = tty_readChar;
  hooked_writeChar = tty_writeChar;

  tty.readLine = dos_readLine;
  tty.readChar = dos_readChar;
  tty.writeChar = dos_writeChar;

  function dos_readLine(callback, prompt) {

    var string = "", c, data, len, fp, buffer;
    if (mode === "r") {
      // Cache for performance
      data = activebuffer.file;
      len = data.length;
      fp = activebuffer.filepointer;

      if (fp >= len) {
        doserror(DOSErrors.END_OF_DATA);
      }

      buffer = [];
      while (fp < len) {
        // Sequential Access
        c = data[fp];
        fp += 1;
        if (c === "\r" || c === "\n" || c === "\x00") {
          break;
        } else {
          buffer.push(c);
        }
      }
      activebuffer.filepointer = fp;
      string = buffer.join("");

      if (monico & MON_I) {
        tty.writeString(prompt + string + "\r");
      }

      // Suppress BASIC parsing of colons
      string = Object.assign(new String(string), {ignoreColons: true});

      // Non-blocking return
      setTimeout(function() { callback(string); }, 0);
    } else {
      hooked_readLine(callback, prompt);
    }
  }

  function dos_readChar(callback) {

    var character = "";
    if (mode === "r") {
      if (activebuffer.filepointer >= activebuffer.file.length) {
        doserror(DOSErrors.END_OF_DATA);
      }

      character = activebuffer.file[activebuffer.filepointer];
      activebuffer.filepointer += 1;

      if (monico & MON_I && tty) {
        hooked_writeChar(character);
      }

      // Non-blocking return
      setTimeout(function() { callback(character); }, 0);
    } else {
      hooked_readChar(callback);
    }
  }

  function dos_writeChar(c) {

    if (commandMode) {
      if (c === "\r") {
        commandMode = false;
        executeCommand(commandBuffer);
        commandBuffer = "";
      } else {
        commandBuffer += c;
      }
      return;
    } else if (c === "\x04") {
      commandBuffer = "";
      commandMode = true;
      return;
    }

    if (mode === "w") {
      var buf, d;

      if (monico & MON_O) {
        hooked_writeChar(c);
      }

      buf = activebuffer;
      // Extend file to necessary length
      while (buf.filepointer > buf.file.length) {
        buf.file += "\x00";
      }

      // Append or insert character
      if (buf.filepointer === buf.file.length) {
        buf.file += c;
      } else {
        d = buf.file.substring(0, buf.filepointer);
        d += c;
        d += buf.file.substring(buf.filepointer + 1);
        buf.file = d;
      }

      buf.filepointer += 1;
    } else {
      hooked_writeChar(c);
    }
  }

  //----------------------------------------------------------------------
  // Clock routine - vaguely ThunderClock compatible
  //----------------------------------------------------------------------

  var clockbuf = '';
  function clock_writeChar(c) {
    var DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    function spad2(s) {
      return ('  ' + String(s)).slice(-2);
    }
    function zpad2(s) {
      return ('00' + String(s)).slice(-2);
    }
    function zpad3(s) {
      return ('000' + String(s)).slice(-3);
    }

    var now = new Date();
    switch (c) {
    default:
    case '%': // AM/PM ASCII string mode - e.g. "TUE MAY 12 4:32:55 PM"
    case '>': // AM/PM ASCII string mode - e.g. "TUE MAY 12 4:32:55 PM"
      clockbuf =
        DAYS[now.getDay()] + ' ' +
        MONTHS[now.getMonth()] + ' ' +
        spad2(now.getDate()) + ' ' +
        spad2((now.getHours() === 0 ? 12 : now.getHours() > 12 ? now.getHours() - 12 : now.getHours())) + ':' +
        zpad2(now.getMinutes()) + ':' +
        zpad2(now.getSeconds()) + ' ' +
        (now.getHours() < 12 ? 'AM' : 'PM');
      break;
    case '&': // 24 hour ASCII string - e.g. "TUE MAY 12 16:32:55"
    case '<': // 24 hour ASCII string - e.g. "TUE MAY 12 16:32:55"
      clockbuf =
        DAYS[now.getDay()] + ' ' +
        MONTHS[now.getMonth()] + ' ' +
        spad2(now.getDate()) + ' ' +
        spad2(now.getHours()) + ':' +
        zpad2(now.getMinutes()) + ':' +
        zpad2(now.getSeconds()) + ' ' +
        (now.getHours() < 12 ? 'AM' : 'PM');
      break;
    case ' ': // Mountain Computer Apple Clock Format - e.g. "05/12 16;32;55.000"
      clockbuf =
        zpad2(now.getMonth()+1) + '/' +
        zpad2(now.getDate()) + ' ' +
        zpad2(now.getHours()) + ';' +
        zpad2(now.getMinutes()) + ';' +
        zpad2(now.getSeconds()) + '.' +
        zpad3(now.getMilliseconds());
      break;
    case '#': // Numeric format, e.g. MO,DW,DT,HR,MN,SEC
      clockbuf = [
        now.getMonth()+1,
        now.getDay(),
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds()
      ].join(',');
      break;
    }
    clockbuf += '\r';
  }
  function clock_readLine(callback, prompt) {
    tty.writeString(prompt); // TODO: Correct? Newline?
    var tmp = clockbuf;
    clockbuf = '';

    // Suppress BASIC parsing of colons
    tmp = Object.assign(new String(tmp), {ignoreColons: true});

    setTimeout(function() { callback(tmp); }, 0);
  }
  function clock_readChar(callback) {
    if (!clockbuf.length) {
      setTimeout(function() { callback('\r'); }, 0);
    } else {
      var c = clockbuf.substring(0, 1);
      clockbuf = clockbuf.slice(1);
      setTimeout(function() { callback(c); }, 0);
    }
  }
}
