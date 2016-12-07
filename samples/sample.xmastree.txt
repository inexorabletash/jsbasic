 10 REM Change Log
 11 REM 1983ish - Rich Orde & Gregg Buntin - First Version
 12 REM 12/2/2016 - Gregg - adapt code for JSBasic by Joshua Bell, add lots of comments
 13 REM 12/2/2016 - Gregg - Bug fix for get key
 14 REM 12/3/2016 - Rich - Add blinky lights, blinky star
 15 REM 12/6/2016 - Rich - make snow fall anywhere, including in front of tree and accumulate on ground
 16 REM 12/6/2016 - Gregg - code cleanup, move 'data' statements to end, create 'lights' subroutine, setup to reuse star drawing routine, more comments
 98 REM -----------------------------------------------------------------------------------------------------------------------------------------------------
 99 REM Credits screen
 110 TEXT : HOME : REM Clear the Bogi screen
 120 VTAB 4 : HTAB 14 : PRINT "Christmas Tree"
 130 VTAB 10 : HTAB 1 : PRINT "By Rich Orde and Gregg Buntin (1983ish)"
 140 VTAB 12 : HTAB 5 : PRINT "Adapted for JSBasic Dec 2, 2016"
 150 VTAB 19 : PRINT "Press any key to continue"
 160 GET KEY$ : REM read input
 198 REM -----------------------------------------------------------------------------------------------------------------------------------------------------
 199 REM Initial Setup
 200 DIM X(28),Y(28), Z(28), V(28), A(10), B(10), R(28) : Rem setup variables
 210 F = 160 : G = 0 : D = 0 : REM ground
 220 HGR : POKE-16302,0 : HCOLOR= 1 : REM Set Hires, full screen, color Bogi green
 230 FOR I = 40 TO 140 STEP 10: FOR J = 0 TO 9 : REM Loops for Tree
 240 HPLOT 140 - J * 1.4 + 20 - I / 2,I + J TO 140 + J * 1.4 - 20 + I / 2,I + J: NEXT : NEXT : REM Draw Tree
 250 HCOLOR= 0: HPLOT 100,149 TO 180,149: HPLOT 105,148 TO 175,148: HPLOT 125,147 TO 155,147 : REM Bottom of tree
 260 HCOLOR= 5: FOR I = 147 TO 160: HPLOT 132,I TO 148,I: NEXT : REM Tree Trunk
 270 HCOLOR= 2 : FOR I = 161 TO 163: HPLOT 0,I TO 279,I: NEXT : REM Ground
 280 ST = 1 : H = 6 : GOSUB 460 : ST = 0 : REM Draw a white star
 290 FOR I = 1 TO 10 : READ A(I), B(I) : Z = I : GOSUB 600 : NEXT : REM 10 lights
 300 FOR I = 1 TO 28: READ R(I) : X(I) =  INT(RND (1) * 10) + R(I): Y(I)=INT(RND(1)*60): Z(I) = INT(RND(1)*3)+2 : V(I)=0 : NEXT : REM get snow starting locations
 398 REM -----------------------------------------------------------------------------------------------------------------------------------------------------
 399 REM Main Loop
 400 FOR I = 1 TO 28: HCOLOR = V(I): HPLOT X(I),Y(I):Y(I) = Y(I) + Z(I) : IF Y(I) > F - 2 THEN Y(I) = F : REM restore snowflake pixel to original background color
 410 C = C + 1 : IF  C / 150 <> INT (C / 150) THEN 440 : REM lights blink every 150 cycles
 420 C = 0 : D = NOT D : Z = Z + D : IF Z = 11 THEN Z = 1: REM cycle through 10 lights to blink
 430 TZ = Z : GOSUB 600 : REM Draw or ease a light
 440 IF C / 100 <> INT(C / 100) THEN 470 : REM star changes color every 100 cycles
 450 H = H + 1 + (H = 3): IF H = 8 THEN H = 1 : REM color change for star, skipping 4 (black)
 460 HCOLOR= H: HPLOT 140,28 TO 140,40: HPLOT 133,35 TO 147,35: HPLOT 135,30 TO 145,40: HPLOT 135,40 TO 145,30 : IF 1 = ST THEN RETURN : REM flashing star
 470 V(I) = HSCRN(X(I), Y(I)) : HCOLOR= 3 : HPLOT X(I),Y(I) : REM white snowflake
 480 IF Y(I)= F THEN HPLOT TO X(I), 160 : G = G + 1 : Y(I) = INT(RND(1)*4): S = S + 1: X(I) =  INT(RND(1)*10) + R(S) : V(I) = 0: Z(I) = INT(RND(1)*3)+2 : IF 28 = S THEN S = 0 : REM flake hit ground, create new one
 490 IF G > 799 THEN G = 0: HPLOT 0, F TO 279, F : F = F - 1 : REM raise ground for snow accumulation every 800 snowflakes that fall
 500 NEXT : REM Next snowflake
 510 GOTO 400 : REM Start the loop over again
 598 REM -----------------------------------------------------------------------------------------------------------------------------------------------------
 599 REM Draw light
 600 HCOLOR = 2 - D
 610 HPLOT A(Z) + 1,B(Z) TO A(Z) + 3,B(Z): HPLOT A(Z) + 1,B(Z) + 4 TO A(Z) + 3,B(Z) + 4: REM top & bottom of lights
 620 FOR J = B(Z) + 1 TO B(Z) + 3: HPLOT A(Z),J TO A(Z) + 4,J: NEXT J : REM middle of lights
 630 RETURN
 898 REM -----------------------------------------------------------------------------------------------------------------------------------------------------
 900 DATA 140,50,135,95,145,135,110,100,160,111 : REM Data for Lights
 910 DATA 102,135,127,120,128,75,150,85,170,133 : REM Data for Lights
 920 DATA 60,10,140,210,180,130,20,270,240,90,40,80,100,30,220,250,160,50,110,190,260,70,120,150,200,170,0,230 : REM data for 28 snowflake zones to avoid collision
