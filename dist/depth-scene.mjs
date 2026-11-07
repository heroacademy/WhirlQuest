// WhirlQuest's lightweight perspective renderer: a shaded, projected 3D world
// drawn on a 2D canvas, keeping full compatibility with phones and static hosting.
const TAU=Math.PI*2;
const palette=[
  {sky:['#7bc8c6','#c8ecdd','#fff1ca'],land:'#5d9d82',path:'#e4c98f',pathTop:'#f6e8bb',edge:'#5a796a',leaf:'#4c967c',mountain:'#87b6a7',gem:['#ed6c74','#9dc777','#f4a355','#ec7b9d','#b998cd']},
  {sky:['#69bbdb','#bde8ee','#fff6d7'],land:'#5d9ca5',path:'#dfcba8',pathTop:'#f3e8ce',edge:'#648e9b',leaf:'#5eaf9f',mountain:'#87c2cc',gem:['#858ed4','#f8d36b','#f8a67c','#b49dd8','#e9c16b']},
  {sky:['#3f579c','#837ac5','#eab6be'],land:'#69609c',path:'#bbb1cb',pathTop:'#ddd7eb',edge:'#60588e',leaf:'#8bc6b4',mountain:'#7772a8',gem:['#ffdb81','#abf4e6','#efa6dc','#b5b2fc','#fff0ac']}
];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a+(b-a)*t;
const coord=(x,y,z,camera,w)=>{
  const scale=1/(1-z*.115);
  return {x:(x-camera)*scale+(1-scale)*w*.49+z*19,y:(y-192)*scale+192+z*34,scale};
};
function poly(ctx,points,fill,stroke=null,width=1){
  ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
  ctx.closePath();ctx.fillStyle=fill;ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
}
function circle(ctx,x,y,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();}
function radial(ctx,x,y,r,bright,dark){
  const g=ctx.createRadialGradient(x-r*.38,y-r*.4,r*.05,x+r*.15,y+r*.2,r*1.35);
  g.addColorStop(0,bright);g.addColorStop(.67,dark);g.addColorStop(1,'#244a5155');return g;
}
function ellipse(ctx,x,y,rx,ry,fill,rotation=0){ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(x,y,rx,ry,rotation,0,TAU);ctx.fill();}
function star(ctx,x,y,r,fill,inner=.45){
  ctx.save();ctx.translate(x,y);ctx.beginPath();
  for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,rr=i%2?r*inner:r;i?ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):ctx.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}
  ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.restore();
}
function sky(ctx,w,h,s,t,p){
  const g=ctx.createLinearGradient(0,0,0,h);
  g.addColorStop(0,p.sky[0]);g.addColorStop(.52,p.sky[1]);g.addColorStop(1,p.sky[2]);
  ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  const sunX=w*.84-Math.sin(t*.002)*10;
  ctx.globalAlpha=.18;circle(ctx,sunX,77,62,'#fff8cd');ctx.globalAlpha=1;
  circle(ctx,sunX,77,s.level.world===2?28:36,'#fff1c3');
  if(s.level.world===2){
    for(let i=0;i<46;i++){const x=((i*137+44-s.camera*.032)%(w+60)+(w+60))%(w+60),y=20+i*59%188;
      circle(ctx,x,y,(i%4===0?2.8:1.2)*(1+.13*Math.sin(t*.04+i)),i%3===0?'#fffed9':'#e1eafa');}
  }
  for(let i=0;i<12;i++){
    const x=((i*197-s.camera*.19)%(w+370)+(w+370))%(w+370)-150;
    const y=53+i*71%133+(i%2?8:0),scale=.72+(i%3)*.26;
    ctx.globalAlpha=s.level.world===2?.42:.72;
    drawCloud(ctx,x,y,scale,'#fffdf3');ctx.globalAlpha=1;
  }
  drawRidges(ctx,w,s,p);
  for(let i=0;i<5;i++){
    const x=((i*345-s.camera*.11)%(w+480)+(w+480))%(w+480)-190;
    const y=238+(i%2)*23;
    island(ctx,x,y, i%3===0?1:.75,p,s.level.world);
  }
}
function drawCloud(ctx,x,y,size,col){
  ellipse(ctx,x,y+11,52*size,14*size,'#4f8d9223');
  for(const [dx,dy,r] of [[-35,0,21],[0,-7,27],[29,1,19],[-8,9,24]]){
    const grad=radial(ctx,x+dx*size,y+dy*size,r*size,'#ffffff',col);
    circle(ctx,x+dx*size,y+dy*size,r*size,grad);
  }
}
function drawRidges(ctx,w,s,p){
  for(let layer=0;layer<3;layer++){
    const y=266+layer*27,amplitude=17+layer*5,parallax=.12+layer*.14;
    ctx.beginPath();ctx.moveTo(0,460);
    for(let x=-20;x<w+25;x+=10){const wx=x+s.camera*parallax;
      ctx.lineTo(x,y-Math.sin(wx/(95+layer*24))*amplitude-Math.sin(wx/44)*7);}
    ctx.lineTo(w,460);ctx.closePath();
    ctx.fillStyle=layer===0?p.mountain:layer===1?'#a1c7b5':p.land;
    ctx.globalAlpha=layer===0?.66:layer===1?.82:.75;ctx.fill();ctx.globalAlpha=1;
  }
}
function island(ctx,x,y,scale,p,world){
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  ellipse(ctx,0,18,88,12,'#35626a2a');
  poly(ctx,[{x:-69,y:6},{x:70,y:6},{x:52,y:29},{x:20,y:44},{x:-35,y:33}],world===2?'#8074ab':'#7a9f84');
  ellipse(ctx,0,0,70,16,world===2?'#ae9ac0':'#a2c7a0');
  const home=world===2?'#d7ccf0':'#f6d8a0';
  poly(ctx,[{x:-18,y:0},{x:-18,y:-37},{x:17,y:-37},{x:17,y:0}],home);
  poly(ctx,[{x:-24,y:-36},{x:0,y:-58},{x:24,y:-36}],world===2?'#7966aa':'#c67d63');
  poly(ctx,[{x:17,y:-37},{x:27,y:-43},{x:27,y:-4},{x:17,y:0}],'#bd9c8b');
  ctx.fillStyle='#627f91';ctx.fillRect(-6,-26,10,12);
  ctx.restore();
}
function track(ctx,s,p,w){
  const at=(x,y,z)=>coord(x,y,z,s.camera,w);
  const start=s.camera-500,end=s.camera+w+600;
  const backLeft=at(start,339,-2.75),backRight=at(end,339,-2.75);
  const frontRight=at(end,339,2.3),frontLeft=at(start,339,2.3);
  poly(ctx,[backLeft,backRight,frontRight,frontLeft],p.pathTop);
  poly(ctx,[frontLeft,frontRight,at(end,370,2.3),at(start,370,2.3)],p.path);
  poly(ctx,[at(start,370,2.3),at(end,370,2.3),at(end,395,2.3),at(start,395,2.3)],p.edge);
  // Perspective lanes make the running strip visibly recede into the landscape.
  for(const z of [-2.35,1.7]){
    const l=at(start,338,z),r=at(end,338,z);
    ctx.strokeStyle=z<0?'#fff8d38f':'#fff7e4bd';ctx.lineWidth=z<0?5:8;
    ctx.beginPath();ctx.moveTo(l.x,l.y);ctx.lineTo(r.x,r.y);ctx.stroke();
  }
  // Angled tile seams and illuminated centre dots.
  for(let x=Math.floor((s.camera-200)/110)*110;x<s.camera+w+350;x+=110){
    const far=at(x,338,-2.55),near=at(x,338,2.2);
    ctx.strokeStyle='#af997340';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(far.x,far.y);ctx.lineTo(near.x,near.y);ctx.stroke();
    const m=at(x+55,338,.45);ellipse(ctx,m.x,m.y,7,3,'#fff5ca8f');
  }
  // Foliage at the edge: separated so obstacles remain legible.
  for(let x=Math.floor((s.camera-150)/200)*200;x<s.camera+w+300;x+=200){
    const r=at(x+23,338,-2.45),size=r.scale;
    ellipse(ctx,r.x,r.y,20*size,7*size,'#2b5e5252');
    for(const dx of [-8,7]){
      ctx.strokeStyle='#3b836b';ctx.lineWidth=2.5*size;
      ctx.beginPath();ctx.moveTo(r.x+dx,r.y);ctx.lineTo(r.x+dx-2,r.y-17*size);ctx.stroke();
      circle(ctx,r.x+dx-2,r.y-19*size,7*size,dx<0?'#e7a9a2':'#f6cb6d');
      circle(ctx,r.x+dx-4,r.y-22*size,2.5*size,'#fff9e9');
    }
  }
}
function pine(ctx,x,y,z,s,p,w,seed){
  const a=coord(x,y,z,s.camera,w),r=a.scale*(.78+(seed%3)*.1);
  if(a.x< -100||a.x>w+100)return;
  ellipse(ctx,a.x+7*r,a.y+7*r,23*r,7*r,'#26494f48');
  poly(ctx,[{x:a.x-7*r,y:a.y},{x:a.x+8*r,y:a.y},{x:a.x+8*r,y:a.y-58*r},{x:a.x-7*r,y:a.y-58*r}],'#ae805b');
  poly(ctx,[{x:a.x+8*r,y:a.y},{x:a.x+15*r,y:a.y-8*r},{x:a.x+15*r,y:a.y-61*r},{x:a.x+8*r,y:a.y-58*r}],'#805e51');
  const col=s.level.world===2?'#7069ae':s.level.world===1?'#61adbd':'#5d9c77';
  for(let i=0;i<3;i++){
    const height=(i*19+72)*r,width=(40-i*8)*r;
    poly(ctx,[{x:a.x,y:a.y-height},{x:a.x-width,y:a.y-height+38*r},{x:a.x+width,y:a.y-height+38*r}],col);
    poly(ctx,[{x:a.x,y:a.y-height},{x:a.x+width,y:a.y-height+38*r},{x:a.x+width*.62,y:a.y-height+51*r}],'#2d716e72');
  }
  if(seed%4===0)star(ctx,a.x+4*r,a.y-90*r,7*r,'#f7d275');
}
function backdropProps(ctx,s,p,w,near=false){
  const interval=near?430:285,z=near?2.34:-3.1;
  for(let x=Math.floor((s.camera-250)/interval)*interval;x<s.camera+w+400;x+=interval){
    if(x<180)continue;
    if((Math.floor(x/interval)+s.level.id)%5===0)continue;
    pine(ctx,x+35,340,z,s,p,w,Math.floor(x/interval));
  }
}
function treasure(ctx,item,s,p,w,t){
  const elapsed=s.frames-(item.cutFrame??-1000);
  if(item.collected&&!(elapsed>=0&&elapsed<28))return;
  const a=coord(item.x,item.y+Math.sin(t*.052+item.id)*4,0,s.camera,w);
  if(a.x< -60||a.x>w+60)return;
  const shadow=coord(item.x,338,0,s.camera,w);
  const high=clamp((338-item.y)/135,.25,1);
  ellipse(ctx,shadow.x+4,shadow.y+5,20*high,6*high,'#405f5944');
  const color=p.gem[item.kind%p.gem.length];
  if(item.collected){
    ctx.save();ctx.globalAlpha=1-elapsed/28;
    for(const dir of [-1,1]){
      ctx.save();ctx.translate(a.x+dir*elapsed*1.6,a.y+elapsed*.6-dir*2);ctx.rotate(dir*elapsed*.055);
      ellipse(ctx,0,0,11,17,radial(ctx,-2,-4,19,'#ffeed5',color));
      ctx.fillStyle='#fff1d4';ctx.fillRect(dir<0?7:-8,-13,1,26);ctx.restore();
    }ctx.restore();return;
  }
  ctx.save();ctx.translate(a.x,a.y);ctx.rotate(Math.sin(t*.025+item.id)*.1);
  if(s.level.world===2){
    // Faceted 3D sky-crystals distinguish Starfall from the orchard worlds.
    const top={x:0,y:-24},left={x:-17,y:-4},right={x:17,y:-4},bottom={x:0,y:21};
    poly(ctx,[{x:5,y:-18},{x:22,y:0},{x:5,y:26},{x:0,y:21}], '#575d8b');
    poly(ctx,[top,left,{x:0,y:3}], '#f3efff');
    poly(ctx,[top,{x:0,y:3},right], color);
    poly(ctx,[left,{x:0,y:3},bottom], '#9a8fc5');
    poly(ctx,[{x:0,y:3},right,bottom], color);
    poly(ctx,[top,{x:0,y:3},right], '#ffffff30');
    star(ctx,-7,-11,4,'#fffbea');
    ctx.restore();return;
  }
  // Spherical body, side thickness and a bright specular highlight.
  ellipse(ctx,5,5,20,19,'#426e6544');
  ellipse(ctx,1,0,19,19,radial(ctx,-5,-6,22,'#fff3dd',color));
  ellipse(ctx,-7,-8,6,4,'#ffffff9e',-.6);
  ctx.strokeStyle='#4f7b5d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(1,-17);ctx.lineTo(4,-24);ctx.stroke();
  ellipse(ctx,10,-20,10,4,'#85ba77',-.45);
  ctx.restore();
}
function storm(ctx,item,s,w,t){
  const a=coord(item.x,item.y,0,s.camera,w);if(a.x< -70||a.x>w+70)return;
  ellipse(ctx,a.x+6,a.y+17,33,11,'#2f3a6355');
  const bob=Math.sin(t*.065+item.x)*2;
  for(const [dx,dy,r] of [[-13,-10,16],[4,-20,24],[21,-8,16],[-1,4,20]]){
    circle(ctx,a.x+dx+3,a.y+dy+bob+5,r,'#37365b');
    circle(ctx,a.x+dx,a.y+dy+bob,r,radial(ctx,a.x+dx-7,a.y+dy-6,r,'#a79bc2','#57537f'));
  }
  poly(ctx,[{x:a.x+2,y:a.y-10},{x:a.x+15,y:a.y-10},{x:a.x+6,y:a.y+4},{x:a.x+16,y:a.y+3},{x:a.x-7,y:a.y+25},{x:a.x-1,y:a.y+5},{x:a.x-10,y:a.y+5}],'#f7b3ce');
  circle(ctx,a.x+22,a.y-31,3,'#ffdbf1');
}
function portal(ctx,x,s,w,t){
  const a=coord(x,338,0,s.camera,w);if(a.x< -130||a.x>w+130)return;
  ellipse(ctx,a.x+10,a.y+11,85,16,'#27596950');
  for(let i=0;i<4;i++){
    ctx.lineWidth=14-i*2;ctx.strokeStyle=['#ffde81','#f5a49a','#a4e0cf','#baabd8'][i];
    ctx.beginPath();ctx.ellipse(a.x,a.y,77-i*12,99-i*9,0,Math.PI,TAU);ctx.stroke();
  }
  star(ctx,a.x,a.y-104+Math.sin(t*.04)*5,15,'#fff1ad');
}
function player(ctx,s,w,t){
  const a=coord(s.x,s.y,.12,s.camera,w),ground=coord(s.x,338,0,s.camera,w);
  const lift=clamp((338-s.y)/170,0,1);
  ellipse(ctx,ground.x+11,ground.y+7,24-lift*8,8-lift*2,'#244f4f49');
  // Air trail is a transparent ribbon which curves in 3D space.
  if(!s.grounded){
    ctx.strokeStyle='#fff6b397';ctx.lineWidth=9;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(a.x-37,a.y+22);ctx.quadraticCurveTo(a.x-65,a.y+33,a.x-89,a.y+11);ctx.stroke();
  }
  // Leaf has an extruded edge and foreshortens as it tumbles.
  ctx.save();ctx.translate(a.x,a.y);ctx.rotate(s.angle);
  ctx.scale(.65+.35*Math.abs(Math.cos(s.angle*.6)),1);
  ctx.fillStyle='#315f63';ctx.strokeStyle='#fff9e1';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(4,-34);ctx.quadraticCurveTo(41,-14,31,9);ctx.quadraticCurveTo(11,34,0,29);ctx.quadraticCurveTo(17,10,4,-34);ctx.fill();ctx.stroke();
  ctx.translate(-5,-5);
  const leaf=ctx.createLinearGradient(-15,-20,30,15);
  leaf.addColorStop(0,'#d0efac');leaf.addColorStop(.48,'#71b695');leaf.addColorStop(1,'#2c776d');
  ctx.fillStyle=leaf;ctx.beginPath();ctx.moveTo(4,-30);ctx.quadraticCurveTo(39,-13,27,8);ctx.quadraticCurveTo(10,30,0,24);ctx.quadraticCurveTo(16,5,4,-30);ctx.fill();
  ctx.strokeStyle='#ffe7a3';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(4,-28);ctx.quadraticCurveTo(11,0,1,25);ctx.stroke();
  circle(ctx,0,0,7,radial(ctx,-3,-4,9,'#ffe8a4','#f4a64b'));ctx.restore();
  // Pip is a glowing 3D orb with a raised wing and tiny face.
  ctx.save();ctx.translate(a.x-43,a.y-37+Math.sin(t*.11)*3);
  ellipse(ctx,-14,-2,13,7,'#aadcb0',-.35);ellipse(ctx,13,-2,13,7,'#79bea4',.35);
  circle(ctx,2,4,16,'#315a5b');circle(ctx,0,0,15,radial(ctx,-5,-6,18,'#fff0a6','#f5b75e'));
  circle(ctx,-5,-1,2.2,'#26464d');circle(ctx,5,-1,2.2,'#26464d');
  ctx.strokeStyle='#996a45';ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(0,3.5,4,.12,Math.PI-.12);ctx.stroke();
  ctx.restore();
}
function motes(ctx,s,w,t){
  for(let i=0;i<18;i++){
    const x=((i*115-s.camera*.34)%(w+120)+(w+120))%(w+120);
    const y=185+i*29%170+Math.sin(t*.025+i)*8;
    circle(ctx,x,y,i%4===0?2.6:1.4,i%3===0?'#fff8cb8c':'#dbf1d68c');
  }
  for(const particle of s.particles||[]){
    const a=coord(particle.x,particle.y,.3,s.camera,w);
    ctx.globalAlpha=clamp(particle.life/30,0,1);
    star(ctx,a.x,a.y,4,particle.color||'#fff4ac');ctx.globalAlpha=1;
  }
}

export function renderSkybound3D(ctx,s,t,w,h){
  if(!s||!ctx)return;
  const p=palette[s.level.world];
  ctx.save();ctx.clearRect(0,0,w,h);
  sky(ctx,w,h,s,t,p);
  track(ctx,s,p,w);
  backdropProps(ctx,s,p,w,false);
  for(const item of s.course.objects)treasure(ctx,item,s,p,w,t);
  for(const item of s.course.hazards)storm(ctx,item,s,w,t);
  portal(ctx,s.course.length,s,w,t);
  motes(ctx,s,w,t);
  player(ctx,s,w,t);
  backdropProps(ctx,s,p,w,true);
  ctx.restore();
}
