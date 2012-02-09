//
// Applesoft BASIC in Javascript
// Paddle and Joystick Emulation
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


// Usage:
//
//   initPaddle( device_element, thumb_element, callback_function );
//   initJoystick( device_element, thumb_element, callback_function_x, callback_function_y );
//
// Example:
//
//   <script>
//     initPaddle( device.getElementById('paddle'), device.getElementById('knob'), function ( v ) { window.status = v; /* v = 0...1 */ } );
//     initJoystick( device.getElementById('joystick'), device.getElementById('stick'), function ( v ) { window.status = v; /* v = 0...1 */ }, function ( v ) { window.status = v; /* v = 0...1 */ } );
//   </script>
//   <style>
//     #paddle { border-style: inset;  border-width: 2px; border-color: gray; background-color: #c0c0c0; height: 20px;
//               width: 300px; text-align: center; }
//     #knob   { border-style: outset; border-width: 2px; border-color: gray; background-color: #404040; height: 16px; width: 10px; }
//     #joystick { border-style: inset;  border-width: 2px; border-color: gray; background-color: #c0c0c0;
//                 width: 100px; height: 100px; text-align: center; vertical-align: middle; line-height: 100px; }
//     #stick    { border-style: outset; border-width: 2px; border-color: gray; background-color: #404040; height: 16px; width: 16px; }
//   </style>
//   <div id="paddle"> <div id="knob"></div> Slide the Paddle! </div>
//   <div id="joystick"> <div id="stick"></div> Twiddle me!</div>

/*extern document,window,addEvent,removeEvent */

function initDevice(device, thumb, fn_x, fn_y) {
  device.style.position = "relative";
  device.style.overflow = "hidden";

  thumb.style.position = "absolute";
  thumb.style.left = 0;
  thumb.style.top = 0;

  thumb.last_x = 0;
  thumb.last_y = 0;

  var onStickDrag = function (e) {
    e.returnValue = false;
    e.cancelBubble = true;
    if (e.stopPropagation) { e.stopPropagation(); }
    if (e.preventDefault) { e.preventDefault(); }

    if (fn_x) {
      var x = e.clientX - thumb.originX + thumb.posX;
      var min_x = 0;
      var max_x = device.clientWidth - thumb.offsetWidth;
      if (x < min_x) { x = min_x; }
      if (x > max_x) { x = max_x; }

      if (x != thumb.last_x) {
        thumb.last_x = x;
        thumb.style.left = x + "px";
        fn_x((x - min_x) / (max_x - min_x));
      }
    }

    if (fn_y) {
      var y = e.clientY - thumb.originY + thumb.posY;
      var min_y = 0;
      var max_y = device.clientHeight - thumb.offsetHeight;
      if (y < min_y) { y = min_y; }
      if (y > max_y) { y = max_y; }

      if (y != thumb.last_y) {
        thumb.last_y = y;
        thumb.style.top = y + "px";
        fn_y((y - min_y) / (max_y - min_y));
      }
    }

    return false;
  };

  var onStickUp = function (e) {
    e.returnValue = false;
    e.cancelBubble = true;
    if (e.stopPropagation) { e.stopPropagation(); }
    if (e.preventDefault) { e.preventDefault(); }

    removeEvent(document, "mousemove", onStickDrag);
    removeEvent(document, "mouseup", onStickUp);
    if (thumb.releaseCapture) { thumb.releaseCapture(true); }

    return false;
  };

  var onStickDown = function (e) {
    e.returnValue = false;
    e.cancelBubble = true;
    if (e.stopPropagation) { e.stopPropagation(); }
    if (e.preventDefault) { e.preventDefault(); }

    addEvent(document, "mousemove", onStickDrag);
    addEvent(document, "mouseup", onStickUp);
    if (thumb.setCapture) { thumb.setCapture(true); }

    if (fn_x) {
      thumb.originX = e.clientX;
      thumb.posX = parseInt(thumb.style.left, 10);
    }

    if (fn_y) {
      thumb.originY = e.clientY;
      thumb.posY = parseInt(thumb.style.top, 10);
    }

    return false;
  };

  device.appendChild(thumb);

  addEvent(thumb, "mousedown", onStickDown);
}

function initPaddle(device, control, fn) {
  initDevice(device, control, fn);
}

function initJoystick(device, control, fn_x, fn_y) {
  initDevice(device, control, fn_x, fn_y);
}
