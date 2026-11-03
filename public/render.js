/* Börtü Böcek - çizim kodu (canvas). Oyun mantığından bağımsızdır. */
const PU={c:{c:'#ff5a7a',e:'\u2764'},h:{c:'#ffd23f',e:'\u26a1'},g:{c:'#ff6b4a',e:'\ud83d\udcaa'},k:{c:'#5ec8ff',e:'\ud83d\udee1\ufe0f'}};
let g=null,S=1,t=0;
function sh(c,k){const n=parseInt(c.slice(1),16),f=v=>Math.max(0,Math.min(255,v*k|0));return'rgb('+f(n>>16)+','+f(n>>8&255)+','+f(n&255)+')'}
function ell(x,y,rx,ry,rot,fill){g.fillStyle=fill;g.beginPath();g.ellipse(x,y,rx,ry,rot,0,7);g.fill()}
function gl(x,y,rx,ry,c){const q=g.createRadialGradient(x-rx*.35,y-ry*.4,Math.min(rx,ry)*.1,x,y,Math.max(rx,ry));q.addColorStop(0,sh(c,1.55));q.addColorStop(.5,c);q.addColorStop(1,sh(c,.4));ell(x,y,rx,ry,0,q)}
function leg(x0,y0,s,ph,r,len,amp,L){
 const sw=Math.sin(ph),up=Math.cos(ph)>0?.78:1;
 const fx=x0+sw*r*.45*amp,fy=y0+s*len*up,kx=x0+(fx-x0)*.3-r*.1,ky=y0+s*len*.5+s*r*.28;
 g.strokeStyle='#1b130b';g.lineWidth=L;g.beginPath();g.moveTo(x0,y0);g.lineTo(kx,ky);g.stroke();
 g.lineWidth=L*.7;g.beginPath();g.moveTo(kx,ky);g.lineTo(fx,fy);g.stroke();
 g.fillStyle='#1b130b';g.beginPath();g.arc(kx,ky,L*.6,0,7);g.fill()}
