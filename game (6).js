const idleImg=new Image(), kick1Img=new Image(), kick2Img=new Image(), kick3Img=new Image(), specialImg=new Image(), throwImg=new Image(), downImg=new Image(), superChargeImg=new Image(), superDashImg=new Image();
idleImg.src="idle.webp";
kick1Img.src="kick1.webp";
kick2Img.src="kick2.webp";
kick3Img.src="kick3.webp";
specialImg.src="special.webp";
throwImg.src="throw.webp";
downImg.src="down.webp";
superChargeImg.src="super_charge.webp";
superDashImg.src="super_dash.webp";

const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const keys={},prevKeys={};
function setKey(k,v){keys[k]=v}
addEventListener("keydown",e=>{setKey(e.key,true);if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"," "].includes(e.key))e.preventDefault()});
addEventListener("keyup",e=>setKey(e.key,false));
for(const b of document.querySelectorAll("button[data-key]")){
 const k=b.dataset.key;
 const d=e=>{e.preventDefault();setKey(k,true);b.classList.add("active")};
 const u=e=>{e.preventDefault();setKey(k,false);b.classList.remove("active")};
 b.addEventListener("touchstart",d,{passive:false});
 b.addEventListener("touchend",u,{passive:false});
 b.addEventListener("touchcancel",u,{passive:false});
 b.addEventListener("mousedown",d);
 b.addEventListener("mouseup",u);
 b.addEventListener("mouseleave",u);
}
document.getElementById("start").addEventListener("touchstart",e=>{e.preventDefault();startButton()},{passive:false});
document.getElementById("start").addEventListener("click",startButton);
function selectClick(e){
 if(state!=="select")return;
 const r=canvas.getBoundingClientRect();
 const x=(e.clientX-r.left)*W/r.width, y=(e.clientY-r.top)*H/r.height;
 for(let i=0;i<roster.length;i++){
   let bx=92+i*154, by=190;
   if(x>bx&&x<bx+124&&y>by&&y<by+168){p1Char=i;p2Char=(i+1+Math.floor(Math.random()*4))%roster.length;fullReset();return;}
 }
}
canvas.addEventListener("click",selectClick);
canvas.addEventListener("touchstart",e=>{if(state==="select"){e.preventDefault();selectClick(e.touches[0])}},{passive:false});

const W=960,H=540,G=420;
const roster=[
 {name:"Yellow",jp:"黄バード",filter:"none",hp:120,atk:1.00,def:1.00,spd:1.00,meter:1.00,desc:"バランス型"},
 {name:"Red",jp:"赤バード",filter:"hue-rotate(320deg) saturate(1.75)",hp:110,atk:1.18,def:0.92,spd:1.00,meter:1.00,desc:"攻撃力高め"},
 {name:"Blue",jp:"青バード",filter:"hue-rotate(175deg) saturate(1.65)",hp:108,atk:0.92,def:0.96,spd:1.18,meter:1.05,desc:"スピード型"},
 {name:"Green",jp:"緑バード",filter:"hue-rotate(95deg) saturate(1.55)",hp:135,atk:0.90,def:1.18,spd:0.92,meter:0.88,desc:"防御型"},
 {name:"Black",jp:"黒バード",filter:"grayscale(1) brightness(.72) contrast(1.55)",hp:100,atk:1.05,def:0.90,spd:1.05,meter:1.35,desc:"ゲージ型"}
];
let p1Char=0,p2Char=1;

let state="select",round=1,timer=70,tick=0,shake=0,freeze=0,msg="",msgT=0,bullets=[],parts=[],koFlash=0,screenFlash=0,meterTick=0,pendingKO=false;
let clouds=[];
for(let i=0;i<16;i++)clouds.push({x:Math.random()*W,y:50+Math.random()*140,s:20+Math.random()*42,v:.12+Math.random()*.28});

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function rect(p){return{x:p.x-p.w/2,y:p.y-p.h,w:p.w,h:p.h}}
function hit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function grounded(p){return p.y>=G-1}
function addMeter(p,n){let c=roster[p.charIndex||0]||roster[0];p.meter=clamp(p.meter+n*c.meter,0,100)}
function makePlayer(name,x,face,cpu=false,charIndex=0){
 let c=roster[charIndex]||roster[0];
 return{name:c.jp,x,y:G,w:92,h:140,vx:0,vy:0,hp:c.hp,maxHp:c.hp,meter:25,face,cpu,charIndex,guard:false,atk:0,type:"",active:false,stun:0,cd:0,spcd:0,throwcd:0,wins:0,airSpecial:false,down:false,downT:0,inv:0,aiT:0,aiMode:"",comboStep:0,comboT:0,guardStun:0,superState:"",superT:0,superHit:false}
}
let p1=makePlayer("きいろバード",240,1,false,p1Char),p2=makePlayer("ライバル",720,-1,true,p2Char);

function resetRound(full=false){
 let w1=full?0:p1.wins,w2=full?0:p2.wins;
 p1=makePlayer("きいろバード",240,1,false,p1Char);p2=makePlayer("ライバル",720,-1,true,p2Char);
 p1.wins=w1;p2.wins=w2;timer=70;tick=0;meterTick=0;pendingKO=false;bullets=[];parts=[];shake=0;freeze=0;koFlash=0;screenFlash=0;msg="ROUND "+round;msgT=85;state="fight";
}
function fullReset(){round=1;resetRound(true)}
function startButton(){if(state==="title"||state==="gameover"){state="select";msg="SELECT BIRD";msgT=30}else if(state==="select"){p2Char=(p1Char+1+Math.floor(Math.random()*4))%roster.length;fullReset()}else if(state==="pause")state="fight";else if(state==="fight")state="pause"}

function clearCpu(){keys.ArrowLeft=keys.ArrowRight=keys.ArrowUp=keys.ArrowDown=keys.PageUp=keys.PageDown=keys["/"]=keys["."]=keys[","]=false}
function cpuThink(p,e){
 clearCpu();
 if(p.down || p.stun>0)return;
 let d=e.x-p.x,a=Math.abs(d);
 p.aiT--;
 if(p.aiT<=0){
   const modes=["approach","retreat","jumpin","zone","baitguard","rush","throw","combo","super"];
   p.aiMode=modes[Math.floor(Math.random()*modes.length)];
   p.aiT=28+Math.random()*52;
 }
 if(p.aiMode==="super"&&p.meter>=100){keys.ArrowDown=true;if(Math.random()<.18)keys[","]=true;}
 if(p.aiMode==="combo"){if(a>110)keys[d<0?"ArrowLeft":"ArrowRight"]=true;if(a<155&&Math.random()<.10)keys["."]=true;}
 if(p.aiMode==="throw"){if(a>82)keys[d<0?"ArrowLeft":"ArrowRight"]=true;if(a<100&&Math.random()<.14)keys["/"]=true;}
 if(p.aiMode==="approach"){if(a>105)keys[d<0?"ArrowLeft":"ArrowRight"]=true;if(a<145&&Math.random()<.055)keys["."]=true}
 if(p.aiMode==="retreat"){keys[d<0?"ArrowRight":"ArrowLeft"]=true;if(a>175&&Math.random()<.045)keys[","]=true}
 if(p.aiMode==="jumpin"){keys[d<0?"ArrowLeft":"ArrowRight"]=true;if(grounded(p)&&Math.random()<.09){keys.ArrowUp=true;keys[d<0?"PageUp":"PageDown"]=true;}if(!grounded(p)&&a<175&&Math.random()<.055)keys[","]=true;if(!grounded(p)&&a<132&&Math.random()<.04)keys["."]=true}
 if(p.aiMode==="zone"){if(a<180)keys[d<0?"ArrowRight":"ArrowLeft"]=true;if(a>165&&Math.random()<.065)keys[","]=true;if(a>230&&grounded(p)&&Math.random()<.02)keys.ArrowUp=true}
 if(p.aiMode==="baitguard"){if(e.type==="special"||e.atk>0||bullets.some(b=>b.o===e))keys.ArrowDown=true;else if(a>120)keys[d<0?"ArrowLeft":"ArrowRight"]=true}
 if(p.aiMode==="rush"){keys[d<0?"ArrowLeft":"ArrowRight"]=true;if(a<155&&Math.random()<.06)keys["."]=true;if(grounded(p)&&a>125&&Math.random()<.04){keys.ArrowUp=true;keys[d<0?"PageUp":"PageDown"]=true}}
 if(e.atk>0&&a<150&&Math.random()<.36)keys.ArrowDown=true;
}

function pressedNow(k){return keys[k]&&!prevKeys[k]}
function throwPressed(p){let T=p.cpu?"/":"f";return pressedNow(T)}
function kickPressed(p){let K=p.cpu?".":"g";return pressedNow(K)}
function applyDown(t,dir){
 t.guard=false;t.down=true;t.downT=76;t.stun=76;t.type="down";t.atk=0;t.active=false;t.vx=dir*11.8;t.vy=-9.8;t.face=-dir;t.inv=20;
}
function tryThrow(a,t){
 if(a.throwcd>0||!grounded(a)||a.atk||a.guard||a.down)return false;
 const dist=Math.abs(a.x-t.x);
 if(dist<108&&!t.down){
   a.face=t.x>=a.x?1:-1;
   a.atk=32;a.type="throw";a.active=false;a.throwcd=72;
   applyDown(t,a.face);
   let ac=roster[a.charIndex||0]||roster[0], tc=roster[t.charIndex||0]||roster[0];t.hp=clamp(t.hp-Math.max(1,Math.round(11*ac.atk/tc.def)),0,t.maxHp);
   addMeter(a,12); addMeter(t,8);
   shake=12;freeze=7;msg="THROW!";msgT=32;
   spark(t.x,t.y-95,34,"#ffdd44");
   return true;
 }
 msg="MISS THROW";msgT=14;a.atk=18;a.type="throw";a.throwcd=55;return true;
}
function startKick(p,enemy){
 if(p.guardStun>0 || p.cd>0 || p.guard || p.down) return false;
 if(enemy) p.face = enemy.x>=p.x ? 1 : -1;

 let next=1;
 if(p.type==="kick" && p.comboStep<3 && p.comboT>0) next=p.comboStep+1;
 else if(!p.atk && p.comboT>0 && p.comboStep<3) next=p.comboStep+1;
 else if(p.atk) return false;

 p.comboStep=next;p.comboT=34;p.atk=next===1?20:(next===2?22:28);p.type="kick";p.active=true;p.cd=next===3?38:14;
 msg=next===1?"KICK 1":(next===2?"KICK 2":"KICK 3!");msgT=12;
 return true;
}
function startSuper(p){
 if(p.meter<100||p.down||p.atk||p.superState||!grounded(p))return false;
 let enemy=p===p1?p2:p1;
 p.face=enemy.x>=p.x?1:-1;p.meter=0;p.superState="charge";p.superT=28;p.superHit=false;p.guard=false;p.atk=28;p.type="super";p.active=false;p.inv=65;p.vx=0;p.vy=0;
 freeze=4;shake=10;msg="PHOENIX CHARGE!";msgT=42;spark(p.x,p.y-96,42,"#ff3333");return true;
}
function updateSuper(p){
 if(!p.superState)return false;
 if(p.superState==="charge"){
   p.superT--;p.vx=0;p.vy=0;
   if(p.superT<=0){
     p.superState="dash";p.superT=54;p.atk=54;p.active=true;p.inv=70;p.vx=p.face*24;shake=8;msg="SUPER!";msgT=22;
   }
   return true;
 }
 if(p.superState==="dash"){
   p.superT--;p.vx=p.face*24;p.x+=p.vx;p.y+=p.vy||0;
   if(p.x<70||p.x>W-70||p.superT<=0){
     p.x=clamp(p.x,70,W-70);p.superState="end";p.superT=38;p.active=false;p.vx=0;p.atk=38;p.inv=16;
     shake=14;screenFlash=6;msg="SUPER END!";msgT=20;spark(p.x,p.y-90,40,"#ff4444");
   }
   return true;
 }
 if(p.superState==="end"){
   p.superT--;p.vx=0;
   if(p.superT<=0){p.superState="";p.type="";p.atk=0;p.active=false;p.inv=12}
   return true;
 }
 return false;
}

function control(p){
 if(p.down)return;
 if(p.guardStun>0){p.guardStun--;p.vx=0;return}
 if(p.stun>0){p.stun--;return}

 let L=p.cpu?"ArrowLeft":"a",R=p.cpu?"ArrowRight":"d",U=p.cpu?"ArrowUp":"w",D=p.cpu?"ArrowDown":"s",S=p.cpu?",":"h";
 let JL=p.cpu?"PageUp":"q", JR=p.cpu?"PageDown":"e";
 let enemy=p===p1?p2:p1;

 if(p.comboT>0)p.comboT--;else if(!p.atk)p.comboStep=0;
 p.guard=!!keys[D]&&grounded(p)&&!p.atk;

 p.vx=0;
 let ch=roster[p.charIndex||0]||roster[0];
 let sp=(p.guard?1.25:4.35)*ch.spd;

 if(keys[L]){p.vx=-sp;if(!p.atk&&!p.superState)p.face=-1}
 if(keys[R]){p.vx= sp;if(!p.atk&&!p.superState)p.face= 1}

 // ジャンプ力アップ + 斜めジャンプボタン
 if((keys[U]||keys[JL]||keys[JR])&&grounded(p)&&!p.guard){
   p.vy=-16.8;
   if(keys[JL]){p.vx=-7.4*ch.spd;p.face=-1}
   else if(keys[JR]){p.vx=7.4*ch.spd;p.face=1}
   else if(keys[L]) p.vx=-7.0*ch.spd;
   else if(keys[R]) p.vx=7.0*ch.spd;
   else p.vx*=.4;
 }

 if(throwPressed(p)){if(tryThrow(p,enemy))return}
 if(kickPressed(p)){if(startKick(p,enemy))return}

 if(keys[S]&&keys[D]&&p.meter>=100&&!p.atk&&!p.spcd){if(startSuper(p))return}
 if(keys[S]&&!p.atk&&!p.spcd&&!p.guard){
   let dir=enemy.x>=p.x?1:-1;p.face=dir;p.atk=grounded(p)?30:34;p.type="special";p.active=true;p.spcd=grounded(p)?86:104;addMeter(p,3);
   if(grounded(p)){
     bullets.push({o:p,x:p.x+dir*76,y:p.y-92,w:50,h:30,vx:dir*8.8,vy:0,life:100,big:1,ref:0,last:p});
   }else{
     p.airSpecial=true;p.vx=dir*8.5;p.vy=Math.max(p.vy,6.5);
     bullets.push({o:p,x:p.x+dir*72,y:p.y-82,w:48,h:28,vx:dir*6.2,vy:5.2,life:70,big:1,air:1,ref:0,last:p});
     msg="AIR SPECIAL!";msgT=20;
   }
 }
}
function physics(p){
 if(p.cd>0)p.cd--;if(p.spcd>0)p.spcd--;if(p.throwcd>0)p.throwcd--;if(p.inv>0)p.inv--;
 if(updateSuper(p)){p.x=clamp(p.x,55,W-55);return}
 if(p.down){p.downT--;p.vy+=.72;p.x+=p.vx;p.y+=p.vy;p.vx*=.965;
 if((p.x<65&&p.vx<0)||(p.x>W-65&&p.vx>0)){p.x=clamp(p.x,65,W-65);p.vx*=-.28;p.vy=-5;shake=18;screenFlash=8;msg="WALL CRASH!";msgT=24;spark(p.x,p.y-75,46,"#ffffff")}
 if(p.y>G){p.y=G;p.vy=0;p.vx*=.86}
 if(p.downT<=0){p.down=false;p.stun=0;p.type="";p.vx=0;p.inv=25;msg="WAKE UP";msgT=14}
 p.x=clamp(p.x,55,W-55);return}
 if(p.atk>0)p.atk--;else{p.type="";p.active=false;p.airSpecial=false}
 p.vy+=.72;if(!grounded(p)&&!p.airSpecial)p.vx*=.985;if(p.airSpecial)p.vx*=.995;p.x+=p.vx;p.y+=p.vy;
 if(p.y>G){p.y=G;p.vy=0;p.airSpecial=false}p.x=clamp(p.x,55,W-55);
}
function spark(x,y,n=14,c="#fff16a"){for(let i=0;i<n;i++)parts.push({x,y,vx:(Math.random()*2-1)*6,vy:(Math.random()*2-1)*6,l:18+Math.random()*14,c})}
function damage(t,a,n,k){
 if(t.down||t.inv>0)return false;
 let ac=roster[a.charIndex||0]||roster[0], tc=roster[t.charIndex||0]||roster[0];
 n=Math.max(1,Math.round(n*ac.atk/tc.def));
 if(t.guard&&t.face===-a.face){n=Math.ceil(n*.25);k*=.45;msg="GUARD!";msgT=16;spark(t.x,t.y-82,8,"#99d9ff");addMeter(t,4);addMeter(a,2);if(a.type==="kick"&&a.comboStep===3){a.guardStun=32;msg="PUNISH CHANCE!";msgT=24;spark(a.x,a.y-80,12,"#ff7777")}t.hp=clamp(t.hp-n,0,t.maxHp);t.x+=a.face*k;return "guard"}
 else{t.stun=12;shake=8;freeze=4;msg="HIT!";msgT=13;spark(t.x,t.y-85,18,"#fff16a")}
 t.hp=clamp(t.hp-n,0,t.maxHp);t.x+=a.face*k;addMeter(a,8);addMeter(t,8);return "hit";
}
function melee(a,t){
 if(!a.atk||!a.active||a.down)return;
 if(a.type==="super"&&a.superState==="dash"){let box={x:a.face>0?a.x+12:a.x-150,y:a.y-158,w:150,h:96};if(hit(box,rect(t))&&!a.superHit){a.superHit=true;t.guard=false;t.down=true;t.downT=90;t.stun=90;let ac=roster[a.charIndex||0]||roster[0], tc=roster[t.charIndex||0]||roster[0];t.hp=clamp(t.hp-Math.max(1,Math.round(28*ac.atk/tc.def)),0,t.maxHp);t.vx=a.face*28;t.vy=-12;t.face=-a.face;if(t.hp<=0)pendingKO=true;freeze=12;shake=24;screenFlash=10;msg="PHOENIX HIT!";msgT=36;spark(t.x,t.y-95,70,"#ff3131")}return}
 let step=a.type==="kick"?a.comboStep:0;let range=step===3?138:(step===2?94:92);let h=step===3?82:54;let y=step===3?a.y-166:a.y-132;
 let box={x:a.face>0?a.x+22:a.x-22-range,y:y,w:range,h:h};
 if(hit(box,rect(t))){a.active=false;if(a.type==="kick"){let dmg=step===1?6:(step===2?8:10);let knock=step===1?16:(step===2?20:76);let result=damage(t,a,dmg,knock);if(step===3&&result==="hit"){t.vy=-9.5;t.vx+=a.face*8;t.stun=28;freeze=8;shake=18;msg="SUPER FINISH!";msgT=30;spark(t.x,t.y-90,46,"#ffcf35")}}else damage(t,a,10,20)}
}
function reflectBullet(b,defender){b.ref++;b.o=defender;b.last=defender;b.vx=-b.vx*1.12;b.vy=b.air?-Math.abs(b.vy)*0.45:b.vy;b.x=defender.x+(b.vx>0?78:-78);b.life=100;addMeter(defender,12);msg="REFLECT!";msgT=22;freeze=4;shake=5;spark(defender.x,defender.y-90,24,b.ref===1?"#7be8ff":"#ff6bff");if(b.ref>=3){b.life=0;spark(defender.x,defender.y-90,34,"#ffffff")}}
function updateBullets(){for(const b of bullets){b.x+=b.vx;b.y+=b.vy||0;b.life--;if(b.air)b.vy+=0.18;let target=b.o===p1?p2:p1;if(hit(b,rect(target))){if(target.guard&&target.face===(b.vx>0?-1:1))reflectBullet(b,target);else{damage(target,b.o,b.big?11:9,36);b.life=0;addMeter(b.o,8)}}}bullets=bullets.filter(b=>b.life>0&&b.x>-120&&b.x<W+120&&b.y<H+80)}

function update(){
 clouds.forEach(c=>{c.x+=c.v;if(c.x>W+80)c.x=-80});
 if(state!=="fight"){if(state==="roundover"){if(msgT>0)msgT--;else{if(p1.wins>=2||p2.wins>=2)state="gameover";else{round++;resetRound(false)}}}return}
 if(freeze>0){freeze--;return}
 meterTick++;if(meterTick>=30){meterTick=0;addMeter(p1,1);addMeter(p2,1)}
 cpuThink(p2,p1);control(p1);control(p2);physics(p1);physics(p2);
 if(!p1.atk&&!p1.down&&!p1.superState)p1.face=p1.x<p2.x?1:-1;if(!p2.atk&&!p2.down&&!p2.superState)p2.face=p2.x<p1.x?1:-1;
 if(hit(rect(p1),rect(p2))&&!p1.down&&!p2.down){p1.x+=p1.x<p2.x?-2:2;p2.x+=p2.x<p1.x?-2:2}
 melee(p1,p2);melee(p2,p1);updateBullets();parts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.25;p.l--});parts=parts.filter(p=>p.l>0);
 if(msgT>0)msgT--;if(++tick>=60){tick=0;timer--}
 if(p1.hp<=0||p2.hp<=0||timer<=0){
 let superPlaying=p1.superState||p2.superState||pendingKO;
 if(superPlaying&&timer>0){
   if(!p1.superState&&!p2.superState){
     pendingKO=false;
     let w=p1.hp===p2.hp?null:(p1.hp>p2.hp?p1:p2);
     if(w)w.wins++;
     msg=w?w.name+" WIN!":"DRAW!";
     msgT=115;state="roundover";koFlash=22;
   }
 }else{
   let w=p1.hp===p2.hp?null:(p1.hp>p2.hp?p1:p2);
   if(w)w.wins++;
   msg=w?w.name+" WIN!":"DRAW!";
   msgT=115;state="roundover";koFlash=18;
 }
}
 for(const k in keys)prevKeys[k]=keys[k];
}
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.fill();ctx.stroke()}
function stage(){let sky=ctx.createLinearGradient(0,0,0,G);sky.addColorStop(0,"#73c9ff");sky.addColorStop(.58,"#dbf7ff");sky.addColorStop(1,"#9fd5ff");ctx.fillStyle=sky;ctx.fillRect(0,0,W,G);for(const c of clouds){ctx.fillStyle="#ffffffaa";ctx.beginPath();ctx.arc(c.x,c.y,c.s,0,7);ctx.arc(c.x+c.s*.9,c.y+7,c.s*.8,0,7);ctx.arc(c.x-c.s*.8,c.y+9,c.s*.7,0,7);ctx.fill()}ctx.fillStyle="#7fb0d0";ctx.fillRect(0,282,W,8);ctx.strokeStyle="#4d7e99";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(330,280);ctx.quadraticCurveTo(480,205,630,280);ctx.stroke();ctx.fillStyle="#607e92";for(let i=0;i<12;i++)ctx.fillRect(100+i*75,245+Math.sin(i)*6,10,65);let floor=ctx.createLinearGradient(0,G,0,H);floor.addColorStop(0,"#baa17e");floor.addColorStop(1,"#4e4554");ctx.fillStyle=floor;ctx.fillRect(0,G,W,H-G);ctx.strokeStyle="#4a3f42";ctx.lineWidth=2;for(let y=G+18;y<H;y+=28){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}for(let xx=0;xx<W;xx+=64){ctx.beginPath();ctx.moveTo(xx,G);ctx.lineTo(xx-28,H);ctx.stroke()}ctx.fillStyle="#ffffff33";ctx.beginPath();ctx.ellipse(p1.x,G+48,80,14,0,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(p2.x,G+48,80,14,0,0,7);ctx.fill()}
function fighter(p,rival){ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));ctx.scale(p.face,1);let fc=roster[p.charIndex||0]||roster[0];ctx.filter=fc.filter;if(p.inv>0&&!p.down&&Math.floor(p.inv/4)%2===0)ctx.globalAlpha=.55;let bob=grounded(p)&&!p.down?Math.sin(Date.now()/120)*2:0;if(p.stun&&!p.down)ctx.rotate(Math.sin(Date.now()/35)*.055);if(!grounded(p)&&!p.down)ctx.rotate(p.vx*p.face>0?-0.08:0.05);let img=idleImg,w=156,h=156,dx=-78,dy=-162;if(p.superState==="charge"||p.superState==="end"){img=superChargeImg;w=178;h=178;dx=-86;dy=-178}else if(p.superState==="dash"){img=superDashImg;w=245;h=116;dx=-122;dy=-140}else if(p.down){img=downImg;w=210;h=145;dx=-105;dy=-126}else if(p.atk&&p.type==="kick"){if(p.comboStep===2){img=kick2Img;w=185;h=170;dx=-88;dy=-174;ctx.translate(10,0)}else if(p.comboStep===3){img=kick3Img;w=220;h=180;dx=-102;dy=-184;ctx.translate(16,-4)}else{img=kick1Img;w=190;h=160;dx=-92;dy=-165;ctx.translate(8,0)}}else if(p.atk&&p.type==="special"){img=specialImg;w=178;h=156;dx=-82;dy=-162;ctx.translate(10,0)}else if(p.atk&&p.type==="throw"){img=throwImg;w=190;h=170;dx=-90;dy=-174;ctx.translate(10,0)}ctx.drawImage(img,dx,dy+bob,w,h);ctx.filter="none";ctx.globalAlpha=1;if(p.guard){ctx.strokeStyle="#87c7ff";ctx.lineWidth=6;ctx.globalAlpha=.88;ctx.beginPath();ctx.arc(0,-88,68,-1.25,1.25);ctx.stroke();ctx.globalAlpha=1}ctx.restore()}
function ui(){ctx.fillStyle="#0b1630";ctx.strokeStyle="#fff";ctx.lineWidth=3;rr(15,15,445,72,12);rr(500,15,445,72,12);ctx.fillStyle="#1c2b45";ctx.fillRect(105,42,330,24);ctx.fillRect(525,42,330,24);ctx.fillStyle=p1.hp<p1.maxHp*.3?"#ff4a5f":"#43e35d";ctx.fillRect(105,42,330*p1.hp/p1.maxHp,24);ctx.fillStyle=p2.hp<p2.maxHp*.3?"#ff4a5f":"#43e35d";ctx.fillRect(855-330*p2.hp/p2.maxHp,42,330*p2.hp/p2.maxHp,24);ctx.strokeStyle="#111";ctx.lineWidth=2;ctx.strokeRect(105,42,330,24);ctx.strokeRect(525,42,330,24);ctx.fillStyle="#222";ctx.fillRect(105,70,180,9);ctx.fillRect(675,70,180,9);ctx.fillStyle=p1.meter>=100?"#ff3333":"#ffd52e";ctx.fillRect(105,70,180*p1.meter/100,9);ctx.fillStyle=p2.meter>=100?"#ff3333":"#ffd52e";ctx.fillRect(855-180*p2.meter/100,70,180*p2.meter/100,9);if(p1.meter>=100){ctx.strokeStyle="#ff3333";ctx.lineWidth=3;ctx.strokeRect(102,67,186,15)}if(p2.meter>=100){ctx.strokeStyle="#ff3333";ctx.lineWidth=3;ctx.strokeRect(672,67,186,15)}ctx.fillStyle="#fff";ctx.font="bold 18px monospace";ctx.textAlign="left";ctx.fillText("1P "+p1.name,105,34);ctx.textAlign="right";ctx.fillText(p2.name+" CPU",855,34);ctx.fillStyle="#12233b";ctx.strokeStyle="#fff";ctx.lineWidth=3;rr(430,15,100,84,14);ctx.textAlign="center";ctx.fillStyle="#fff";ctx.font="bold 46px monospace";ctx.fillText(timer,480,61);ctx.font="bold 15px monospace";ctx.fillStyle="#ffd52e";ctx.fillText("ROUND "+round,480,83);ctx.fillStyle="#111";for(let i=0;i<2;i++){ctx.beginPath();ctx.arc(115+i*25,84,10,0,7);ctx.fill();ctx.beginPath();ctx.arc(845-i*25,84,10,0,7);ctx.fill()}ctx.fillStyle="#ffd52e";for(let i=0;i<p1.wins;i++){ctx.beginPath();ctx.arc(115+i*25,84,8,0,7);ctx.fill()}for(let i=0;i<p2.wins;i++){ctx.beginPath();ctx.arc(845-i*25,84,8,0,7);ctx.fill()}}

