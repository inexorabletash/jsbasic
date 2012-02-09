//
// Atom to HTML - fetch a feed, inject it as dl/dt/dd
//

// Copyright (C) 2009-2010 Joshua Bell
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

function atomToHtml(uri, element) {

  var READYSTATE_UNINITIALIZED = 0;
  var READYSTATE_LOADING = 1;
  var READYSTATE_LOADED = 2;
  var READYSTATE_INTERACTIVE = 3;
  var READYSTATE_COMPLETE = 4;

  var xhr = new XMLHttpRequest();
  var async = true;
  xhr.open("GET", uri, async);
  xhr.onreadystatechange = function() {
    if (xhr.readyState === READYSTATE_COMPLETE) {
      if ((xhr.status === 200 || xhr.status === 0) && xhr.responseXML) {
        var doc = xhr.responseXML;
        var entries = doc.getElementsByTagName('entry');
        var html = [];

        html.push('<dl>');

        for (var i = 0; i < entries.length; i += 1) {
          var entry = entries[i];
          try {
            var entryHTML = [];
            entryHTML.push('<dt>', entry.getElementsByTagName('title')[0].childNodes[0].nodeValue);
            entryHTML.push('<dd>', entry.getElementsByTagName('content')[0].childNodes[0].nodeValue);
            html.push(entryHTML.join(''));
          } catch (e) {
            if (console && console.log) { console.log("Error:", e); }
          }
        }

        html.push('</dl>');

        element.innerHTML = html.join('');
      } else {
        element.innerHTML = '<em>Unable to load feed</em>';
      }
    }
  };

  try {
    xhr.send(null);
  } catch (e) {
    element.innerHTML = '<em>Unable to load feed</em>';
  }
}

