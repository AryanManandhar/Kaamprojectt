function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
  return h;
}
function photoFor(name) {
  return AVATAR_POOL[hashStr(name) % AVATAR_POOL.length];
}
