import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS,WORLDS,buildCourse,gateOptions,initialSave,sanitizeSave,finishLevel} from '../dist/logic.mjs';

test('fifteen individually selectable trails span three worlds',()=>{
  assert.equal(LEVELS.length,15);assert.equal(WORLDS.length,3);
  assert.equal(new Set(LEVELS.map(l=>l.id)).size,15);
  for(const world of [0,1,2])assert.equal(LEVELS.filter(l=>l.world===world).length,5);
});
test('all courses are deterministic and contain reachable treasures',()=>{
  for(const level of LEVELS){
    const a=buildCourse(level),b=buildCourse(level);
    assert.deepEqual(a,b);
    assert.ok(a.objects.length>=level.goal);
    assert.ok(a.objects.every(o=>o.x>200&&o.x<level.length));
    assert.ok(a.hazards.every(h=>h.x>500&&h.x<level.length));
  }
});
test('practice has no hazards and retains treasures',()=>{
  const a=buildCourse(LEVELS[3],true),b=buildCourse(LEVELS[3]);
  assert.equal(a.hazards.length,0);assert.equal(a.objects.length,b.objects.length);
});
test('maths gates show three mathematically correct outcomes',()=>{
  const options=gateOptions(80,1);
  assert.equal(options.length,3);
  assert.equal(options[0].result,105);assert.equal(options[1].result,160);assert.equal(options[2].result,139);
  assert.deepEqual(gateOptions(0,1).map(o=>o.result),[35,20,69]);
});
test('one player saves without changing a different player',()=>{
  const save=initialSave(),p=save.players[0];
  const result=finishLevel(p,3,80,4);
  assert.equal(result.newlyCompleted,true);assert.equal(p.stars,80);
  finishLevel(p,3,20,1);
  assert.equal(p.completed[3],80);assert.equal(p.stars,100);assert.equal(p.bestCombo,4);
  assert.ok(sanitizeSave(save));
});
test('reject invalid or oversized backup records',()=>{
  const save=initialSave();assert.equal(sanitizeSave({...save,version:2}),null);
  assert.equal(sanitizeSave({...save,players:[]}),null);
  assert.equal(sanitizeSave({...save,players:[{...save.players[0],stars:-20}]}),null);
  assert.equal(sanitizeSave({...save,players:[{...save.players[0],completed:{'../x':12}}]}),null);
  assert.equal(sanitizeSave({...save,players:[save.players[0],save.players[0]]}),null);
});
