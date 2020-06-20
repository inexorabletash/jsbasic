10 rem Tetris code
80 DEF FN SHCOLR(a) = ASC(MID$("@ACFIKLM",a + 1,1)) - 64
90 gosub 4550 : rem Title screen
100 time = 500
110 height = 39 : rem Cannot be larger than 47 (REALLY 39)
120 left = 0
130 width = 9
140 dim array(width + 1, height + 1), erase(height)
145 dim sp(7), tl(4)
150 gr
160 home
165 gosub 1850 : rem Set up shapes at bottom of screen

170 gosub 4240 : rem Set up total line labels
180 color= 15 : rem Draw borders
190 vlin 0, height at left
200 vlin 0, height at left + width + 1

210 rem Fill in borders in array
215 rem Fill bottom row
220 for fill = 0 to width + 1
230 array(fill, height+1) = 15
240 next fill

245 rem Fill left and right sides
250 for fill = 0 to height
260 array(0, fill) = 15 : erase(fill) = 0
265 FOR a = 1 TO width : array(a,fill) = 0 : NEXT
270 array(width+1, fill) = 15
275 next fill

280 sd = RND (-PEEK(79) * 999 - PEEK(78)): rem random number seed
285 eg=0 : tt = 0
290 gosub 3250: rem Choose piece
295 lshape = shape

300 rem Start playing
310 gosub 2020: rem Make turn
320 if not eg then 310

325 REM END OF GAME
330 VTAB 23 : HTAB 21 : PRINT "GAME OVER"
340 HTAB 20 : PRINT "PLAY AGAIN?";
350 a = PEEK(49152) : IF a < 128 GOTO 350
360 POKE 49168,0 : a = a - (a > 223) * 32
365 IF a = 206 THEN HTAB 20 : PRINT " GOODBYE FOR NOW!"; : END
370 IF a <> 217 GOTO 350
380 COLOR= 0 : FOR a = 1 TO width : VLIN 0,height AT a : NEXT
390 GOSUB 1700 : HOME : GOTO 170

395 REM CREATE SHAPE ARRAYS, READ SHAPE DATA (VARIANT OF OLD SUGGESTION)
400 DIM D1(7,4),D2(7,4),D3(7,4),D4(7,4),E1(7,4),E2(7,4),E3(7,4),E4(7,4)
410 FOR x = 1 TO 7
420 FOR y = 1 TO (x > 1 AND x < 5) * 2 + (x <> 5) + 1
430 READ D1(x,y),E1(x,y), D2(x,y),E2(x,y), D3(x,y),E3(x,y), D4(x,y),E4(x,y)
440 NEXT y,x
450 RETURN

490 rem Shape data

500 DATA -2,0, -1,0, 0,0, 1,0: rem Shape 1, rot 1; straight piece horizontal
510 DATA 0,-1, 0,0, 0,1, 0,2: rem Shape 1, rot 2; straight piece vertical

520 DATA -1,0, 0,0, 1,0, 1,-1: rem Shape 2, rot 1; L shape horizontal
530 DATA -1,-1, 0,-1, 0,0, 0,1:rem Shape 2, rot 2; L shape vertical
590 DATA -1,1, -1,0, 0,0, 1,0: rem Shape 2, rot 3
650 DATA 0,-1, 0,0, 0,1, 1,1: rem Shape 2, rot 4

710 DATA -1,0, 0,0, 1,0, 1,1: rem shape 3, rot 1; Reverse L shape
770 DATA 1,-1, 0,-1, 0,0, 0,1: rem shape 3, rot 2
830 DATA -1,-1, -1,0, 0,0, 1,0:rem shape 3, rot 3
840 DATA 0,-1, 0,0, 0,1, -1,1: rem shape 3, rot 4

850 DATA 0,-1, -1,0, 0,0, 1,0: rem shape 4, rot 1; T shape
860 DATA 0,-1, -1,0, 0,0, 0,1: rem shape 4, rot 2
870 DATA -1,0, 0,0, 1,0, 0,1: rem shape 4, rot 3
880 DATA 0,-1, 0,0, 1,0, 0,1: rem shape 4, rot 4

890 DATA 0,-1, 1,-1, 0,0, 1,0: rem shape 5; square

900 DATA 0,0, 1,0, -1,1, 0,1: rem shape 6, rot 1; S shape
910 DATA 0,-1, 0,0, 1,0, 1,1: rem shape 6, rot 2

920 DATA -1,-1, 0,-1, 0,0, 1,0:rem shape 7, rot 1; Z shape
930 DATA 0,-1, -1,0, 0,0, -1,1:rem shape 7, rot 2

1490 rem Shape "directory"
1500 a1 = D1(shape,rt) + x : b1 = E1(shape,rt) + y
1510 a2 = D2(shape,rt) + x : b2 = E2(shape,rt) + y
1520 a3 = D3(shape,rt) + x : b3 = E3(shape,rt) + y
1530 a4 = D4(shape,rt) + x : b4 = E4(shape,rt) + y
1540 return