function ant(x,y,s,r){g.lineWidth=Math.max(1.5,1.6*S);g.strokeStyle='#1b130b';g.beginPath();g.moveTo(x,y*s);g.quadraticCurveTo(x+r*.45,s*r*(.3+Math.sin(t*5+s)*.08),x+r*.85,s*r*(.62+Math.sin(t*6+s*2)*.12));g.stroke()}
function drawB(b){
 const r=b.r,sp=b.sp,fl=b.fly>0?1:0,spd=Math.hypot(b.vx,b.vy),amp=Math.min(1,spd/(200*S))*.85+.15,k=b.sc*(1+fl*.2),L=Math.max(2,2.4*S),w=b.ph*1.7,P3=3.14;
 g.save();g.translate(b.x,b.y);
 g.fillStyle='rgba(0,0,0,.28)';g.beginPath();g.ellipse(3+fl*8,5+fl*14,r*1.05*b.sc,r*.8*b.sc,0,0,7);g.fill();
 g.rotate(b.a);g.scale(k,k);g.lineCap='round';g.lineJoin='round';
 if(sp==='o'){for(let i=0;i<4;i++)for(const s of[-1,1])leg(r*(.65-i*.26),s*r*.18,s,w+(i%2)*P3+(s>0?P3:0),r,r*(1.5+(i===1||i===2?.25:0)),amp,L)}
 else if(sp==='p'){for(const x of[-.15,-.85])for(const s of[-1,1])leg(r*x,s*r*.15,s,w+(x<-.5?P3:0)+(s>0?P3:0),r,r*1.25,amp,L)}
 else{for(let i=0;i<3;i++)for(const s of[-1,1])leg(r*(.5-i*.5),s*r*.3,s,w+(i%2)*P3+(s>0?P3:0),r,r*(.95+(i===1?.12:0)),amp,L)}
 if(sp==='d'){g.save();g.translate(-r*1.75,0);g.rotate(b.ph*.5);gl(0,0,r*.62,r*.62,'#7a5230');
  g.fillStyle='rgba(40,24,10,.5)';for(let i=0;i<5;i++){g.beginPath();g.arc(Math.cos(i*1.3)*r*.3,Math.sin(i*1.9)*r*.3,r*.1,0,7);g.fill()}g.restore()}
 if(sp==='o'){
  gl(-r*.7,0,r*.85,r*.72,b.col);
  for(let i=0;i<3;i++)ell(-r*(.35+.38*i),0,r*.13,r*(.24-i*.05),0,'rgba(255,225,170,.6)');
  gl(r*.25,0,r*.5,r*.42,sh(b.col,.75));
  g.strokeStyle='#1b130b';g.lineWidth=L;
  for(const s of[-1,1]){ell(r*.62,s*r*.12,r*.07,r*.07,0,'#fff');ell(r*.5,s*r*.24,r*.05,r*.05,0,'#fff');
   g.strokeStyle='#1b130b';g.beginPath();g.moveTo(r*.72,s*r*.1);g.lineTo(r*1.08,s*r*(.06+Math.sin(t*8)*.02));g.stroke()}
 }else if(sp==='p'){
  gl(-r*.35,0,r*1.0,r*.4,b.col);
  g.strokeStyle=sh(b.col,.4);g.lineWidth=1.5;g.beginPath();g.moveTo(r*.5,0);g.lineTo(-r*1.3,0);g.stroke();
  gl(r*.6,0,r*.5,r*.2,sh(b.col,.9));
  g.fillStyle=sh(b.col,1.1);g.beginPath();g.moveTo(r*.95,-r*.34);g.lineTo(r*1.45,0);g.lineTo(r*.95,r*.34);g.closePath();g.fill();
  for(const s of[-1,1]){ell(r*1.12,s*r*.27,r*.12,r*.12,0,'#fff3b0');ell(r*1.15,s*r*.27,r*.05,r*.05,0,'#111')}
  const sw=Math.sin(t*3+b.seed)*.1;
  for(const s of[-1,1]){g.strokeStyle=sh(b.col,.85);g.lineWidth=L*1.3;g.beginPath();g.moveTo(r*.8,s*r*.2);g.lineTo(r*1.4,s*r*(.62+sw));g.lineTo(r*1.9,s*r*(.2+sw));g.stroke();
   g.lineWidth=L*.7;g.strokeStyle='#2a3a10';g.beginPath();g.moveTo(r*1.5,s*r*(.52+sw));g.lineTo(r*1.85,s*r*(.28+sw));g.stroke()}
 }else{
  ant(r*1.05,r*.15,-1,r);ant(r*1.05,r*.15,1,r);
  if(sp==='u'){
   gl(-r*.1,0,r*.95,r*.82,b.col);
   g.strokeStyle='#220808';g.lineWidth=1.6;g.beginPath();g.moveTo(r*.7,0);g.lineTo(-r*1.05,0);g.stroke();
   for(const[x,y]of[[-.5,-.38],[-.5,.38],[.1,-.42],[.1,.42],[-.25,0]])ell(r*x,r*y,r*.14,r*.14,0,'#1a1210');
   ell(r*.62,0,r*.4,r*.52,0,'#1a1a1a');ell(r*.7,-r*.2,r*.1,r*.08,0,'#f2f2f2');ell(r*.7,r*.2,r*.1,r*.08,0,'#f2f2f2');
   gl(r*1.0,0,r*.28,r*.34,'#2a2a2a');
  }else if(sp==='d'){
   gl(-r*.1,0,r*.9,r*.8,b.col);
   g.strokeStyle='rgba(0,0,0,.5)';g.lineWidth=1.5;g.beginPath();g.moveTo(r*.6,0);g.lineTo(-r*1.0,0);g.stroke();
   gl(r*.62,0,r*.42,r*.55,sh(b.col,.8));gl(r*1.02,0,r*.3,r*.5,sh(b.col,.6));
   g.fillStyle='#111';for(let i=-2;i<=2;i++){g.beginPath();g.moveTo(r*1.25,i*r*.18-r*.05);g.lineTo(r*1.45,i*r*.18);g.lineTo(r*1.25,i*r*.18+r*.05);g.fill()}
  }else{
   gl(-r*.2,0,r*1.0,r*.78,b.col);
   g.strokeStyle=sh(b.col,.4);g.lineWidth=1.5;g.beginPath();g.moveTo(r*.6,0);g.lineTo(-r*1.15,0);g.stroke();
   gl(r*.62,0,r*.46,r*.52,sh(b.col,.75));gl(r*1.02,0,r*.3,r*.32,'#3a2616');
   g.fillStyle='#2a1c12';g.beginPath();g.moveTo(r*1.15,-r*.13);g.lineTo(r*2.0,0);g.lineTo(r*1.15,r*.13);g.fill();
   g.strokeStyle='#2a1c12';g.lineWidth=L*1.1;for(const s of[-1,1]){g.beginPath();g.moveTo(r*1.65,s*r*.04);g.lineTo(r*1.95,s*r*.32);g.stroke()}
  }
  for(const s of[-1,1])ell(r*1.12,s*r*.17,r*.05,r*.05,0,'#0a0a0a');
  ell(-r*.3,-r*.3,r*.45,r*.13,-.3,'rgba(255,255,255,.28)');
 }
 if(fl)for(const s of[-1,1])ell(-r*.2,s*r*1.0,r*.9,r*(.28+.1*Math.sin(t*50)),s*.35,'rgba(235,245,255,.5)');
 if(b.dashT>0){g.strokeStyle='rgba(255,240,170,.8)';g.lineWidth=3;g.beginPath();g.arc(0,0,r*1.25,0,7);g.stroke()}
 if(b.arm>0){g.strokeStyle='#d5dcec';g.lineWidth=5;g.beginPath();g.arc(0,0,r*1.45,0,7);g.stroke()}
 if(b.put>0&&b.pu){g.strokeStyle=PU[b.pu].c;g.lineWidth=3;g.beginPath();g.arc(0,0,r*1.2,0,7);g.stroke()}
 if(b.hf>0){g.fillStyle='rgba(255,60,40,'+Math.min(.55,b.hf*2.5)+')';g.beginPath();g.arc(0,0,r*1.1,0,7);g.fill()}
 g.restore();
}

