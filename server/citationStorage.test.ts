import test from 'node:test';
import assert from 'node:assert/strict';
import { citationSourceColumns } from './citationStorage.ts';

test('legacy knowledge citations keep the knowledge_sources foreign key',()=>{
  assert.deepEqual(citationSourceColumns('legacy-1',true,false),{sourceId:'legacy-1',kmsDocumentId:null});
});

test('KMS citations use the assigned kms_documents foreign key',()=>{
  assert.deepEqual(citationSourceColumns('kms-1',false,true),{sourceId:null,kmsDocumentId:'kms-1'});
});

test('citation saves reject unknown or unassigned sources',()=>{
  assert.throws(()=>citationSourceColumns('other-workspace-doc',false,false),/not available in this workspace/);
});

test('a matching assigned KMS source takes the KMS FK when IDs overlap',()=>{
  assert.deepEqual(citationSourceColumns('both-1',true,true),{sourceId:null,kmsDocumentId:'both-1'});
});
