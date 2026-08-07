function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
  return h;
}
function photoFor(name) {
  return AVATAR_POOL[hashStr(name) % AVATAR_POOL.length];
}

// 🔒 SHA-256 hashing function (runs in browser)
// Hashes the password client-side before it ever leaves the browser, so the
// real plaintext password is never sent over the network. The backend then
// hashes this value AGAIN with bcrypt before storing it (see server.js).
