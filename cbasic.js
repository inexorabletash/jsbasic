// Console:
// For Mozilla Rhino: rhino cbasic.js your_basic_program.txt
// For Windows CScript: cscript.exe cbasic.js your_basic_program.txt

if(!Object.keys){Object.keys=function(o){if(o!==Object(o))throw new TypeError();var ret=[],p;for(p in o)if(Object.prototype.hasOwnProperty.call(o,p))ret.push(p);return ret;};}
if(!Array.prototype.forEach){Array.prototype.forEach=function(fun){if(this===void 0||this===null){throw new TypeError();}var t=Object(this);var len=t.length>>>0;if(typeof fun!=="function"){throw new TypeError();}var thisp=arguments[1],i;for(i=0;i<len;i++){if(i in t){fun.call(thisp,t[i],i,t);}}};}
if(!Array.prototype.map){Array.prototype.map=function(fun){if(this===void 0||this===null){throw new TypeError();}var t=Object(this);var len=t.length>>>0;if(typeof fun!=="function"){throw new TypeError();}var res=[];res.length=len;var thisp=arguments[1],i;for(i=0;i<len;i++){if(i in t){res[i]=fun.call(thisp,t[i],i,t);}}return res;};}
if(!Array.prototype.reduce){Array.prototype.reduce=function(fun){if(this===void 0||this===null){throw new TypeError();}var t=Object(this);var len=t.length>>>0;if(typeof fun!=="function"){throw new TypeError();}if(len===0&&arguments.length===1){throw new TypeError();}var k=0;var accumulator;if(arguments.length>=2){accumulator=arguments[1];}else{do{if(k in t){accumulator=t[k++];break;}if(++k>=len){throw new TypeError();}}while(true);}while(k<len){if(k in t){accumulator=fun.call(undefined,accumulator,t[k],k,t);}k++;}return accumulator;};}

var arguments, args = arguments;
var host = (function() {
  if (typeof WScript === 'object') {

    // Microsoft Windows Scripting engine

    args = (function() {
      var a = [];
      for (var i = 0; i < WScript.Arguments.length; ++i) {
        a.push(WScript.Arguments(i));
      }
      return a;
    }());

    return {
      name: "cscript.exe",


      fetch: function(filename) {
        var file = new ActiveXObject("Scripting.FileSystemObject").OpenTextFile(new ActiveXObject("WScript.Shell").CurrentDirectory + "\\" + filename),
            data = file.ReadAll();
        file.Close();
        return data;
      },

      console: {
        gets: function() { return WScript.StdIn.ReadLine(); },
        getc: function() { return WScript.StdIn.ReadLine().substring(0, 1); },
        puts: function(s) { WScript.StdOut.Write(s); },
        putc: function(c) { WScript.StdOut.Write(c); },
        errs: function(s) { WScript.StdErr.Write(s); }
      },

      quit: function(s) { WScript.Quit(s); }
    };
  }

  if (typeof java === 'object') {
    // Mozilla Rhino

    return {
      name: "rhino",

      fetch: function(filename) {
        var r = new java.io.BufferedReader(new java.io.FileReader(new java.io.File(filename))),
            sb = new java.lang.StringBuilder(), s;
        do {
          s = r.readLine();
          if (s !== null) {
            sb.append(s).append('\n');
          }
        } while (s !== null);
        return String(sb);
      },

      console: (function() {
        var stdin = new java.io.BufferedReader(new java.io.InputStreamReader(java.lang.System['in']));

        return {
          gets: function() { return String(stdin.readLine()); },
          getc: function() { return String(stdin.readLine()).substring(0, 1); },
          puts: function(s) { java.lang.System.out.print(s); },
          putc: function(c) { java.lang.System.out.print(c); },
          errs: function(s) { java.lang.System.err.print(s); }
        };
      }()),

      quit: function(s) { quit(s); }
  };
  }

  throw 'Unknown script host';
}());

if (args.length !== 1) {
  host.console.errs("Usage: " + host + " cbasic.js program_name\n");
  host.quit(1);
}

var filename = args[0];

eval(host.fetch("basic.js"));

// Compile
var program = (function() {

  host.console.puts('Compiling...\n');
  try {
    var source = host.fetch(filename);
    return basic.compile(source);
  } catch (pe) {
    if (pe instanceof basic.ParseError) {
      host.console.errs(pe.message + ' (source line: ' + pe.line + ', column: ' + pe.column + ')\n');
      host.quit(1);
    } else {
      throw pe;
    }
  }
}());

// Run
(function() {
  host.console.puts('Running...\n');
  program.init({
    tty: {
      getCursorPosition: function() { return { x: 0, y: 0 }; },
      setCursorPosition: function() { },
      getScreenSize: function() { return { width: 80, height: 24 }; },
      writeChar: function(ch) { host.console.putc(ch.replace(/\r/g, '\n')); },
      writeString: function(string) { host.console.puts(string.replace(/\r/g, '\n')); },
      readChar: function(callback) {
        callback(host.console.getc());
      },
      readLine: function(callback, prompt) {
        host.console.puts(prompt);
        callback(host.console.gets().replace(/[\r\n]*/, ''));
      }
    }
  });

  var state;
  try {
    do {
      state = program.step();
    } while (state !== basic.STATE_STOPPED);
  } catch (rte) {
    if (rte instanceof basic.RuntimeError) {
      host.console.errs(rte.message + '\n');
      host.console.quit(1);
    } else {
      throw rte;
    }
  }
}());
