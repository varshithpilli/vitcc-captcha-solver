const solveChennai = (img, textBox) => {
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
    });
};

const tryUrls = () => {
  console.log(document.URL)
  
  if (document.URL.match("vtopcc.vit.ac.in")) {
    let img = document.getElementById("captchaBlock")?.children[0];
    if (!img) {
      img = document.getElementsByClassName("form-control bg-light border-0")[0];
    }
    
    let textBox = document.getElementById("captchaStr");
    
    if (!img || !textBox) {
      console.log("No captcha found on this page");
      return;
    }
    
    img.style.height = "40px!important";
    img.style.width = "200px!important";
    solveChennai(img, textBox);

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
      
      img.style.height = "40px!important";
      img.style.width = "200px!important";
      let textBox = document.getElementById("captchaStr");
      if (textBox) {
        solveChennai(img, textBox);
      }
    });
  }

  else if (document.URL.match("https://vtopregcc.vit.ac.in/RegistrationNew/")) {
    let img = document.getElementById("captcha_id");
    let textBox = document.getElementById("captchaString");
    
    if (!img || !textBox) {
      console.log("No captcha found on this page");
      return;
    }
    
    img.style.height = "40px!important";
    img.style.width = "200px!important";
    solveChennai(img, textBox);
  }
}

window.addEventListener("load", tryUrls, false);