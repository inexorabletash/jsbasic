jsbasic - Applesoft BASIC in JavaScript
=======================================

This is hosted for playing with at https://inexorabletash.github.io/jsbasic/

Notes & Known Issues
--------------------
* The BASIC program is compiled to JavaScript before execution. Syntax errors are therefore detected at compile-time rather than at run-time as on a traditional interpreter. For example, the following program would run without errors on an Apple since the erroneous second statement is never reached. `10 END : CHR$(PRINT)`
* Handling of BASIC code that does not match the canonical `LIST` output format may not behave as on an Apple:
  * Keyword parsing differs from Applesoft command line. For example `FOR I = S TO P` doesn't collapse into `FOR I = STOP`.
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
