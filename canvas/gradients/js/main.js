var c=document.getElementById("gradients");
c.style.background="#FFFFFF";
var ctx=c.getContext("2d");
ctx.canvas.width=600;
ctx.canvas.height=600;

ctx.strokeStyle="white"

cycle=0

function drawcube(x,y,side,rot){
  /* 
  Function not related to bug. This works fine.
  Draws a cube
  (x,y): coordinates of the "upper left" corner
  side: lenght of side
  rot: rotation of the cube in rad
  */

  // calculate vertice separation given rotation and size
  vs=Math.sin(rot)*side;
  hs=Math.cos(rot)*side;
  // calculate displacement
  dy=(Math.sin(rot+(Math.PI/4))*side)/2
  dx=(Math.cos(rot+(Math.PI/4))*side)/2
  x=x-dx; y=y-dy;

  // Draw lines between vertices
  ctx.beginPath();
  ctx.moveTo(x,y);
  ctx.lineTo(x+hs,y+vs);
  ctx.lineTo(x+hs-vs,y+hs+vs);
  ctx.lineTo(x-vs,y+hs);
  ctx.lineTo(x,y);
  draw();
}

function draw(){ctx.stroke();}//Also not related to bug

function main(){
  /*
  Main loop
  */

  // Draw gradient in the canvas. This makes stuff slow
  grad=ctx.createRadialGradient(300,900,10,300,900,900);
  grad.addColorStop(1, "blue");   
  grad.addColorStop(0, "red");
  ctx.fillStyle=grad
  ctx.fillRect(0,0,600,600);

  //draw a moving square
  posx=300+(Math.sin(Math.PI*cycle/2.4*2/45+(Math.PI/4))*425)/2;
  posy=300+(Math.cos(Math.PI*cycle/1.1*2/45+(Math.PI/4))*425)/2;
  drawcube(posx,posy,100,Math.PI*(cycle)*2/45);
  cycle++
}

fps=60
setInterval(main,1000/fps)
