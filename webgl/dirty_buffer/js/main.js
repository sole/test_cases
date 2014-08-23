var scene = new THREE.Scene(), 
    w = window.innerWidth, h = window.innerHeight, 
    camera = new THREE.PerspectiveCamera(65   /* field of view, the lower, the closer it appears */, 
                                         w/h  /* aspect ratio of view */, 
                                         .1   /* near clipping plane */, 
                                         1000 /* far clipping plane */), 
    renderer = new THREE.WebGLRenderer() /* renderer draws on screen what the camera sees */, 
    
    /* threejs.org/docs/#Reference/Extras.Geometries/BoxGeometry */
    geometry = new THREE.BoxGeometry(2, 2, 2), 
    
    /* threejs.org/docs/#Reference/Materials/MeshBasicMaterial */
    material = new THREE.MeshBasicMaterial({ 
                          color: 0xffa500, 
                          wireframe: true
                        }), 
    cube = new THREE.Mesh(geometry, material);

var animate = function() {
  
  renderer.render(scene, camera); /* this is enough to render cube if not animated */
  
  /* keep increasing rotation around the y-axis */
  cube.rotation.y += .01; /* the higher the value, the faster it rotates */
  
  requestAnimationFrame(animate);
}

renderer.setSize(w, h);
document.body.appendChild(renderer.domElement); /* add our renderer to the body element */

scene.add(cube); /* cube added at coordinates (0, 0, 0) */

/* move the cube from inside the camera, the higher the value, the further away it goes */
camera.position.z = 5;

animate();
