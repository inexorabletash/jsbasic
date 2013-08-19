
0 REM Sky palette:
0 REM Clouds    6/1 (light blue)
0 REM Sky       6/6 (blue)
0 REM Dusk      6/2 (purple)
0 REM Night     6/0 (dark blue)

0 REM Ground palette:
0 REM Water         6/0 (dark blue)
0 REM Water (night) 0/0 (black)
0 REM Water         6/1 (turquoise)
0 REM Cement        1/2 (gray)
0 REM Grass         1/1 (green)
0 REM Forest        1/0 (dark green)
0 REM Sand          5/1 (khaki)
0 REM Tundra        1/3 (light green)
0 REM Ice           3/3 (white)

10 HGR : HGR2 : PG = 0
20 DIM SC(192), GC(192)
30 FOR Y = 0 TO 191 STEP 2 
: SC(Y) = 6 : SC(Y+1) = 6
: GC(Y) = 5 : GC(Y+1) = 1
: NEXT

100 POKE 49236 + (1-PG), 0 : POKE 230, 32 + 32 * PG

120 M = 2 * ( 0.5 - (PDL(0) / 255) )
121 B = 192 * (PDL(1) / 255) - 96
122 B = B * 2

140 GOSUB 1000
150 PG = PG + 1 : IF PG > 1 THEN PG = 0
160 GOTO 100

999 END



1000 REM Draw sky/horizon; call w/ M, B (y=Mx + B); 0,0 is center

1010 Y1 = ( M * -140 ) + B + 96
1011 Y2 = ( M *  140 ) + B + 96
1012 IF Y1 < 0 AND Y2 < 0 THEN FOR Y = 0 TO 191
: HCOLOR= GC(Y) : HPLOT 0,Y TO 279,Y 
: NEXT : RETURN

1013 IF Y1 > 279 AND Y2 > 279 THEN FOR Y = 0 TO 191
: HCOLOR= SC(Y) : HPLOT 0,Y TO 279,Y 
: NEXT : RETURN

1014 IF Y1 = Y2 THEN Y1 = INT(Y1) 
: FOR Y = 0 TO Y1 - 1 
: HCOLOR= SC(Y) : HPLOT 0,Y TO 279,Y 
: NEXT
: FOR Y = Y1 TO 191 
: HCOLOR= GC(Y) : HPLOT 0,Y TO 279,Y 
: NEXT
: RETURN

1015 REM TODO: Optimize for near-horizontal lines with solid above/below



: REM (y-b)/m = x

1020 X1 = ( -96 - B ) / M + 140
1021 X2 = (  96 - B ) / M + 140
1022 DX = (X2 - X1) / 192

: REM TODO: flip colors if DX is negative


1040 XF = X1 : FOR Y = 0 TO 191 : X = INT(XF) : XF = XF + DX

1041 IF DX <= 0 THEN C1 = SC(Y) : C2 = GC(Y)
1042 IF DX >  0 THEN C1 = GC(Y) : C2 = SC(Y)

1050 IF X < 1   THEN HCOLOR= C2 : HPLOT 0,Y TO 279,Y : GOTO 1080
1051 IF X > 279 THEN HCOLOR= C1 : HPLOT 0,Y TO 279,Y : GOTO 1080
1052 HCOLOR= C1 : HPLOT 0,Y TO X-1, Y : HCOLOR= C2 : HPLOT X,Y TO 279,Y

1080 NEXT : RETURN
