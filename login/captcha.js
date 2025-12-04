const solveChennai = (img, textBox, callback) => {
  fetch(chrome.runtime.getURL("weights.json"))
    .then((response) => response.json())
    .then((data) => {

      const HEIGHT = 40;
      const WIDTH = 200;

      const weights = data.weights;
      const biases = data.biases;

      const label_txt = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const pd = ctx.getImageData(0, 0, WIDTH, HEIGHT);

      let sat = saturation(pd.data);
      let def = deflatten(sat, [HEIGHT, WIDTH]);
      let blocksList = ChennaiBlocks(def);
      let out = "";
      for (let i = 0; i < 6; i += 1) {
        let block = preProcess(blocksList[i]);
        block = [flatten(block)];
        block = matrixMultiplication(block, weights);
        block = matrixAddition(...block, biases);
        block = softmax(block);
        block = block.indexOf(Math.max(...block));
        out += label_txt[block];
      }
      textBox.value = out.trim();
      var box = document.getElementsByClassName("row")[1];
      addCredits(box);
      
      if (callback) callback();
    });
};

const tryUrls = () => {
  console.log(document.URL);
  
  let autoSubmitRequested = false;
  
  document.addEventListener('fillCaptcha', (e) => {
    autoSubmitRequested = e.detail?.autoSubmit || false;
    const currentUrl = window.location.href;
    
    if (currentUrl.includes('vtopcc.vit.ac.in')) {
      handleVtopCaptcha(autoSubmitRequested);
    } else if (currentUrl.includes('vtopregcc.vit.ac.in')) {
      handleFFCSCaptcha(autoSubmitRequested);
    }
  });
  
  if (document.URL.match("vtopcc.vit.ac.in")) {
    handleVtopCaptcha(false);
  }

  else if (document.URL.match("https://vtopregcc.vit.ac.in/RegistrationNew/")) {
    handleFFCSCaptcha(false);
  }
}

function handleVtopCaptcha(autoSubmit) {
  let img = document.getElementById("captchaBlock")?.children[0];
  if (!img) {
    img = document.getElementsByClassName("form-control bg-light border-0")[0];
  }
  
  let textBox = document.getElementById("captchaStr");
  
  if (!img || !textBox) {
    console.log("No captcha found on this page");
    return;
  }
  
  img.style.height = "40px";
  img.style.width = "200px";
  solveChennai(img, textBox, () => {
    // Dispatch events to ensure the captcha value is registered
    textBox.dispatchEvent(new Event('input', { bubbles: true }));
    textBox.dispatchEvent(new Event('change', { bubbles: true }));
    
    if (autoSubmit) {
      setTimeout(() => {
        const submitBtn = document.querySelector('#submitBtn');
        if (submitBtn) submitBtn.click();
      }, 500);
    }
  });

  let container = document.getElementById("captchaBlock");
  if (!container) {
    console.log("No captcha container found");
    return;
  }
  
  container.addEventListener('DOMSubtreeModified', () => {
    img = document.getElementById("captchaBlock")?.children[0];
    if (!img) {
      img = document.getElementsByClassName("form-control bg-light border-0")[0];
    }
    if (!img) return;
    
    img.style.height = "40px";
    img.style.width = "200px";
    let textBox = document.getElementById("captchaStr");
    if (textBox) {
      solveChennai(img, textBox, () => {
        // Dispatch events to ensure the captcha value is registered
        textBox.dispatchEvent(new Event('input', { bubbles: true }));
        textBox.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }
  });
}

function handleFFCSCaptcha(autoSubmit) {
  if (document.getElementById("captchaStringProgInfo")) {
    console.log("Step 2 CAPTCHA detected");
    
    const solveCaptchaStep2 = () => {
      let img = document.getElementById("captcha_id");
      let textBox = document.getElementById("captchaStringProgInfo");
      
      if (img && textBox) {
        img.style.height = "40px";
        img.style.width = "200px";
        solveChennai(img, textBox, () => {
          // Dispatch events to ensure the captcha value is registered
          textBox.dispatchEvent(new Event('input', { bubbles: true }));
          textBox.dispatchEvent(new Event('change', { bubbles: true }));
          
          if (autoSubmit) {
            setTimeout(() => {
              const submitBtn = document.querySelector('button[type="submit"]');
              if (submitBtn) submitBtn.click();
            }, 500);
          }
        });
        console.log("Step 2 CAPTCHA solved");
      }
    };
    
    solveCaptchaStep2();
    
    const testDiv = document.getElementById("test");
    if (testDiv) {
      const observer = new MutationObserver(() => {
        console.log("CAPTCHA refreshed, solving again...");
        solveCaptchaStep2();
      });
      
      observer.observe(testDiv, { 
        childList: true, 
        subtree: true,
        attributes: true,
        attributeFilter: ['src'] 
      });
      
      console.log("Observer set up for Step 2 CAPTCHA");
    }
    
    const refreshButton = document.getElementById("refreshCaptchaProcess");
    if (refreshButton) {
      refreshButton.addEventListener('click', () => {
        console.log("Refresh button clicked");
        setTimeout(solveCaptchaStep2, 500);
      });
    }
  }
  else if (document.getElementById("captchaString")) {
    console.log("Step 1 CAPTCHA detected");
    let img = document.getElementById("captcha_id");
    let textBox = document.getElementById("captchaString");
    
    if (img && textBox) {
      img.style.height = "40px";
      img.style.width = "200px";
      solveChennai(img, textBox, () => {
        // Dispatch events to ensure the captcha value is registered
        textBox.dispatchEvent(new Event('input', { bubbles: true }));
        textBox.dispatchEvent(new Event('change', { bubbles: true }));
        
        if (autoSubmit) {
          setTimeout(() => {
            const submitBtn = document.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.click();
          }, 500);
        }
      });
      console.log("Step 1 CAPTCHA solved");
    }
  }
}

// Also run when DOM is ready (in case load event already fired)
if (document.readyState === "complete" || document.readyState === "interactive") {
  setTimeout(tryUrls, 100);
}

window.addEventListener("load", tryUrls, false);