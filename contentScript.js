function softmax(a){
  var n = [...a];
  let s = 0;
  n.forEach((f) => {
    s += Math.exp(f);
  });
  for (let i = 0; i < a.length; i++) {
    n[i] = Math.exp(a[i]) / s;
  }
  return n;
};

function matrixMultiplication(a, b){
  if (!Array.isArray(a) || !Array.isArray(b) || !a.length || !b.length) {
    throw new Error("arguments should be in 2-dimensional array format");
  }
  let x = a.length,
    z = a[0].length,
    y = b[0].length;
  if (b.length !== z) {
    console.log(no);
  }
  let productRow = Array.apply(null, new Array(y)).map(
    Number.prototype.valueOf,
    0
  );
  let product = new Array(x);
  for (let p = 0; p < x; p++) {
    product[p] = productRow.slice();
  }
  for (let i = 0; i < x; i++) {
    for (let j = 0; j < y; j++) {
      for (let k = 0; k < z; k++) {
        product[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return product;
};

function matrixAddition(a, b){
  let x = a.length;
  let c = new Array(x);
  for (let i = 0; i < x; i++) {
    c[i] = a[i] + b[i];
  }
  return c;
};

function saturation(d){
  sat = new Array(d.length / 4);
  for (let i = 0; i < d.length; i += 4) {
    min = Math.min(d[i], d[i + 1], d[i + 2]);
    max = Math.max(d[i], d[i + 1], d[i + 2]);
    sat[i / 4] = Math.round(((max - min) * 255) / max);
  }
  return sat;
};

function flatten(ar){
  var ne = new Array(ar.length * ar[0].length);
  for (let i = 0; i < ar.length; i += 1) {
    for (let j = 0; j < ar[0].length; j += 1) {
      ne[i * ar[0].length + j] = ar[i][j];
    }
  }
  return ne;
};

function deflatten(ar, shape){
  var img = new Array(shape[0]);
  for (let i = 0; i < shape[0]; i += 1) {
    img[i] = new Array(shape[1]);
    for (let j = 0; j < shape[1]; j += 1) {
      img[i][j] = ar[i * shape[1] + j];
    }
  }
  return img;
};

function chennaiPreProcess(im){
  let avg = 0;
  im.forEach((e) => e.forEach((f) => (avg += f)));
  avg /= 24 * 22;
  var ne = new Array(im.length);
  for (let i = 0; i < im.length; i += 1) {
    ne[i] = new Array(im[0].length);
    for (let j = 0; j < im[0].length; j += 1) {
      if (im[i][j] > avg) {
        ne[i][j] = 1;
      } else {
        ne[i][j] = 0;
      }
    }
  }
  return ne;
};

function ChennaiBlocks(im){
  blocksList = new Array(6);
  for (let a = 0; a < 6; a += 1) {
    x1 = (a + 1) * 25 + 2;
    y1 = 7 + 5 * (a % 2) + 1;
    x2 = (a + 2) * 25 + 1;
    y2 = 35 - 5 * ((a + 1) % 2);
    blocksList[a] = im.slice(y1, y2).map((i) => i.slice(x1, x2));
  }
  return blocksList;
};


const addCredits = function (box, string="Thank me later") { 
  if (box.children[box.children.length-1].innerHTML != string){
    var para = document.createElement("p");
    para.innerHTML = string;
    para.style.cssText = "font-size: 12px; text-align: center;";
    para.setAttribute("id", "Credits");
    box.appendChild(para);
  }
};

const displayImage = (img) => {
  const height = img.length;
  const width = img[0].length;
  img = flatten(img)
  var buffer = new Uint8ClampedArray(width * height * 4);
  for (let pos=0; pos<buffer.length; pos=pos+4){
    buffer[pos  ] = img[pos/4]*255;
    buffer[pos+1] = img[pos/4]*255;
    buffer[pos+2] = img[pos/4]*255;
    buffer[pos+3] = 255;
  }
  var image = new Image(width, height);
  var canvas = document.createElement('canvas'),
  ctx = canvas.getContext('2d');
  canvas.width = width;
  canvas.height = height;
  var idata = ctx.createImageData(width, height);
  idata.data.set(buffer);
  ctx.putImageData(idata, 0, 0);

  image.src = canvas.toDataURL();
  document.body.appendChild(image);
}

const solveChennai = (img, textBox) => {
    fetch(chrome.runtime.getURL("weights.json"))
    .then((response) => response.json())
    .then((data) => {

      const HEIGHT=40;
      const WIDTH=200;

      const weights = data.weights;
      const biases = data.biases;

      const label_txt = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const pd = ctx.getImageData(0, 0, WIDTH, HEIGHT);

      sat = saturation(pd.data);
      def = deflatten(sat, [HEIGHT, WIDTH]);
      blocksList = ChennaiBlocks(def);
      out = "";
      for (let i = 0; i < 6; i += 1) {
        block = chennaiPreProcess(blocksList[i]);
        block = [flatten(block)];
        block = matrixMultiplication(block, weights);
        block = matrixAddition(...block, biases);
        block = softmax(block);
        block = block.indexOf(Math.max(...block));
        out += label_txt[block];
      }
      console.log(out);
      textBox.value = out.trim();
      var box = document.getElementsByClassName("row")[1];
      const strings = [
        "Filled by yours truly",
        "Thank me later",
        "Too lazy for this",
        "I am a robot",
        "Here.. let me",
        "Was I faster than auto-complete?",
      ]
      addCredits(box, strings[Math.floor(Math.random() * strings.length)]);
    });
};

const tryUrls = ()=>{
  console.log(document.URL)
  if (document.URL.match("vtopcc.vit.ac.in")) {
    img = document.getElementById("captchaBlock").children[0]
    if (!img) {
      var img = document.getElementsByClassName("form-control bg-light border-0")[0];
    }
    img.style.height="40px!important";
    img.style.width="200px!important";
    var textBox = document.getElementById("captchaStr");
    solveChennai(img, textBox);

    var container = document.getElementById("captchaBlock");
    container.addEventListener('DOMSubtreeModified', ()=>{
      img = document.getElementById("captchaBlock").children[0]
      if (!img) {
        var img = document.getElementsByClassName("form-control bg-light border-0")[0];
      }
      img.style.height="40px!important";
      img.style.width="200px!important";
      var textBox = document.getElementById("captchaStr");
      solveChennai(img, textBox);
    })
  }
  
  else if (document.URL.match("https://vtopregcc.vit.ac.in/RegistrationNew/")) {
    var img = document.getElementById("captcha_id");
    var textBox = document.getElementById("captchaString");
    img.style.height="40px!important";
    img.style.width="200px!important";
    solveChennai(img, textBox);
  }
}

tryUrls()