1590 rem PAUSE
1600 VTAB 23 : HTAB 20 : PRINT "== PAUSED =="; : HTAB 20
1610 FOR a = 0 TO 1 : a = PEEK(49152) > 127 : NEXT
1620 POKE 49168,0 : CALL -868
1630 RETURN

1690 REM ERASE SHAPE IN "NEXT" WINDOW
1700 x = left + width + 5 : rem Offset shape for drawing in Next window
1710 y = 1 : rt = 1
1720 shape = lshape
1730 xdr = 1 : rem Set variable for erasing shape in last "next" window

1760 rem Draw shape
1770 color= 0 : if not xdr then color= FN SHCOLR(shape)
1790 gosub 1500 : rem get shape from directory
1800 plot a1, b1
1810 plot a2, b2
1820 plot a3, b3
1830 plot a4, b4
1840 return

1850 rem Set up shapes at bottom of screen
1860 rt = 1
1870 x = 14
1880 for shape = 1 to 7
1890 y = 38 - (shape = 3 OR shape = 6)
1900 gosub 1770 : rem Draw shape
1910 x = x + 4
1920 next shape
1930 return

1940 rem Check conflict
1945 rem Called from 4450 (Send piece to bottom) and 4790 (Move piece)
1950 cfl = 0
1960 gosub 1500 : rem Shape directory
1965 if a1 < 0 or b1 < 0 or a2 < 0 or b2 < 0 or a3 < 0 or b3 < 0 or a4 < 0 or b4 < 0 then cfl = 1 : return
1970 cfl = array(a1, b1) or array(a2, b2) or array(a3, b3) or array(a4, b4)
2010 return

2020 rem Make turn
2030 null = peek (49168) : rem Reset keyboard strobe
2040 t1 = time
2050 bot = 0
2060 drop = 0
2070 gosub 1700 : rem Draw (erase) shape in "next" window
2080 xdr = 0
2090 ns = lshape
2100 gosub 3250 : rem Pick shape
2110 gosub 1770 : rem Draw shape in "next" window
2120 lshape = shape
2130 shape = ns
2135 gosub 4160 : rem Calculate & print total shapes picked
2140 rem (Arbitrary numbering shift to 3000s due to typo)
3140 x = 1 + int(width/2) : rem Set x to middle of field for start of round

3150 rem Check for end of play
3160 gosub 1940 : rem Check for conflict
3170 if cfl then eg = 1 : return
3175 gosub 1770 : rem Draw shape

3180 rem Make move loop
3185 if drop then t1 = 1
3187 for clock = 0 to t1
3190 if peek (49152) > 127 then gosub 3280 : rem Process input if input detected
3200 next clock

3205 y1 = y : x1 = x : r1 = rt
3210 y = y + 1
3215 cfl = 0
3220 if not bot then gosub 4740 : rem Move piece
3230 if cfl goto 3660 : rem Add to shape & check for complete line
3233 if not bot goto 3180 : rem Back to top of Make move loop, else force to bottom
3235 y = y - 1 : xdr = 1
3239 gosub 1770 : rem Draw shape (erase)
3242 y = y + 1 : xdr = 0
3245 goto 4440 : rem Send piece to bottom

3250 rem Pick shape
3260 shape = int (rnd(sd) * 7) + 1
3270 return

3280 rem Process input
3285 a = PEEK (49152)
3290 get g$
3300 if g$ = " " goto 3480 : rem Check for rotate
3310 if g$ = "J" or a = 136 then a = -1 : goto 4720 : rem Check for move left
3320 if g$ = "K" or a = 149 then a = 1 : goto 4720 : rem Check for move right
3325 if g$ = "D" or a = 138 goto 4480 : rem Force down
3330 if g$ = "M" then bot = 1 : return : rem Send piece to bottom
3335 if g$ = "S" then drop = 1 : rem Speed up piece
3337 if g$ = "P" then goto 1600 : rem Pause game
3340 return

3470 rem Check for rotate (SHAPE 5 DOES NOT CHANGE)
3480 if shape = 5 then return
3490 r1 = rt : x1 = x : y1 = y
3500 gosub 3600 : rem Rotate directory
3510 goto 4740 : rem Move piece

3590 rem Rotate directory
3600 if shape = 1 or shape > 5 then rt = 3 - rt : return : rem Two way rotate
3610 if shape < 5 then rt = (rt < 4) * rt + 1 : rem Four way rotate
3620 return

3660 rem Check for complete line
3665 gosub 3770 : rem Add piece to board
3670 line = 0
3673 if y + 2 < height then dw = y + 2
3677 if y + 2 = > height then dw = height
3680 for row = y - 1 to dw
3690 hit = 0
3700 for c = 1 to width
3710 if not array (c, row) then hit = 1
3720 next c
3730 if not hit then erase(row) = 1 : line = line + 1
3740 next row
3750 if line goto 3850 : rem Blink & erase lines
3760 return

3770 rem Add to board
3790 gosub 1500 : rem Shape directory
3800 array (a1, b1) = shape
3810 array (a2, b2) = shape
3820 array (a3, b3) = shape
3830 array (a4, b4) = shape
3840 return

