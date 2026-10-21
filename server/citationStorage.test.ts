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

test('RAG-internal document ids are stored unlinked instead of failing the save',()=>{
  // Regression: RAG returns ids like "d3_sistem_informasi_telkom_university_bjo85"
  // that do not exist in KMS. One such id aborted the whole draft transaction.
  assert.deepEqual(
    citationSourceColumns('d3_sistem_informasi_telkom_university_bjo85',false,false,{allowUnlinked:true}),
    {sourceId:null,kmsDocumentId:null}
  );
});

test('a real KMS id still links even when other citations are unknown',()=>{
  assert.deepEqual(citationSourceColumns('doc-1792450848267',false,true,{allowUnlinked:true}),{sourceId:null,kmsDocumentId:'doc-1792450848267'});
});
