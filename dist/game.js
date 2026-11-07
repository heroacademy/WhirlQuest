import {bootAcademy} from './academy-client.js';
import {WORLDS, LEVELS, buildCourse, gateOptions, initialSave, sanitizeSave, defaultPlayer, finishLevel, clamp} from './logic.mjs';
import {renderSkybound3D} from './depth-scene.mjs';

const $ = id => document.getElementById(id);
const canvas=$('game'),ctx=canvas.getContext('2d');
const TAU=Math.PI*2, H=460,GROUND=340;
let viewWidth=920, lastTime=0, accumulator=0, tick=0, selectedLevel=1, selectedWorld=0, tipTimeout=null;
let audioContext=null, save=loadSave(), state=null, academy=null;
const player=()=>save.players.find(p=>p.id===save.selected)||save.players[0];

function loadSave(){try {const saved=JSON.parse(localStorage.getItem('hero-sky-slicer-v1'));return sanitizeSave(saved)||initialSave();}catch{return initialSave();}}
function persist(sync=true){try{localStorage.setItem('hero-sky-slicer-v1',JSON.stringify(save));}catch{announce('Browser storage is unavailable. Use a backup to keep your progress.');}if(sync)void academy?.flush();}
function announce(message){$('announcer').textContent=message;}
function sound(freq=520,type='sine',duration=.12){
  if(!save.settings.sound)return;
  try{
    audioContext ||= new (window.AudioContext||window.webkitAudioContext)();
    const osc=audioContext.createOscillator(),gain=audioContext.createGain(),time=audioContext.currentTime;
    osc.type=type;osc.frequency.setValueAtTime(freq,time);osc.frequency.exponentialRampToValueAtTime(Math.max(90,freq*.65),time+duration);
    gain.gain.setValueAtTime(.085,time);gain.gain.exponentialRampToValueAtTime(.001,time+duration);
    osc.connect(gain).connect(audioContext.destination);osc.start(time);osc.stop(time+duration);
  }catch{}
}
function resize(){
  const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
  const dpr=Math.min(window.devicePixelRatio||1,2),scale=rect.height/H;
  canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);
  ctx.setTransform(dpr*scale,0,0,dpr*scale,0,0);
  viewWidth=rect.width/scale;
  draw();
}
function makeState(levelId,practice=false){
  const level=LEVELS[levelId-1],course=buildCourse(level,practice);
  return {level,course,practice,mode:'ready',x:80,y:315,vy:0,angle:0,spin:0,grounded:true,airFlips:1,
    score:0,combo:0,bestCombo:0,sliced:0,camera:0,frames:0,lastSlice:-1000,particles:[],pulse:0,gateChoice:null,gateAward:0};
}
function chooseLevel(levelId){
  selectedLevel=levelId;selectedWorld=LEVELS[levelId-1].world;
  state=makeState(levelId);
  const level=state.level,world=WORLDS[level.world];
  $('stage-icon').textContent=world.icon;
  $('stage-kicker').textContent=`${world.full.toUpperCase()} · TRAIL ${String(level.number).padStart(2,'0')}`;
  $('stage-name').textContent=level.name;
  $('pip-tip-text').textContent=world.tip;
  $('mission-title').textContent=`Collect ${level.goal} treasures`;
  $('mission-text').textContent=level.world===2?'Gather sparkles and star gems on your journey.':'Catch the glowing treasures along the sky trail.';
  $('mission-count').textContent=`0 of ${level.goal} treasures`;
  $('mission-progress').style.width='0%';
  $('progress-fill').style.width='0%';
  $('score').textContent='0';$('combo').textContent='0';
  $('gate-panel').hidden=true;
  showOverlay('✦',levelId===1?'Ready, sky explorer?':level.name,
    levelId===1?'Tap to flip your magic leaf. Collect fruit, dodge storm clouds and reach the rainbow gate!':`Trail ${level.number} in ${world.full}. Gather ${level.goal} treasures, then choose a maths reward path.`,"Let's fly!");
  renderMap();draw();
}
function showOverlay(icon,title,description,action,helper='Tap the game · Click · Spacebar'){
  $('overlay-icon').textContent=icon;$('overlay-title').textContent=title;$('overlay-description').textContent=description;
  $('overlay-action').textContent=action;$('overlay-helper').textContent=helper;$('game-overlay').hidden=false;
}
function startLevel(practice=state?.practice||false){
  academy?.recordAttempt();
  const current=state?.level.id||selectedLevel;
  state=makeState(current,practice);state.mode='running';
  $('game-overlay').hidden=true;$('gate-panel').hidden=true;
  $('score').textContent='0';$('combo').textContent='0';
  $('progress-fill').style.width='0%';$('mission-progress').style.width='0%';
  $('mission-count').textContent=`0 of ${state.level.goal} treasures`;
  $('mission-title').textContent=practice?'Practice your flips':`Collect ${state.level.goal} treasures`;
  $('mission-text').textContent=practice?'No storm clouds in this practice run. Just enjoy the flight!':'Catch the glowing treasures along the sky trail.';
  $('pause-button').textContent='Ⅱ';$('pause-button').setAttribute('aria-label','Pause game');
  announce(practice?'Practice flight started':'Sky trail started');
}
function flip(){
  if(!state)return;
  if(state.mode==='ready'){startLevel();return;}
  if(state.mode!=='running')return;
  if(state.grounded){state.vy=-10.6;state.grounded=false;state.airFlips=1;}
  else if(state.airFlips>0){state.vy=Math.min(state.vy,-7.6);state.airFlips--;}
  else return;
  state.spin=.27;state.pulse=1;sound(490,'triangle',.13);
  spawnParticles(state.x-7,state.y+12,'#ffda79',5,2);
}
function pauseToggle(){
  if(!state)return;
  if(state.mode==='running'){
    state.mode='paused';showOverlay('Ⅱ','A little sky break','Take your time. Pip will wait right here for you!','Keep flying','Your adventure is safe right here');
    $('pause-button').textContent='▶';$('pause-button').setAttribute('aria-label','Resume game');
  }else if(state.mode==='paused'){
    state.mode='running';$('game-overlay').hidden=true;
    $('pause-button').textContent='Ⅱ';$('pause-button').setAttribute('aria-label','Pause game');
  }
}
function update(){
  if(!state||state.mode!=='running')return;
  const s=state;s.frames++;
  s.x+=s.level.speed+(s.practice?-.35:0);
  s.vy+=.36;s.y+=s.vy;
  if(s.y>=GROUND-25){s.y=GROUND-25;s.vy=0;s.grounded=true;s.airFlips=1;s.spin*=.76;}
  if(s.y<36){s.y=36;s.vy=Math.max(s.vy,0);}
  if(!s.grounded)s.spin=Math.max(s.spin,.14);
  s.angle+=s.spin;s.pulse*=.92;
  s.camera=Math.max(0,s.x-viewWidth*.26);
  for(const item of s.course.objects){
    if(item.collected)continue;
    if(Math.abs(item.x-s.x)<27&&Math.abs(item.y-s.y)<32){
      item.collected=true;item.cutFrame=s.frames;s.sliced++;
      s.combo=s.frames-s.lastSlice<90?s.combo+1:1;
      s.lastSlice=s.frames;s.bestCombo=Math.max(s.combo,s.bestCombo);
      s.score+=10+Math.min(s.combo-1,9)*3;
      spawnParticles(item.x,item.y,WORLDS[s.level.world].accent,12,3.4);
      sound(600+Math.min(s.combo,8)*70,'sine',.09);
      $('score').textContent=s.score;$('combo').textContent=s.combo;
      $('mission-count').textContent=`${Math.min(s.sliced,s.level.goal)} of ${s.level.goal} treasures`;
      $('mission-progress').style.width=`${Math.min(100,s.sliced/s.level.goal*100)}%`;
      if(s.sliced===s.level.goal)tip('Mission complete! Keep flying ✦');
    }
  }
  if(s.frames-s.lastSlice>110&&s.combo){s.combo=0;$('combo').textContent='0';}
  for(const storm of s.course.hazards){
    if(Math.abs(storm.x-s.x)<storm.size+14&&s.y>GROUND-storm.size-37){crash();return;}
  }
  for(const particle of s.particles){particle.x+=particle.vx;particle.y+=particle.vy;particle.vy+=.12;particle.life--;}
  s.particles=s.particles.filter(p=>p.life>0);
  $('progress-fill').style.width=`${clamp(s.x/s.course.length*100,0,100)}%`;
  if(s.x>=s.course.length){if(s.practice){practiceFinished();}else{openGate();}}
}
function spawnParticles(x,y,color,count=8,speed=2){
  if(!state)return;
  for(let i=0;i<count;i++){
    const a=i/count*TAU+Math.random()*.4,force=(.4+Math.random())*speed;
    state.particles.push({x,y,vx:Math.cos(a)*force,vy:Math.sin(a)*force-1,life:20+Math.random()*14,color});
  }
}
function crash(){
  state.mode='crashed';sound(180,'sawtooth',.3);
  spawnParticles(state.x,state.y,'#e7a1be',16,4);
  showOverlay('♡','Oopsie-daisy!','That storm cloud was a bit bumpy. No points lost and you can try as many times as you like!','Try again','Pip says: every try helps you learn');
  announce('You met a storm cloud. You can try again without penalty.');
}
function practiceFinished(){
  state.mode='practice-complete';sound(740,'sine',.22);
  showOverlay('🌈','You found your wings!','Lovely flying! Ready to take on a sky trail with colourful treasures and a little maths magic?','Play the trail','Practice runs do not change your adventure score');
}
function openGate(){
  state.mode='gate';$('progress-fill').style.width='100%';$('game-overlay').hidden=true;
  $('gate-panel').hidden=false;$('gate-feedback').textContent='';$('gate-continue').hidden=true;
  $('gate-hint').hidden=false;
  $('gate-question').textContent=`You collected ${state.score} stars in the sky. Which reward path will you choose?`;
  const choices=$('gate-choices');choices.replaceChildren();
  for(const [index,option] of gateOptions(state.score,state.level.id).entries()){
    const button=document.createElement('button');button.type='button';button.className='gate-choice';button.innerHTML=`<strong>${option.label}</strong><small>${option.description}</small>`;
    button.addEventListener('click',()=>chooseGate(index));choices.appendChild(button);
  }
  announce('You reached the rainbow maths gate! Choose a reward path.');sound(790,'sine',.2);
}
function chooseGate(index){
  if(!state||state.gateChoice!==null)return;
  state.gateChoice=index;
  const options=gateOptions(state.score,state.level.id),chosen=options[index],best=Math.max(...options.map(o=>o.result));
  state.gateAward=chosen.result;
  [...$('gate-choices').children].forEach((el,i)=>{el.disabled=true;el.classList.toggle('selected',i===index);});
  const name=chosen.label.startsWith('×')?'doubling':`adding ${Number(chosen.label.slice(1))}`;
  $('gate-feedback').textContent=`Wonderful! ${name} makes ${chosen.result} stars.${chosen.result===best?' You found the brightest path!':' Another path might grow even more.'}`;
  $('gate-hint').hidden=true;$('gate-continue').hidden=false;
  const result=finishLevel(player(),state.level.id,chosen.result,state.bestCombo);
  player().runs=(player().runs||0)+1;
  persist();renderStats();renderMap();
  announce(`${state.level.name} complete! You earned ${chosen.result} Hero stars.`);
  sound(900,'triangle',.27);
  if(result.newlyCompleted)tip('New trail badge earned! ✦');
}
function nextLevel(){
  chooseLevel(selectedLevel===15?1:selectedLevel+1);
}
function tip(message){
  const el=$('floating-tip');el.textContent=message;el.hidden=false;
  clearTimeout(tipTimeout);tipTimeout=setTimeout(()=>{el.hidden=true;},2300);
}

