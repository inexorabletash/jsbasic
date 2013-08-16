
window.onload = function () {

  var $ = function (s) { return document.querySelector(s); };

  $('#lb_files').selectedIndex = 0;

  var bell = (function () {
    var b = new Bell(/^.*\/|/.exec(window.location)[0]);
    return function () { b.play(); };
  } ());


  var tty = new TTY($('#screen'), $('#screen'), bell);
  var dos = new DOS(tty);

  var lores = new LoRes($('#lores'), 40, 48);
  var hires = new HiRes($('#hires'), 280, 192);
  var hires2 = new HiRes($('#hires2'), 280, 192);
  var display = {
    state: { graphics: false, full: true, page1: true, lores: true },
    setState: function (state, value /* ... */) {
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
    editor = (function () {
      var textArea = document.createElement('textarea');
      $('#editorframe').appendChild(textArea);
      textArea.style.width = '598px';
      textArea.style.height = '384px';
      return {
        getValue: function () {
          return textArea.value;
        },
        setValue: function (value) {
          textArea.value = value;
        },
        setCursor: function (line, column) {
          // TODO: Implement me!
        }
      };
    }());
  }

  $('#btn_share').onclick = function () {
    // Load up the hidden text area with the current source
    $('#source').value = getSource();
  };

  function getSource() {
    return editor.getValue();
  }

  function setSource(source) {
    editor.setValue(source);
  }

  // Do not let certain events take focus away from "keyboard"
  function keyboardFocus(e) {
    tty.focus();
    e.stopPropagation(); // W3C
    e.preventDefault(); // e.g. to block arrows from scrolling the page
  }

  addEvent($('#lores'), 'click', keyboardFocus);
  addEvent($('#hires'), 'click', keyboardFocus);
  addEvent($('#hires2'), 'click', keyboardFocus);
  addEvent($('#screen'), 'click', keyboardFocus);
  addEvent($('#frame'), 'click', keyboardFocus);
  addEvent($('#frame'), 'blur', keyboardFocus); // Needed on IE, not sure why it tries to get focus

  addEvent($('#screen'), 'focus', function () {
    getClassList($('#frame')).add('focused');
  });
  addEvent($('#screen'), 'blur', function () {
    getClassList($('#frame')).remove('focused');
  });

  var program;
  addEvent($('#btn_run'), 'click', function () {
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

    program.init({
      tty: tty,
      hires: hires,
      hires2: hires2,
      lores: lores,
      display: display,
      paddle: function (n) { return pdl[n]; }
    });
    setTimeout(driver, 0);
  });

  addEvent($('#btn_stop'), 'click', function () {
    tty.reset(); // cancel any blocking input
    stopped = true;
    updateUI();
  });

  addEvent($('#lb_files'), 'change', function () {
    var sel = $('#lb_files');
    loadFile('samples/' + sel.value + ".txt", setSource);
  });

  addEvent($('#btn_save'), 'click', function () {
    window.localStorage.setItem("save_program", getSource());
    $('#btn_load').disabled = false;
  });
  addEvent($('#btn_load'), 'click', function () {
    setSource(window.localStorage.getItem("save_program"));
  });
  $('#btn_load').disabled = (window.localStorage.getItem("save_program") === null);

  // Add a "printer" on demand
  var printer = null;
  var paper = $('#paper');
  addEvent($('#show_paper'), 'click', function () {
    window.getClassList(document.body).add('printout');
    printer = new Printer(tty, paper);
  });
  addEvent($('#hide_paper'), 'click', function () {
    window.getClassList(document.body).remove('printout');
    printer.close();
    printer = null;
  });


  // Mouse-as-Joystick
  var wrapper = $('#screen-wrapper');
  addEvent(wrapper, 'mousemove', function (e) {
    // compute relative coordinates
    var x = e.clientX, y = e.clientY, elem = wrapper;
    while (elem) {
      x -= elem.offsetLeft - elem.scrollLeft;
      y -= elem.offsetTop - elem.scrollTop;
      elem = elem.offsetParent;
    }

    function clamp(n, min, max) { return Math.min(Math.max(n, min), max); }
    pdl[0] = clamp(x / (wrapper.offsetWidth - 1), 0, 1);
    pdl[1] = clamp(y / (wrapper.offsetHeight - 1), 0, 1);
  });


  var stopped = true;
  function updateUI() {
    $("#btn_stop").disabled = stopped ? "disabled" : "";
    $("#btn_run").disabled = stopped ? "" : "disabled";
    $("#lb_files").disabled = stopped ? "" : "disabled";

    if (stopped) {
      $("#btn_run").focus();
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
    req.onreadystatechange = function () {
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
};
