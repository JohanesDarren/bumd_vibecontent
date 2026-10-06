import test from 'node:test';
import assert from 'node:assert/strict';
import * as visual from './visualScene.ts';

test('validated scene preserves exact copy, full prompt and requested dimensions', () => {
  assert.equal(typeof visual.validateScene, 'function', 'scene validation must exist');
  const input = {workspaceId:'org-test', prompt:'boats '.repeat(400), aspectRatio:'9:16', headline:'Air & <Bersih>', subheadline:'', badgeText:'', ctaText:'', disclaimer:''};
  const request = visual.validateVisualInput(input);
  assert.equal(request.prompt, input.prompt);
  const scene = visual.validateScene({background:'#123456',concept:'Sailboat',shapes:[{path:'M 10 10 L 80 50 L 10 90 Z',fill:'#ffffff',motion:'float'}]}, request);
  assert.equal(scene.width,576); assert.equal(scene.height,1024);
  const svg = visual.renderSceneSvg(scene);
  assert.match(svg,/Air &amp; &lt;Bersih&gt;/);
  assert.match(svg,/M 10 10 L 80 50 L 10 90 Z/);
});

test('invalid optional brand colors do not block image generation input', () => {
  const request = visual.validateVisualInput({
    workspaceId: 'org-test',
    prompt: 'Corporate water service campaign',
    aspectRatio: '1:1',
    primaryColor: '',
    accentColor: 'rgb(14, 165, 233)'
  });
  assert.equal(request.primaryColor, undefined);
  assert.equal(request.accentColor, undefined);
});

test('three-digit hex brand colors are normalized', () => {
  const request = visual.validateVisualInput({
    workspaceId: 'org-test',
    prompt: 'Corporate water service campaign',
    aspectRatio: '1:1',
    primaryColor: '#abc'
  });
  assert.equal(request.primaryColor, '#aabbcc');
});
