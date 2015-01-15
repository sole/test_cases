window.onload = function() {

	var h1 = document.querySelector('h1');
	h1.textContent = document.title;

	/* compact way of setting PI = Math.PI, sin = Math.sin & so on... :D */
Object.getOwnPropertyNames(Math).map(function(p) { window[p] = Math[p] });

var v = document.querySelector('.v'),
    c = document.querySelector('.c'), 
    ctx = c.getContext('2d'), 
    w, h, d, p, r, 
    req_id;

var init = function() {
  r = c.getBoundingClientRect();

  if(req_id) {
    cancelAnimationFrame(req_id);
  }

  v.src = src;
  v.autoplay = v.loop = true;
  w = c.width = v.clientWidth;
  h = c.height = v.clientHeight;
  d = sqrt(w*w + h*h);
  p = { 'x': w/2, 'y': h/2 };

  draw();
};

var draw = function() {
  var idata, data, data_len, x, y, dx, dy, dd, f;

  ctx.drawImage(v, 0, 0, w, h);
  /**/
  idata = ctx.getImageData(0, 0, w, h);
  data = idata.data;
  data_len = data.length;

  for(var i = 0; i < data_len/4; i++) {
    x = i%w;
    y = floor(i/w);
    dx = p.x - x;
    dy = p.y - y;
    dd = sqrt(dx*dx + dy*dy);
    f = pow(1 - dd/d, 4);

    data[4*i + 1] += 192*f;
  }

  ctx.putImageData(idata, 0, 0);
  /**/
  requestAnimationFrame(draw);
};

init();

addEventListener('resize', init, false);

c.addEventListener('mousemove', function(e) {
  p = { 'x': e.clientX - r.left, 'y': e.clientY - r.top };
}, false);
};