function selectScreen(){
 let g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,"#1c2b48");g.addColorStop(.55,"#090d19");g.addColorStop(1,"#32182d");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 ctx.textAlign="center";ctx.fillStyle="#fff";ctx.font="bold 54px sans-serif";ctx.strokeStyle="#111";ctx.lineWidth=7;ctx.strokeText("SELECT YOUR BIRD",480,86);ctx.fillText("SELECT YOUR BIRD",480,86);
 ctx.font="16px sans-serif";ctx.fillStyle="#ffd52e";ctx.fillText("鳥をタップして選択。CPUは別カラーになります。",480,122);
 for(let i=0;i<roster.length;i++){
   let c=roster[i], x=92+i*154, y=190;
   ctx.fillStyle=i===p1Char?"#ffdf4d":"#111b30";ctx.strokeStyle="#fff";ctx.lineWidth=3;rr(x,y,124,168,16);
   ctx.save();ctx.translate(x+62,y+110);ctx.scale(1,1);ctx.filter=c.filter;ctx.drawImage(idleImg,-52,-110,104,104);ctx.restore();
   ctx.fillStyle="#fff";ctx.font="bold 17px sans-serif";ctx.fillText(c.jp,x+62,y+28);
   ctx.font="12px sans-serif";ctx.fillStyle="#dce8ff";ctx.fillText(c.desc,x+62,y+148);
 }
 ctx.fillStyle="#ffffffdd";ctx.font="14px monospace";ctx.fillText("能力: 赤=攻撃 / 青=速さ / 緑=防御 / 黒=ゲージ",480,405);
 ctx.fillStyle="#ffcf35";ctx.strokeStyle="#5c3300";ctx.lineWidth=4;rr(330,438,300,56,14);ctx.fillStyle="#111";ctx.font="bold 24px sans-serif";ctx.fillText("STARTでも決定",480,474);
}

