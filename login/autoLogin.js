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
      console.log(`Timeout waiting for selector: ${s}`);
    }
  }, 100);
};

const fillCredentials = (usernameSelector, passwordSelector, submitSelector, storageKey, hasCaptcha) => {
  chrome.storage.local.get(storageKey, r => {
    const d = r[storageKey];
    if (!d) {
      console.log(`No credentials found for ${storageKey}`);
      return;
    }
    
    // If autoSubmit is enabled, ensure fillForm and fillCaptcha are also enabled
    if (d.autoSubmit) {
      d.fillForm = true;
      if (hasCaptcha) d.fillCaptcha = true;
    }
    
    wait(usernameSelector, () => {
      const usernameField = q(usernameSelector);
      const passwordField = q(passwordSelector);
      
      if (!usernameField || !passwordField) {
        console.log("Username or password field not found");
        return;
      }
      
      usernameField.value = d.username || "";
      passwordField.value = d.password || "";
      
      if (d.fillForm) {
        ["input", "change"].forEach(e => {
          usernameField.dispatchEvent(new Event(e, { bubbles: true }));
          passwordField.dispatchEvent(new Event(e, { bubbles: true }));
        });
      }
      
      // If this site has captcha functionality and fillCaptcha is enabled
      if (hasCaptcha && d.fillCaptcha) {
        document.dispatchEvent(new CustomEvent("fillCaptcha", { detail: { autoSubmit: d.autoSubmit } }));
      }
      // If no captcha but autoSubmit is enabled
      else if (d.autoSubmit) {
        setTimeout(() => {
          const submitBtn = q(submitSelector);
          if (submitBtn) {
            submitBtn.click();
            console.log("Auto-submit clicked");
          }
        }, 300);
      }
    });
  });
};

const handleVtopLogin = () => {
  const currentUrl = window.location.href;
  if (currentUrl.includes("vtopcc.vit.ac.in") && currentUrl.includes("/vtop/")) {
    console.log("VTOP login page detected");
    fillCredentials("#username", "#password", "#submitBtn", "vtopCreds", true);
  }
};

const handleFFCSLogin = () => {
  const currentUrl = window.location.href;
  if (currentUrl.includes("vtopregcc.vit.ac.in")) {
    console.log("FFCS login page detected");
    fillCredentials("#username", "#password", "#submitBtn", "ffcsCreds", true);
  }
};

const handleLMSLogin = () => {
  const currentUrl = window.location.href;
  if (currentUrl.includes("lms.vit.ac.in")) {
    console.log("LMS login page detected");
    fillCredentials("#username", "#password", "#loginbtn", "lmsCreds", false);
  }
};

const tryAutoLogin = () => {
  const currentUrl = window.location.href;
  console.log("Auto-login checking URL:", currentUrl);
  
  if (currentUrl.match("vtopcc.vit.ac.in")) {
    handleVtopLogin();
  } else if (currentUrl.match("vtopregcc.vit.ac.in")) {
    handleFFCSLogin();
  } else if (currentUrl.match("lms.vit.ac.in")) {
    handleLMSLogin();
  }
};

// Run when DOM is ready
if (document.readyState === "complete" || document.readyState === "interactive") {
  setTimeout(tryAutoLogin, 100);
} else {
  window.addEventListener("load", tryAutoLogin, false);
}