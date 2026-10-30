import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, URL, process: { env: {} }, require: name => {
    throw Error(`Unexpected dependency ${name}`);
  } });
  return exports;
}

const { getAndroidDownloadUrl, isApkUrl } = load('src/lib/app-download.ts');
const url = value => getAndroidDownloadUrl({ ANDROID_APP_DOWNLOAD_URL: value });

test('missing or empty download URL hides the link', () => {
  assert.equal(getAndroidDownloadUrl({}), null);
  assert.equal(getAndroidDownloadUrl(), null);
  assert.equal(url(''), null);
  assert.equal(url('   '), null);
});

test('non-HTTPS or malformed download URLs are rejected', () => {
  assert.equal(url('http://example.com/app.apk'), null);
  assert.equal(url('javascript:alert(1)'), null);
  assert.equal(url('data:text/html,hi'), null);
  assert.equal(url('not a url'), null);
  assert.equal(url('/relative/app.apk'), null);
});

test('HTTPS APK and store URLs are returned unchanged', () => {
  const apk = 'https://expo.dev/artifacts/eas/abc123.apk';
  const store = 'https://play.google.com/store/apps/details?id=com.askr.workouttracker';
  assert.equal(url(apk), apk);
  assert.equal(url(store), store);
});

test('only APK URLs are treated as direct downloads', () => {
  assert.equal(isApkUrl('https://expo.dev/artifacts/eas/abc123.apk'), true);
  assert.equal(isApkUrl('https://example.com/App.APK?v=2'), true);
  assert.equal(isApkUrl('https://play.google.com/store/apps/details?id=com.askr.workouttracker'), false);
});
