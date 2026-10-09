import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWorkspaceAssignments, workspaceKnowledgeBaseId, isKnowledgeAssigned } from './knowledgeAccess.ts';

test('workspace RAG scopes differ so one company can separate knowledge by workspace', () => {
  assert.notEqual(workspaceKnowledgeBaseId('ws-a'), workspaceKnowledgeBaseId('ws-b'));
  assert.equal(workspaceKnowledgeBaseId('ws-a'), 'kb-vibecontent-ws-ws-a');
});

test('a workspace only uses enabled assigned knowledge', () => {
  const assignments = normalizeWorkspaceAssignments([
    { workspaceId: 'ws-a', enabled: false },
    { workspaceId: 'ws-b', enabled: true }
  ]);
  assert.equal(isKnowledgeAssigned(assignments, 'ws-a'), false);
  assert.equal(isKnowledgeAssigned(assignments, 'ws-b'), true);
  assert.equal(isKnowledgeAssigned(assignments, 'ws-c'), false);
});

test('workspace assignments deduplicate IDs and preserve enabled state', () => {
  assert.deepEqual(normalizeWorkspaceAssignments([
    { workspaceId: 'ws-a', enabled: true },
    { workspaceId: 'ws-a', enabled: false },
    { workspaceId: 'ws-b', enabled: false },
    { workspaceId: '', enabled: true }
  ]), [
    { workspaceId: 'ws-a', enabled: true },
    { workspaceId: 'ws-b', enabled: false }
  ]);
});

test('new knowledge defaults to its originating workspace when assignments are omitted', () => {
  assert.deepEqual(normalizeWorkspaceAssignments(undefined, 'ws-a'), [{ workspaceId: 'ws-a', enabled: true }]);
  assert.deepEqual(normalizeWorkspaceAssignments([], 'ws-a'), []);
});

test('invalid assignment shapes fail closed instead of broadening access', () => {
  assert.deepEqual(normalizeWorkspaceAssignments([{ workspaceId: 'ws-a', enabled: 'yes' }]), []);
});