function draw(){
  if(!ctx||!canvas.width)return;
  const s=state||makeState(1),world=WORLDS[s.level.world],camera=s.camera;
  // Draw the original depth-projected WhirlQuest world. The underlying game
  // coordinates and input model remain unchanged for touch accessibility.
  try{renderSkybound3D(ctx,s,tick,viewWidth,H);return;}
  catch(error){console.warn('Depth renderer unavailable; reverting to the simple scene.',error);}
  ctx.save();ctx.clearRect(0,0,viewWidth,H);
  const sky=ctx.createLinearGradient(0,0,0,H);
  if(s.level.world===2){sky.addColorStop(0,'#7776b7');sky.addColorStop(1,'#d9c3dd');}
  else{sky.addColorStop(0,s.level.world===1?'#9fdbed':'#a7d9d1');sky.addColorStop(1,'#f4ebc7');}
  ctx.fillStyle=sky;ctx.fillRect(0,0,viewWidth,H);
  drawSky(world,s,camera);
  drawHills(world,camera);
  drawGround(world,camera);
  for(const item of s.course.objects){if(item.collected)continue;const x=item.x-camera;if(x< -40||x>viewWidth+40)continue;drawTreasure(x,item.y,item.kind,s.level.world,tick);}
  for(const storm of s.course.hazards){const x=storm.x-camera;if(x>-70&&x<viewWidth+70)drawStorm(x,storm.y,storm.size,tick);}
  drawPortal(s.course.length-camera,s.level.world,tick);
  for(const particle of s.particles){ctx.globalAlpha=clamp(particle.life/30,0,1);ctx.fillStyle=particle.color;ctx.beginPath();ctx.arc(particle.x-camera,particle.y,2.5,0,TAU);ctx.fill();}ctx.globalAlpha=1;
  drawPlayer(s.x-camera,s.y,s.angle,s.pulse,s.grounded);
  ctx.restore();
}
function drawSky(world,s,camera){
  const moon=s.level.world===2;
  const sunX=viewWidth*.82-(camera*.018)%60;
  ctx.fillStyle=moon?'#f9e0ab':'#fff7ca';ctx.beginPath();ctx.arc(sunX,84,36,0,TAU);ctx.fill();
  ctx.globalAlpha=.34;ctx.beginPath();ctx.arc(sunX,84,53,0,TAU);ctx.fill();ctx.globalAlpha=1;
  for(let i=0;i<10;i++){
    const x=((i*235-camera*.13)%(viewWidth+290)+(viewWidth+290))%(viewWidth+290)-120;
    const y=54+(i*73)%115;
    ctx.fillStyle=moon?'#eee7fa85':'#fffdf1be';
    ctx.beginPath();ctx.ellipse(x,y,55,16,0,0,TAU);ctx.ellipse(x-24,y+5,31,12,0,0,TAU);ctx.ellipse(x+22,y-8,26,16,0,0,TAU);ctx.fill();
  }
  if(moon){for(let i=0;i<38;i++){const x=((i*137+47-camera*.04)%(viewWidth+20)+viewWidth+20)%(viewWidth+20);const y=20+(i*53)%225;ctx.fillStyle='#fff8e8bd';ctx.fillRect(x,y,i%3===0?3:2,i%3===0?3:2);}}
}
function drawHills(world,camera){
  for(let layer=0;layer<2;layer++){
    const base=layer===0?296:327,amp=layer===0?36:21,parallax=layer===0?.17:.35;
    ctx.beginPath();ctx.moveTo(0,H);
    for(let x=-15;x<=viewWidth+20;x+=15){const z=x+camera*parallax;ctx.lineTo(x,base-Math.sin(z/100+layer)*amp-Math.sin(z/47+layer)*8);}
    ctx.lineTo(viewWidth,H);ctx.closePath();ctx.fillStyle=layer===0?(world.id==='starlight'?'#9694bc':'#a4c9ad'):(world.id==='starlight'?'#7d86ac':'#7ab096');ctx.fill();
  }
}
function drawGround(world,camera){
  ctx.fillStyle=world.ground;ctx.fillRect(0,GROUND+12,viewWidth,H-GROUND);
  ctx.fillStyle=world.id==='starlight'?'#cac1df':'#c5db9a';ctx.fillRect(0,GROUND+7,viewWidth,9);
  ctx.fillStyle='#fff7d3';ctx.globalAlpha=.24;
  for(let x=-(camera%43);x<viewWidth;x+=43){ctx.beginPath();ctx.arc(x,382,4,0,TAU);ctx.arc(x+22,415,3,0,TAU);ctx.fill();}ctx.globalAlpha=1;
  for(let wx=Math.floor(camera/145)*145;wx<camera+viewWidth+100;wx+=145){const x=wx-camera;if(wx<100)continue;
    ctx.strokeStyle=world.id==='starlight'?'#cad3b4':'#3e8868';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,GROUND+5);ctx.lineTo(x,GROUND-10);ctx.stroke();
    ctx.fillStyle=world.accent;for(let a=0;a<5;a++){const theta=a*TAU/5;ctx.beginPath();ctx.ellipse(x+Math.cos(theta)*7,GROUND-15+Math.sin(theta)*7,5,6,theta,0,TAU);ctx.fill();}
    ctx.fillStyle='#fff7e7';ctx.beginPath();ctx.arc(x,GROUND-15,3.5,0,TAU);ctx.fill();
  }
}
function drawTreasure(x,y,kind,world,t){
  y+=Math.sin(t*.045+x*.02)*3;
  ctx.save();ctx.translate(x,y);
  ctx.globalAlpha=.25;ctx.fillStyle='#fff9cf';ctx.beginPath();ctx.arc(0,0,27,0,TAU);ctx.fill();ctx.globalAlpha=1;
  if(world===2){
    ctx.rotate(t*.012);ctx.fillStyle=['#ffd56d','#c7f8ef','#f3b8e1','#d6d2ff','#ffea9c'][kind];starPath(0,0,19,9,5);ctx.fill();ctx.strokeStyle='#fffef0';ctx.lineWidth=2;ctx.stroke();
  }else{
    const colours=world===0?['#ef7468','#a5c879','#ffa34a','#f16c87','#d5a0b0']:['#778bcf','#eaca5d','#fba978','#ad92c8','#ebbb69'];
    ctx.fillStyle=colours[kind];ctx.beginPath();ctx.arc(-8,3,11,0,TAU);ctx.arc(8,3,11,0,TAU);ctx.fill();
    ctx.fillStyle='#ffffff78';ctx.beginPath();ctx.ellipse(-9,-2,4,6,-.5,0,TAU);ctx.fill();
    ctx.strokeStyle='#6e7050';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(2,-17);ctx.stroke();
    ctx.fillStyle='#80ab68';ctx.beginPath();ctx.ellipse(8,-15,9,4,-.5,0,TAU);ctx.fill();
  }
  ctx.restore();
}
function starPath(x,y,outer,inner,points=5){ctx.beginPath();for(let i=0;i<points*2;i++){const a=i*Math.PI/points-Math.PI/2,r=i%2?inner:outer;const xx=x+Math.cos(a)*r,yy=y+Math.sin(a)*r;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.closePath();}
function drawStorm(x,y,r,t){
  ctx.save();ctx.translate(x,y);ctx.fillStyle='#5b5b84';ctx.strokeStyle='#41456f';ctx.lineWidth=3;
  for(const [dx,dy,rr] of [[-11,-7,r*.55],[5,-12,r*.72],[18,-3,r*.53],[-4,8,r*.68]]){ctx.beginPath();ctx.arc(dx,dy,rr,0,TAU);ctx.fill();ctx.stroke();}
  ctx.fillStyle='#efc4d8';ctx.beginPath();ctx.moveTo(-3,-3);ctx.lineTo(7,-3);ctx.lineTo(0,11);ctx.lineTo(12,8);ctx.lineTo(-7,27);ctx.lineTo(-2,8);ctx.lineTo(-12,8);ctx.closePath();ctx.fill();
  ctx.fillStyle='#ffdce3';ctx.globalAlpha=.5+.25*Math.sin(t*.12);ctx.beginPath();ctx.arc(20,-26,3,0,TAU);ctx.fill();ctx.restore();
}
function drawPortal(x,world,t){
  if(x< -110||x>viewWidth+120)return;
  ctx.save();ctx.translate(x,GROUND+12);
  ctx.lineWidth=12;ctx.strokeStyle='#ffdf88';ctx.beginPath();ctx.arc(0,0,77,Math.PI,TAU);ctx.stroke();
  ctx.lineWidth=9;ctx.strokeStyle='#f9a9a4';ctx.beginPath();ctx.arc(0,0,64,Math.PI,TAU);ctx.stroke();
  ctx.lineWidth=8;ctx.strokeStyle='#9bd5d2';ctx.beginPath();ctx.arc(0,0,51,Math.PI,TAU);ctx.stroke();
  ctx.fillStyle='#fff6d8';starPath(0,-85+Math.sin(t*.05)*5,14,6);ctx.fill();ctx.restore();
}
function drawPlayer(x,y,angle,pulse,grounded){
  ctx.save();ctx.translate(x,y);
  ctx.globalAlpha=.2;ctx.fillStyle='#fff6ba';ctx.beginPath();ctx.arc(0,0,32+pulse*10,0,TAU);ctx.fill();ctx.globalAlpha=1;
  ctx.rotate(angle);
  ctx.fillStyle='#2d7975';ctx.strokeStyle='#fff8df';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(-4,-27);ctx.quadraticCurveTo(35,-20,25,6);ctx.quadraticCurveTo(8,24,-5,25);ctx.quadraticCurveTo(5,6,-4,-27);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#88c6a1';ctx.beginPath();ctx.moveTo(-4,-22);ctx.quadraticCurveTo(20,-16,16,4);ctx.lineTo(-2,17);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#f6de8f';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-4,-21);ctx.quadraticCurveTo(3,1,-4,24);ctx.stroke();
  ctx.fillStyle='#f5b95c';ctx.beginPath();ctx.arc(-3,0,7,0,TAU);ctx.fill();ctx.restore();
  // Pip floats alongside the player as a friendly companion.
  ctx.save();ctx.translate(x-43,y-37+(grounded?0:Math.sin(tick*.17)*4));
  ctx.fillStyle='#ffd36a';ctx.strokeStyle='#215457';ctx.lineWidth=2.5;
  ctx.beginPath();ctx.ellipse(0,0,13,15,-.2,0,TAU);ctx.fill();ctx.stroke();
  ctx.fillStyle='#aedcb7';ctx.beginPath();ctx.ellipse(-14,0,10,5,-.4,0,TAU);ctx.ellipse(14,-1,10,5,.4,0,TAU);ctx.fill();
  ctx.fillStyle='#264c4d';ctx.beginPath();ctx.arc(-4,-2,2.1,0,TAU);ctx.arc(5,-2,2.1,0,TAU);ctx.fill();
  ctx.strokeStyle='#a46b3e';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(1,3,3,.2,Math.PI-.2);ctx.stroke();ctx.restore();
}

function renderStats(){
  const p=player();$('completed-stat').innerHTML=`${Object.keys(p.completed).length} <em>/ 15</em>`;
  $('stars-stat').textContent=p.stars.toLocaleString('en-GB');$('combo-stat').textContent=p.bestCombo;
  $('profile-label').textContent=p.name;$('profile-avatar').textContent=p.name[0].toUpperCase();
}
function renderMap(){
  const tabs=$('world-tabs');tabs.replaceChildren();
  for(const [i,world] of WORLDS.entries()){
    const b=document.createElement('button');b.type='button';b.className=`world-tab${selectedWorld===i?' selected':''}`;
    b.setAttribute('role','tab');b.setAttribute('aria-selected',selectedWorld===i?'true':'false');b.textContent=`${world.icon} ${world.name}`;
    b.addEventListener('click',()=>{selectedWorld=i;renderMap();});tabs.appendChild(b);
  }
  const list=$('stage-list');list.replaceChildren();
  for(const level of LEVELS.filter(l=>l.world===selectedWorld)){
    const finished=player().completed[level.id];
    const button=document.createElement('button');button.type='button';
    button.className=`stage-choice${selectedLevel===level.id?' selected':''}${finished?' done':''}`;
    const number=document.createElement('span');number.className='stage-num';number.textContent=finished?'✓':String(level.number).padStart(2,'0');
    const copy=document.createElement('span');copy.className='stage-copy';
    const strong=document.createElement('strong');strong.textContent=level.name;
    const small=document.createElement('small');small.textContent=finished?`Best: ${finished} stars`:`Collect ${level.goal} treasures`;
    copy.append(strong,small);
    const mark=document.createElement('span');mark.className='stage-check';mark.textContent=selectedLevel===level.id?'➜':finished?'★':'';
    button.append(number,copy,mark);button.addEventListener('click',()=>chooseLevel(level.id));list.appendChild(button);
  }
}
function renderProfiles(){
  const list=$('profiles-list');list.replaceChildren();
  for(const p of save.players){
    const row=document.createElement('div');row.className=`profile-row${p.id===save.selected?' selected':''}`;
    const name=document.createElement('strong');name.textContent=`✦ ${p.name}`;
    const button=document.createElement('button');button.type='button';button.textContent=p.id===save.selected?'Playing ✓':'Play as';button.disabled=p.id===save.selected;
    button.addEventListener('click',()=>{save.selected=p.id;persist();renderStats();chooseLevel(1);renderProfiles();$('profiles-dialog').close();});
    row.append(name,button);list.appendChild(row);
  }
}
function exportSave(){
  const blob=new Blob([JSON.stringify(save,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='hero-academy-whirlquest-backup.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function importSave(file){
  if(!file||file.size>256000){announce('That backup is too large.');return;}
  try{
    const imported=sanitizeSave(JSON.parse(await file.text()));
    if(!imported){announce('This is not a recognised Sky Slicer backup.');alert('This backup could not be read. Your existing explorers are safe.');return;}
    if(!confirm('Replace the explorer profiles on this device with the backup?'))return;
    save=imported;persist();renderStats();chooseLevel(1);renderProfiles();announce('Backup restored.');
  }catch{alert('That file is not a valid JSON backup. Your progress has not changed.');}
}

function bind(){
  canvas.addEventListener('pointerdown',e=>{e.preventDefault();flip();});
  $('jump-button').addEventListener('click',flip);
  $('overlay-action').addEventListener('click',()=>{
    if(state.mode==='paused')pauseToggle();
    else if(state.mode==='practice-complete'){chooseLevel(selectedLevel);startLevel(false);}
    else startLevel(state.practice);
  });
  $('gate-continue').addEventListener('click',nextLevel);
  $('gate-hint').addEventListener('click',()=>{
    const options=gateOptions(state.score,state.level.id);
    $('gate-feedback').textContent=`Adding gives you a little more. Doubling means ${state.score} + ${state.score}. Which will be bigger?`;
  });
  $('pause-button').addEventListener('click',pauseToggle);
  $('practice-button').addEventListener('click',()=>{chooseLevel(1);startLevel(true);$('canvas-wrap').scrollIntoView({behavior:'smooth',block:'center'});});
  $('sound-button').addEventListener('click',()=>{
    save.settings.sound=!save.settings.sound;persist();syncSound();if(save.settings.sound)sound(750);
  });
  window.addEventListener('keydown',e=>{
    if(e.code==='Space'&&!e.repeat&&!$('profiles-dialog').open){e.preventDefault();if(state?.mode==='running'||state?.mode==='ready')flip();}
    if(e.code==='KeyP'&&!e.repeat&&!$('profiles-dialog').open)pauseToggle();
  });
  $('profile-button').addEventListener('click',()=>{if(state?.mode==='running')pauseToggle();renderProfiles();$('profiles-dialog').showModal();});
  $('close-profiles').addEventListener('click',()=>$('profiles-dialog').close());
  $('new-profile-form').addEventListener('submit',e=>{
    e.preventDefault();const input=$('new-profile-name'),name=input.value.trim();
    if(!name||save.players.length>=12){announce('You can create up to 12 explorers.');return;}
    const p=defaultPlayer(name);save.players.push(p);save.selected=p.id;persist();input.value='';renderStats();chooseLevel(1);renderProfiles();$('profiles-dialog').close();
  });
  $('export-save').addEventListener('click',exportSave);
  $('import-save').addEventListener('change',e=>{importSave(e.target.files?.[0]);e.target.value='';});
  const observer=new ResizeObserver(resize);observer.observe(canvas);
  window.addEventListener('resize',resize);
}
function syncSound(){
  $('sound-button').classList.toggle('active',save.settings.sound);
  $('sound-button').setAttribute('aria-pressed',String(save.settings.sound));
  $('sound-button').setAttribute('aria-label',save.settings.sound?'Turn sound off':'Turn sound on');
}
function loop(now){
  const delta=lastTime?Math.min(now-lastTime,60):16;lastTime=now;
  accumulator+=delta;
  while(accumulator>=1000/60){tick++;update();accumulator-=1000/60;}
  draw();requestAnimationFrame(loop);
}

bind();syncSound();renderStats();chooseLevel(1);persist();requestAnimationFrame(loop);

// The preview retains its owner-only audience. Public grants remain disabled.
try {academy=await bootAcademy({game:'skyslicer',identity:()=>player().id,
 select(id){if(!save.players.some(p=>p.id===id))return false;save.selected=id;persist(false);renderStats();chooseLevel(1);return true;},
 create(hero){if(save.players.length>=12)throw Error('All twelve explorer spaces are in use.');const p=defaultPlayer(hero.name||'Explorer');save.players.push(p);save.selected=p.id;persist(false);renderStats();chooseLevel(1);return p.id;},
 snapshot:()=>({version:1,...structuredClone(player())}),
 restore(remote){const next=sanitizeSave({version:1,selected:player().id,players:[{...remote,id:player().id}],settings:save.settings});if(!next)throw Error('Invalid Sky Slicer journey');save.players[save.players.findIndex(p=>p.id===player().id)]=next.players[0];persist(false);renderStats();chooseLevel(1);},
 milestones:()=>Object.keys(player().completed).map(k=>Number(k)-1),
 });}catch{announce('Local play is ready. Family connection is not yet released for this preview.');}
