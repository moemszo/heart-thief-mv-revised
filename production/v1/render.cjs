const fs = require('fs');
const path = require('path');
const {spawn} = require('child_process');
const {once} = require('events');
const {createCanvas, loadImage, GlobalFonts} = require('@napi-rs/canvas');

const ROOT = path.resolve(__dirname, '../..');
const ASSET_DIR = path.join(ROOT, 'outputs/proseka_mv_assets');
const opts = Object.fromEntries(process.argv.slice(2).map(s => s.replace(/^--/, '').split('=')));
const W = Number(opts.width || 1920), H = Math.round(W * 9/16), FPS = Number(opts.fps || 30);
const START = Number(opts.start || 0), DURATION = Number(opts.duration || 118.8);
const OUT = opts.output || path.join(ROOT, 'outputs/heart_thief_mv/ハート泥棒_MV_clean.mp4');
const AUDIO = 'media/audio/ハート泥棒.mp3';
const FONT_DIR = '[SYSTEM_FONTS]';
GlobalFonts.registerFromPath(path.join(FONT_DIR, 'ヒラギノ角ゴシック W7.ttc'), 'MV JP');
GlobalFonts.registerFromPath(path.join(FONT_DIR, 'Avenir Next.ttc'), 'MV Latin');

const C = {navy:'#17182E', ink:'#28233F', cream:'#FFF8EA', white:'#FFFFFF', cyan:'#3EE1E8', pink:'#FF739A', coral:'#FF766E', lemon:'#FFE679', purple:'#8165CC'};
const assets = {};
const clamp = (x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const lerp = (a,b,u)=>a+(b-a)*u;
const ease = u=>1-Math.pow(1-clamp(u),3);
const smooth = u=>{u=clamp(u);return u*u*(3-2*u)};
const fract = n=>n-Math.floor(n);
const rand = n=>fract(Math.sin(n*127.1+311.7)*43758.5453123);
let timeline = JSON.parse(fs.readFileSync(path.join(__dirname,'timeline.json'),'utf8'));
let analysis = {};
const ANALYSIS_FILE = path.join(ROOT,'work/audio_analysis/analysis.json');
if(fs.existsSync(ANALYSIS_FILE)) analysis=JSON.parse(fs.readFileSync(ANALYSIS_FILE,'utf8'));
let beats = analysis.beat_times || analysis.beats || [];
if(!Array.isArray(beats) || typeof beats[0] !== 'number') beats=[];
const bpm = Number(timeline.bpm || 130);
if(!beats.length) beats=Array.from({length:Math.ceil(119*bpm/60)+2},(_,i)=>(timeline.beat_offset||0)+i*60/bpm);
function beat(t){
  let lo=0,hi=beats.length-1;
  while(lo<hi){const m=Math.ceil((lo+hi)/2);if(beats[m]<=t)lo=m;else hi=m-1;}
  const phase=clamp((t-beats[lo])/((beats[lo+1]||beats[lo]+60/bpm)-beats[lo]));
  return {index:lo, phase, pulse:Math.exp(-phase*7.5)};
}

async function loadAssets(){
  for(const file of fs.readdirSync(ASSET_DIR).filter(f=>f.endsWith('.png')&&!/design|turnaround/.test(f))){
    const id=file.replace('.png',''), img=await loadImage(path.join(ASSET_DIR,file));
    const cv=createCanvas(img.width,img.height),ctx=cv.getContext('2d');ctx.drawImage(img,0,0);
    const pd=ctx.getImageData(0,0,cv.width,cv.height), data=pd.data;
    let left=cv.width,right=0,top=cv.height,bottom=0;
    const whitePlate=file.includes('white_blackbg');
    for(let y=0;y<cv.height;y++)for(let x=0;x<cv.width;x++){
      const j=(y*cv.width+x)*4;
      if(whitePlate){
        const lum=(data[j]+data[j+1]+data[j+2])/3;
        data[j+3]=Math.round(255*clamp((lum-8)/242));data[j]=data[j+1]=data[j+2]=255;
      }else if(!id.startsWith('bg_')){
        // Matte cleanup applied only to the video compositor's in-memory textures.
        data[j+3]=Math.round(255*Math.pow(clamp(data[j+3]/254),1.35));
      }
      if(data[j+3]>18){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    }
    if(!id.startsWith('bg_'))ctx.putImageData(pd,0,0);
    const tex={cv,w:cv.width,h:cv.height,box:[left,top,right-left+1,bottom-top+1],tints:{}};
    assets[id]=tex;
  }
}
function tint(tex,color){
  if(!tex.tints[color]){const cv=createCanvas(tex.w,tex.h),ctx=cv.getContext('2d');ctx.drawImage(tex.cv,0,0);ctx.globalCompositeOperation='source-in';ctx.fillStyle=color;ctx.fillRect(0,0,tex.w,tex.h);tex.tints[color]=cv;}
  return tex.tints[color];
}
function layer(ctx,id,x,y,height,{rot=0,alpha=1,color=null,flip=false,anchor=.5}={}){
  const a=assets[id]; if(!a)throw new Error('Missing asset '+id);
  const [sx,sy,sw,sh]=a.box,ww=height*sw/sh;
  ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.scale(flip?-1:1,1);ctx.globalAlpha*=alpha;
  ctx.drawImage(color?tint(a,color):a.cv,sx,sy,sw,sh,-ww/2,-height*anchor,ww,height);ctx.restore();
}
function actor(ctx,id,x,top,h,t,{rot=0,ghost=false,entry=1,shadow=true}={}){
  const b=beat(t), bob=Math.sin(t*1.8)*5, yy=top+bob+25*(1-ease(entry));
  const rr=rot+Math.sin(t*.45)*.005;
  if(shadow){layer(ctx,id,x+13,yy+12,h,{anchor:0,rot:rr,color:C.navy,alpha:.18});}
  if(ghost){layer(ctx,id,x-20-b.pulse*12,yy,h,{anchor:0,rot:rr,color:C.cyan,alpha:.55});layer(ctx,id,x+20+b.pulse*12,yy,h,{anchor:0,rot:rr,color:C.pink,alpha:.48});}
  layer(ctx,id,x,yy,h,{anchor:0,rot:rr});
}
function photoCard(ctx,id,x,y,w,h,t,{rot=-.035,zoom=1.55,actorX=0,dark=.12}={}){
  ctx.save();ctx.translate(x,y);ctx.rotate(rot+Math.sin(t*.3)*.005);
  ctx.fillStyle='rgba(15,12,36,.38)';ctx.fillRect(-w/2+17,-h/2+23,w,h);
  ctx.fillStyle=C.cream;ctx.fillRect(-w/2-9,-h/2-9,w+18,h+18);
  ctx.save();ctx.beginPath();ctx.rect(-w/2,-h/2,w,h);ctx.clip();
  const a=assets.bg_prechorus_wait,z=Math.max(w/a.w,h/a.h),ww=a.w*z,hh=a.h*z;
  ctx.drawImage(a.cv,-ww/2,-hh/2,ww,hh);ctx.fillStyle=`rgba(20,17,43,${dark})`;ctx.fillRect(-w/2,-h/2,w,h);
  actor(ctx,id,actorX,-h/2+28,h*zoom,t,{shadow:false,entry:1});ctx.restore();
  ctx.strokeStyle=C.pink;ctx.lineWidth=4;ctx.strokeRect(-w/2+12,-h/2+12,w-24,h-24);ctx.restore();
}
function heartPath(ctx,x,y,size){
  ctx.moveTo(x,y+size*.43);ctx.bezierCurveTo(x-size*.92,y-size*.09,x-size*.48,y-size*.69,x,y-size*.27);
  ctx.bezierCurveTo(x+size*.48,y-size*.69,x+size*.92,y-size*.09,x,y+size*.43);ctx.closePath();
}
function heart(ctx,x,y,size,color,alpha=1,stroke=0,rot=0){ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.globalAlpha*=alpha;ctx.beginPath();heartPath(ctx,0,0,size);ctx.fillStyle=color;ctx.strokeStyle=color;ctx.lineWidth=stroke;if(stroke)ctx.stroke();else ctx.fill();ctx.restore();}
function star(ctx,x,y,r,color,alpha=1,rot=0){ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.globalAlpha*=alpha;ctx.fillStyle=color;ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,rr=i%2?r*.19:r;const xx=Math.cos(a)*rr,yy=Math.sin(a)*rr;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.closePath();ctx.fill();ctx.restore();}
function particles(ctx,t,{n=20,color=C.lemon,hearts=false,front=false,seed=1}={}){
  const b=beat(t);
  for(let i=0;i<n;i++){
    const q=i+seed*109;let x=rand(q)*2160-120,y=fract(rand(q+900)-t*(.012+rand(q+100)*.014))*1260-90;
    x+=Math.sin(t*.45+q)*25;
    if(front && x>330&&x<1570)continue;
    const size=8+rand(q+48)*(front?26:20),a=.25+rand(q+17)*.4;
    if(hearts)heart(ctx,x,y,size,color,a,rand(q)>0.6?3:0,Math.sin(t+q)*.2);
    else star(ctx,x,y,size*(.65+.35*Math.sin(t*2+q)**2+.15*b.pulse),color,a,t*.1+q);
  }
}
function lines(ctx,t,color=C.white,alpha=.16){ctx.save();ctx.strokeStyle=color;ctx.lineWidth=2;ctx.globalAlpha*=alpha;for(let i=0;i<8;i++){let x=((i*340+t*45)%2800)-450;ctx.beginPath();ctx.moveTo(x,-100);ctx.lineTo(x+650,1180);ctx.stroke();}ctx.restore();}
function dots(ctx,color=C.navy,alpha=.1){ctx.save();ctx.fillStyle=color;ctx.globalAlpha*=alpha;for(let y=20;y<1080;y+=40)for(let x=20;x<1920;x+=40){ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.fill();}ctx.restore();}
function fill(ctx,color){ctx.fillStyle=color;ctx.fillRect(0,0,1920,1080);}
function bg(ctx,id,t,u,{zoom=1.09,pan=1,dark=0,rot=0}={}){
  const a=assets[id],b=beat(t),z=zoom+u*.035,sw=1920*z,sh=1080*z;
  ctx.save();ctx.translate(960+pan*(u-.5)*65,540+Math.sin(t*.35)*9);ctx.rotate(rot+Math.sin(t*.16)*.004);ctx.drawImage(a.cv,-sw/2,-sh/2,sw,sh);ctx.restore();
  if(dark){ctx.fillStyle=`rgba(18,16,44,${dark})`;ctx.fillRect(0,0,1920,1080);}
}
function circle(ctx,x,y,r,color,width=2,alpha=1){ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();ctx.restore();}
function label(ctx,text,x,y,size=30,color=C.navy,align='left',alpha=1){ctx.save();ctx.fillStyle=color;ctx.globalAlpha*=alpha;ctx.font=`700 ${size}px "MV Latin",sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(text,x,y);ctx.restore();}
function title(ctx,x,y,scale=1,alpha=1){
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.rotate(-.045);ctx.globalAlpha*=alpha;
  ctx.font='900 154px "MV JP", sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
  ctx.strokeStyle=C.navy;ctx.lineWidth=24;ctx.strokeText('ハート泥棒',0,0);
  ctx.strokeStyle=C.white;ctx.lineWidth=9;ctx.strokeText('ハート泥棒',0,0);
  ctx.fillStyle=C.pink;ctx.fillText('ハート泥棒',0,0);
  label(ctx,'H E A R T   T H I E F',0,116,31,C.navy,'center');
  star(ctx,-440,-85,44,C.lemon);heart(ctx,445,18,75,C.cyan,1,0,.22);ctx.restore();
}
function ribbon(ctx,t,color=C.pink){ctx.save();ctx.translate(960,540);ctx.rotate(-.15);ctx.fillStyle=color;ctx.globalAlpha=.16;ctx.fillRect(-1200,260,2400,70);ctx.fillRect(-1200,-400,2400,24);ctx.restore();}
function vignette(ctx,strength=.28){const g=ctx.createRadialGradient(960,470,370,960,500,1100);g.addColorStop(0,'rgba(16,12,33,0)');g.addColorStop(1,`rgba(16,12,33,${strength})`);ctx.fillStyle=g;ctx.fillRect(0,0,1920,1080);}
function graphicPanel(ctx,t,c1,c2,v=0){fill(ctx,c1);dots(ctx,C.navy,.08);ctx.fillStyle=c2;ctx.beginPath();ctx.moveTo(1050+40*Math.sin(t),0);ctx.lineTo(1920,0);ctx.lineTo(1920,1080);ctx.lineTo(760,1080);ctx.closePath();ctx.fill();lines(ctx,t,C.white,.35);}
function stageHeart(ctx,t,x=970,y=490,r=530){const b=beat(t);heart(ctx,x,y,r*(1+.022*b.pulse),C.pink,.15,0,-.07);heart(ctx,x,y,r*1.03,C.cream,.65,6,-.07);}
function rayBurst(ctx,x,y,t,color=C.lemon){ctx.save();ctx.translate(x,y);ctx.rotate(t*.025);ctx.globalAlpha=.2;ctx.fillStyle=color;for(let i=0;i<15;i++){ctx.rotate(Math.PI*2/15);ctx.beginPath();ctx.moveTo(70,0);ctx.lineTo(1400,-43);ctx.lineTo(1400,43);ctx.closePath();ctx.fill();}ctx.restore();}

function renderScene(ctx,s,t){
  const d=s.end-s.start,local=clamp(t-s.start,0,d),u=local/d,ent=local/.65,b=beat(t),v=s.variant||0;
  const slide=(1-ease(ent))*120, slow=Math.sin(t*.4)*15;
  ctx.save();
  switch(s.kind){
    case 'intro':{
      graphicPanel(ctx,t,C.navy,v%2?C.pink:C.cyan,v);rayBurst(ctx,960,540,t,C.white);
      layer(ctx,'silhouette_a_cheer_black',500-slide,580,1010,{color:C.pink,rot:-.05});
      layer(ctx,'silhouette_b_dance_white_blackbg',1420+slide,560,1040,{color:C.cream,rot:.05});
      const h=210+u*460+b.pulse*15;layer(ctx,'prop_pinky_ring',960,525,h,{rot:-.35+u*.6});
      circle(ctx,960,540,h*.8,C.white,3,.6);particles(ctx,t,{n:35,color:C.lemon,seed:4});break;
    }
    case 'title':{
      bg(ctx,'bg_chorus_heartstage',t,u,{dark:.13});rayBurst(ctx,960,500,t,C.cream);
      actor(ctx,'character_a_peace',325-slide,85,1060,t,{rot:-.04,ghost:true,entry:ent});
      actor(ctx,'character_b_peace',1600+slide,90,1060,t,{rot:.04,ghost:true,entry:ent});
      ctx.fillStyle='rgba(255,248,234,.88)';ctx.save();ctx.translate(960,510);ctx.rotate(-.045);ctx.fillRect(-660,-140,1320,320);ctx.restore();
      title(ctx,960,460,lerp(.82,1,ease(ent))*(1+.008*b.pulse));particles(ctx,t,{n:24,seed:11});break;
    }
    case 'ring':{
      bg(ctx,'bg_verse_ring_charm',t,u,{zoom:1.1,pan:v%2?-1:1});
      ctx.fillStyle='rgba(255,248,234,.23)';ctx.fillRect(0,0,1920,1080);
      circle(ctx,555,470,260+u*25,C.white,3,.75);circle(ctx,555,470,315+u*25,C.pink,2,.48);
      actor(ctx,'character_a_charm',1390+slide,45,1200,t,{entry:ent,rot:.025});
      layer(ctx,'prop_pinky_ring',565-slide,445+slow,440+u*50,{rot:-.19+u*.23});
      star(ctx,408,314,25+15*b.pulse,C.white);star(ctx,720,510,18,C.lemon);
      ribbon(ctx,t,C.cyan);particles(ctx,t,{n:16,seed:12});break;
    }
    case 'charm':{
      bg(ctx,'bg_verse_ring_charm',t,u,{zoom:1.2,pan:-1,dark:.08});
      actor(ctx,s.actor||'character_a_charm',590-slide,30,1390,t,{entry:ent,rot:-.018});
      circle(ctx,1420,540,285,C.cream,28,.3);circle(ctx,1420,540,325,C.white,3,.7);
      layer(ctx,'prop_love_charm',1400+slide,515+slow,460,{rot:Math.sin(t*.6)*.09});
      heart(ctx,1620,245,90,C.pink,.55,4,.15);particles(ctx,t,{n:21,seed:3});break;
    }
    case 'portrait':{
      bg(ctx,s.bg||'bg_prechorus_wait',t,u,{zoom:1.16,pan:v%2?-1:1,dark:.15});
      const right=v%2===0,x=right?1300:600;
      ctx.fillStyle=right?'rgba(62,225,232,.3)':'rgba(255,115,154,.26)';ctx.beginPath();ctx.moveTo(right?0:1920,0);ctx.lineTo(right?980:920,0);ctx.lineTo(right?700:1220,1080);ctx.lineTo(right?0:1920,1080);ctx.fill();
      circle(ctx,right?480:1430,485,330,C.cream,4,.7);
      actor(ctx,s.actor||'character_b_heartthief',x+(right?slide:-slide),-65,1770-u*60,t,{entry:ent,rot:right?.022:-.023});
      for(let k=0;k<3;k++)heart(ctx,right?350+k*105:1300+k*100,440+Math.sin(t*.8+k)*90,65-k*11,[C.white,C.lemon,C.pink][k],.8,k%2?4:0,-.15+k*.15);
      particles(ctx,t,{n:14,color:C.cream,seed:17,front:true});break;
    }
    case 'detail':{
      graphicPanel(ctx,t,v%2?C.navy:C.cream,v%2?C.purple:C.pink,v);
      ctx.save();ctx.translate(960,505);ctx.rotate(v%2?.028:-.025);ctx.fillStyle=C.navy;ctx.fillRect(-856,-385,1736,776);
      ctx.beginPath();ctx.rect(-840,-377,1680,750);ctx.clip();ctx.translate(-960,-505);
      bg(ctx,s.bg||'bg_chorus_heartstage',t,u,{zoom:1.22,dark:.21,pan:-1});
      actor(ctx,s.actor||'character_b_heartthief',1120+lerp(80,-90,u),80,2740-u*90,t,{entry:1,rot:0,shadow:false});ctx.restore();
      ctx.save();ctx.translate(960,505);ctx.rotate(v%2?.028:-.025);ctx.strokeStyle=C.white;ctx.lineWidth=7;ctx.strokeRect(-840,-377,1680,750);ctx.restore();
      for(let k=0;k<5;k++)star(ctx,190+k*350,90+30*Math.sin(k+t),18+(k%2)*9,C.lemon,.75);
      heart(ctx,1610,810,92,C.pink,.8,5,.15);circle(ctx,230,775,106,C.cyan,5,.8);break;
    }
    case 'triptych':{
      fill(ctx,C.cream);dots(ctx,C.navy,.1);
      const ids=s.actors||['character_a_peace','character_b_point','character_a_apple'];
      const cols=[C.cyan,C.pink,C.lemon];
      for(let k=0;k<3;k++){
        const x=355+k*604,yy=530+(k%2?-28:20),rot=[-.025,.025,-.025][k];
        ctx.save();ctx.translate(x,yy);ctx.rotate(rot);ctx.fillStyle=C.navy;ctx.fillRect(-272+9,-446+14,544,894);ctx.fillStyle=cols[k];ctx.fillRect(-272,-446,544,894);
        ctx.beginPath();ctx.rect(-265,-439,530,880);ctx.clip();ctx.translate(-x,-yy);
        circle(ctx,x,475,245,C.white,4,.6);actor(ctx,ids[k],x+Math.sin(t*.4+k)*18,95,1260,t,{entry:ent,rot:0,shadow:false});ctx.restore();
      }
      particles(ctx,t,{n:10,color:C.pink,hearts:true,seed:64,front:true});break;
    }
    case 'ringmacro':{
      bg(ctx,'bg_verse_ring_charm',t,u,{zoom:1.25,pan:-1,dark:.1});
      const hh=lerp(610,1040,ease(u));layer(ctx,'prop_pinky_ring',960+slow,530,hh,{rot:lerp(-.2,.21,u)});
      circle(ctx,960,530,330+u*220,C.white,5,.45);circle(ctx,960,530,440+u*240,C.cyan,3,.3);
      star(ctx,740-u*50,260-u*50,40+18*b.pulse,C.white);particles(ctx,t,{n:18,seed:6});break;
    }
    case 'staccato':{
      const phase=Math.floor(local/(60/bpm)),dark=(phase+v)%2===0;
      graphicPanel(ctx,t,dark?C.navy:C.cream,dark?C.pink:C.cyan,v);
      const main=phase%2?'silhouette_a_cheer_black':'silhouette_b_dance_white_blackbg';
      const col=dark?C.cream:C.navy;
      layer(ctx,main,960,570,1060,{color:col,rot:phase%2?-.045:.045});
      layer(ctx,main,190,580,940,{color:dark?C.cyan:C.pink,alpha:.62,rot:-.09});
      layer(ctx,main,1750,580,940,{color:dark?C.cyan:C.pink,alpha:.62,rot:.09});
      heart(ctx,960,470,740,dark?C.lemon:C.pink,.35,5,.02);break;
    }
    case 'split':{
      graphicPanel(ctx,t,C.cyan,C.pink,v);stageHeart(ctx,t,970,475,540);
      ctx.save();ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(1050,0);ctx.lineTo(850,1080);ctx.lineTo(0,1080);ctx.closePath();ctx.clip();
      actor(ctx,s.actor||'character_a_apple',510-slide,-15,1350,t,{entry:ent,rot:-.02});ctx.restore();
      ctx.save();ctx.beginPath();ctx.moveTo(1066,0);ctx.lineTo(1920,0);ctx.lineTo(1920,1080);ctx.lineTo(866,1080);ctx.closePath();ctx.clip();
      actor(ctx,s.other||'character_b_apple',1450+slide,-5,1350,t,{entry:ent,rot:.02});ctx.restore();
      ctx.strokeStyle=C.cream;ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(1058,0);ctx.lineTo(858,1080);ctx.stroke();
      if(v%2===0)layer(ctx,'prop_bitten_apple',960,845,260*(1+.02*b.pulse),{rot:-.2+u*.25});
      particles(ctx,t,{n:18,color:C.lemon,front:true,seed:9});break;
    }
    case 'wait':{
      bg(ctx,'bg_prechorus_wait',t,u,{zoom:1.12,pan:-1,dark:.12});
      ctx.fillStyle='rgba(23,24,46,.5)';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(900,0);ctx.lineTo(680,1080);ctx.lineTo(0,1080);ctx.fill();
      for(let k=0;k<7;k++){ctx.strokeStyle=k%2?C.pink:C.cyan;ctx.lineWidth=8;ctx.globalAlpha=.45;ctx.beginPath();ctx.moveTo(-60,140+k*130);ctx.lineTo(520+u*90,190+k*105);ctx.stroke();}ctx.globalAlpha=1;
      circle(ctx,490,525,250,C.cream,4,.55);
      layer(ctx,'silhouette_b_neutral_black',400,565,875,{color:C.pink,alpha:.58,rot:-.05});
      actor(ctx,'character_a_wait',1320+slide,-5,1410,t,{entry:ent,ghost:true,rot:.015});break;
    }
    case 'silhouettes':{
      const dark=v%2===0;graphicPanel(ctx,t,dark?C.navy:C.lemon,dark?C.purple:C.cyan,v);
      stageHeart(ctx,t,960,520,700);lines(ctx,t*2,dark?C.white:C.navy,.2);
      const main=s.actor||'silhouette_b_dance_white_blackbg', secondary=s.other||'silhouette_a_cheer_black';
      layer(ctx,secondary,395-slide,590,1040,{color:dark?C.pink:C.navy,rot:-.04,alpha:.95});
      layer(ctx,main,1340+slide,570,1080*(1+.008*b.pulse),{color:dark?C.cream:C.navy,rot:.03});
      for(let k=0;k<5;k++)heart(ctx,780+k*90,310+k*105+Math.sin(t+k)*30,48,C.cream,.7,k%2?4:0,.1);
      particles(ctx,t,{n:12,color:C.lemon,seed:8});break;
    }
    case 'chorus':{
      bg(ctx,'bg_chorus_heartstage',t,u,{zoom:1.1+.012*b.pulse,pan:v%2?-1:1,dark:.08});
      stageHeart(ctx,t,960,500,580);rayBurst(ctx,960,580,t,C.lemon);
      if(v%3===0){actor(ctx,'character_a_cheer',380-slide,90,1090,t,{entry:ent,rot:-.05,ghost:true});actor(ctx,'character_b_heartthief',1380+slide,-65,1440,t,{entry:ent,rot:.025,ghost:true});}
      else if(v%3===1){actor(ctx,'character_b_dance',1010+slow,-10,1090*(1+.012*b.pulse),t,{entry:ent,ghost:true});layer(ctx,'silhouette_a_cheer_black',200,590,940,{color:C.pink,alpha:.65,rot:-.08});layer(ctx,'silhouette_a_cheer_black',1750,600,940,{color:C.cyan,alpha:.65,rot:.08});}
      else{actor(ctx,'character_a_peace',590-slide,-60,1370,t,{entry:ent,rot:-.035,ghost:true});actor(ctx,'character_b_cheer',1530+slide,90,1040,t,{entry:ent,rot:.05,ghost:true});}
      particles(ctx,t,{n:25,color:C.lemon,seed:21});particles(ctx,t,{n:13,color:C.pink,hearts:true,seed:29,front:true});break;
    }
    case 'phone':{
      bg(ctx,'bg_social_night',t,u,{zoom:1.08,pan:-1,dark:.13});
      circle(ctx,1340,540,455,C.cyan,4,.3);circle(ctx,1340,540,400,C.pink,2,.4);
      photoCard(ctx,'character_a_phone_check',485-slide,565,745,860,t,{rot:-.045,zoom:1.5});
      layer(ctx,'prop_generic_story_phone',1350+slide,560+slow,1020+u*50,{rot:.07-.12*u});
      for(let k=0;k<8;k++){const q=fract(t*.16+k*.135);heart(ctx,1670+Math.sin(k+t)*35,920-q*940,24+q*25,C.pink,(1-q)*.85,0,.1);}
      particles(ctx,t,{n:12,color:C.cyan,seed:7});break;
    }
    case 'phone_macro':{
      bg(ctx,'bg_social_night',t,u,{zoom:1.26,pan:1,dark:.34});
      layer(ctx,'prop_generic_story_phone',1170+lerp(100,-90,u),620+u*40,1670+u*150,{rot:-.12+u*.1});
      photoCard(ctx,'character_a_phone_check',310-slide,620,480,760,t,{rot:-.08,zoom:1.48});
      for(let k=0;k<7;k++){const q=fract(t*.25+k*.16);heart(ctx,1670+Math.sin(k)*90,980-q*1100,25+q*42,C.pink,(1-q)*.85,0,Math.sin(t+k)*.2);}
      particles(ctx,t,{n:9,color:C.white,seed:91,front:true});break;
    }
    case 'social':{
      bg(ctx,'bg_social_night',t,u,{zoom:1.19,pan:1,dark:.25});
      photoCard(ctx,'character_a_phone_check',570-slide,560,990,970,t,{rot:-.032,zoom:1.66,actorX:35});
      ctx.fillStyle='rgba(255,248,234,.09)';ctx.save();ctx.translate(1450,535);ctx.rotate(.065);ctx.fillRect(-375,-470,750,940);ctx.restore();
      layer(ctx,'prop_generic_story_phone',1450+slide,540,960,{rot:.055});
      particles(ctx,t,{n:13,color:C.pink,hearts:true,seed:52});break;
    }
    case 'anxiety':{
      bg(ctx,'bg_social_night',t,u,{zoom:1.28,pan:-1,dark:.42});
      const x=v%2?1170:800;
      circle(ctx,x,480,470,C.pink,3,.35);circle(ctx,x,480,510,C.cyan,2,.25);
      photoCard(ctx,s.actor||'character_a_wait',x+slow,555,1140,955,t,{rot:-.025,zoom:1.65,dark:.3});
      for(let k=0;k<7;k++){const xx=180+rand(k+30)*1500, yy=220+rand(k+50)*650;heart(ctx,xx+u*(k%2?80:-80),yy-u*90,40+rand(k)*45,C.pink,.38,3,(u-.5)*.3);}
      vignette(ctx,.52);break;
    }
    case 'finale':{
      bg(ctx,'bg_chorus_heartstage',t,u,{zoom:1.1,pan:-1,dark:.02});rayBurst(ctx,960,500,t,C.lemon);
      actor(ctx,'character_a_cheer',365-slide,70,1060,t,{entry:ent,rot:-.035,ghost:true});
      actor(ctx,'character_b_dance',1560+slide,75,1060,t,{entry:ent,rot:.035,ghost:true});
      heart(ctx,960,500,600,C.cream,.9);title(ctx,960,435,.82*(1+.012*b.pulse));
      particles(ctx,t,{n:45,color:C.lemon,seed:10});particles(ctx,t,{n:19,color:C.pink,hearts:true,front:true,seed:13});break;
    }
    case 'outro':{
      graphicPanel(ctx,t,C.cream,C.cyan,v);ctx.fillStyle='rgba(255,248,234,.62)';ctx.fillRect(0,0,1920,1080);
      const appear=ease(ent);
      layer(ctx,'prop_pinky_ring',960,465,510-u*70,{rot:-.1+u*.23,alpha:.55});
      title(ctx,960,430,.96,appear);particles(ctx,t,{n:14,color:C.pink,seed:8});
      circle(ctx,960,485,385,C.navy,2,.25);break;
    }
    default:throw new Error('Unknown scene '+s.kind);
  }
  // Thin editorial framing sits above scene layers, with open space for lyric overlay.
  ctx.strokeStyle='rgba(255,248,234,.4)';ctx.lineWidth=1.5;ctx.strokeRect(37,34,1846,1012);
  ctx.restore();
}

const cv=createCanvas(W,H),ctx=cv.getContext('2d');
const sceneA=createCanvas(W,H),aCtx=sceneA.getContext('2d');
const sceneB=createCanvas(W,H),bCtx=sceneB.getContext('2d');
function sceneToCanvas(c,s,t){c.setTransform(W/1920,0,0,H/1080,0,0);c.clearRect(0,0,1920,1080);renderScene(c,s,t);}
function drawFrame(t){
  let idx=timeline.shots.findIndex(s=>t>=s.start && t<s.end);if(idx<0)idx=timeline.shots.length-1;
  const s=timeline.shots[idx],local=t-s.start,td=Math.min(s.transitionDuration||.28,(s.end-s.start)*.25);
  sceneToCanvas(bCtx,s,t);ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;
  if(idx>0 && local<td){
    const prev=timeline.shots[idx-1];sceneToCanvas(aCtx,prev,Math.min(t,prev.end-.001));ctx.drawImage(sceneA,0,0);
    const p=ease(local/td),typ=s.transition||'wipe';ctx.save();
    if(typ==='fade'){ctx.globalAlpha=p;ctx.drawImage(sceneB,0,0);}
    else if(typ==='iris'){ctx.beginPath();ctx.arc(W*.52,H*.48,p*W*.86,0,Math.PI*2);ctx.clip();ctx.drawImage(sceneB,0,0);}
    else {const edge=-W*.25+p*W*1.5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(edge+H*.21,0);ctx.lineTo(edge-H*.21,H);ctx.lineTo(0,H);ctx.closePath();ctx.clip();ctx.drawImage(sceneB,0,0);}
    ctx.restore();
    if(typ==='flash' && local<td){ctx.globalAlpha=.19*(1-local/td);ctx.fillStyle=C.cream;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}
  }else ctx.drawImage(sceneB,0,0);
  if(t<.45){ctx.globalAlpha=1-smooth(t/.45);ctx.fillStyle=C.navy;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}
  if(t>117.0){ctx.globalAlpha=smooth((t-117.0)/1.76);ctx.fillStyle=C.navy;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;}
  return cv;
}

async function main(){
  await loadAssets();
  if(opts.stills){
    const dir=path.join(__dirname,'stills');fs.mkdirSync(dir,{recursive:true});
    const times=opts.stills==='all'?timeline.shots.map(s=>s.start+Math.min(.8,(s.end-s.start)/2)):opts.stills.split(',').map(Number);
    for(const t of times)fs.writeFileSync(path.join(dir,`frame_${t.toFixed(3)}.jpg`),drawFrame(t).toBuffer('image/jpeg',90));
    console.log(JSON.stringify({stills:times.length,dir}));return;
  }
  const ff=spawn('[FFMPEG]',[
    '-hide_banner','-loglevel','warning','-y','-f','rawvideo','-pix_fmt','rgba','-s',`${W}x${H}`,'-r',String(FPS),'-i','pipe:0',
    '-ss',String(START),'-i',AUDIO,'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p',
    '-c:a','aac','-b:a','320k','-ar','48000','-t',String(DURATION),'-movflags','+faststart','-metadata','title=ハート泥棒 — Music Video',OUT
  ],{stdio:['pipe','ignore','pipe']});
  let stderr='';ff.stderr.on('data',d=>{stderr+=d.toString();});ff.stdin.on('error',e=>console.error('encoder input',e.message));
  const total=Math.round(DURATION*FPS),startClock=Date.now();
  for(let f=0;f<total;f++){
    const frame=drawFrame(START+f/FPS).data();if(!ff.stdin.write(frame))await once(ff.stdin,'drain');
    if(f%(FPS*5)===0)console.log(JSON.stringify({seconds:(f/FPS).toFixed(1),total:DURATION,renderFps:(f/((Date.now()-startClock)/1000)).toFixed(1)}));
  }
  ff.stdin.end();const [code]=await once(ff,'close');if(code!==0)throw new Error('Encoder failed '+code+' '+stderr);
  console.log(JSON.stringify({output:OUT,frames:total,seconds:DURATION,elapsed:(Date.now()-startClock)/1000,encoderWarnings:stderr}));
}
main().catch(e=>{console.error(e);process.exit(1);});
