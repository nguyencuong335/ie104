// assets/js/session.js

/** Lấy tham số "next" từ URL nếu có */
function getNextFromURL() {
  try {
    const url = new URL(location.href);
    return url.searchParams.get("next") || "/";
  } catch { return "/"; }
}

/** Bắt buộc đăng nhập: nếu chưa có auth_user thì chuyển sang auth.html */
function requireAuth() {
  try {
    const u = JSON.parse(localStorage.getItem("auth_user") || "null");
    if (!u) {
      const next = location.pathname + location.search + location.hash;
      location.replace("./auth.html?next=" + encodeURIComponent(next));
      return false;
    }
    return true;
  } catch {
    location.replace("./auth.html");
    return false;
  }
}

/** Đăng nhập demo (user/12345678) – bạn có thể thay bằng gọi API sau này */
function signInDemo(username, password) {
  // demo cứng
  if (username === "user" && password === "12345678") {
    const user = { username: "user", displayName: "Demo User", ts: Date.now() };
    localStorage.setItem("auth_user", JSON.stringify(user));
    return { ok: true, user };
  }
  return { ok: false, error: "Sai tài khoản hoặc mật khẩu" };
}

/** Đăng xuất + (tuỳ chọn) điều hướng về auth.html kèm next */
function signOut(redirect = true) {
  try { localStorage.removeItem("auth_user"); } catch {}
  if (redirect) {
    const next = location.pathname + location.search + location.hash;
    location.replace("./auth.html?next=" + encodeURIComponent(next));
  }
}

/** Đang đăng nhập hay chưa */
function isSignedIn() {
  try {
    return !!JSON.parse(localStorage.getItem("auth_user") || "null");
  } catch { return false; }
}