function title(){let g=ctx.createLinearGradient(0,0,W,0);g.addColorStop(0,"#ffcf35cc");g.addColorStop(.5,"#000000dd");g.addColorStop(1,"#54b3ffcc");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);fighter({...p1,x:205,y:390,face:1,atk:0,stun:0,guard:0,down:false,inv:0,superState:""},false);fighter({...p2,x:760,y:390,face:-1,atk:0,stun:0,guard:0,down:false,inv:0,superState:""},true);ctx.textAlign="center";ctx.fillStyle="#111";ctx.font="bold 62px sans-serif";ctx.strokeStyle="#fff";ctx.lineWidth=7;ctx.strokeText("BIRD FIGHTER 2X",480,120);ctx.fillText("BIRD FIGHTER 2X",480,120);ctx.fillStyle="#fff";ctx.font="bold 20px sans-serif";ctx.fillText("ゲージ調整・超必殺・3段キック入り",480,162);ctx.fillStyle="#ffcf35";ctx.strokeStyle="#5c3300";ctx.lineWidth=4;rr(330,230,300,62,14);ctx.fillStyle="#111";ctx.font="bold 28px sans-serif";ctx.fillText("▶ キャラ選択へ",480,270);ctx.fillStyle="#fff";ctx.font="15px sans-serif";ctx.fillText("ゲージMAX：ガード＋必殺でフェニックスチャージ",480,320)}
function overlays(){ctx.textAlign="center";if(state==="title")title();if(state==="select")selectScreen();if(state==="pause"){ctx.fillStyle="#0009";ctx.fillRect(0,0,W,H);ctx.fillStyle="#fff";ctx.font="bold 54px monospace";ctx.fillText("PAUSE",480,270)}if(msgT&&msg){ctx.fillStyle="#fff";ctx.strokeStyle="#111";ctx.lineWidth=6;ctx.font="bold 44px monospace";ctx.strokeText(msg,480,150);ctx.fillText(msg,480,150)}if(screenFlash>0){screenFlash--;ctx.fillStyle="rgba(255,255,255,.35)";ctx.fillRect(0,0,W,H)}if(koFlash>0){koFlash--;ctx.fillStyle="rgba(255,255,255,.35)";ctx.fillRect(0,0,W,H);ctx.fillStyle="#ffcf35";ctx.strokeStyle="#5c2200";ctx.lineWidth=8;ctx.font="bold 90px sans-serif";ctx.strokeText("K.O.",480,285);ctx.fillText("K.O.",480,285)}if(state==="gameover"){ctx.fillStyle="#0009";ctx.fillRect(0,0,W,H);ctx.fillStyle="#fff";ctx.font="bold 46px sans-serif";ctx.fillText((p1.wins>p2.wins?p1.name:p2.name)+" CHAMPION!",480,232);ctx.font="22px sans-serif";ctx.fillText("STARTで再戦",480,280)}}
function draw(){ctx.save();if(shake>0){ctx.translate((Math.random()*2-1)*shake,(Math.random()*2-1)*shake);shake*=.82;if(shake<.5)shake=0}stage();for(const b of bullets){let grad=ctx.createRadialGradient(b.x,b.y,3,b.x,b.y,b.big?38:28);if(b.ref===0){grad.addColorStop(0,"#fff");grad.addColorStop(.45,"#ffe65a");grad.addColorStop(1,"#ff9a0000")}else if(b.ref===1){grad.addColorStop(0,"#fff");grad.addColorStop(.45,"#65e6ff");grad.addColorStop(1,"#009dff00")}else{grad.addColorStop(0,"#fff");grad.addColorStop(.45,"#ff6bff");grad.addColorStop(1,"#ff00aa00")}ctx.fillStyle=grad;ctx.beginPath();ctx.arc(b.x,b.y,b.big?36:24,0,7);ctx.fill();ctx.fillStyle=b.ref===0?"#ffc400":b.ref===1?"#45d8ff":"#ff45d8";ctx.fillRect(b.x-b.w/2,b.y-b.h/2,b.w,b.h)}fighter(p1,false);fighter(p2,true);for(const p of parts){ctx.globalAlpha=Math.max(0,p.l/28);ctx.fillStyle=p.c;ctx.fillRect(p.x,p.y,6,6);ctx.globalAlpha=1}ui();overlays();ctx.restore()}
function loop(){update();draw();requestAnimationFrame(loop)}loop();