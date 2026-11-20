import test from 'node:test';
import assert from 'node:assert/strict';
import { APPROVED_SCREENS, SCREEN_REGISTRY, validateScreenRegistry } from '../types/screens.ts';

test('Screen Registry must enforce strictly 18 approved screens (16 core + Pilot Demo Diagnostic + Screen Reader Settings)', () => {
  const result = validateScreenRegistry();
  assert.equal(result.isValid, true, result.error);
  assert.equal(result.totalScreens, 18, 'Must contain exactly 18 screens');
  assert.equal(APPROVED_SCREENS.length, 18, 'APPROVED_SCREENS must have exactly 18 items');
  assert.equal(Object.keys(SCREEN_REGISTRY).length, 18, 'SCREEN_REGISTRY must have exactly 18 items');
});

test('All 18 approved screens have complete and valid metadata', () => {
  APPROVED_SCREENS.forEach((id, index) => {
    const meta = SCREEN_REGISTRY[id];
    assert.ok(meta, `Metadata missing for screen: ${id}`);
    assert.equal(meta.id, id);
    assert.equal(meta.screenNumber, index + 1);
    assert.ok(meta.title.length > 0, `Title missing for ${id}`);
    assert.ok(meta.description.length > 0, `Description missing for ${id}`);
  });
});
