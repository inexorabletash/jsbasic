 10 TEXT : HOME : REM Clear the screen
 20 VTAB 4 : HTAB 14 : PRINT "LoRes Drawing"
 30 VTAB 10 : HTAB 7 : PRINT "By Gregg Buntin - Dec 2, 2016"
 40 VTAB 12 : HTAB 2 : PRINT "Adapted from ancient code (circa 1985)"
 50 VTAB 19 : PRINT "Do you want instructions?"
 60 GET ANS$ : REM read input
 70 IF ANS$ = "Y" OR ANS$ = "y" THEN 500
 200 X = 1:Y = 1:C = 2 : REM Set x,y and color defaults
 210 TEXT : HOME : GR : REM Clear screen and set graphics mode
 220 MESS$ = "Not Plotting" : GOSUB 800
 230 GOTO 400 : REM Jump to plot current dot then continue
 240 K =  PEEK ( - 16384): IF K < 128 THEN 240 : REM Read Keyboard
 250 X1 = X:Y1 = Y: POKE  - 16368,0 : REM Save last position
 260 IF K = 155 THEN  TEXT : HOME : END : REM Esc
 270 IF K = 136 THEN X = X - 1: IF X < 0 THEN X = 39 : REM Left
 280 IF K = 149 THEN X = X + 1: IF X > 39 THEN X = 0 : REM Right
 290 IF K = 139 THEN Y = Y - 1: IF Y < 0 THEN Y = 39 : REM Up
 300 IF K = 138 THEN Y = Y + 1: IF Y > 39 THEN Y = 0 : REM Down
 310 IF K = 195 THEN  VTAB 24: INPUT "COLOR:";C: COLOR= C : HOME : REM Color
 320 IF K = 208 THEN PL = 1 : MESS$ = "Plotting" : REM P (Plot)
 330 IF K = 206 THEN PL = 0 : MESS$ = "Not Plotting" :REM N (No Plot)
 340 IF K = 197 THEN PL = 2 : MESS$ = "Erasing" : REM E (Erase)
 350 IF K = 210 THEN GOSUB 700 : REM R (Reset / Clear)
 360 GOSUB 800
 370 IF PL = 0 THEN  COLOR= OC: PLOT X1,Y1 : REM Plot the current position non destuctively
 380 IF PL = 2 THEN  COLOR= 0: PLOT X1,Y1 : REM Erase the current positon
 390 OC =  SCRN( X,Y) : REM Save current position Color
 400 COLOR= C: PLOT X,Y : REM Plot the current position
 410 GOTO 240 : REM go read another key
 500 TEXT : HOME
 510 PRINT "Arrow keys move up, down, left, right"
 520 PRINT "C key changes color"
 530 PRINT "   (valid values are from 0 to 15)"
 540 PRINT "P plot dots (draw)"
 550 PRINT "N No plot dots (don't draw)"
 560 PRINT "E Erase dots"
 570 PRINT "R Reset (clear screen)"
 580 PRINT "Esc Quits"
 590 PRINT : PRINT "Press any key to continue"
 600 GET ANS$
 610 GOTO 200
 700 VTAB 23 : HTAB 1 : PRINT "Really clear screen?"; : GET ANS$ : IF ANS$ = "Y" OR ANS$ = "y" THEN TEXT : HOME : GR
 710 RETURN
 800 HOME : VTAB 23 : HTAB 1 : PRINT MESS$ : RETURN