3850 rem Blink & erase lines
3853 gosub 4310 : rem Calculate & print total lines cleared
3860 for blink = 0 to 3
3865 color= 0
3870 for row = y - 1 to dw
3880 if erase (row) then hlin left + 1, left + width at row
3890 next row
3895 for zz = 0 to 300 : next zz : rem Time delay
3900 for row = y - 1 to dw
3910 if erase(row) then gosub 3950 : rem redraw line
3920 next row
3925 for zz = 0 to 300 : next zz : rem Time delay
3930 next blink
3933 goto 4020 : rem Restack shape

3950 rem Redraw line
3960 for c = 1 to width
3980 color= FN SHCOLR(array(c, row))
3990 plot c, row
4000 next c
4010 return

4020 rem Restack shape
4025 l1 = 0
4030 sh = 0
4040 row = dw
4043 rem Top of loop
4044 if row < 0 then gosub 4980 : goto 4060 : rem Clear top of shape
4045 if not erase (row) then gosub 4080 : goto 4060 : rem Shift row
4050 if erase (row) then sh = sh + 1 : erase (row) = 0
4060 row = row - 1
4065 if row + sh > 0 then 4044
4070 return

4080 rem Shift row
4085 hit = 0
4090 for c = 1 to width
4095 if array (c, row) then hit = 1 :rem If there is an active cell, it's not a completely blank line.
4100 array (c, row + sh) = array (c, row)
4110 color= FN SHCOLR(array (c, row))
4120 plot c, row + sh
4130 next c
4135 if not hit then l1 = l1 + 1 : rem If the line is completely blank
4140 if l1 > line then row = -4
4150 return

4160 rem calculate & print total shapes picked
4170 sp (shape) = sp (shape) + 1
4190 vtab 21
4200 htab shape * 4 + 10
4210 print sp(shape);
4230 return

4240 rem set up total line labels
4250 htab 1: vtab 21 : print "SIN"
4260 print "DOU" : print "TRI"
4270 print "TET" tab (10) "TOT";
4280 FOR a = 0 TO 4 : tl(a) = 0 : NEXT
4290 FOR a = 1 TO 7 : sp(a) = 0 : NEXT
4300 return

4310 rem calculate & print total lines cleared
4320 tl(line) = tl(line) + 1 : tt = tt + line
4350 htab 6
4360 vtab 20 + line
4370 print tl(line);
4390 htab 15
4400 vtab 24
4410 print tt;
4420 return

4430 rem Send piece to bottom - DROP IT DOWN UNTIL "CONFLICT" OCCURS (HITS OTHER PIECES OR BOTTOM)
4440 y = y + 1
4450 gosub 1940 : rem Check for conflict
4460 if cfl then y = y - 1 : gosub 1770 : goto 3660 : rem Draw, Add to bottom
4470 goto 4440

4480 rem Force piece down
4490 y1 = y : x1 = x : r1 = rt
4500 y = y + 1
4510 goto 4740 : rem Move piece

4550 rem Title screen
4555 pr#0
4560 text : home
4570 print "Tetris for Applesoft BASIC"
4580 print "Programmed by Arthur Allen"
4590 print "Based on Tetris by Alexey Pajitnov"
4600 print : print : print "Keys:"
4610 print "<-- or J to move piece left"
4620 print "--> or K to move piece right"
4630 print "<SPACE> to rotate piece anti-clockwise"
4640 print " | M to send piece to bottom"
4650 print " | or D to force piece down"
4660 print "\|/ S to speed up piece"
4670 htab 7 : print "P to pause game"
4680 print : GOSUB 400 : REM READ SHAPE DATA
4690 INPUT "Press Enter to begin";g$
4695 RETURN

4710 rem PREPARE TO MOVE PIECE LEFT OR RIGHT, THEN MOVE IT
4720 x1 = x : y1 = y : r1 = rt : x = x + a

4730 rem move piece
4740 c1 = a1 : d1 = b1
4760 c2 = a2 : d2 = b2
4770 c3 = a3 : d3 = b3
4780 c4 = a4 : d4 = b4
4790 gosub 1940 : rem Check for conflict
4800 if cfl goto 4900 : rem Return old values
4805 color= 0
4810 plot c1, d1
4820 plot c2, d2
4830 plot c3, d3
4840 plot c4, d4
4845 color= FN SHCOLR(shape)
4850 plot a1, b1
4860 plot a2, b2
4870 plot a3, b3
4880 plot a4, b4
4885 return

4890 rem Return old values
4900 a1 = c1 : b1 = d1
4910 a2 = c2 : b2 = d2
4920 a3 = c3 : b3 = d3
4930 a4 = c4 : b4 = d4
4940 rt = r1
4950 x = x1
4960 y = y1
4965 goto 1500 : rem Shape directory

4980 rem Clear top of shape
4990 color= 0
5000 hlin 1, width at row + sh
5010 for c = 1 to width
5020 array (c, row + sh) = 0
5030 next c
5040 return

5050 rem End of listing
