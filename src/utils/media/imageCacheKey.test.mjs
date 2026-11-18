// The feed image cache key (imageCacheKey.ts).
//   node --test src/utils/media/imageCacheKey.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { imageCacheKey } from './imageCacheKey.ts';

const BUCKET = 'bhav-bhakti.firebasestorage.app';

// Exactly how the backend's Storage library writes the path into a V4 signed
// link (@google-cloud/storage util.encodeURI: each segment through
// encodeURIComponent, plus ! ' ( ) * encoded too).
const encodeSegment = (segment) =>
  encodeURIComponent(segment).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
const encodePath = (path) => path.split('/').map(encodeSegment).join('/');
const signedLink = (path, signature = 'abc123', bucket = BUCKET) =>
  `https://storage.googleapis.com/${bucket}/${encodePath(path)}` +
  `?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=x%2F20261118%2Fauto%2Fstorage%2Fgoog4_request` +
  `&X-Goog-Date=20261118T120000Z&X-Goog-Expires=259200&X-Goog-SignedHeaders=host&X-Goog-Signature=${signature}`;
// What a route param hands back when the link was decoded once (CLAUDE.md §68).
const decodedOnce = (link) => decodeURIComponent(link);

test('a plain path gives img: + the storage path', () => {
  assert.equal(imageCacheKey(signedLink('Thumbnails/aarti.jpg')), 'img:Thumbnails/aarti.jpg');
});

test('spaces are decoded back to the real path', () => {
  const path = 'Wallpapers/Static wallpapers/Ganesha/Ganesha 1.png';
  assert.ok(signedLink(path).includes('Static%20wallpapers'));
  assert.equal(imageCacheKey(signedLink(path)), `img:${path}`);
});

test('Hindi characters are decoded back to the real path', () => {
  const path = 'Audio/ringtones/Shiva/हर हर महादेव रिंगटोन calm.jpg';
  assert.ok(signedLink(path).includes('%E0'));
  assert.equal(imageCacheKey(signedLink(path)), `img:${path}`);
});

test("( ) ! ' * and + are decoded back to the real path", () => {
  const path = "Wallpapers/Krishna (Bal) - Jai! Shri's *best* +1.png";
  const link = signedLink(path);
  for (const encoded of ['%28', '%29', '%21', '%27', '%2A', '%2B']) assert.ok(link.includes(encoded), encoded);
  assert.equal(imageCacheKey(link), `img:${path}`);
});

test('a new signature for the same file gives the same key', () => {
  const path = 'Thumbnails/Video wallpapers/Shiva/Mahadev v2.jpg';
  assert.equal(imageCacheKey(signedLink(path, 'first')), imageCacheKey(signedLink(path, 'second-different')));
});

test('a replaced file (v2) gives a different key', () => {
  assert.notEqual(
    imageCacheKey(signedLink('Wallpapers/Video wallpapers/Shiva/Mahadev.jpg')),
    imageCacheKey(signedLink('Wallpapers/Video wallpapers/Shiva/Mahadev v2.jpg'))
  );
});

test('the once-decoded link from a route param gives the same key', () => {
  for (const path of [
    'Thumbnails/aarti.jpg',
    'Wallpapers/Static wallpapers/Ganesha/Ganesha 1.png',
    'Audio/ringtones/Shiva/हर हर महादेव रिंगटोन calm.jpg',
    "Wallpapers/Krishna (Bal) - Jai! Shri's *best* +1.png",
    'Stories/Karna Suryaputra/cover.jpg.jpg',
  ]) {
    const link = signedLink(path);
    assert.equal(imageCacheKey(decodedOnce(link)), imageCacheKey(link), path);
  }
});

test('a literal % in a file name gives the same key encoded or once-decoded', () => {
  const path = 'Wallpapers/100% bhakti.png';
  const link = signedLink(path);
  assert.equal(imageCacheKey(link), `img:${path}`);
  // Decoding the once-decoded path fails on the stray %, so the raw path is kept.
  assert.equal(imageCacheKey(decodedOnce(link)), `img:${path}`);
});

test('the bucket is not part of the key', () => {
  assert.equal(imageCacheKey(signedLink('a/b.jpg', 'x', 'other-bucket')), 'img:a/b.jpg');
});

test('the query string and fragment are ignored', () => {
  assert.equal(imageCacheKey(`https://storage.googleapis.com/${BUCKET}/a/b.jpg#frag`), 'img:a/b.jpg');
  assert.equal(imageCacheKey(`https://storage.googleapis.com/${BUCKET}/a/b.jpg?x=1#frag`), 'img:a/b.jpg');
  assert.equal(imageCacheKey(`https://storage.googleapis.com/${BUCKET}/a/b.jpg`), 'img:a/b.jpg');
});

test('a malformed % keeps the raw path (never throws)', () => {
  assert.equal(imageCacheKey(`https://storage.googleapis.com/${BUCKET}/a/%E0%A4.jpg?s=1`), 'img:a/%E0%A4.jpg');
  assert.equal(imageCacheKey(`https://storage.googleapis.com/${BUCKET}/a/%zz.jpg`), 'img:a/%zz.jpg');
});

test('anything that is not a signed Cloud Storage link gets no key', () => {
  for (const value of [
    // Old tokened Firebase download link.
    `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/Thumbnails%2Fa.jpg?alt=media&token=t`,
    `http://storage.googleapis.com/${BUCKET}/a.jpg`,
    `https://storage.googleapis.com.evil.example/${BUCKET}/a.jpg`,
    `https://example.com/${BUCKET}/a.jpg`,
    'https://via.placeholder.com/80x80',
    'file:///data/user/0/cache/a.jpg',
    'Thumbnails/a.jpg',
    // No bucket or no path.
    'https://storage.googleapis.com/',
    'https://storage.googleapis.com//a.jpg',
    `https://storage.googleapis.com/${BUCKET}`,
    `https://storage.googleapis.com/${BUCKET}/`,
    `https://storage.googleapis.com/${BUCKET}/?X-Goog-Signature=x`,
    '',
    undefined,
    null,
    42,
    {},
    `https://storage.googleapis.com/${BUCKET}/${'a'.repeat(5000)}.jpg`,
  ]) {
    assert.equal(imageCacheKey(value), null, String(value).slice(0, 80));
  }
});
