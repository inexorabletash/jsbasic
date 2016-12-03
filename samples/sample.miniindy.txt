 10 TEXT : HOME : REM Clear the screen
 20 VTAB 4 : HTAB 15 : PRINT "Mini Indy"
 30 VTAB 10 : HTAB 7 : PRINT "By Gregg Buntin - Dec 2, 2016"
 40 VTAB 12 : HTAB 5 : PRINT "Adapted from an ancient one liner"
 50 VTAB 18 : HTAB 6 : PRINT "Left & Right Arrow Keys move"
 60 VTAB 19 : HTAB 7 : PRINT "any other key goes straight"
 70 VTAB 21 : PRINT "Press any key to play"
 80 GET KEY$ : TEXT : HOME : REM wait for keypress then clear screen and begin
 90 DIM RL(13) : DIM RR(13) : FOR X = 1 TO 13 : RL(X) = 1 : RR(X) = 35 : NEXT : REM Set default road width
 100 REM left & right arrow keys, any other straight
 110 W = (W = 0) * 10 + W - .01 + (W < 0) : REM determine width of road
 120 K =  PEEK (49152) : REM read the keyboard
 130 X = X - (K = 136) + (K = 149) + (X = 0) * 10 : REM determine "car" position
 140 L = (L < 4) * 2 + L +  SGN ( RND (1) - .5) - (L + W > 30) : REM Determine where road begins
 150 VTAB 23 : HTAB 1 : FOR I = 1 TO L : PRINT "@"; : NEXT : REM Draw left "grass"
 160 RS = L + W + 1 : REM deterine right start position
 170 VTAB 23 : HTAB RS : FOR I = RS TO 34 : PRINT "@"; : NEXT : REM Draw right "grass"
 180 C = 0 : IF X < RL(1) OR X > RR(1) THEN C = 1 : REM check for collision
 190 HTAB (X) : VTAB 10 : PRINT "V" : REM Draw "car"
 200 T = T + 1 : REM Increment score
 210 HTAB 35 : VTAB 24 : PRINT T : REM display score
 220 FOR MY = 2 TO 13 : RL(MY-1) = RL(MY) : RR(MY-1) = RR(MY) : NEXT : REM for collision detection
 230 RL(13) = L : RR(13) = RS : REM newest road position
 240 FOR MY = 1 TO 1000 : NEXT MY : REM Slow the emulator down some
 250 IF C = 0 THEN 100 : REM check if still on the road
 260 HOME : PRINT "YOUR SCORE WAS:"T : REM And you're done
