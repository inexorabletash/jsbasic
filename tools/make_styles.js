function pos(code, sw) {
  var x = Math.floor(code / 16);
  var y = code % 16;
  x = -( sw > 40 ? 1 : 2 )* (3 + 13 * x);
  y = -2 * (4 + 13 * y);
  return String(x) + 'px ' + String(y) + 'px';
}

function gen(cc, sc, sw, styles) {
  console.log('.'+sw+'col'+styles+' .a2c'+cc+' { background-position: '+ pos(sc,sw)+' }');
}

var sw, i;
for( sw = 40; sw <= 80; sw += 40) {
  // 0x00-0x1F = INVERSE @ABC…XYZ[\]^_
  // 0x20-0x3F = INVERSE  !"#$…<=>?

  for (i = 0x00; i < 0x20; i++) { gen(i+0x00, i+0xC0, sw, ''); }
  for (i = 0x00; i < 0x20; i++) { gen(i+0x20, i+0xA0, sw, ''); }

  // 80-column firmware inactive
  // 0x40-0x5F = FLASH @ABC…XYZ[\]^_
  // 0x60-0x7F = FLASH  !"#$…<=>?

  for (i = 0x00; i < 0x20; i++) { gen(i+0x40, i+0x40, sw, ''); }
  for (i = 0x00; i < 0x20; i++) { gen(i+0x40, i+0xC0, sw, '.flash'); }
  for (i = 0x00; i < 0x20; i++) { gen(i+0x60, i+0x20, sw, ''); }
  for (i = 0x00; i < 0x20; i++) { gen(i+0x60, i+0xA0, sw, '.flash'); }

  // 80-column firmware active
  // 0x40-0x5F = MOUSETEXT
  // 0x60-0x7F = INVERSE  `abc…{|}~

  for (i = 0x00; i < 0x20; i++) { gen(i+0x40, i+0x80, sw, '.active'); }
  for (i = 0x00; i < 0x20; i++) { gen(i+0x60, i+0xE0, sw, '.active'); }

  // 0x80-0x9F = NORMAL @ABC…XYZ[\]^_
  // 0xA0-0xBF = NORMAL  !"#$…<=>?
  // 0xC0-0xDF = NORMAL @ABC…XYZ[\]^_
  // 0xE0-0xFF = NORMAL `abc…{|}~

  for (i = 0x00; i < 0x20; i++) { gen(i+0x80, i+0x40, sw, ''); }
  for (i = 0x00; i < 0x20; i++) { gen(i+0xA0, i+0x20, sw, ''); }
  for (i = 0x00; i < 0x20; i++) { gen(i+0xC0, i+0x40, sw, ''); }
  for (i = 0x00; i < 0x20; i++) { gen(i+0xE0, i+0x60, sw, ''); }

  // Extension symbols
  for (i = 0x00; i < 0x20; i++) { gen(i+0x100, i+0x100, sw, ''); }
}
