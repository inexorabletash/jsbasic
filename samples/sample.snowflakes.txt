100 REM *****************************************************************
110 REM *                                                               *
120 REM *                         SNOWFLAKE                             *
130 REM *             A GRAPHICS NONSENSE FOR APPLE II                  *
140 REM *                   KEVIN RIORDAN 1985                          *
150 REM *                                                               *
160 REM *****************************************************************
170 :

180 REM  THIS PROGRAM DRAWS SUCCESSIVE AND INCREASINGLY
190 REM    INTRICATE SYMMETRICAL DESIGNS ON THE HIRES
200 REM    SCREEN.
210 REM  SINCE IT RUNS IN AN ETERNAL LOOP, THE ONLY
220 REM   WAY TO STOP IT IS TO RESET OR POWER OFF -
230 REM   BUT IT'S VERY RESTFUL TO STARE AT!
240 :

250 X=3:S=140:T=95:HGR2:HCOLOR=2
260 FORY=0TOINT((X-2)/2):GOSUB280:GOSUB410
270 HGR2:NEXT:X=X+1:GOTO260
280 A1=2*(22/7)/X:A2=A1*(Y+1)
290 C=1/SIN((22/7)*(Y+1)/X)
300 D=X:E=Y+1
310 D=D-INT(D/E)*E:IFABS(D)>0.5THENF=E:E=D:D=F:GOTO310
320 E=INT(E+0.5):D=X/E
330 IFD-INT(D/2)*2>0.5THENC=C+COS((22/7)*E/(2*X))
340 G=X+0.5:K=D-0.5
350 FORL=1TOINT(G):M=0:N=0:R=(L-1)*A1

360 FORQ=1TOINT(K):M=M+COS(R)/C:N=N+SIN(R)/C
370 U=140+INT(95*M+0.5):V=95+INT(95*N+0.5)
380 HPLOT S,T TO U,V:S=U:T=V:R=R+A2:NEXT
390 U=140:V=95:HPLOT S,T TO U,V
400 S=140:T=95:NEXT:RETURN
410 FORJ=1TO1000:NEXT:RETURN
