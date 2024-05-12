//
// BASIC Compiler and Executor
//

// API:
//    var program = basic.compile(source);
//    // may throw basic.ParseError
//
//    program.init({tty: ..., hires: .e.., lores: ...})
//
//    // if TTY input is blocking:
//
//    var state;
//    do {
//        state = program.step();
//        // may throw basic.RuntimeError
//    } while (state !== basic.STATE_STOPPED);
//
//    // if TTY input is non-blocking:
//    function driver() {
//        var state;
//        do {
//            state = program.step(driver);
//            // may throw basic.RuntimeError
//        } while (state === basic.STATE_RUNNING);
//    }
//    driver(); // step until done or blocked
//    // driver will also be called after input is unblocked
//    // driver may want to yield via setTimeout() after N steps

this.basic = (function() {

  var basic = {
    STATE_STOPPED: 0,
    STATE_RUNNING: 1,
    STATE_BLOCKED: 2
  };

  //
  // Thrown if parsing fails
  //
  basic.ParseError = function(msg, line, column) {
    this.name = 'ParseError';
    this.message = msg || '';
    this.line = line;
    this.column = column;
  };
  basic.ParseError.prototype = new Error();


  //
  // Thrown when a program is running; can be caught by ONERR
  //
  basic.RuntimeError = function(msg, code) {
    this.name = 'RuntimeError';
    this.message = msg;
    this.code = code;
  };
  basic.RuntimeError.prototype = new Error();

  function runtime_error(msg) {
    if (typeof msg === 'object' && msg.length && msg.length >= 2) {
      throw new basic.RuntimeError(msg[1], msg[0]);
    } else {
      throw new basic.RuntimeError(msg);
    }
  }

  var ERRORS = {
    NEXT_WITHOUT_FOR: [0, "Next without for"],
    SYNTAX_ERROR: [16, "Syntax error"],
    RETURN_WITHOUT_GOSUB: [22, "Return without gosub"],
    OUT_OF_DATA: [42, "Out of data"],
    ILLEGAL_QUANTITY: [53, "Illegal quantity"],
    OVERFLOW: [69, "Overflow"],
    OUT_OF_MEMORY: [77, "Out of memory"],
    UNDEFINED_STATEMENT: [90, "Undefined statement"],
    BAD_SUBSCRIPT: [107, "Bad subscript"],
    REDIMED_ARRAY: [120, "Redimensioned array"],
    DIVISION_BY_ZERO: [133, "Division by zero"],
    TYPE_MISMATCH: [163, "Type mismatch"],
    STRING_TOO_LONG: [176, "String too long"],
    FORMULA_TOO_COMPLEX: [191, "Formula too complex"],
    UNDEFINED_FUNCTION: [224, "Undefined function"],
    REENTER: [254, "Re-enter"],
    INTERRUPT: [255, "Break"]
  };

  // Keyword table - these can be altered (e.g. localized) here
  var kws = {
    ABS: "ABS",
    AND: "AND",
    ASC: "ASC",
    ATN: "ATN",
    AT: "AT",
    CALL: "CALL",
    CHR$: "CHR$",
    CLEAR: "CLEAR",
    COLOR: "COLOR=",
    CONT: "CONT",
    COS: "COS",
    DATA: "DATA",
    DEF: "DEF",
    DEL: "DEL",
    DIM: "DIM",
    DRAW: "DRAW",
    END: "END",
    EXP: "EXP",
    FLASH: "FLASH",
    FN: "FN",
    FOR: "FOR",
    FRE: "FRE",
    GET: "GET",
    GOSUB: "GOSUB",
    GOTO: "GOTO",
    GR: "GR",
    HCOLOR: "HCOLOR=",
    HGR2: "HGR2",
    HGR: "HGR",
    HIMEM: "HIMEM:",
    HLIN: "HLIN",
    HOME: "HOME",
    HPLOT: "HPLOT",
    HTAB: "HTAB",
    IF: "IF",
    IN: "IN#",
    INPUT: "INPUT",
    INT: "INT",
    INVERSE: "INVERSE",
    LEFT$: "LEFT$",
    LEN: "LEN",
    LET: "LET",
    LIST: "LIST",
    LOAD: "LOAD",
    LOG: "LOG",
    LOMEM: "LOMEM:",
    MID$: "MID$",
    NEW: "NEW",
    NEXT: "NEXT",
    NORMAL: "NORMAL",
    NOTRACE: "NOTRACE",
    NOT: "NOT",
    ONERR: "ONERR",
    ON: "ON",
    OR: "OR",
    PDL: "PDL",
    PEEK: "PEEK",
    PLOT: "PLOT",
    POKE: "POKE",
    POP: "POP",
    POS: "POS",
    PRINT: "PRINT",
    PR: "PR#",
    READ: "READ",
    RECALL: "RECALL",
    REM: "REM",
    RESTORE: "RESTORE",
    RESUME: "RESUME",
    RETURN: "RETURN",
    RIGHT$: "RIGHT$",
    RND: "RND",
    ROT: "ROT=",
    RUN: "RUN",
    SAVE: "SAVE",
    SCALE: "SCALE=",
    SCRN: "SCRN",
    SGN: "SGN",
    SHLOAD: "SHLOAD",
    SIN: "SIN",
    SPC: "SPC",
    SPEED: "SPEED=",
    SQR: "SQR",
    STEP: "STEP",
    STOP: "STOP",
    STORE: "STORE",
    STR$: "STR$",
    TAB: "TAB",
    TAN: "TAN",
    TEXT: "TEXT",
    THEN: "THEN",
    TO: "TO",
    TRACE: "TRACE",
    USR: "USR",
    VAL: "VAL",
    VLIN: "VLIN",
    VTAB: "VTAB",
    WAIT: "WAIT",
    XDRAW: "XDRAW",
    AMPERSAND: "&",
    QUESTION: "?",
    HSCRN: "HSCRN"
  };

  //
  // Runtime flow control
  //
  function EndProgram() { }
  function GoToLine(n) { this.line = n; }
  function NextLine() { }
  function BlockingInput(method, callback) {
    this.method = method;
    this.callback = callback;
  }

  // Adapted from:
  // http://stackoverflow.com/questions/424292/how-to-create-my-own-javascript-random-number-generator-that-i-can-also-set-the-s
  function PRNG() {
    var S = 2345678901, // seed
        A = 48271, // const
        M = 2147483647, // const
        Q = M / A, // const
        R = M % A; // const

    this.next = function PRNG_next() {
      var hi = S / Q,
          lo = S % Q,
          t = A * lo - R * hi;
      S = (t > 0) ? t : t + M;
      this.last = S / M;
      return this.last;
    };
    this.seed = function PRNG_seed(x) {
      S = Math.floor(Math.abs(x));
    };
    this.next();
  }

  // Multidimensional array, with auto-dimensioning on first access
  function BASICArray(type, dims) {

    var array, dimensions;

    function offset(dims, subscripts) {
      if (subscripts.length !== dimensions.length) {
        runtime_error(ERRORS.BAD_SUBSCRIPT);
      }

      var k, l, s = 0, p, ss;
      for (k = 0; k < dims.length; k += 1) {

        ss = subscripts[k];
        if (ss < 0) {
          runtime_error(ERRORS.ILLEGAL_QUANTITY);
        }
        ss = ss >> 0;
        if (ss >= dims[k]) {
          runtime_error(ERRORS.BAD_SUBSCRIPT);
        }

        p = 1;
        for (l = k + 1; l < dims.length; l += 1) {
          p *= dims[l];
        }
        s += p * ss;
      }
      return s;
    }

    this.dim = function dim(dims) {
      if (array) {
        runtime_error(ERRORS.REDIMED_ARRAY);
      }

      dimensions = dims.map(function(n) { return (Number(n) >> 0) + 1; });

      var i, len = dimensions.reduce(function(a, b) { return a * b; }),
          defval = (type === 'string') ? '' : 0;

      array = [];
      for (i = 0; i < len; i += 1) {
        array[i] = defval;
      }
    };

    this.get = function get(subscripts) {
      if (!array) {
        this.dim(subscripts.map(function() { return 10; }));
      }


      return array[offset(dimensions, subscripts)];
    };

    this.set = function set(subscripts, value) {
      if (!array) {
        this.dim(subscripts.map(function() { return 10; }));
      }

      array[offset(dimensions, subscripts)] = value;
    };

    this.toJSON = function toJSON() {
      return { type: type, dimensions: dimensions, array: array };
    };

    if (dims) {
      this.dim(dims);
    }
  }

  // Stream API, for parsing source and INPUT entry
  function Stream(string) {
    this.line = 0;
    this.column = 0;

    this.match = function match(re) {
      var m = string.match(re), lines;
      if (m) {
        string = string.substring(m[0].length);
        lines = m[0].split('\n');
        if (lines.length > 1) {
          this.line += lines.length - 1;
          this.column = lines[lines.length - 1].length;
        } else {
          this.column += m[0].length;
        }

        this.lastMatch = m;
        return m;
      }
      return (void 0);
    };

    this.eof = function eof() {
      return string.length === 0;
    };
  }

  // Used for DATA (compile-time) and INPUT (runtime)
  // Parses source string for optionally quoted, comma-
  // separated values and adds them to items. Returns
  // the substring consumed.
  var parseDataInput = (function() {

    var regexWhitespace = /^[ \t]+/,
        regexQuotedString = /^"([^"]*?)(?:"|(?=\n|\r|$))/,
        regexUnquotedString = /^[^:,\r\n]*/,
        regexUnquotedStringIgnoreColons = /^[^,\r\n]*/,
        regexComma = /^,/;

    return function parseDataInput(stream, items, ignoreColons) {

      do {
        stream.match(regexWhitespace);

        if (stream.match(regexQuotedString)) {
          // quoted string
          items.push(stream.lastMatch[1]);
        } else if (stream.match(ignoreColons ? regexUnquotedStringIgnoreColons : regexUnquotedString)) {
          // unquoted string
          items.push(stream.lastMatch[0]);
        }
      } while (stream.match(regexComma));
    };
  } ());


  basic.compile = function compile(source) {
    "use strict";

    function vartype(name) {
      var s = name.charAt(name.length - 1);
      return s === '$' ? 'string' : s === '%' ? 'int' : 'float';
    }

    //----------------------------------------------------------------------
    //
    // Runtime Environment (bound to compiled program)
    //
    //----------------------------------------------------------------------

    var env,        // Environment - passed in to program, contains tty, graphics, etc.
        state,      // Program state - initialized at runtime
        lib,        // Statement Library (closure over state and env)
        funlib,     // Function Library (closure over state and env)
        peek_table, // Native memory access shims (PEEK, POKE, CALL)
        poke_table,
        call_table;

    //
    // NOTE: tempting to make these part of env but some access/modify program state,
    // e.g. onerr
    //
    peek_table = {
      // Text window
      0x0020: function() { return env.tty.textWindow ? env.tty.textWindow.left : 0; },
      0x0021: function() { return env.tty.textWindow ? env.tty.textWindow.width : 80; },
      0x0022: function() { return env.tty.textWindow ? env.tty.textWindow.top : 0; },
      0x0023: function() { return env.tty.textWindow ? env.tty.textWindow.top + env.tty.textWindow.height : 24; },
      0x0024: function() { return env.tty.getCursorPosition().x; },
      0x0025: function() { return env.tty.getCursorPosition().y; },

      // Random number field
      0x004e: function() { return (Math.random() * 256) & 0xff; },
      0x004f: function() { return (Math.random() * 256) & 0xff; },

      // Last error code
      0x00de: function() { return state.onerr_code; },

      // Hires Plotting Page (32=1, 64=2, 96=3)
      0x00e6: function() { return env.display ? (env.display.hires_plotting_page === 2 ? 64 : 32) : 0; },

      // TODO: 0x3D0 = 0x4C if DOS is present.

      // Keyboard
      0xC000: function() { return env.tty.getKeyboardRegister ? env.tty.getKeyboardRegister() : 0; },
      0xC010: function() { return env.tty.clearKeyboardStrobe ? env.tty.clearKeyboardStrobe() : 0; },

      // Speaker toggle
      0xC030: function() { return 0; },

      // Buttons
      0xC060: function() { return env.tty.getButtonState ? env.tty.getButtonState(3) : 0; },
      0xC061: function() { return env.tty.getButtonState ? env.tty.getButtonState(0) : 0; },
      0xC062: function() { return env.tty.getButtonState ? env.tty.getButtonState(1) : 0; },
      0xC063: function() { return env.tty.getButtonState ? env.tty.getButtonState(2) : 0; },

      // Graphics State
      0xC01A: function() { return (env.display && !env.display.getState().graphics) * 128; },
      0xC01B: function() { return (env.display && !env.display.getState().full) * 128; },
      0xC01C: function() { return (env.display && !env.display.getState().page1) * 128; },
      0xC01D: function() { return (env.display && !env.display.getState().lores) * 128; },
      0xC01E: function() { return (env.tty.isAltCharset && env.tty.isAltCharset()) * 128; },
      0xC01F: function() { return (env.tty.isFirmwareActive && env.tty.isFirmwareActive()) * 128; }
    };

    poke_table = {
      // Text window
      0x0020: function(v) { if (env.tty.textWindow) { env.tty.textWindow.left = v; } },
      0x0021: function(v) { if (env.tty.textWindow) { env.tty.textWindow.width = v; } },
      0x0022: function(v) { if (env.tty.textWindow) {
        var bottom = env.tty.textWindow.top + env.tty.textWindow.height;
        env.tty.textWindow.top = v;
        env.tty.textWindow.height = bottom - env.tty.textWindow.top;
      } },
      0x0023: function(v) { if (env.tty.textWindow) { env.tty.textWindow.height = v - env.tty.textWindow.top; } },
      0x0024: function(v) { env.tty.setCursorPosition(v, void 0); },
      0x0025: function(v) { env.tty.setCursorPosition(void 0, v); },

      // ONERR flag
      0x00D8: function(v) { if (v < 0x80) { state.onerr_handler = (void 0); } },

      // Hires Plotting Page (32=1, 64=2, 96=3)
      0x00E6: function(v) { if (env.display) { env.display.hires_plotting_page = (v === 64 ? 2 : 1); } },

      // Keyboard strobe
      0xC010: function() { if (env.tty.clearKeyboardStrobe) { env.tty.clearKeyboardStrobe(); } },

      // Display switches
      0xC050: function() { if (env.display) { env.display.setState("graphics", true); } }, // Graphics
      0xC051: function() { if (env.display) { env.display.setState("graphics", false); } }, // Text
      0xC052: function() { if (env.display) { env.display.setState("full", true); } }, // Full Graphics
      0xC053: function() { if (env.display) { env.display.setState("full", false); } }, // Split Screen
      0xC054: function() { if (env.display) { env.display.setState("page1", true); } }, // Page 1
      0xC055: function() { if (env.display) { env.display.setState("page1", false); } }, // Page 2
      0xC056: function() { if (env.display) { env.display.setState("lores", true); } }, // Lo-Res
      0xC057: function() { if (env.display) { env.display.setState("lores", false); } }, // Hi-Res

      // Speaker toggle
      0xC030: function() { } // no-op
    };

    call_table = {
      0xD683: function() { // Clear stack
        state.stack = [];
      },
      0xF328: function() { // Pop error entry off stack
        var stack_record = state.stack.pop();
        if (!{}.hasOwnProperty.call(stack_record, 'resume_stmt_index')) {
          runtime_error(ERRORS.SYNTAX_ERROR);
          return;
        }
      },
      0xF3E4: function() { // Reveal hi-res page 1
        if (!env.hires) { runtime_error('Hires graphics not supported'); }
        env.display.setState('graphics', true, 'full', true, 'page1', true, 'lores', false);
      },
      0xF3F2: function() { // Clear hi-res screen to black
        var hires = env.display.hires_plotting_page === 2 ? env.hires2 : env.hires;
        if (!hires) { runtime_error('Hires graphics not supported'); }
        hires.clear();
      },
      0xF3F6: function() { // Clear hi-res screen to last color Hplotted
        var hires = env.display.hires_plotting_page === 2 ? env.hires2 : env.hires;
        if (!hires) { runtime_error('Hires graphics not supported'); }
        hires.clear(hires.color);
      },
      0xFBF4: function() { // Move cursor right
        if (env.tty.cursorRight) { env.tty.cursorRight(); }
      },
      0xFC10: function() { // Move cursor left
        if (env.tty.cursorLeft) { env.tty.cursorLeft(); }
      },
      0xFC1A: function() { // Move cursor up
        if (env.tty.cursorUp) { env.tty.cursorUp(); }
      },
      0xFC42: function() { // Clear text from cursor to bottom
        if (env.tty.clearEOS) { env.tty.clearEOS(); }
      },
      0xFC66: function() { // Move cursor down
        if (env.tty.cursorDown) { env.tty.cursorDown(); }
      },
      0xFC9C: function() { // Clear from cursor to right
        if (env.tty.clearEOL) { env.tty.clearEOL(); }
      },
      0xFD0C: function() { // Wait for key press
        throw new BlockingInput(env.tty.readChar, function(_){});
      },
      0xFE84: function() { // Normal
        if (env.tty.setTextStyle) { env.tty.setTextStyle(env.tty.TEXT_STYLE_NORMAL); }
      },
      0xFE80: function() { // Inverse
        if (env.tty.setTextStyle) { env.tty.setTextStyle(env.tty.TEXT_STYLE_INVERSE); }
      }
    };

    lib = {

      //////////////////////////////////////////////////////////////////////
      //
      // Variable Statements
      //
      //////////////////////////////////////////////////////////////////////

      'clear': function CLEAR() {
        state.clear();
      },

      'dim': function DIM(name, subscripts) {
        state.arrays[name].dim(subscripts);
      },

      'def': function DEF(name, func) {
        state.functions[name] = func;
      },

      //////////////////////////////////////////////////////////////////////
      //
      // Flow Control Statements
      //
      //////////////////////////////////////////////////////////////////////

      'goto': function GOTO(line) {
        throw new GoToLine(line);
      },

      'on_goto': function ON_GOTO(index /* , ...lines */) {
        index = Math.floor(index);
        if (index < 0 || index > 255) {
          runtime_error(ERRORS.ILLEGAL_QUANTITY);
        }
        --index;
        var lines = Array.prototype.slice.call(arguments, 1);

        if (index >= 0 && index < lines.length) {
          throw new GoToLine(lines[index]);
        }
      },

      'gosub': function GOSUB(line) {
        state.stack.push({
          gosub_return: state.stmt_index,
          line_number: state.line_number
        });
        throw new GoToLine(line);
      },

      'on_gosub': function ON_GOSUB(index /* , ...lines */) {
        index = Math.floor(index);
        if (index < 0 || index > 255) {
          runtime_error(ERRORS.ILLEGAL_QUANTITY);
        }
        --index;
        var lines = Array.prototype.slice.call(arguments, 1);
        if (index >= 0 && index < lines.length) {
          state.stack.push({
            gosub_return: state.stmt_index,
            line_number: state.line_number
          });
          throw new GoToLine(lines[index]);
        }
      },

      'return': function RETURN() {
        var stack_record;
        while (state.stack.length) {
          stack_record = state.stack.pop();
          if ({}.hasOwnProperty.call(stack_record, 'gosub_return')) {
            state.stmt_index = stack_record.gosub_return;
            state.line_number = stack_record.line_number;
            return;
          }
        }
        runtime_error(ERRORS.RETURN_WITHOUT_GOSUB);
      },

      'pop': function POP() {
        var stack_record = state.stack.pop();
        if (!{}.hasOwnProperty.call(stack_record, 'gosub_return')) {
          runtime_error(ERRORS.RETURN_WITHOUT_GOSUB);
          return;
        }
      },

      'for': function FOR(varname, to, step) {
        state.stack.push({
          index: varname,
          to: to,
          step: step,
          for_next: state.stmt_index,
          line_number: state.line_number
        });
      },

      'next': function NEXT(/* ...varnames */) {
        var varnames = Array.prototype.slice.call(arguments),
                    varname, stack_record, value;
        do {
          varname = varnames.shift();

          do {
            stack_record = state.stack.pop();
            if (!stack_record || !{}.hasOwnProperty.call(stack_record, 'for_next')) {
              runtime_error(ERRORS.NEXT_WITHOUT_FOR);
            }
          } while (varname !== (void 0) && stack_record.index !== varname);

          value = state.variables[stack_record.index];

          value = value + stack_record.step;
          state.variables[stack_record.index] = value;

          if (!(stack_record.step > 0 && value > stack_record.to) &&
                        !(stack_record.step < 0 && value < stack_record.to) &&
                        !(stack_record.step === 0 && value === stack_record.to)) {
            state.stack.push(stack_record);
            state.stmt_index = stack_record.for_next;
            state.line_number = stack_record.line_number;
            return;
          }
        } while (varnames.length);
      },

      'if': function IF(value) {
        if (!value) {
          throw new NextLine();
        }
      },

      'stop': function STOP() {
        runtime_error(ERRORS.INTERRUPT);
      },

      'end': function END() {
        throw new EndProgram();
      },

      //////////////////////////////////////////////////////////////////////
      //
      // Error Handling Statements
      //
      //////////////////////////////////////////////////////////////////////

      'onerr_goto': function ONERR_GOTO(line) {
        state.onerr_handler = line;
        throw new NextLine();
      },

      'resume': function RESUME() {
        var stack_record = state.stack.pop();
        if (!{}.hasOwnProperty.call(stack_record, 'resume_stmt_index')) {
          runtime_error(ERRORS.SYNTAX_ERROR);
          return;
        }
        state.line_number = stack_record.resume_line_number;
        state.stmt_index = stack_record.resume_stmt_index;
      },

      //////////////////////////////////////////////////////////////////////
      //
      // Inline Data Statements
      //
      //////////////////////////////////////////////////////////////////////

      'restore': function RESTORE() {
        state.data_index = 0;
      },

      // PERF: optimize by turning into a function, e.g. "state.parsevar(name, lib.read())"
      'read': function READ(/* ...lvalues */) {
        var lvalues = Array.prototype.slice.call(arguments);
        while (lvalues.length) {
          if (state.data_index >= state.data.length) {
            runtime_error(ERRORS.OUT_OF_DATA);
          }
          (lvalues.shift())(state.data[state.data_index]);
          state.data_index += 1;
        }
      },

      //////////////////////////////////////////////////////////////////////
      //
      // I/O Statements
      //
      //////////////////////////////////////////////////////////////////////

      'print': function PRINT(/* ...strings */) {
        var args = Array.prototype.slice.call(arguments), arg;
        while (args.length) {
          arg = args.shift();
          if (typeof arg === 'function') {
            arg = arg();
          }
          env.tty.writeString(String(arg));
        }
      },

      'comma': function COMMA() {
        return function() {
          var cur = env.tty.getCursorPosition().x,
                        pos = (cur + 16) - (cur % 16);
          if (pos >= env.tty.getScreenSize().width) {
            return '\r';
          } else {
            return ' '.repeat(pos - cur);
          }
        };
      },

      'spc': function SPC(n) {
        n = n >> 0;
        if (n < 0 || n > 255) {
          runtime_error(ERRORS.ILLEGAL_QUANTITY);
        }
        return function() {
          return ' '.repeat(n);
        };
      },

      'tab': function TAB(n) {
        n = n >> 0;
        if (n < 0 || n > 255) {
          runtime_error(ERRORS.ILLEGAL_QUANTITY);
        }
        if (n === 0) { n = 256; }

        return function() {
          var pos = env.tty.getCursorPosition().x + 1;
          return ' '.repeat(pos >= n ? 0 : n - pos);
        };
      },

      'get': function GET(lvalue) {
        throw new BlockingInput(env.tty.readChar, function(entry) { lvalue(entry); });
      },

      'input': function INPUT(prompt /* , ...varlist */) {
        var varlist = Array.prototype.slice.call(arguments, 1); // copy for closure
        var im = function(cb) { return env.tty.readLine(cb, prompt); };
        var ih = function(entry) {
          var parts = [],
              stream = new Stream(entry);

          parseDataInput(stream, parts, entry.ignoreColons);

          while (varlist.length && parts.length) {
            try {
              varlist.shift()(parts.shift());
            } catch (e) {
              if (e instanceof basic.RuntimeError &&
                  e.code === ERRORS.TYPE_MISMATCH[0]) {
                e.code = ERRORS.REENTER[0];
                e.message = ERRORS.REENTER[1];
              }
              throw e;
            }
          }

          if (varlist.length) {
            prompt = '??';
            throw new BlockingInput(im, ih);
          }

          if (parts.length) {
            env.tty.writeString('?EXTRA IGNORED\r');
          }
        };
        throw new BlockingInput(im, ih);
      },

      'home': function HOME() {
        if (env.tty.clearScreen) { env.tty.clearScreen(); }
      },

      'htab': function HTAB(pos) {
        if (pos < 1 || pos >= env.tty.getScreenSize().width + 1) {
          runtime_error(ERRORS.ILLEGAL_QUANTITY);
        }

        if (env.tty.textWindow) {
          pos += env.tty.textWindow.left;
        }

        env.tty.setCursorPosition(pos - 1, void 0);
      },

      'vtab': function VTAB(pos) {
        if (pos < 1 || pos >= env.tty.getScreenSize().height + 1) {
          runtime_error(ERRORS.ILLEGAL_QUANTITY);
        }
        env.tty.setCursorPosition(void 0, pos - 1);
      },

      'inverse': function INVERSE() {
        if (env.tty.setTextStyle) { env.tty.setTextStyle(env.tty.TEXT_STYLE_INVERSE); }
      },
      'flash': function FLASH() {
        if (env.tty.setTextStyle) { env.tty.setTextStyle(env.tty.TEXT_STYLE_FLASH); }
      },
      'normal': function NORMAL() {
        if (env.tty.setTextStyle) { env.tty.setTextStyle(env.tty.TEXT_STYLE_NORMAL); }
      },
      'text': function TEXT() {
        if (env.display) {
          env.display.setState("graphics", false);
        }

        if (env.tty.textWindow) {
          // Reset text window
          env.tty.textWindow = {
            left: 0,
            top: 0,
            width: env.tty.getScreenSize().width,
            height: env.tty.getScreenSize().height
          };
        }
        env.tty.setCursorPosition(0, env.tty.getScreenSize().height - 1);
      },

      //////////////////////////////////////////////////////////////////////
      //
      // Miscellaneous Statements
      //
      //////////////////////////////////////////////////////////////////////

      'notrace': function NOTRACE() {
        state.trace_mode = false;
      },
      'trace': function TRACE() {
        state.trace_mode = true;
      },

      //////////////////////////////////////////////////////////////////////
      //
      // Lores Graphics
      //
      //////////////////////////////////////////////////////////////////////

      'gr': function GR() {
        if (!env.lores) { runtime_error('Lores graphics not supported'); }
        env.display.setState("lores", true, "full", false, "graphics", true);
        env.lores.clear();

        if (env.tty.textWindow) {
          env.tty.textWindow.left = 0;
          env.tty.textWindow.width = env.tty.getScreenSize().width;
          env.tty.textWindow.top = env.tty.getScreenSize().height - 4;
          env.tty.textWindow.height = 4;
        }

        env.tty.setCursorPosition(0, env.tty.getScreenSize().height);
      },

      'color': function COLOR(n) {
        if (!env.lores) { runtime_error('Lores graphics not supported'); }

        n = n >> 0;
        if (n < 0 || n > 255) { runtime_error(ERRORS.ILLEGAL_QUANTITY); }

        env.lores.setColor(n);
      },

      'plot': function PLOT(x, y) {
        if (!env.lores) { runtime_error('Lores graphics not supported'); }

        x = x >> 0;
        y = y >> 0;

        var size = env.lores.getScreenSize();
        if (x < 0 || y < 0 || x >= size.width || y >= size.height) {
          runtime_error(ERRORS.ILLEGAL_QUANTITY);
        }

        env.lores.plot(x, y);
      },

      'hlin': function HLIN(x1, x2, y) {
        if (!env.lores) { runtime_error('Lores graphics not supported'); }

        x1 = x1 >> 0;
        x2 = x2 >> 0;
        y = y >> 0;

        var size = env.lores.getScreenSize();
        if (x1 < 0 || x2 < 0 || y < 0 ||
                    x1 >= size.width || x2 >= size.width || y >= size.height) {
          runtime_error(ERRORS.ILLEGAL_QUANTITY);
        }

        env.lores.hlin(x1, x2, y);
      },

      'vlin': function VLIN(y1, y2, x) {
        if (!env.lores) { runtime_error('Lores graphics not supported'); }

        y1 = y1 >> 0;
        y2 = y2 >> 0;
        x = x >> 0;

        var size = env.lores.getScreenSize();
        if (x < 0 || y1 < 0 || y2 < 0 ||
                    x >= size.width || y1 >= size.height || y2 >= size.height) {
          runtime_error(ERRORS.ILLEGAL_QUANTITY);
        }

        env.lores.vlin(y1, y2, x);
      },


      //////////////////////////////////////////////////////////////////////
      //
      // Hires Graphics
      //
      //////////////////////////////////////////////////////////////////////


      'hgr': function HGR() {
        if (!env.hires) { runtime_error('Hires graphics not supported'); }
        env.display.setState("lores", false, "full", false, "page1", true, "graphics", true);
        env.display.hires_plotting_page = 1;
        env.hires.clear();
      },

      'hgr2': function HGR2() {
        if (!env.hires) { runtime_error('Hires graphics not supported'); }
        env.display.setState("lores", false, "full", true, "page1", false, "graphics", true);
        env.display.hires_plotting_page = 2;
        env.hires2.clear();
      },

      'hcolor': function HCOLOR(n) {
        if (!env.hires) { runtime_error('Hires graphics not supported'); }
        n = n >> 0;
        if (n < 0 || n > 7) { runtime_error(ERRORS.ILLEGAL_QUANTITY); }
        env.hires.setColor(n);
        if (env.hires2) { env.hires2.setColor(n); }
      },

      'hplot': function HPLOT(/* ...coords */) {
        var hires = env.display.hires_plotting_page === 2 ? env.hires2 : env.hires;
        if (!hires) { runtime_error('Hires graphics not supported'); }

        var coords = Array.prototype.slice.call(arguments),
                    size = hires.getScreenSize(),
                    x, y;

        x = coords.shift() >> 0;
        y = coords.shift() >> 0;

        if (x < 0 || y < 0 || x >= size.width || y >= size.height) {
          runtime_error(ERRORS.ILLEGAL_QUANTITY);
        }

        hires.plot(x, y);
        while (coords.length) {
          x = coords.shift() >> 0;
          y = coords.shift() >> 0;
          if (x < 0 || y < 0 || x >= size.width || y >= size.height) {
            runtime_error(ERRORS.ILLEGAL_QUANTITY);
          }
          hires.plot_to(x, y);
        }
      },

      'hplot_to': function HPLOT_TO(/* ...coords */) {
        var hires = env.display.hires_plotting_page === 2 ? env.hires2 : env.hires;
        if (!hires) { runtime_error('Hires graphics not supported'); }

        var coords = Array.prototype.slice.call(arguments),
            size = hires.getScreenSize(), x, y;

        while (coords.length) {
          x = coords.shift() >> 0;
          y = coords.shift() >> 0;

          if (x < 0 || y < 0 || x >= size.width || y >= size.height) {
            runtime_error(ERRORS.ILLEGAL_QUANTITY);
          }

          hires.plot_to(x, y);
        }
      },


      //////////////////////////////////////////////////////////////////////
      //
      // Compatibility shims
      //
      //////////////////////////////////////////////////////////////////////

      'pr#': function PR(slot) {
        if (slot === 0) {
          if (env.tty.setFirmwareActive) { env.tty.setFirmwareActive(false); }
        } else if (slot === 3) {
          if (env.tty.setFirmwareActive) { env.tty.setFirmwareActive(true); }
        }
      },

      'poke': function POKE(address, value) {
        address = address & 0xffff;

        value = value >> 0;
        if (value < 0 || value > 255) {
          runtime_error(ERRORS.ILLEGAL_QUANTITY);
        }

        if (!({}.hasOwnProperty.call(poke_table, address))) {
          runtime_error("Unsupported POKE location: " + address);
        }

        poke_table[address](value);
      },

      'call': function CALL(address) {
        address = address & 0xffff;

        if (!({}.hasOwnProperty.call(call_table, address))) {
          runtime_error("Unsupported POKE location: " + address);
        }

        call_table[address]();
      },

      'speed': function SPEED(n) {
        n = n >> 0;
        if (n < 0 || n > 255) {
          runtime_error(ERRORS.ILLEGAL_QUANTITY);
        }

        env.tty.speed = n;
      },

      //////////////////////////////////////////////////////////////////////
      //
      // Referenced by compiled functions
      //
      //////////////////////////////////////////////////////////////////////

      'div': function div(n, d) {
        var r = n / d;
        if (!isFinite(r)) { runtime_error(ERRORS.DIVISION_BY_ZERO); }
        return r;
      },

      'fn': function fn(name, arg) {
        if (!{}.hasOwnProperty.call(state.functions, name)) {
          runtime_error(ERRORS.UNDEFINED_FUNCTION);
        }
        return state.functions[name](arg);
      },

      'checkFinite': function checkFinite(n) {
        if (!isFinite(n)) { runtime_error(ERRORS.OVERFLOW); }
        return n;
      },

      'toint': function toint(n) {
        n = n >> 0;
        if (n > 0x7fff || n < -0x8000) { runtime_error(ERRORS.ILLEGAL_QUANTITY); }
        return n;
      }
    };

    // Apply a signature [return_type, arg0_type, arg1_type, ...] to a function
    function funcsign(func /*, return_type, ...arg_types */) {
      func.signature = Array.prototype.slice.call(arguments, 1);
      return func;
    }

    funlib = {};

      //////////////////////////////////////////////////////////////////////
      //
      // Functions
      //
      // name: [ impl, returntype, [arg0type [, arg1type [, ... ] ]
      //
      //////////////////////////////////////////////////////////////////////


      funlib[kws.ABS] = funcsign(Math.abs, 'number', 'number');
      funlib[kws.ASC] = funcsign(function(s) {
        if (s.length < 1) { runtime_error(ERRORS.ILLEGAL_QUANTITY); }
        return s.charCodeAt(0);
      }, 'number', 'string');
      funlib[kws.ATN] = funcsign(Math.atan, 'number', 'number');
      funlib[kws.CHR$] = funcsign(String.fromCharCode, 'string', 'number');
      funlib[kws.COS] = funcsign(Math.cos, 'number', 'number');
      funlib[kws.EXP] = funcsign(Math.exp, 'number', 'number');
      funlib[kws.INT] = funcsign(Math.floor, 'number', 'number');
      funlib[kws.LEN] = funcsign(function LEN(s) { return s.length; }, 'number', 'string');
      funlib[kws.LOG] = funcsign(Math.log, 'number', 'number');
      funlib[kws.SGN] = funcsign(function SGN(n) { return n > 0 ? 1 : n < 0 ? -1 : 0; }, 'number', 'number');
      funlib[kws.SIN] = funcsign(Math.sin, 'number', 'number');
      funlib[kws.SQR] = funcsign(Math.sqrt, 'number', 'number');
      funlib[kws.STR$] = funcsign(function STR$(n) { return n.toString(); }, 'string', 'number');
      funlib[kws.TAN] = funcsign(Math.tan, 'number', 'number');
      funlib[kws.VAL] = funcsign(function VAL(s) {
        var n = parseFloat(s);
        return isFinite(n) ? n : 0;
      }, 'number', 'string');

      funlib[kws.RND] = funcsign(function RND(n) {
        if (n > 0) {
          // Next in PRNG sequence
          return state.prng.next();
        } else if (n < 0) {
          // Re-seed. NOTE: Not predictable as in Applesoft
          state.prng.seed(n);
          return state.prng.next();
        }
        return state.prng.last;
      }, 'number', 'number');

      funlib[kws.LEFT$] = funcsign(function LEFT$(s, n) {
        if (n < 1 || n > 255) {
          runtime_error(ERRORS.ILLEGAL_QUANTITY);
        }
        return s.substring(0, n);
      }, 'string', 'string', 'number');
      funlib[kws.MID$] = funcsign(function MID$(s, n, n2) {
        if (n < 1 || n > 255) {
          runtime_error(ERRORS.ILLEGAL_QUANTITY);
        }
        if (n2 < 0 || n2 > 255) {
          runtime_error(ERRORS.ILLEGAL_QUANTITY);
        }
        return n2 === (void 0) ? s.substring(n - 1) : s.substring(n - 1, n + n2 - 1);
      }, 'string', 'string', 'number', 'number?');
      funlib[kws.RIGHT$] = funcsign(function RIGHT$(s, n) {
        if (n < 1 || n > 255) {
          runtime_error(ERRORS.ILLEGAL_QUANTITY);
        }
        return s.length < n ? s : s.substring(s.length - n);
      }, 'string', 'string', 'number');

      funlib[kws.POS] = funcsign(function POS(n) { return env.tty.getCursorPosition().x; }, 'number', 'number');
      funlib[kws.SCRN] = funcsign(function SCRN(x, y) {
        if (!env.lores) { runtime_error("Graphics not supported"); }
        x = x >> 0;
        y = y >> 0;
        var size = env.lores.getScreenSize();
        if (x < 0 || y < 0 || x >= size.width || y >= size.height) {
          runtime_error(ERRORS.ILLEGAL_QUANTITY);
        }

        return env.lores.getPixel(x, y);
      }, 'number', 'number', 'number');
      funlib[kws.HSCRN] = funcsign(function HSCRN(x, y) {
        var hires = env.display.hires_plotting_page === 2 ? env.hires2 : env.hires;
        if (!hires) { runtime_error("Graphics not supported"); }

        x = x >> 0;
        y = y >> 0;
        var size = hires.getScreenSize();
        if (x < 0 || y < 0 || x >= size.width || y >= size.height) {
          runtime_error(ERRORS.ILLEGAL_QUANTITY);
        }

        return hires.getPixel(x, y);
      }, 'number', 'number', 'number');

      funlib[kws.PDL] = funcsign(function PDL(n) {
        if (env.paddle) {
          return (env.paddle(n) * 255) & 0xff;
        } else {
          return runtime_error('Paddles not attached');
        }
      }, 'number', 'number');
      funlib[kws.FRE] = funcsign(function FRE(n) {
        return JSON ? JSON.stringify([state.variables, state.arrays, state.functions]).length : 0;
      }, 'number', 'number');
      funlib[kws.PEEK] = funcsign(function PEEK(address) {
        address = address & 0xffff;
        if (!{}.hasOwnProperty.call(peek_table, address)) {
          runtime_error("Unsupported PEEK location: " + address);
        }
        return peek_table[address]();
      }, 'number', 'number');

      // Not supported
      funlib[kws.USR] = funcsign(function USR(n) { runtime_error("USR Function not supported"); }, 'number', 'number');


    //----------------------------------------------------------------------
    //
    // Parser / Compiler
    //
    //----------------------------------------------------------------------

    var program = (function() {

      var identifiers = {
        variables: {},
        arrays: {}
      };

      //////////////////////////////////////////////////////////////////////
      //
      // Lexical Analysis
      //
      //////////////////////////////////////////////////////////////////////

      var match, test, endOfStatement, endOfProgram,
          currLine = 0, currColumn = 0,
          currLineNumber = 0;

      function parse_error(msg) {
        return new basic.ParseError(msg + " in line " + currLineNumber,
                                    currLine, currColumn);
      }


      (function(source) {
        function munge(kw) {
          // Escape special characters
          function escape(c) { return (/[[\]\\^$.|?*+()]/).test(c) ? '\\' + c : c; }
          // Allow linear whitespace between characters
          //return kw.split('').map(escape).join('[ \\t]*');

          // Allow linear whitespace in HCOLOR=, HIMEM:, CHR$, etc
          return kw.split(/(?=\W)/).map(escape).join('[ \\t]*');
        }

        var RESERVED_WORDS = [
          kws.ABS, kws.AND, kws.ASC, kws.ATN, kws.AT, kws.CALL,
          kws.CHR$, kws.CLEAR, kws.COLOR, kws.CONT, kws.COS,
          /*kws.DATA,*/ kws.DEF, kws.DEL, kws.DIM, kws.DRAW, kws.END,
          kws.EXP, kws.FLASH, kws.FN, kws.FOR, kws.FRE, kws.GET,
          kws.GOSUB, kws.GOTO, kws.GR, kws.HCOLOR, kws.HGR2, kws.HGR,
          kws.HIMEM, kws.HLIN, kws.HOME, kws.HPLOT, kws.HTAB, kws.IF,
          kws.IN, kws.INPUT, kws.INT, kws.INVERSE, kws.LEFT$, kws.LEN,
          kws.LET, kws.LIST, kws.LOAD, kws.LOG, kws.LOMEM, kws.MID$,
          kws.NEW, kws.NEXT, kws.NORMAL, kws.NOTRACE, kws.NOT,
          kws.ONERR, kws.ON, kws.OR, kws.PDL, kws.PEEK, kws.PLOT,
          kws.POKE, kws.POP, kws.POS, kws.PRINT, kws.PR, kws.READ,
          kws.RECALL, /*kws.REM,*/ kws.RESTORE, kws.RESUME,
          kws.RETURN, kws.RIGHT$, kws.RND, kws.ROT, kws.RUN, kws.SAVE,
          kws.SCALE, kws.SCRN, kws.SGN, kws.SHLOAD, kws.SIN, kws.SPC,
          kws.SPEED, kws.SQR, kws.STEP, kws.STOP, kws.STORE, kws.STR$,
          kws.TAB, kws.TAN, kws.TEXT, kws.THEN, kws.TO, kws.TRACE,
          kws.USR, kws.VAL, kws.VLIN, kws.VTAB, kws.WAIT, kws.XDRAW,
          kws.AMPERSAND, kws.QUESTION, kws.HSCRN
        ];
        // NOTE: keywords that are stems of other words need to go after (e.g. "NOTRACE", "NOT)
        RESERVED_WORDS.sort();
        RESERVED_WORDS.reverse();

        var regexReservedWords = new RegExp("^(" + RESERVED_WORDS.map(munge).join("|") + ")", "i"),
            regexIdentifier = /^([A-Za-z][A-Za-z0-9]?)[A-Za-z0-9]*(\$|%)?/,
            regexStringLiteral = /^"([^"]*?)(?:"|(?=\n|\r|$))/,
            regexNumberLiteral = /^[0-9]*\.?[0-9]+(?:[eE]\s*[-+]?\s*[0-9]+)?/,
            regexHexLiteral = /^\$[0-9A-Fa-f]+/,
            regexOperator = /^[;=<>+\-*/^(),]/,

            regexLineNumber = /^[0-9]+/,
            regexSeparator = /^:/,

            regexRemark = new RegExp('^(' + munge(kws.REM) + '([^\r\n]*))', 'i'),
            regexData = new RegExp('^(' + munge(kws.DATA) + ')', 'i'),

            regexLinearWhitespace = /^[ \t]+/,
            regexNewline = /^\r?\n/;

        // Token types:
        //    lineNumber    - start of a new line
        //    separator     - separates statements on same line
        //    reserved      - reserved keyword (command, function, etc)
        //    identifier    - variable name
        //    string        - string literal
        //    number        - number literal
        //    operator      - operator
        //    remark        - REM blah
        //    data          - DATA blah,"blah",blah

        var start = true,
            stream = new Stream(source);

        function nextToken() {
          var token = {}, newline = start, ws;
          start = false;

          currLine = stream.line + 1;
          currColumn = stream.column + 1;

          // Consume whitespace
          do {
            ws = false;
            if (stream.match(regexLinearWhitespace)) {
              ws = true;
            } else if (stream.match(regexNewline)) {
              ws = true;
              newline = true;
            }
          } while (ws);

          if (stream.eof()) {
            return (void 0);
          }

          if (newline) {
            if (stream.match(regexLineNumber)) {
              token.lineNumber = Number(stream.lastMatch[0]);
            } else if (stream.match(regexSeparator)) {
              // Extension - allow leading : to continue previous line
              token.separator = stream.lastMatch[0];
            } else {
              throw parse_error("Syntax error: Expected line number or separator");
            }
          } else if (stream.match(regexRemark)) {
            token.remark = stream.lastMatch[2];
          } else if (stream.match(regexData)) {
            token.data = [];
            parseDataInput(stream, token.data);
          } else if (stream.match(regexReservedWords)) {
            token.reserved = stream.lastMatch[1].toUpperCase().replace(/\s+/g, '');
            if (token.reserved === kws.QUESTION) { token.reserved = kws.PRINT; } // HACK
          } else if (stream.match(regexIdentifier)) {
            token.identifier = stream.lastMatch[1].toUpperCase() + (stream.lastMatch[2] || ''); // Canonicalize identifier name
          } else if (stream.match(regexStringLiteral)) {
            token.string = stream.lastMatch[1];
          } else if (stream.match(regexNumberLiteral)) {
            token.number = parseFloat(stream.lastMatch[0].replace(/\s+/g, ''));
          } else if (stream.match(regexHexLiteral)) {
            token.number = parseInt(stream.lastMatch[0].substring(1), 16);
          } else if (stream.match(regexOperator)) {
            token.operator = stream.lastMatch[0].replace(/\s+/g, '');
          } else if (stream.match(regexSeparator)) {
            token.separator = stream.lastMatch[0];
          } else {
            throw parse_error("Syntax error: Unexpected '" + source.substr(0, 40) + "'");
          }
          return token;
        }

        var lookahead = nextToken();

        match = function match(type, value) {

          if (!lookahead) {
            throw parse_error("Syntax error: Expected " + type + ", saw end of file");
          }

          var token = lookahead;
          if ('lineNumber' in token) {
            currLineNumber = token.lineNumber;
          }
          lookahead = nextToken();

          if (!{}.hasOwnProperty.call(token, type)) {
            throw parse_error("Syntax error: Expected " + type + ", saw " + JSON.stringify(token));
          }

          if (value !== (void 0) && token[type] !== value) {
            throw parse_error("Syntax error: Expected '" + value + "', saw " + JSON.stringify(token));
          }

          return token[type];
        };

        test = function test(type, value, consume) {
          if (lookahead && {}.hasOwnProperty.call(lookahead, type) &&
                        (value === (void 0) || lookahead[type] === value)) {

            if (consume) {
              var token = lookahead;
              if ('lineNumber' in token) {
                currLineNumber = token.lineNumber;
              }
              lookahead = nextToken();
            }

            return true;
          }

          return false;
        };

        endOfStatement = function endOfStatement() {
          return !lookahead ||
                        {}.hasOwnProperty.call(lookahead, 'separator') ||
                        {}.hasOwnProperty.call(lookahead, 'lineNumber');
        };

        endOfProgram = function endOfProgram() {
          return !lookahead;
        };

      } (source));


      //////////////////////////////////////////////////////////////////////
      //
      // Compiler utility functions
      //
      //////////////////////////////////////////////////////////////////////

      function quote(string) {
        return JSON.stringify(string);
      }

      //////////////////////////////////////////////////////////////////////
      //
      // Recursive Descent Parser
      //
      //////////////////////////////////////////////////////////////////////

      var parseExpression, parseSubscripts;

      //
      // Type Checking
      //

      function parseAnyExpression() {
        var expr = parseExpression();
        return expr.source;
      }

      function enforce_type(actual, expected) {
        if (actual !== expected) {
          throw parse_error('Type mismatch error: Expected ' + expected);
        }
      }

      function parseStringExpression() {
        var expr = parseExpression();
        enforce_type(expr.type, 'string');
        return expr.source;
      }

      function parseNumericExpression() {
        var expr = parseExpression();
        enforce_type(expr.type, 'number');
        return expr.source;
      }

      //
      // Variables
      //

      parseSubscripts = function() {
        var subscripts; // undefined = no subscripts

        if (test('operator', '(', true)) {

          subscripts = [];

          do {
            subscripts.push(parseNumericExpression());
          } while (test('operator', ',', true));

          match("operator", ")");

          return subscripts.join(',');
        }
        return (void 0);
      };

      function parsePValue() {
        var name = match('identifier'),
            subscripts = parseSubscripts();

        if (subscripts) {
          identifiers.arrays[name] = true;
          return '(function (value){state.parsevar(' +
                        quote(name) + ',[' + subscripts + '],value);})';
        } else {
          identifiers.variables[name] = true;
          return '(function (value){state.parsevar(' +
                        quote(name) + ',value);})';
        }
      }


      //
      // Expressions
      //

      parseExpression = (function() {
        // closure to keep things tidy

        function parseUserfunction() {
          var name = match('identifier'),
              type = vartype(name) === 'string' ? 'string' : 'number',
              expr;

          // FUTURE: Allow differing argument type and return type
          // (may require runtime type checks)

          // Determine the function argument
          match("operator", "(");
          expr = type === 'string' ? parseStringExpression() : parseNumericExpression();
          match("operator", ")");

          return { source: 'lib.fn(' + quote(name) + ',' + expr + ')', type: type };
        }


        function parsefunction(name) {
          if (!{}.hasOwnProperty.call(funlib, name)) {
            throw parse_error("Undefined function: " + name);
          }

          match("operator", "(");

          var func = funlib[name],
              funcdesc = func.signature.slice(),
              rtype = funcdesc.shift(),
              args = [],
              atype;

          while (funcdesc.length) {
            atype = funcdesc.shift();

            if (/\?$/.test(atype)) {
              if (test('operator', ')')) {
                break;
              } else {
                atype = atype.substring(0, atype.length - 1);
              }
            }
            if (args.length) {
              match("operator", ",");
            }

            if (atype === 'string') {
              args.push(parseStringExpression());
            } else if (atype === 'number') {
              args.push(parseNumericExpression());
            } else {
              throw new Error("Invalid function definition");
            }
          }

          match("operator", ")");

          return { source: 'funlib.' + name + '(' + args.join(',') + ')', type: rtype };
        }

        function parseFinalExpression() {
          if (test('number')) {
            return { source: String(match('number')), type: 'number' };
          } else if (test('string')) {
            return { source: quote(match('string')), type: 'string' };
          } else if (test('reserved', kws.FN, true)) {
            return parseUserfunction();
          } else if (test('reserved')) {
            return parsefunction(match('reserved'));
          } else if (test('identifier')) {
            var name = match('identifier'),
                type = vartype(name) === 'string' ? 'string' : 'number',
                subscripts = parseSubscripts();
            if (subscripts) {
              identifiers.arrays[name] = true;
              return { source: 'state.arrays[' + quote(name) + '].get([' + subscripts + '])', type: type };
            } else {
              identifiers.variables[name] = true;
              return { source: 'state.variables[' + quote(name) + ']', type: type };
            }
          } else {
            match("operator", "(");
            var expr = parseExpression();
            match("operator", ")");
            return expr;
          }
        }

        function parseUnaryExpression() {
          var rhs, op;

          if (test('operator', '+') || test('operator', '-')) {
            op = match('operator');
          } else if (test('reserved', kws.NOT)) {
            op = match('reserved');
          }

          if (op) {
            rhs = parseUnaryExpression();

            enforce_type(rhs.type, 'number');

            switch (op) {
              case "+": return rhs;
              case "-": return { source: '(-' + rhs.source + ')', type: 'number' };
              case kws.NOT: return { source: '((!' + rhs.source + ')?1:0)', type: 'number' };
            }
          }
          return parseFinalExpression();
        }

        function parsePowerExpression() {
          var lhs = parseUnaryExpression(), rhs;
          while (test('operator', '^', true)) {
            rhs = parseUnaryExpression();

            enforce_type(lhs.type, 'number');
            enforce_type(rhs.type, 'number');

            lhs = { source: 'Math.pow(' + lhs.source + ',' + rhs.source + ')', type: 'number' };
          }
          return lhs;
        }

        function parseMultiplicativeExpression() {
          var lhs = parsePowerExpression(), rhs, op;
          while (test('operator', '*') || test('operator', '/')) {
            op = match('operator');
            rhs = parsePowerExpression();

            enforce_type(lhs.type, 'number');
            enforce_type(rhs.type, 'number');

            switch (op) {
              case "*": lhs = { source: '(' + lhs.source + '*' + rhs.source + ')', type: 'number' }; break;
              case "/": lhs = { source: 'lib.div(' + lhs.source + ',' + rhs.source + ')', type: 'number' }; break;
            }
          }
          return lhs;
        }

        function parseAdditiveExpression() {
          var lhs = parseMultiplicativeExpression(), rhs, op;
          while (test('operator', '+') || test('operator', '-')) {
            op = match('operator');
            rhs = parseMultiplicativeExpression();

            switch (op) {
              case "+":
                enforce_type(rhs.type, lhs.type);
                lhs = { source: '(' + lhs.source + '+' + rhs.source + ')', type: lhs.type }; break;
              case "-":
                enforce_type(lhs.type, 'number');
                enforce_type(rhs.type, 'number');
                lhs = { source: '(' + lhs.source + '-' + rhs.source + ')', type: lhs.type }; break;
            }
          }
          return lhs;
        }

        function parseRelationalExpression() {
          var lhs = parseAdditiveExpression(), rhs, op;
          while (test('operator', '<') || test('operator', '>') || test('operator', '=')) {

            op = match('operator');
            switch (op) {
            case '<':
              if (test('operator', '=', true)) { op = '<='; break; }
              if (test('operator', '>', true)) { op = '!=='; break; }
              break;
            case '>':
              if (test('operator', '=', true)) { op = '>='; break; }
              if (test('operator', '<', true)) { op = '!=='; break; }
              break;
            case '=':
              if (test('operator', '<', true)) { op = '<='; break; }
              if (test('operator', '>', true)) { op = '>='; break; }
              if (test('operator', '=', true)) { op = '==='; break; }
              op = '===';
            }

            rhs = parseAdditiveExpression();

            enforce_type(rhs.type, lhs.type);
            lhs = lhs = { source: '((' + lhs.source + op + rhs.source + ')?1:0)', type: 'number' };
          }
          return lhs;
        }

        function parseAndExpression() {
          var lhs = parseRelationalExpression(), rhs;
          while (test('reserved', kws.AND, true)) {
            rhs = parseRelationalExpression();

            enforce_type(lhs.type, 'number');
            enforce_type(rhs.type, 'number');

            lhs = {
              source: '((' + lhs.source + '&&' + rhs.source + ')?1:0)',
              type: 'number'
            };
          }
          return lhs;
        }

        function parseOrExpression() {
          var lhs = parseAndExpression(), rhs;
          while (test('reserved', kws.OR, true)) {
            rhs = parseAndExpression();

            enforce_type(lhs.type, 'number');
            enforce_type(rhs.type, 'number');

            lhs = {
              source: '((' + lhs.source + '||' + rhs.source + ')?1:0)',
              type: 'number'
            };
          }
          return lhs;
        }

        return parseOrExpression;
      } ());


      //
      // Statements
      //

      function parseCommand() {

        function slib(name /* , ...args */) {
          var args = Array.prototype.slice.call(arguments, 1);
          return 'lib[' + quote(name) + '](' + args.join(',') + ');';
        }

        var keyword = test('identifier') ? kws.LET : match('reserved'),
            name, type, subscripts, is_to, expr, param, args, prompt, trailing, js;

        switch (keyword) {
          //////////////////////////////////////////////////////////////////////
          //
          // Variable Statements
          //
          //////////////////////////////////////////////////////////////////////

          case kws.CLEAR: // Clear all variables
            return slib('clear');

          case kws.LET:  // Assign a variable, LET x = expr
            name = match('identifier');
            subscripts = parseSubscripts();
            match('operator', '=');

            type = vartype(name);
            if (type === 'int') {
              expr = 'lib.toint(lib.checkFinite(' + parseNumericExpression() + '))';
            } else if (type === 'float') {
              expr = 'lib.checkFinite(' + parseNumericExpression() + ')';
            } else { // type === 'string')
              expr = parseStringExpression();
            }

            if (!subscripts) {
              identifiers.variables[name] = true;
              return 'state.variables[' + quote(name) + '] = ' + expr;
            }
            identifiers.arrays[name] = true;
            return 'state.arrays[' + quote(name) + '].set([' + subscripts + '], ' + expr + ')';

          case kws.DIM:
            js = '';
            do {
              name = match('identifier');
              subscripts = parseSubscripts();
              identifiers.arrays[name] = true;
              js += slib('dim', quote(name), '[' + subscripts + ']');
            } while (test('operator', ',', true));
            return js;

          case kws.DEF:     // DEF FN A(X) = expr
            match("reserved", kws.FN);
            name = match('identifier');
            match("operator", "(");
            param = match('identifier');
            match("operator", ")");
            match("operator", "=");

            if (vartype(name) !== vartype(param)) {
              throw parse_error("DEF FN function type and argument type must match");
            }

            expr = vartype(name) === 'string' ?
              parseStringExpression() : parseNumericExpression();

            return slib('def', quote(name),
                            'function (arg){' +
            // Save the current context/variable so we can evaluate
                            'var rv,ov=state.variables[' + quote(param) + '];' +
            // Swap in the argument
                            'state.variables[' + quote(param) + ']=arg;' +
            // Evaluate the user-function expression
                            'rv=' + expr + ';' +
            // Restore
                            'state.variables[' + quote(param) + ']=ov;' +
                            'return rv;' +
                            '}');

            //////////////////////////////////////////////////////////////////////
            //
            // Flow Control Statements
            //
            //////////////////////////////////////////////////////////////////////

          case kws.GOTO: // GOTO linenum
            return slib('goto', match("number"));

          case kws.ON:  // ON expr (GOTO|GOSUB) linenum[,linenum ... ]
            expr = parseNumericExpression();

            keyword = match('reserved');
            if (keyword !== kws.GOTO && keyword !== kws.GOSUB) {
              throw parse_error("Syntax error: Expected " + kws.GOTO + " or " + kws.GOSUB);
            }

            args = [];
            do {
              args.push(match("number"));
            } while (test("operator", ",", true));

            return slib(keyword === kws.GOSUB ? 'on_gosub' : 'on_goto', expr, args.join(','));

          case kws.GOSUB: // GOSUB linenum
            return slib('gosub', match("number"));

          case kws.RETURN: // Return from the last GOSUB
            return slib('return');

          case kws.POP: // Turn last GOSUB into a GOTO
            return slib('pop');

          case kws.FOR: // FOR i = m TO n STEP s
            name = match('identifier');
            if (vartype(name) !== 'float') {
              throw parse_error("Syntax error: Expected floating point variable");
            }
            identifiers.variables[name] = true;
            return 'state.variables[' + quote(name) + '] = ' +
                  (match("operator", "=") && parseNumericExpression()) + ';' +
                  slib('for', quote(name),
                   match("reserved", kws.TO) && parseNumericExpression(),
                   test('reserved', kws.STEP, true) ? parseNumericExpression() : '1');

          case kws.NEXT: // NEXT [i [,j ... ] ]
            args = [];
            if (test('identifier')) {
              args.push(quote(match('identifier')));
              while (test("operator", ",", true)) {
                args.push(quote(match('identifier')));
              }
            }

            return slib('next', args.join(','));

          case kws.IF:  // IF expr (GOTO linenum|THEN linenum|THEN statement [:statement ... ]
            expr = parseAnyExpression();

            js = slib('if', expr);

            if (test('reserved', kws.GOTO, true)) {
              // IF expr GOTO linenum
              return js + slib('goto', match('number'));
            }

            match('reserved', kws.THEN);
            if (test('number')) {
              // IF expr THEN linenum
              return js + slib('goto', match('number'));
            }
            // IF expr THEN statement
            return js + parseCommand(); // recurse

          case kws.END:  // End program
            return slib('end');

          case kws.STOP: // Break, like an error
            return slib('stop');

            //////////////////////////////////////////////////////////////////////
            //
            // Error Handling Statements
            //
            //////////////////////////////////////////////////////////////////////

          case kws.ONERR: // ONERR GOTO linenum
            return slib('onerr_goto',
                            match("reserved", kws.GOTO) && match("number"));

          case kws.RESUME:
            return slib('resume');

            //////////////////////////////////////////////////////////////////////
            //
            // Inline Data Statements
            //
            //////////////////////////////////////////////////////////////////////

          case kws.RESTORE:
            return slib('restore');

          case kws.READ:
            args = [];
            do {
              args.push(parsePValue());
            } while (test("operator", ",", true));

            return slib('read', args.join(','));

            //////////////////////////////////////////////////////////////////////
            //
            // I/O Statements
            //
            //////////////////////////////////////////////////////////////////////

          case kws.PRINT: // Output to the screen
            args = [];
            trailing = true;
            while (!endOfStatement()) {
              if (test('operator', ';', true)) {
                trailing = false;
              } else if (test('operator', ',', true)) {
                trailing = false;
                args.push('lib.comma()');
              } else if (test('reserved', kws.SPC) || test('reserved', kws.TAB)) {
                trailing = false;
                keyword = match('reserved');
                match("operator", "(");
                expr = parseNumericExpression();
                match("operator", ")");

                args.push('lib.' + (keyword === kws.SPC ? 'spc' : 'tab') + '(' + expr + ')');
              } else {
                trailing = true;
                args.push(parseAnyExpression());
              }
            }
            if (trailing) {
              args.push(quote('\r'));
            }

            return slib('print', args.join(','));

          case kws.INPUT: // Read input from keyboard
            prompt = '?';
            if (test('string')) {
              prompt = match('string');
              match("operator", ";");
            }

            args = [];

            do {
              args.push(parsePValue());
            } while (test("operator", ",", true));

            return slib('input', quote(prompt), args.join(','));

          case kws.GET: // Read character from keyboard
            return slib('get', parsePValue());

          case kws.HOME:  // Clear text screen
            return slib('home');

          case kws.HTAB:  // Set horizontal cursor position
            return slib('htab', parseNumericExpression());

          case kws.VTAB:  // Set vertical cursor position
            return slib('vtab', parseNumericExpression());

          case kws.INVERSE:  // Inverse text
            return slib('inverse');

          case kws.FLASH:  // Flashing text
            return slib('flash');

          case kws.NORMAL:  // Normal text
            return slib('normal');

          case kws.TEXT:  // Set display mode to text
            return slib('text');

            //////////////////////////////////////////////////////////////////////
            //
            // Miscellaneous Statements
            //
            //////////////////////////////////////////////////////////////////////

          case kws.NOTRACE:  // Turn off line tracing
            return slib('notrace');

          case kws.TRACE:  // Turn on line tracing
            return slib('trace');

            //////////////////////////////////////////////////////////////////////
            //
            // Lores Graphics
            //
            //////////////////////////////////////////////////////////////////////

          case kws.GR:   // Set display mode to lores graphics, clear screen
            return slib('gr');

          case kws.COLOR:  // Set lores color
            return slib('color', parseNumericExpression());

          case kws.PLOT:  // Plot lores point
            return slib('plot',
                            parseNumericExpression(),
                            match("operator", ",") && parseNumericExpression());

          case kws.HLIN:  // Draw lores horizontal line
            return slib('hlin',
                            parseNumericExpression(),
                            match("operator", ",") && parseNumericExpression(),
                            match("reserved", kws.AT) && parseNumericExpression());

          case kws.VLIN:  // Draw lores vertical line
            return slib('vlin',
                            parseNumericExpression(),
                            match("operator", ",") && parseNumericExpression(),
                            match("reserved", kws.AT) && parseNumericExpression());

            //////////////////////////////////////////////////////////////////////
            //
            // Hires Graphics
            //
            //////////////////////////////////////////////////////////////////////

            // Hires Display Routines
          case kws.HGR:   // Set display mode to hires graphics, clear screen
            return slib('hgr');

          case kws.HGR2:  // Set display mode to hires graphics, page 2, clear screen
            return slib('hgr2');

          case kws.HCOLOR:  // Set hires color
            return slib('hcolor', parseNumericExpression());

          case kws.HPLOT:  // Draw hires line
            is_to = test('reserved', kws.TO, true);

            args = [];
            do {
              args.push(parseNumericExpression());
              match("operator", ",");
              args.push(parseNumericExpression());
            } while (test('reserved', kws.TO, true));

            return slib(is_to ? 'hplot_to' : 'hplot', args.join(','));

            //////////////////////////////////////////////////////////////////////
            //
            // Compatibility shims
            //
            //////////////////////////////////////////////////////////////////////

          case kws.PR:   // Direct output to slot
            return slib('pr#', parseNumericExpression());

          case kws.CALL:  // Call native routine
            return slib('call', parseNumericExpression());

          case kws.POKE:  // Set memory value
            return slib('poke',
                            parseNumericExpression(),
                            match("operator", ",") && parseNumericExpression());

          case kws.SPEED:  // Output speed
            return slib('speed', parseNumericExpression());

            //////////////////////////////////////////////////////////////////////
            //
            // INTROSPECTION
            //
            //////////////////////////////////////////////////////////////////////

          case kws.LIST:  // List program statements
            throw parse_error("Introspection statement not supported: " + keyword);

            //////////////////////////////////////////////////////////////////////
            //
            // Statements that will never be implemented
            //
            //////////////////////////////////////////////////////////////////////

            // Shape tables
          case kws.ROT:   // Set rotation angle for hires shape
          case kws.SCALE: // Set rotation angle for hires shape
          case kws.DRAW:   // Draw hires shape
          case kws.XDRAW:  // XOR draw hires shape
            throw parse_error("Display statement not supported: " + keyword);

            // Interpreter Routines
          case kws.CONT:  // Continue stopped program (immediate mode)
          case kws.DEL:   // Deletes program statements
          case kws.NEW:   // Wipe program
          case kws.RUN:   // Execute program
            throw parse_error("Interpreter statement not supported: " + keyword);

            // Native Routines
          case kws.HIMEM:  // Set upper bound of variable memory
          case kws.IN:     // Direct input from slot
          case kws.LOMEM:  // Set low bound of variable memory
          case kws.WAIT:    // Wait for memory value to match a condition
          case kws.AMPERSAND:       // Command hook
            throw parse_error("Native interop statement not supported: " + keyword);

            // Tape Routines
          case kws.LOAD:    // Load program from cassette port
          case kws.RECALL:  // Load array from cassette port
          case kws.SAVE:    // Save program to cassette port
          case kws.STORE:   // Store array to cassette port
          case kws.SHLOAD:  // Load shape table from cassette port
            throw parse_error("Tape statement not supported: " + keyword);

            //////////////////////////////////////////////////////////////////////
            //
            // NYI Statements
            //
            //////////////////////////////////////////////////////////////////////

            // Parts of other statements - AT, FN, STEP, TO, THEN, etc.
          default:
            throw parse_error("Syntax error: " + keyword);
        }
      }

      //
      // Top-level Program Structure
      //

      var parseProgram = function() {

        var program = {
          statements: [], // array of: [ line-number | statement-function ]
          data: [],       // array of [ string | number ]
          jump: []        // map of: { line-number: statement-index }
        };

        function mkfun(js) {
          var fun; // NOTE: for IE; would prefer Function()
          eval('fun = (function (){' + js + '});');
          return fun;
        }

        function empty_statement() { }

        // Statement = data-declaration | remark | Command | EmptyStatement
        // Command   = identifier /*...*/ | reserved /*...*/
        function parseStatement() {
          if (test('data')) {
            program.data = program.data.concat(match('data'));
            return undefined;
          } else if (test('remark', void 0, true)) {
            return undefined;
          } else if (test('reserved') || test('identifier')) {
            return mkfun(parseCommand());
          } else {
            // So TRACE output is correct
            return empty_statement;
          }
        }

        // Line = line-number Statement { separator Statement }
        function parseLine() {
          var num = match('lineNumber');
          var statements = [];
          var statement = parseStatement();
          if (statement) statements.push(statement);
          while (test('separator', ':', true)) {
            statement = parseStatement();
            if (statement) statements.push(statement);
          }
          insertLine(num, statements);
        }

        function insertLine(number, statements) {
          var remove = 0;
          for (var i = 0, len = program.statements.length; i < len; ++i) {
            if (typeof program.statements[i] !== 'number')
              continue;
            if (program.statements[i] < number)
              continue;
            if (program.statements[i] === number) {
              var n = i;
              do {
                ++n;
                ++remove;
              } while (n < len && typeof program.statements[n] !== 'number');
            }
            break;
          }
          var args = [i, remove, number].concat(statements);
          program.statements.splice.apply(program.statements, args);
        }

        // Program = Line { Line }
        while (!endOfProgram()) {
          parseLine();
        }

        // Produce jump table
        program.statements.forEach(function(stmt, index) {
          if (typeof stmt === 'number') {
            program.jump[stmt] = index;
          }
        });

        program.variable_identifiers = Object.keys(identifiers.variables);
        program.array_identifiers = Object.keys(identifiers.arrays);

        return program;
      };

      return parseProgram();
    } ());

    program.init = function init(environment) {

      // stuff these into runtime library closure/binding
      env = environment;
      state = {
        variables: {},
        arrays: {},
        functions: {},
        data: this.data,
        data_index: 0,
        stmt_index: 0,
        line_number: 0,
        stack: [],
        prng: new PRNG(),

        onerr_code: 255,
        onerr_handler: void 0,
        trace_mode: false,

        input_continuation: null,

        clear: function() {
          program.variable_identifiers.forEach(function(identifier) {
            state.variables[identifier] = vartype(identifier) === 'string' ? '' : 0;
          });

          program.array_identifiers.forEach(function(identifier) {
            state.arrays[identifier] = new BASICArray(vartype(identifier));
          });

          state.functions = {};
          state.data_index = 0;
        }
      };

      state.clear();

      state.parsevar = function parsevar(name, subscripts, input) {

        if (arguments.length === 2) {
          input = arguments[1];
          subscripts = void 0;
        }
        var value;

        switch (vartype(name)) {
          case 'string':
            value = input;
            break;

          case 'int':
            value = Number(input);
            if (!isFinite(value)) { runtime_error(ERRORS.TYPE_MISMATCH); }
            value = lib.toint(value);
            break;

          case 'float':
            value = Number(input);
            if (!isFinite(value)) { runtime_error(ERRORS.TYPE_MISMATCH); }
            break;
        }

        if (subscripts) {
          state.arrays[name].set(subscripts, value);
        } else {
          state.variables[name] = value;
        }
      };
    };

    program.step = function step(driver) {

      function gotoline(line) {
        if (!{}.hasOwnProperty.call(program.jump, line)) {
          runtime_error(ERRORS.UNDEFINED_STATEMENT);
        }
        state.stmt_index = program.jump[line];
      }

      var stmt;

      try {
        // for RuntimeError

        try {
          if (state.input_continuation) {
            var cont = state.input_continuation;
            state.input_continuation = null;
            cont(state.input_buffer);
          } else if (state.stmt_index >= program.statements.length) {
            return basic.STATE_STOPPED;
          } else {

            stmt = program.statements[state.stmt_index];

            if (typeof stmt === 'number') {
              state.line_number = stmt;
            } else if (typeof stmt === 'function') {
              if (state.trace_mode) {
                env.tty.writeString('#' + state.line_number + ' ');
              }
              stmt();
            } else {
              throw "WTF?";
            }
          }

          state.stmt_index += 1;
          return basic.STATE_RUNNING;

        } catch (e) {
          // These may throw RuntimeError
          if (e instanceof basic.RuntimeError) {
            throw e; // let outer catch block handle it
          } else if (e instanceof GoToLine) {
            gotoline(e.line);
            return basic.STATE_RUNNING;
          } else if (e instanceof NextLine) {
            while (state.stmt_index < program.statements.length &&
                            typeof program.statements[state.stmt_index] !== 'number') {
              state.stmt_index += 1;
            }
            return basic.STATE_RUNNING;
          } else if (e instanceof BlockingInput) {
            // what to call on next step() after input is handled
            state.input_continuation = e.callback;

            // call input method to prepare async input
            e.method(function(v) {
              state.input_buffer = v;
              if (driver) { driver(); }
            });

            return basic.STATE_BLOCKED;
          } else if (e instanceof EndProgram) {
            return basic.STATE_STOPPED;
          } else if (e instanceof Error && /stack|recursion/i.test(e.message)) {
            // IE: Error "Out of stack space"
            // Firefox: InternalError "too much recursion"
            // Safari: RangeError "Maximum call stack size exceeded"
            // Chrome: RangeError "Maximum call stack size exceeded"
            // Opera: Error "Maximum recursion depth exceeded"
            runtime_error(ERRORS.FORMULA_TOO_COMPLEX);
          } else if (e instanceof Error && /memory|overflow/i.test(e.message)) {
            // IE: Error "Out of memory"
            // Firefox: InternalError "allocation size overflow"
            // Safari: Error "Out of memory"
            // Chrome: (not catchable)
            // Opera: (not catchable)
            runtime_error(ERRORS.OUT_OF_MEMORY);
            // NOTE: not reliably generated; don't unit test
          } else {
            throw e;
          }
        }
      } catch (rte) {
        if (rte instanceof basic.RuntimeError) {
          state.onerr_code = rte.code || 0;
          if (state.onerr_handler !== void 0) {
            state.stack.push({
              resume_stmt_index: state.stmt_index,
              resume_line_number: state.line_number
            });
            gotoline(state.onerr_handler);
            return basic.STATE_RUNNING;
          } else if (rte.code === ERRORS.REENTER[0]) {
            env.tty.writeString('?REENTER\r');
            return basic.STATE_RUNNING;
          } else {
            // annotate and report to the user
            rte.message += " in line " + state.line_number;
            throw rte;
          }
        } else {
          throw rte;
        }
      }
    };

    return program;
  };

  return basic;

} ());

// TODO: Unit tests for compile errors
