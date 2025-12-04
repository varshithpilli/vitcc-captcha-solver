function loadCredentials() {
  chrome.storage.local.get(["vtopCreds", "ffcsCreds", "lmsCreds"], r => {
    console.log("Loading credentials:", r);
    ["vtop", "ffcs", "lms"].forEach(t => {
      const d = r[t + "Creds"];
      if (!d) {
        console.log(`No credentials found for ${t}Creds`);
        return;
      }
      document.getElementById(`${t}-username`).value = d.username || "";
      document.getElementById(`${t}-password`).value = d.password || "";
      document.getElementById(`${t}-fill`).checked = d.fillForm !== false;
      if (t !== "lms") document.getElementById(`${t}-captcha`).checked = d.fillCaptcha !== false;
      document.getElementById(`${t}-submit`).checked = d.autoSubmit || false;
      updateButtonState(t, true);
    });
  });
}

function updateButtonState(t, u) {
  const b = document.getElementById(`${t}-save-btn`);
  if (b) b.textContent = u ? "Update" : "Save";
}

function showMessage(t, m, s = true) {
  const e = document.getElementById(`${t}-message`);
  if (!e) return;
  e.textContent = m;
  e.style.background = s ? "#d4edda" : "#f8d7da";
  e.style.color = s ? "#155724" : "#721c24";
  e.style.padding = "5px";
  e.style.borderRadius = "4px";
  setTimeout(() => {
    e.textContent = "";
    e.style.background = "";
    e.style.padding = "";
  }, 2000);
}

function saveCredentials(t) {
  console.log(`Saving credentials for ${t}`);
  
  const usernameField = document.getElementById(`${t}-username`);
  const passwordField = document.getElementById(`${t}-password`);
  const fillField = document.getElementById(`${t}-fill`);
  const submitField = document.getElementById(`${t}-submit`);
  
  if (!usernameField || !passwordField) {
    console.error(`Fields not found for ${t}`);
    return;
  }
  
  const d = {
    username: usernameField.value,
    password: passwordField.value,
    fillForm: fillField ? fillField.checked : false,
    autoSubmit: submitField ? submitField.checked : false
  };
  
  // For VTOP and FFCS, include captcha setting
  if (t !== "lms") {
    const captchaField = document.getElementById(`${t}-captcha`);
    d.fillCaptcha = captchaField ? captchaField.checked : false;
  } else {
    d.fillCaptcha = false;
  }
  
  if (!d.username && !d.password) {
    console.log("No username or password entered");
    return showMessage(t, "Enter details", false);
  }
  
  const storageKey = t + "Creds";
  console.log(`Saving to ${storageKey}:`, d);
  
  chrome.storage.local.set({ [storageKey]: d }, () => {
    if (chrome.runtime.lastError) {
      console.error("Error saving:", chrome.runtime.lastError);
      showMessage(t, "Error saving", false);
    } else {
      console.log(`Successfully saved ${storageKey}`);
      showMessage(t, "Saved", true);
      updateButtonState(t, true);
      
      // Verify it was saved
      chrome.storage.local.get([storageKey], result => {
        console.log(`Verification - ${storageKey}:`, result);
      });
    }
  });
}

// Make saveCredentials available globally for inline onclick handlers
window.saveCredentials = saveCredentials;

// Handle toggle interactions
function setupToggleHandlers(type) {
  const autoSubmitToggle = document.getElementById(`${type}-submit`);
  const fillFormToggle = document.getElementById(`${type}-fill`);
  const fillCaptchaToggle = document.getElementById(`${type}-captcha`);
  
  if (!autoSubmitToggle || !fillFormToggle) return;
  
  // When auto-submit is turned ON, automatically enable fillForm and fillCaptcha
  autoSubmitToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
      fillFormToggle.checked = true;
      if (fillCaptchaToggle) {
        fillCaptchaToggle.checked = true;
      }
      console.log(`Auto-submit enabled for ${type}, enabling fillForm and fillCaptcha`);
    }
  });
  
  // When fillForm is turned OFF, automatically disable autoSubmit
  fillFormToggle.addEventListener('change', (e) => {
    if (!e.target.checked) {
      autoSubmitToggle.checked = false;
      if (fillCaptchaToggle) {
        fillCaptchaToggle.checked = false;
      }
      console.log(`Fill form disabled for ${type}, disabling autoSubmit and fillCaptcha`);
    }
  });
  
  // When fillCaptcha is turned OFF, automatically disable autoSubmit (for sites with captcha)
  if (fillCaptchaToggle) {
    fillCaptchaToggle.addEventListener('change', (e) => {
      if (!e.target.checked) {
        autoSubmitToggle.checked = false;
        console.log(`Fill captcha disabled for ${type}, disabling autoSubmit`);
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("Credentials page loaded");
  loadCredentials();
  
  // Attach save button click handlers
  ["vtop", "ffcs", "lms"].forEach(t => {
    const saveBtn = document.getElementById(`${t}-save-btn`);
    if (saveBtn) {
      // Remove inline onclick and add event listener
      saveBtn.onclick = null;
      saveBtn.addEventListener("click", () => saveCredentials(t));
      console.log(`Attached click handler for ${t}-save-btn`);
    }
    
    // Setup toggle handlers
    setupToggleHandlers(t);
    
    // Update button state on input
    ["username", "password"].forEach(i => {
      const field = document.getElementById(`${t}-${i}`);
      if (field) {
        field.addEventListener("input", () => updateButtonState(t, true));
      }
    });
  });
});