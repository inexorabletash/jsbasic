10 gr:poke -16302,0
15 i=0:x1 = 15:x2=1:x3 = 1
20 for y=7 to 47:i=i-1 : if (i <= 0) then i=7: read c: color=c
30 if (y < 21) then x1=x1-((21-y)/12) : goto 40
31 x1 = x1 + x2 - 1: x2 = x2 * x3: x3 = x3 + 0.002
40 hlin x1,39-x1 at y
50 next y
60 data 12,13,9,1,3,6
70 color=0
80 hlin 16,22 at 7: hlin 18,20 at 8: hlin 16,22 at 47: hlin 18,20 at 46
90 vlin 14,34 at 32: vlin 15,33 at 31: vlin 16,32 at 30
100 vlin 18,30 at 29: vlin 22, 26 at 28
110 color = 12: for a=0 to 3:vlin a,a+4 at 22-a:next a
