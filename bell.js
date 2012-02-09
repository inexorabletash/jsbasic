//
// Applesoft BASIC in Javascript
// Bell - play an audio file for the CHR$(7) "BEL" beep
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

var Bell;
if (typeof Bell !== 'function') {
  Bell = function(base) {

    var tag;

    // Prefer HTML5 audio
    tag = document.createElement('audio');
    if (typeof tag.canPlayType === 'function') {
      tag.setAttribute('preload', 'true');
      if (tag.canPlayType('audio/mp3')) {
        tag.setAttribute('src', base + 'bell.mp3');
      } else if (tag.canPlayType('audio/ogg')) {
        tag.setAttribute('src', base + 'bell.ogg');
      } else if (tag.canPlayType('audio/wav')) {
        tag.setAttribute('src', base + 'bell.wav');
      }
      this.play = function() { tag.play(); };
      this.stop = function() { tag.pause(); tag.currentTime = 0; };
      return;
    }

    // Fallback for IE<9
    tag = document.createElement('bgsound');
    if ('loop' in tag) {
      tag.src = base + 'bell.wav';
      tag.loop = 1;
      this.play = function() { document.body.appendChild(tag); };
      this.stop = function() { document.body.removeChild(tag); };
      return;
    }

    this.play = function() { };
    this.stop = function() { };
  };
}
