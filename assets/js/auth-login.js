// Login page logic (standalone)
(function () {
  const form  = document.getElementById("form-login");
  const err   = document.getElementById("login-error");
  const email = document.getElementById("login-email");
  const pass  = document.getElementById("login-pass");

  const mark = (el, bad) => el.classList.toggle("invalid", !!bad);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let bad = false;

    // validate rỗng -> viền đỏ
    if (!email.value.trim()) { mark(email, true); bad = true; } else mark(email, false);
    if (!pass.value.trim())  { mark(pass,  true); bad = true; } else mark(pass,  false);

    // hiện dòng thông báo chung TRÊN nút
    err.textContent = "Please fill in all the required fields";
    err.hidden = !bad;
    if (bad) return;

    // Demo auth: user / 12345678
    const u = email.value.trim(), p = pass.value;
    if (u === "user" && p === "12345678") {
      localStorage.setItem("auth_user", JSON.stringify({ username: u }));
      const next = new URLSearchParams(location.search).get("next");
      location.replace(next || "./index.html");
      return;
    }

    // sai thông tin
    err.textContent = "Sai email hoặc mật khẩu";
    err.hidden = false;
    [email, pass].forEach(i => i.classList.add("invalid"));
  });

  // blur -> bỏ viền đỏ nếu đã nhập
  [email, pass].forEach(i => i.addEventListener("blur", () => {
    if (i.value.trim()) i.classList.remove("invalid");
  }));
})();
