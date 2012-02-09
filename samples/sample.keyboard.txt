0 text : home : pr#0
1 c = peek(49152) : poke 49168,0
: htab 1 : vtab 20 : normal
2 if c >= 128 then c = c - 128 : inverse
4 y = int(c/16) : x = c - y * 16
: htab x * 2 + 1 : vtab y + 1
5 if c >= 32 then print chr$(c); 
6 if c < 32 then print chr$(127);
9 goto 1
