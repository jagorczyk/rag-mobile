/**
 * Structural verification of Kole Jain / HIG mobile UI standards in shipped code.
 * Drives real source files (not re-implemented expectations).
 *
 * Run: node scripts/verify-mobile-ui.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

// 1) Touch target constant is ≥44 and exported from theme (shipped module)
const themeUrl = pathToFileURL(path.join(root, 'src', 'theme.ts')).href;
// theme.ts is TypeScript; parse the constant from source rather than importing TS
const themeSrc = read('src/theme.ts');
const touchMatch = themeSrc.match(/export const TOUCH_TARGET_MIN\s*=\s*(\d+)/);
assert.ok(touchMatch, 'TOUCH_TARGET_MIN must be exported from src/theme.ts');
const TOUCH_TARGET_MIN = Number(touchMatch[1]);
assert.ok(TOUCH_TARGET_MIN >= 44, `TOUCH_TARGET_MIN must be ≥44, got ${TOUCH_TARGET_MIN}`);

// 2) ui.tsx styles reference TOUCH_TARGET_MIN for primary controls
const uiSrc = read('src/ui.tsx');
assert.ok(uiSrc.includes('export { TOUCH_TARGET_MIN }') || uiSrc.includes('TOUCH_TARGET_MIN'), 'ui re-exports/uses TOUCH_TARGET_MIN');
assert.match(uiSrc, /iconButton:[\s\S]*?height:\s*TOUCH_TARGET_MIN/, 'IconButton height uses TOUCH_TARGET_MIN');
assert.match(uiSrc, /iconButton:[\s\S]*?width:\s*TOUCH_TARGET_MIN/, 'IconButton width uses TOUCH_TARGET_MIN');
assert.match(uiSrc, /search:[\s\S]*?minHeight:\s*TOUCH_TARGET_MIN/, 'SearchField minHeight uses TOUCH_TARGET_MIN');
assert.match(uiSrc, /segment:[\s\S]*?minHeight:\s*TOUCH_TARGET_MIN/, 'SegmentedControl minHeight uses TOUCH_TARGET_MIN');
assert.match(uiSrc, /button:[\s\S]*?minHeight:\s*TOUCH_TARGET_MIN/, 'Button minHeight uses TOUCH_TARGET_MIN');
assert.ok(uiSrc.includes('useReducedMotion'), 'shared reduced-motion hook exists');
assert.ok(uiSrc.includes('AnimatedBottomSheet'), 'shared bottom sheet primitive exists');
assert.ok(uiSrc.includes('EmptyState'), 'EmptyState primitive exists');
assert.match(uiSrc, /EmptyState[\s\S]*action\?:/, 'EmptyState accepts action CTA');

// 3) Floating tab bar: ≤5 destinations, ≥44 tab items, home hidden
const tabsLayout = read('app/(tabs)/_layout.tsx');
assert.ok(tabsLayout.includes('position: \'absolute\'') || tabsLayout.includes('position: "absolute"'), 'tab bar is floating (absolute)');
assert.match(tabsLayout, /minHeight:\s*TOUCH_TARGET_MIN/, 'tab items meet touch floor');
const tabScreens = [...tabsLayout.matchAll(/Tabs\.Screen\s+name="([^"]+)"/g)].map((m) => m[1]);
const visibleTabs = tabScreens.filter((name) => {
  const block = tabsLayout.includes(`name="${name}"`) && tabsLayout.includes('href: null') && name === 'home';
  return name !== 'home' || !block;
}).filter((n) => n !== 'home');
// Explicit: home has href:null; visible are folders, people, chats
assert.ok(tabsLayout.includes('name="home"') && tabsLayout.includes('href: null'), 'home tab is hidden from bar');
assert.ok(visibleTabs.length <= 5, `visible tabs must be ≤5, got ${visibleTabs.length}`);
assert.ok(visibleTabs.length >= 3, 'expect at least 3 primary destinations');
assert.ok(tabsLayout.includes('useReducedMotion'), 'tab bar honors reduced motion');

// 4) Detail routes live outside (tabs) — contextual chrome, not primary tab bar
assert.ok(fs.existsSync(path.join(root, 'app/chat/[id].tsx')), 'chat detail route exists outside tabs');
assert.ok(fs.existsSync(path.join(root, 'app/folders/[id].tsx')), 'folder detail route exists outside tabs');
const chatDetail = read('app/chat/[id].tsx');
const folderDetail = read('app/folders/[id].tsx');
assert.ok(chatDetail.includes('router.back') || chatDetail.includes('onBack'), 'chat detail has back chrome');
assert.ok(folderDetail.includes('onBack') || folderDetail.includes('router.back'), 'folder detail has back chrome');
assert.ok(!chatDetail.includes('CompactTabBar'), 'chat detail does not embed main tab bar');
assert.ok(!folderDetail.includes('CompactTabBar'), 'folder detail does not embed main tab bar');

// 5) Empty states wire primary CTAs on main surfaces
const folders = read('app/(tabs)/folders.tsx');
const people = read('app/(tabs)/people.tsx');
const chats = read('app/(tabs)/chats.tsx');
assert.ok(folders.includes('EmptyState') && folders.includes('Dodaj folder'), 'folders empty has Dodaj folder CTA');
assert.ok(people.includes('EmptyState') && people.includes('Przejdź do biblioteki'), 'people empty has library CTA');
assert.ok(chats.includes('EmptyState') && chats.includes('Nowa rozmowa'), 'chats empty has Nowa rozmowa CTA');
assert.ok(folderDetail.includes('EmptyState') && folderDetail.includes('Dodaj plik'), 'folder empty has Dodaj plik CTA');

// 6) Secondary flows use AnimatedBottomSheet (not ad-hoc full-page-only rename)
assert.ok(folders.includes('AnimatedBottomSheet'), 'folders uses shared sheet');
assert.ok(chats.includes('AnimatedBottomSheet'), 'chats rename uses shared sheet');
assert.ok(folderDetail.includes('AnimatedBottomSheet'), 'folder detail uses shared sheet');
assert.ok(!folders.includes('animationType="fade"') || !folders.includes('Nowy folder'), 'new folder uses sheet primitive');
// chats should not use centered FadeModal rename card
assert.ok(!chats.includes('renameCard'), 'chats rename no longer uses ad-hoc centered card');

// 7) Anti-slop: no gradient text / glass decoration tokens in shared UI
assert.ok(!uiSrc.includes('backgroundClip') && !uiSrc.includes('background-clip'), 'no gradient text');
assert.ok(!uiSrc.includes('BlurView') && !uiSrc.includes('expo-blur'), 'no glassmorphism in shared UI');
assert.ok(!themeSrc.includes('#2155e5') && !themeSrc.includes('blue'), 'monochrome Quiet Archive palette');

// 8) Send / primary composer controls ≥44 in chat detail
assert.match(chatDetail, /sendButton:[\s\S]*?width:\s*TOUCH_TARGET_MIN/, 'send button width ≥44');
assert.match(chatDetail, /sendButton:[\s\S]*?height:\s*TOUCH_TARGET_MIN/, 'send button height ≥44');

console.log('verify-mobile-ui: all checks passed');
console.log(JSON.stringify({
  TOUCH_TARGET_MIN,
  visibleTabDestinations: visibleTabs,
  detailRoutesOutsideTabs: ['app/chat/[id].tsx', 'app/folders/[id].tsx'],
  emptyStateCtas: ['folders:Dodaj folder', 'people:Przejdź do biblioteki', 'chats:Nowa rozmowa', 'folderDetail:Dodaj plik'],
  sheetPrimitives: true,
}, null, 2));
