 10 TEXT : HOME : REM Clear the screen
 20 VTAB 4 : HTAB 14 : PRINT "Calculated Image"
 30 VTAB 10 : HTAB 7 : PRINT "By Gregg Buntin - Dec 2, 2016"
 40 VTAB 12 : HTAB 5 : PRINT "Adapted from an ancient one liner"
 50 VTAB 19 : PRINT "Type a number from 2 to 9"
 60 GET NUM$ : REM read input
 70 IF NUM$ < "2" OR NUM$ > "9" THEN 10 : REM Check for 2 through 9
 200 P = VAL(NUM$) / 10 : REM Divide by 10 because we want a decimal
 210 HGR2 : REM Hires screen 2
 220 FOR Y =  -95 TO 0 : REM roughly half the screen height
 230 Y2 = Y * Y : REM used in the math
 240 FOR X =  -139 TO 0 : REM roughly half the screen width
 250 R = (1E7 -  INT ((Y2 + X * X) ^ P)) / 2 : REM Math is fun
 260 HCOLOR= 3 * (R <  >  INT (R)) : REM White or Black
 270 X1 = X + 139 : REM so we plot X > 0 and start at the outsides
 280 Y1 = Y + 95 : REM so we plot Y > 0 and start at the top
 290 HPLOT X1,Y1 : REM Plot a dot from left to right (TOP)
 300 HPLOT 278 - X1,Y1 : REM Plot a dot from right to left (TOP)
 310 HPLOT X1,190 - Y1 : REM Plot a dot from left to right (Bottom)
 320 HPLOT 278 - X1,190 - Y1 : REM Plot a dot from right to left (Bottom)
 330 NEXT : REM next X
 340 NEXT : REM next Y
