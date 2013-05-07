jsbasic - Applesoft BASIC in JavaScript
=======================================

This is hosted for playing with at http://calormen.com/applesoft/ 

* The code depends on various polyfills at: http://calormen.com/polyfill
* The editor depends on CodeMirror and custom BASIC parser/styles

Notes & Known Issues
--------------------
* The BASIC program is compiled to JavaScript before execution. Syntax errors are therefore detected at compile-time rather than at run-time as on a traditional interpreter. For example, the following program would run without errors on an Apple since the erroneous second statement is never reached. `10 END : CHR$(PRINT)`
* Handling of BASIC code that does not match the canonical `LIST` output format may not behave as on an Apple:
* Keyword parsing differs from Applesoft command line. For example `FOR I = S TO P` doesn't collapse into `FOR I = STOP`.
* The interpreter doesn't actually care about line numbers for statement ordering (just for `GOTO/GOSUB` targets and `IF` statements). So `20 PRINT "A"`, `10 PRINT "B"` will just print `A`, then `B`
* To improve readability, lines may start with : and continue the previously numbered line.
* Floating point overflow is only detected on variable assignment.
* The DOS operating system implements only a subset of DOS 3.3 and ProDOS useful for basic file I/O.
* Except for a small number of compatibility shims for common operations (e.g. keyboard strobe), commands that refer to assembly routines (`PEEK`, `POKE`, `CALL`, `USR` etc.), shape tables, or tape I/O are not implemented.
* Commands that operate on the program itself (`LIST`, `RUN`, `DEL`, etc.) are not implemented.

You can run your basic programs from the command line (with only basic text input and output, and no graphics or DOS commands):
* On Windows, download basic.js and run from a command prompt via: `cscript.exe basic.js your_basic_program.txt`
* On Mac/Linux, install Mozilla Rhino, download basic.js and run from the command prompt via: `java -jar PATH_TO/js.jar basic.js your_program.txt`

To Do
-----
* Snapshot and/or link sensibly to the polyfills
* Implement DOS functionality for consoles

Links

-----
[6502asm.com](http://www.6502asm.com/) - a 6502 assembler/emulator in JavaScript
[Quite BASIC](http://www.quitebasic.com/) - a similar project aimed at teaching programming
[NG-BASIC for Javascript](http://navahogunleg.net/blog/my-projects/ng-basic/) Navaho Gunleg's interpreter
[BASIC Programming Resources](http://www.nicholson.com/rhn/basic/)
[Apple II emulator in JavaScript](http://www.scullinsteel.com/apple2/)
