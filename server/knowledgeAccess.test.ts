import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWorkspaceAssignments, workspaceKnowledgeBaseId, isKnowledgeAssigned } from './knowledgeAccess.ts';

test('the app uses one shared project knowledge base', () => {
  // Workspace isolation comes from KMS document assignment, not from inventing
  // a separate RAG knowledge base per workspace.
  assert.equal(workspaceKnowledgeBaseId('ws-a'), 'kb_vibecontent');
  assert.equal(workspaceKnowledgeBaseId('ws-b'), 'kb_vibecontent');
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
