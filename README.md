jsbasic - Applesoft BASIC in JavaScript
=======================================

This is hosted for playing with at http://calormen.com/applesoft/

Use `git clone --recursive` to get [polyfill](http://github.com/inexorabletash/polyfill) for older browsers.

Notes & Known Issues
--------------------
* The BASIC program is compiled to JavaScript before execution. Syntax errors are therefore detected at compile-time rather than at run-time as on a traditional interpreter. For example, the following program would run without errors on an Apple since the erroneous second statement is never reached. `10 END : CHR$(PRINT)`
* Handling of BASIC code that does not match the canonical `LIST` output format may not behave as on an Apple:
  * Keyword parsing differs from Applesoft command line. For example `FOR I = S TO P` doesn't collapse into `FOR I = STOP`.
  * The interpreter doesn't actually care about line numbers for statement ordering (just for `GOTO/GOSUB` targets and `IF` statements). So `20 PRINT "A"`, `10 PRINT "B"` will just print `A`, then `B`
* Limitations:
  * Floating point overflow is only detected on variable assignment.
  * Only a subset of DOS 3.3 and ProDOS useful for basic file I/O are implemented.
  * Only a small number of common `PEEK`, `POKE` and `CALL` locations are supported.
  * Commands that refer to assembly routines (`&`, `USR()` etc.), shape tables, and tape I/O are not implemented.
* Commands that operate on the program itself (`LIST`, `RUN`, `DEL`, etc.) are not implemented.
* A handful of extensions are made beyond Applesoft BASIC:
  * To improve readability, lines may start with `:` and continue the previously numbered line.
  * `DEF FN` can define string functions
  * `==` can be used as `=`
  * `CHR$()` values > 255 do interesting things
  * `HSCRN(x, y)` allows probing the hi-res screen
  * hexadecimal literals e.g. `$C010` can be used as numbers

You can run your basic programs from the command line (with only basic text input and output, and no graphics or DOS commands):
* Clone the repository locally
* On Windows, run from a command prompt via: `cscript.exe cbasic.js your_program.txt`
* On Mac/Linux, install Mozilla Rhino, run from the command prompt via: `java -jar PATH_TO/js.jar cbasic.js your_program.txt`
