//
// Applesoft BASIC in Javascript
// Printer (for copying output)
//

// Copyright (C) 2009-2011 Joshua Bell
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

function Printer(tty) {

  // For closures
  var self = this;

  // Create new window and document
  var w = window.open('about:blank', '_blank', 'width=500,height=400,status=0,location=0,menubar=0,toolbar=0');
  var body = w.document.getElementsByTagName('body')[0];
  body.style.fontFamily = 'Courier, Monospace';
  body.style.backgroundColor = '#ffffff';
  body.style.backgroundImage = "url('http://calormen.com/Star_Trek/ASCII/lpt.jpg')";
  body.style.color = '#000000';
  body.style.paddingLeft = '50px';

  var paper = w.document.createElement('div');
  paper.style.whiteSpace = 'pre';
  body.appendChild(paper);

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
        paper.appendChild(w.document.createTextNode('\n'));
        break;

      default:
        paper.appendChild(w.document.createTextNode(c));
        break;
    }

    paper.parentElement.scrollTop = paper.parentElement.scrollHeight;
  };

  w.onunload = function() {
    if (self.onclose) {
      self.onclose();
    }
    tty.writeChar = tty_writeChar;
  };
}
