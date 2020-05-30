
window.addEventListener('DOMContentLoaded', function() {

  var $ = function(s) { return document.querySelector(s); };

  $('#lb_files').selectedIndex = 0;

  var frame = $('#frame');

  var keyboard = frame;
  if (/iPod|iPad|iPhone/.test(navigator.platform)) {
    keyboard = document.createElement('input');
    keyboard.type = 'text';
    keyboard.style.width = keyboard.style.height = '1px';
    keyboard.style.border = 'none';
    keyboard.style.position = 'absolute';
    keyboard.style.left = keyboard.style.top = '-100px';
    frame.removeAttribute('tabIndex');
    frame.addEventListener('click', function() { keyboard.focus(); });
    frame.parentNode.insertBefore(keyboard, frame);
  }

  var tty = new TTY($('#screen'), keyboard);
  (function() {
    // Install output hook for bell
    var b = new Bell(/^.*\/|/.exec(window.location)[0]);
    var orig = tty.writeChar;
    tty.writeChar = function index_writeChar(c) {
      if (c.charCodeAt(0) === 7)
        b.play();
      else
        orig(c);
    };
  }());
  var dos = new DOS(tty);

  var lores = new LoRes($('#lores'), 40, 48);
  var hires = new HiRes($('#hires'), 280, 192);
  var hires2 = new HiRes($('#hires2'), 280, 192);
  var display = {
    state: { graphics: false, full: true, page1: true, lores: true },
    setState: function(state, value /* ... */) {
      var args = Array.prototype.slice.call(arguments);
      while (args.length) {
        state = args.shift();
        value = args.shift();
        this.state[state] = value;
      }

      if (this.state.graphics) {
        lores.show(this.state.lores);
        hires.show(!this.state.lores && this.state.page1);
        hires2.show(!this.state.lores && !this.state.page1);
        tty.splitScreen(tty.getScreenSize().height - (this.state.full ? 0 : 4));
      } else {
        lores.show(false);
        hires.show(false);
        hires2.show(false);
        tty.splitScreen(0);
      }
    },
    getState: function() {
      return Object.assign({}, this.state);
    }
  };
  var pdl = [0, 0, 0, 0];

  // Lexical highlighting, if available
  var editor;
  if (typeof CodeMirror === 'function') {
    editor = new CodeMirror($('#editorframe'), {
      mode: 'basic',
      tabMode: 'default',
      content: $('#source').value,
      height: '100%'
    });
  } else {
    editor = (function() {
      var textArea = document.createElement('textarea');
      $('#editorframe').appendChild(textArea);
      textArea.style.width = '598px';
      textArea.style.height = '384px';
      return {
        getValue: function() {
          return textArea.value;
        },
        setValue: function(value) {
          textArea.value = value;
        },
        setCursor: function(line, column) {
          // TODO: Implement me!
        }
      };
    }());
  }

  $('#btn_share').onclick = function(e) {
    // Load up the hidden text area with the current source
    $('#source').value = getSource();
  };

  function getSource() {
    return editor.getValue();
  }

  function setSource(source) {
    editor.setValue(source);
  }

  var program;
  $('#btn_run').addEventListener('click', function(e) {
    e.preventDefault();

    dos.reset();
    tty.reset();
    tty.autoScroll = true;

    try {
      program = basic.compile(getSource());
    } catch (e) {
      if (e instanceof basic.ParseError) {
        editor.setCursor({ line: e.line - 1, ch: e.column - 1 });
        console.log(e.message +
                    ' (source line:' + e.line + ', column:' + e.column + ')');
      }
      alert(e);
      return;
    }

    stopped = false;
    updateUI();
    $('#btn_stop').focus();

    program.init({
      tty: tty,
      hires: hires,
      hires2: hires2,
      lores: lores,
      display: display,
      paddle: function(n) { return pdl[n]; }
    });
    setTimeout(driver, 0);
  });

  $('#btn_stop').addEventListener('click', function(e) {
    e.preventDefault();

    tty.reset(); // cancel any blocking input
    stopped = true;
    updateUI();
  });

  $('#lb_files').addEventListener('change', function() {
    var sel = $('#lb_files');
    loadFile('samples/' + sel.value + ".txt", setSource);
  });

  var current_file_name;
  $('#btn_save').addEventListener('click', function(e) {
    e.preventDefault();
    var a = document.createElement('a');
    a.download = current_file_name || 'basic_program.txt';
    a.href = 'data:text/plain;base64,' + window.btoa(getSource());
    document.body.appendChild(a);
    a.click();
    a.parentElement.removeChild(a);
  });
  $('#btn_load').addEventListener('click', function(e) {
    e.preventDefault();
    var input = document.createElement('input');
    input.type = 'file';
    input.addEventListener('change', function(e) {
      var file = e.target.files[0];
      current_file_name = file.name;
      var reader = new FileReader();
      reader.addEventListener('load', function() {
        setSource(reader.result);
      });
      reader.readAsText(file);
    });
    document.body.appendChild(input);
    input.click();
    input.parentElement.removeChild(input);
  });

  // Add a "printer" on demand
  var printer = null;
  var paper = $('#paper');
  $('#show_paper').addEventListener('click', function(e) {
    e.preventDefault();
    document.body.classList.add('printout');
    printer = new Printer(tty, paper);
  });
  $('#hide_paper').addEventListener('click', function(e) {
    e.preventDefault();
    document.body.classList.remove('printout');
    printer.close();
    printer = null;
  });

  // Mouse-as-Joystick
  var wrapper = $('#screen-wrapper');
  wrapper.addEventListener('mousemove', function(e) {
    var rect = wrapper.getBoundingClientRect(),
        x = e.clientX - rect.left, y = e.clientY - rect.top;
    function clamp(n, min, max) { return n < min ? min : n > max ? max : n; }
    pdl[0] = clamp(x / (rect.width - 1), 0, 1);
    pdl[1] = clamp(y / (rect.height - 1), 0, 1);
  });

  var stopped = true;
  function updateUI() {
    var btnFocus = (document.activeElement === $("#btn_run") ||
                    document.activeElement === $("#btn_stop"));
    $("#btn_stop").disabled = stopped ? "disabled" : "";
    $("#btn_run").disabled = stopped ? "" : "disabled";
    $("#lb_files").disabled = stopped ? "" : "disabled";

    if (btnFocus || stopped) {
      $(stopped ? "#btn_run" : "#btn_stop").focus();
    } else {
      tty.focus();
    }
  }


  // TODO: Expose a RESPONSIVE |---+--------| FAST slider in the UI
  // Number of steps to execute before yielding execution
  // (Use a prime to minimize risk of phasing with loops)
  var NUM_SYNCHRONOUS_STEPS = 37;

  function driver() {
    var state = basic.STATE_RUNNING;
    var statements = NUM_SYNCHRONOUS_STEPS;

    while (!stopped && state === basic.STATE_RUNNING && statements > 0) {

      try {
        state = program.step(driver);
      } catch (e) {
        console.log(e);
        alert(e.message ? e.message : e);
        stopped = true;
        updateUI();
        return;
      }

      statements -= 1;
    }

    if (state === basic.STATE_STOPPED || stopped) {
      stopped = true;
      updateUI();
    } else if (state === basic.STATE_BLOCKED) {
      // Fall out
    } else { // state === basic.STATE_RUNNING
      setTimeout(driver, 0); // Keep going
    }
  }

  function parseQueryParams() {
    var params = {};
    var query = document.location.search.substring(1);
    query.split(/&/g).forEach(function(pair) {
      pair = pair.replace(/\+/g, " ").split(/=/).map(decodeURIComponent);
      params[pair[0]] = pair.length === 1 ? pair[0] : pair[1];
    });
    return params;
  }

  function loadFile(filename, callback) {
    var req = new XMLHttpRequest();
    var url = encodeURI(filename); // not encodeURIComponent, so paths can be specified
    var async = true;
    req.open("GET", url, async);
    req.onreadystatechange = function() {
      if (req.readyState === XMLHttpRequest.DONE) {
        if (req.status === 200 || req.status === 0) {
          callback(req.responseText);
        }
      }
    };
    req.send(null);
  }

  // load default
  var params = parseQueryParams();
  if ('source' in params) {
    setSource(params.source);
  } else {
    loadFile('samples/sample.default.txt', setSource);
  }
});
