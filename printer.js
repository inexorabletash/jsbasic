//
// Printer (for copying output)
//

function Printer(tty, paper) {
  var tty_writeChar = tty.writeChar;
  tty.writeChar = function(c) {

    tty_writeChar(c);

    switch (c.charCodeAt(0)) {
      case 0:
      case 1:
      case 2:
      case 3:
      case 4: // DOS hook
      case 5:
      case 6:
      case 7: // (BEL) bell
      case 8: // (BS) backspace
      case 9:
      case 11: // (VT) clear EOS
      case 12: // (FF) clear
      case 14: // (SO) normal
      case 15: // (SI) inverse
      case 16:
      case 17: // (DC1) 40-column
      case 18: // (DC2) 80-column
      case 19: // (DC3) stop list
      case 20:
      case 21: // (NAK) quit (disable 80-col card)
      case 22: // (SYN) scroll
      case 23: // (ETB) scroll up
      case 24: // (CAN) disable mousetext
      case 25: // (EM) home
      case 26: // (SUB) clear line
      case 27: // (ESC) enable mousetext
      case 28: // (FS) forward space
      case 29: // (GS) clear EOL
      case 30: // (RS) gotoXY
      case 31:
        break;

      case 10: // (LF) line feed
      case 13: // (CR) return
        paper.appendChild(document.createTextNode('\n'));
        break;

      default:
        paper.appendChild(document.createTextNode(c));
        break;
    }

    if ('normalize' in paper) {
      paper.normalize();
    }
    paper.scrollTop = paper.scrollHeight;
  };

  this.close = function() {
    tty.writeChar = tty_writeChar;
  };
}
