const q = s => document.querySelector(s);

const wait = (s, cb, timeout = 5000) => {
  const startTime = Date.now();
  const t = setInterval(() => {
    const el = q(s);
    if (el) {
      clearInterval(t);
      cb();
    } else if (Date.now() - startTime > timeout) {
      clearInterval(t);
    }
  }, 100);
};

const loginAttempts = {
  vtop: false,
  ffcs: false,
  lms: false
};

const fillCredentials = (usernameSelector, passwordSelector, storageKey, attemptKey, hasCaptcha) => {
  if (loginAttempts[attemptKey]) return;
  
  chrome.storage.local.get(storageKey, r => {
    const d = r[storageKey];
    if (!d || !d.fillForm) return;
    
    wait(usernameSelector, () => {
      const usernameField = q(usernameSelector);
      const passwordField = q(passwordSelector);
      
      if (!usernameField || !passwordField) return;
      
      usernameField.value = d.username || "";
      passwordField.value = d.password || "";
      
      ["input", "change", "keyup"].forEach(e => {
        usernameField.dispatchEvent(new Event(e, { bubbles: true }));
        passwordField.dispatchEvent(new Event(e, { bubbles: true }));
      });
      
      loginAttempts[attemptKey] = true;
      
      if (hasCaptcha && d.fillCaptcha) {
        document.dispatchEvent(new CustomEvent("fillCaptcha", { detail: { autoSubmit: d.autoSubmit } }));
      } else if (d.autoSubmit && !hasCaptcha) {
        setTimeout(() => {
          const submitBtn = q("#loginbtn");
          if (submitBtn) submitBtn.click();
        }, 500);
      }
    });
  });
};

const handleVtopLogin = () => {
  const currentUrl = window.location.href;
  
  if (currentUrl.includes("/vtop/open/page")) {
    chrome.storage.local.get("vtopCreds", r => {
      const d = r.vtopCreds;
      if (d && d.autoSubmit) {
        setTimeout(() => {
          const studentForm = document.getElementById("stdForm");
          if (studentForm) studentForm.submit();
        }, 500);
      }
    });
  } else if (currentUrl.includes("/vtop/")) {
    fillCredentials("#username", "#password", "vtopCreds", "vtop", true);
  }
};

const handleFFCSLogin = () => {
  fillCredentials("#username", "#password", "ffcsCreds", "ffcs", true);
};

const handleLMSLogin = () => {
  fillCredentials("#username", "#password", "lmsCreds", "lms", false);
};

const tryAutoLogin = () => {
  const currentUrl = window.location.href;
  
  if (currentUrl.match("vtopcc.vit.ac.in")) {
    handleVtopLogin();
  } else if (currentUrl.match("vtopregcc.vit.ac.in")) {
    handleFFCSLogin();
  } else if (currentUrl.match("lms.vit.ac.in")) {
    handleLMSLogin();
  }
};

if (document.readyState === "complete" || document.readyState === "interactive") {
  setTimeout(tryAutoLogin, 100);
} else {
  window.addEventListener("load", tryAutoLogin, false);
}