/* Bir sahneyi çizer. V: görüntü bilgisi, E: ekran bilgisi {cx,cy,k,t,shake,fx,ph} */
function drawScene(ctx,V,E){
 g=ctx;S=E.k*1000/340;t=E.t;
 const A=Sim.ARENA[V.ar]||Sim.ARENA.k,k=E.k,R0=1000*k,cx=E.cx,cy=E.cy,hr=V.h*k;
 g.save();
 if(E.shake>0)g.translate((Math.random()-.5)*E.shake,(Math.random()-.5)*E.shake);
 const gr=g.createRadialGradient(cx,cy,hr,cx,cy,R0);gr.addColorStop(0,A.c0);gr.addColorStop(1,A.c1);
 g.fillStyle=gr;g.beginPath();g.arc(cx,cy,R0,0,7);g.fill();
 g.strokeStyle=A.ln;g.lineWidth=2;
 for(let i=1;i<9;i++){g.beginPath();g.arc(cx,cy,hr+(R0-hr)*i/9,0,7);g.stroke()}
 if(hr>0){const hg=g.createRadialGradient(cx,cy,0,cx,cy,hr);hg.addColorStop(0,'#000');hg.addColorStop(.7,'#050302');hg.addColorStop(1,'#241509');
  g.fillStyle=hg;g.beginPath();g.arc(cx,cy,hr,0,7);g.fill();
  g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=Math.max(3,5*S);g.beginPath();g.arc(cx,cy,hr,0,7);g.stroke()}
 g.strokeStyle=A.rim;g.lineWidth=Math.max(6,10*S);g.beginPath();g.arc(cx,cy,R0+5*S,0,7);g.stroke();
 for(const q of V.g){g.strokeStyle='#14200f';g.lineWidth=Math.max(10,16*S);g.beginPath();g.arc(cx,cy,R0+4*S,q[0]-q[1]/2,q[0]+q[1]/2);g.stroke();
  g.strokeStyle='rgba(255,90,60,.7)';g.lineWidth=3;g.setLineDash([8,8]);g.beginPath();g.arc(cx,cy,R0-2*S,q[0]-q[1]/2,q[0]+q[1]/2);g.stroke();g.setLineDash([])}
 for(const u of V.u){const p=1+Math.sin(t*6)*.12,c=PU[u[2]]||PU.h,x=cx+u[0]*k,y=cy+u[1]*k;
  g.fillStyle=c.c;g.beginPath();g.arc(x,y,15*S*p,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=2;g.stroke();
  g.font=Math.round(17*S+2)+'px serif';g.textAlign='center';g.textBaseline='middle';g.fillText(c.e,x,y+1)}
 for(const w of V.wb){const x=cx+w[0]*k,y=cy+w[1]*k,r=w[2]*k;g.globalAlpha=Math.min(1,w[3]/1.5)*.8;g.strokeStyle='#f1f1f1';g.lineWidth=1.5;
  for(let i=0;i<8;i++){g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(i*.785)*r,y+Math.sin(i*.785)*r);g.stroke()}
  for(let j=1;j<4;j++){g.beginPath();g.arc(x,y,r*j/3,0,7);g.stroke()}g.globalAlpha=1}
 for(const e of E.fx){g.strokeStyle='rgba(255,245,200,'+e.l*3+')';g.lineWidth=3;g.beginPath();g.arc(cx+e.x*k,cy+e.y*k,(.3-e.l)*160*S*e.z+6,0,7);g.stroke()}
 const rb=V.b.map(b=>({x:cx+b.x*k,y:cy+b.y*k,r:b.r*k,a:b.a,vx:b.vx*k,vy:b.vy*k,sp:b.sp,col:b.col,sc:b.sc,fly:b.fly,arm:b.arm,put:b.pu?1:0,pu:b.pu,dashT:b.dashT,hf:b.hf,ph:E.ph.get(b.id)||0,seed:b.id,fall:b.fall,can:b.can,nm:b.nm,pid:b.pid,ix:b.ix}));
 for(const b of rb)if(!b.fall)drawB(b);
 for(const b of rb)if(b.fall)drawB(b);
 for(const b of rb)if(!b.fall){const w=b.r*2.2,x=b.x-w/2,y=b.y-b.r*1.8-4,q=b.can/100;
  g.fillStyle='rgba(0,0,0,.55)';g.fillRect(x-1,y-1,w+2,7);g.fillStyle=q>.6?'#6fd25a':q>.3?'#e6c53a':'#e0483a';g.fillRect(x,y,w*q,5);
  if(b.pid){g.fillStyle=b.pid===E.me?'#ffd966':'#fff';g.font='bold 13px Georgia,serif';g.textAlign='center';g.textBaseline='alphabetic';g.fillText(b.nm,b.x,y-4)}}
 g.restore();
}
/* Menü için küçük böcek resmi */
function previewImg(sp){
 const T=Sim.BUG[sp],c=document.createElement('canvas'),x=c.getContext('2d'),sv=g,sS=S;c.width=c.height=72;
 const k={g:.95,d:.7,o:.9,p:.8,u:1.1}[sp];S=1;
 const b={x:36+({d:8,g:-4,p:-4}[sp]||0),y:36,r:T.r*k,a:-.45,vx:0,vy:0,sp,col:T.col,sc:1,fly:0,arm:0,put:0,pu:'',dashT:0,hf:0,ph:.8,seed:1,fall:0};
 g=x;drawB(b);g=sv;S=sS;return c.toDataURL();
}
