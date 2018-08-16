Web Page Embedding
==================

Want to show off your BASIC creation on your own web site? Now you can with just a tiny bit of HTML.
There are two parts:
 1. Insert `<script src="https://inexorabletash.github.io/jsbasic/script.js"></script>` on your page to enable it
 2. Add `<script type="text/applesoft-basic">` then your BASIC program then `</script>`

Like this:
```html
<!DOCTYPE html>
<title>My BASIC example</title>
<h1>Look what I did!</h1>

<script src="https://inexorabletash.github.io/jsbasic/script.js"></script>
<script type="text/applesoft-basic">

10 REM Your BASIC program goes here
20 PRINT "HELLO WORLD"
30 GOTO 20

</script>
```

Wherever you have the BASIC program, a simulated screen will appear and the program will run.

Notes:

* If the program stops, the user will need to re-load the page to re-run it, so this works best with interactive programs or programs that run as loops.
* You can have more than one `<script type="text/applesoft-basic">` instance on the page, although the last one will get focus.
* Text and graphics (lo-res, hi-res) are supported.
* Input is supported, just like the main page:
  * Keyboard: click to give a particular program focus
  * Paddles: mouse X/Y over the screen translates into `PDL(0)` and `PDL(1)` data
  * Buttons: *Left* and *Right Alt* (or *Home* and *End*) generate Button 0 (*Open Apple*) / Button 1 (*Closed Apple*)
* A subset of DOS 3.3/ProDOS is supported, although loading files will be *relative to the hosting page* in the `vfs` folder. If the page is hosted as `http://example.com/demo.html` and the program attempts to open `SAMPLE` then `http://example.com/vfs/SAMPLE.txt` will be fetched.

Caveats
-------
* This will synchronously pull down several other JS and CSS files, which are not minified, so your page may load slowly.
* The JavaScript objects are not very well encapsulated, so make sure to test if you've got other script on the page. I'll attempt to clean this up.

Please file bugs on github if you run into any problems.
