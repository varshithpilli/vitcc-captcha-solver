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

function preProcess(im) {
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
  let sat = new Array(d.length / 4);
  for (let i = 0; i < d.length; i += 4) {
    let min = Math.min(d[i], d[i + 1], d[i + 2]);
    let max = Math.max(d[i], d[i + 1], d[i + 2]);
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

function ChennaiBlocks(im) {
  let blocksList = new Array(6);
  for (let a = 0; a < 6; a += 1) {
    let x1 = (a + 1) * 25 + 2;
    let y1 = 7 + 5 * (a % 2) + 1;
    let x2 = (a + 2) * 25 + 1;
    let y2 = 35 - 5 * ((a + 1) % 2);
    blocksList[a] = im.slice(y1, y2).map((i) => i.slice(x1, x2));
  }
  return blocksList;
};

const addCredits = function (box) {
  const strings = [
    "Filled by yours truly",
    "Thank me later",
    "Too lazy for this",
    "I am a robot",
    "Here.. let me",
    "Was I faster than auto-complete?",
  ]
  let string = strings[Math.floor(Math.random() * strings.length)]

  if (box.children[box.children.length - 1].innerHTML != string) {
    var para = document.createElement("p");
    para.innerHTML = string;
    para.style.cssText = "font-size: 12px; text-align: center;";
    para.setAttribute("id", "Credits");
    box.appendChild(para);
  }
};