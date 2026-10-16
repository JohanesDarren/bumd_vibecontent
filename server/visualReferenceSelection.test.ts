import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseVisualReference } from './visualReferenceSelection.ts';
const refs=[{id:'a',title:'Danau biru alami'},{id:'b',title:'Acara kota malam'}];
test('auto selects matching assigned media and skips unrelated uploads',()=>{
  assert.equal(chooseVisualReference('Danau dan air biru',refs)?.id,'a');
  assert.equal(chooseVisualReference('Lukisan galaksi',refs),undefined);
});
test('explicit selection must belong to authorized workspace',()=>{
  assert.equal(chooseVisualReference('galaksi',refs,'b')?.id,'b');
  assert.throws(()=>chooseVisualReference('galaksi',refs,'foreign'),/not authorized/i);
});
