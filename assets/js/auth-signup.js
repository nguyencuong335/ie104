// Signup page logic (standalone)
(function () {
  const q = id => document.getElementById(id);
  const form = q("form-signup");
  const err  = q("su-error");

  const fields = [
    q("su-first"), q("su-last"),
    q("su-gender"), q("su-dob"),
    q("su-email"), q("su-phone"),
    q("su-pass"), q("su-repass")
  ];
  const terms = q("su-terms");

  const mark = (el, bad) => el.classList.toggle("invalid", !!bad);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let bad = false;

    fields.forEach(el => {
      const v = (el.value || "").toString().trim();
      if (!v) { mark(el, true); bad = true; } else mark(el, false);
    });
    if (!terms.checked) bad = true;

    // mật khẩu khớp?
    if (!bad && q("su-pass").value !== q("su-repass").value) {
      mark(q("su-pass"), true); mark(q("su-repass"), true);
      err.textContent = "Mật khẩu nhập lại không khớp";
      err.hidden = false; return;
    }

    err.textContent = "Please fill in all the required fields";
    err.hidden = !bad;
    if (bad) return;

    // Demo: đăng ký xong -> đăng nhập
    const email = q("su-email").value.trim();
    localStorage.setItem("auth_user", JSON.stringify({ username: email }));
    const next = new URLSearchParams(location.search).get("next");
    location.replace(next || "./index.html");
  });

  fields.forEach(el => el.addEventListener("blur", () => {
    if ((el.value || "").toString().trim()) el.classList.remove("invalid");
  }));

  // ===== Hiệu ứng cho nút OAuth (Google / Facebook) =====
  const oauthButtons = document.querySelectorAll('.oauth-btn');
  oauthButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('loading')) return;
      btn.classList.add('loading');
      btn.setAttribute('aria-busy', 'true');
      btn.setAttribute('disabled', 'true');
      setTimeout(() => {
        btn.classList.remove('loading');
        btn.removeAttribute('aria-busy');
        btn.removeAttribute('disabled');
      }, 1200);
    });
  });
})();
