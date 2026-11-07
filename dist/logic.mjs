export const WORLDS = [
  {id:'meadow',name:'Meadow',full:'Mellow Meadows',icon:'🌿',colour:'#a2dbbc',ground:'#639a69',accent:'#ffce68',fruit:['🍎','🍐','🍊','🍓','🍒'],tip:'Take your time. One well-timed flip can carry you a long way!'},
  {id:'cloud',name:'Clouds',full:'Cloudberry Coast',icon:'☁️',colour:'#b2e3ed',ground:'#76adb0',accent:'#f7a8a5',fruit:['🫐','🍋','🍑','🍇','🍍'],tip:'Use your second flip to change course in mid-air.'},
  {id:'starlight',name:'Stars',full:'Starfall Skies',icon:'🌟',colour:'#b9b4e3',ground:'#7973b5',accent:'#ffe393',fruit:['⭐','🌙','💎','🌈','✨'],tip:'The bigger reward is not always the biggest-looking number!'}
];
const names = [
  ['A Little Lift-Off','Apple Hop','The Gentle Glide','Sunny Side Up','Meadow Mastery'],
  ['Cloudberry Bounce','Rainbow Run','Sky Lanterns','Dancing Clouds','Over the Horizon'],
  ['Twinkle Trail','Moonbeam Magic','Comet Catcher','The Big Star Jump','Pip’s Grand Finale']
];
export const LEVELS = names.flatMap((group,world)=>group.map((name,i)=>({
  id:world*5+i+1, name,world,number:i+1,
  goal:4+i+(world===2?2:0),
  length:1850+(world*5+i)*135,
  speed:3.4+world*.2+i*.1
})));
export const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function seededRandom(seed){let value=seed>>>0;return ()=>{value=(Math.imul(1664525,value)+1013904223)>>>0;return value/4294967296;};}
export function buildCourse(level,practice=false){
  const rand=seededRandom(level.id*84593+11);
  const objects=[];const hazards=[];let counter=0;
  for(let x=310;x<level.length-210;x+=120+rand()*52){
    const high=rand()>.52;
    objects.push({id:counter++,x:Math.round(x),y:high?210+rand()*65:296+rand()*22,kind:Math.floor(rand()*5),collected:false});
  }
  if(!practice){
    for(let x=640;x<level.length-260;x+=650-level.world*85){
      hazards.push({x:Math.round(x+rand()*40),y:328,size:25+(level.world>0?4:0)});
    }
  }
  return {objects,hazards,length:level.length};
}
export function gateOptions(score, levelId){
  const base=Math.max(10,score);
  const n=levelId%5;
  return [
    {label:`+${20+n*5}`,description:'Add stars',result:base+20+n*5},
    {label:'×2',description:'Double stars',result:base*2},
    {label:`+${55+n*4}`,description:'Big bonus',result:base+55+n*4}
  ];
}
export const defaultPlayer=(name='Explorer')=>({id:makeId(),name:name.trim().slice(0,20)||'Explorer',stars:0,bestCombo:0,completed:{},runs:0,createdAt:new Date().toISOString()});
const makeId=()=>globalThis.crypto?.randomUUID?.()||`explorer-${Date.now()}-${Math.floor(Math.random()*999999)}`;
export function validPlayer(raw){
  if(!raw||typeof raw!=='object'||typeof raw.name!=='string'||!raw.name.trim())return false;
  if(raw.name.length>20||typeof raw.id!=='string'||raw.id.length>100)return false;
  if(!Number.isFinite(raw.stars)||raw.stars<0||raw.stars>1e9)return false;
  if(!Number.isFinite(raw.bestCombo)||raw.bestCombo<0||raw.bestCombo>1e6)return false;
  if(!raw.completed||typeof raw.completed!=='object'||Array.isArray(raw.completed))return false;
  return Object.entries(raw.completed).every(([key,value])=>/^(?:[1-9]|1[0-5])$/.test(key)&&Number.isFinite(value)&&value>=0&&value<=1e9);
}
export function initialSave(){const explorer=defaultPlayer();return {version:1,selected:explorer.id,players:[explorer],settings:{sound:false}};}
export function sanitizeSave(raw){
  if(!raw||raw.version!==1||!Array.isArray(raw.players)||raw.players.length<1||raw.players.length>12||!raw.players.every(validPlayer))return null;
  const ids=new Set(raw.players.map(p=>p.id));if(ids.size!==raw.players.length)return null;
  return {version:1,selected:ids.has(raw.selected)?raw.selected:raw.players[0].id,players:raw.players.map(p=>({...p,stars:Math.floor(p.stars),bestCombo:Math.floor(p.bestCombo),completed:Object.fromEntries(Object.entries(p.completed).map(([k,v])=>[k,Math.floor(v)])),runs:clamp(Number(p.runs)||0,0,1e7)})),settings:{sound:!!raw.settings?.sound}};
}
export function finishLevel(player,levelId,score,combo){
  const before=player.completed[levelId]||0;
  player.completed[levelId]=Math.max(before,Math.floor(score));
  player.stars+=Math.floor(score);
  player.bestCombo=Math.max(player.bestCombo,combo);
  return {personalBest:score>before,newlyCompleted:before===0};
}
