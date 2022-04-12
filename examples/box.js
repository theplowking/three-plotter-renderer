import * as THREE from "three";
import { PlotterRenderer } from "../src/plotter-renderer.js";
import { OrbitControls } from "../node_modules/three/examples/jsm/controls/OrbitControls.js";

import CSG from "./three-csg.js"

/** @typedef {import('../node_modules/three/build/three.module.js')} THREE */

var camera, scene, renderer;
var cameraControls;
var canvasWidth = window.innerWidth;
var canvasHeight = window.innerHeight;
var floorMesh;
var focused = false;

window.onload = () => {
  init();
  render();
};

window.onblur = () => {
  focused = false;
};

window.onfocus = window.onclick = () => {
  focused = true;
};

window.onkeypress = (e) => {
  console.log(e.keyCode);
  switch (e.keyCode) {
    case 61:
      renderer.increaseSpacing();
      break;
    case 45:
      renderer.decreaseSpacing();
      break;
    case 93:
      renderer.increaseRotation();
      break;
    case 91:
      renderer.decreaseRotation();
      break;
    case 46:
      renderer.nextHatchGroup();
      break;
    case 44:
      renderer.previousHatchGroup();
      break;
  }
};

function init() {

  var view = document.getElementById("view");
  var container = document.getElementById("plot");
  var overla= document.getElementById("plot");

  // CAMERA
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 8000);
  camera.position.set(600, 600, 600);

  // var aspect = window.innerWidth / window.innerHeight;
  // var d = 1000;
  // camera = new THREE.OrthographicCamera( - d * aspect, d * aspect, d, - d, 1, 8000 );
  // camera.position.set( 600, 950, 600 ); // all components equal
  //camera.lookAt( scene.position ); // or the origin

  // RENDERER
  renderer = new PlotterRenderer();

  renderer.setSize(canvasWidth, canvasHeight);
  container.appendChild(renderer.domElement);

  // EVENTS
  window.addEventListener("resize", onWindowResize, false);

  // CONTROLS
  // @ts-ignore
  cameraControls = new OrbitControls(camera, view);
  cameraControls.zoomSpeed = 2;

  // scene itself
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xaaaaaa);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.75);
  dirLight.position.set(600, 600, 600);

  scene.add(dirLight);

  // const dirLight2 = new THREE.DirectionalLight(0x333333, 0.75);
  // dirLight2.position.set(-100, 300, -500);

  // scene.add(dirLight2);

  // const light = new THREE.PointLight(0xffffff, 1.0, 5000);
  // light.position.x = 300;
  // light.position.z = 600;
  // light.position.y = 1000;

  // camera.add(light);

  scene.add(camera);

  // GUI
  setupGui();

  const hFloor = 1600;
  const h = 1000;
  
  const stepSize = 50;
  const offset = 100;
  const depth = 4000;
  let thickness = 20;
  let stepThickness = 20;
  const lvls = 4;
  const debug=false;

  let mat = new THREE.MeshPhongMaterial({ opacity: 1, color: 0xffffff });
  
  let floorGeo = new THREE.BoxGeometry(hFloor, depth, hFloor);

  let edge;

  floorMesh= new THREE.Mesh(floorGeo, mat);
  floorMesh.position.add(new THREE.Vector3( 0, -depth/2, 0));

  for (let level = 0; level < lvls; level++) {
    
    //thickness = 20 + (level * 300);
    let stepCount = 10 - (level*1);
    for (let side = 0; side < 4; side++) {
      
      //Create a matrix
      var rotationMatrix = new THREE.Matrix4();
      //Rotate the matrix
      rotationMatrix.makeRotationY((side-2) * -Math.PI / 2);
      
      let sideHeight = h - (level*offset*2);
      let outerOffset = level * offset;
      edge = h/2 - outerOffset - offset;
  
      
      let stepMesh = new THREE.Mesh(new THREE.BoxGeometry(offset, thickness, offset));
      stepMesh.position.add(new THREE.Vector3( offset/2, 0, offset/2));
      stepMesh.position.add(new THREE.Vector3( edge, 0, -sideHeight/2));
      placeObject(stepMesh, rotationMatrix);
  
      //let stepCount = sideHeight/stepSize;
      for (let step = 0; step < stepCount; step++) {
        
        let stepHeight = (sideHeight-(2*offset))/stepCount;
       
        let stepMesh = new THREE.Mesh(new THREE.BoxGeometry(offset, thickness, stepHeight));
        stepMesh.position.add(new THREE.Vector3( offset/2, 0, stepHeight/2));
        if((side+1)%2==0){stepMesh.rotateY(Math.PI/2)} //rotate 90 for the edges
        stepMesh.position.add(new THREE.Vector3( edge, 0, -sideHeight/2 + offset + step*stepHeight));
        placeObject(stepMesh, rotationMatrix);

      }

      // stepMesh = new THREE.Mesh(new THREE.BoxGeometry(offset, thickness, offset));
      // stepMesh.position.add(new THREE.Vector3( edge, 0, sideHeight/2));
      // placeObject(stepMesh, rotationMatrix);
      
    }
    //thickness -= stepThickness*40;
    
  }

  //final box
  let stepMesh = new THREE.Mesh(new THREE.BoxGeometry(h-(2*offset*lvls), depth, h-(2*offset*lvls)));
  stepMesh.position.add(new THREE.Vector3( 0, -depth/2, 0));
  //stepMesh.position.add(new THREE.Vector3( -offset*lvls/2, 0, offset*lvls/2));
  placeObject(stepMesh, rotationMatrix);

  stepMesh = new THREE.Mesh(new THREE.BoxGeometry(hFloor, depth, (hFloor-h)/2));
  stepMesh.position.add(new THREE.Vector3( (hFloor-h)/2/2, -depth/2, 0));
  stepMesh.position.add(new THREE.Vector3( h/2, 0, 0));
  placeObject(stepMesh, rotationMatrix);

  stepMesh = new THREE.Mesh(new THREE.BoxGeometry((hFloor-h)/2, depth, hFloor));
  stepMesh.position.add(new THREE.Vector3( 0, -depth/2, -(hFloor-h)/2/2));
  stepMesh.position.add(new THREE.Vector3( 0, 0, -h/2));
  placeObject(stepMesh, rotationMatrix);

  scene.add(floorMesh);

  function placeObject(mesh, rotationMatrix){

    thickness += stepThickness*2;
    //stepHeight -= stepThickness;

    mesh.position.applyMatrix4(rotationMatrix);

    if(debug){
      let newMesh = mesh.clone();
      scene.add(newMesh);
      return;
    }
    
    //Make sure the .matrix of each mesh is current
    floorMesh.updateMatrix();
    mesh.updateMatrix();

    //Create a bsp tree from each of the meshes
    let bspA = CSG.fromMesh( floorMesh );              
    let bspB = CSG.fromMesh( mesh );

    // Subtract one bsp from the other via .subtract... other supported modes are .union and .intersect
    let bspResult = bspA.subtract(bspB);

    //Get the resulting mesh from the result bsp, and assign meshA.material to the resulting mesh
    floorMesh = CSG.toMesh( bspResult, floorMesh.matrix, floorMesh.material );

  }


///#################
  // let geom =  new THREE.SphereBufferGeometry(100, 16, 16);

  // // Make 2 box meshes.. 
  // let meshA = new THREE.Mesh(new THREE.BoxGeometry(100,100,100), mat);
  // let meshB = new THREE.Mesh(geom);

  
  // //offset one of the boxes by half its width..
  // meshB.position.add(new THREE.Vector3( 50, 50, 50));

  // //Make sure the .matrix of each mesh is current
  // meshA.updateMatrix();
  // meshB.updateMatrix();

  // //Create a bsp tree from each of the meshes
  // let bspA = CSG.fromMesh( meshA );              
  // let bspB = CSG.fromMesh( meshB );

  // // Subtract one bsp from the other via .subtract... other supported modes are .union and .intersect
  // let bspResult = bspA.subtract(bspB);

  // //Get the resulting mesh from the result bsp, and assign meshA.material to the resulting mesh
  // let meshResult = CSG.toMesh( bspResult, meshA.matrix, meshA.material );

  // //var mesh = new THREE.Mesh(meshResult, new THREE.MeshPhongMaterial({ opacity: 1, color: 0xffffff }));
  // //var mesh = new THREE.MeshBasicMaterial({ color: 0xd3d3d3 });
  // scene.add(meshResult);

  var tick = function () {
    if (focused) {
      renderer.render(scene, camera, 0.2, 0.3);
    }
    requestAnimationFrame(tick);
  };

  var optimizeTimeout = null;

  var setOptimize = function () {
    clearTimeout(optimizeTimeout);
    optimizeTimeout = setTimeout(() => {
      renderer.doOptimize = true;
    }, 500);
  };

  cameraControls.addEventListener("start", function () {
    renderer.doOptimize = false;
    clearTimeout(optimizeTimeout);
  });

  cameraControls.addEventListener("end", function () {
    setOptimize();
  });

  cameraControls.addEventListener("change", function () {
    renderer.doOptimize = false;
    clearTimeout(optimizeTimeout);
    setOptimize();
  });

  tick();
  //setOptimize();
}

function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);

  camera.aspect = canvasWidth / canvasHeight;
  camera.updateProjectionMatrix();

  render();
}

function setupGui() {
  var exportButton = document.getElementById("exportsvg");
  exportButton.addEventListener("click", exportSVG);
}

function render() {
  renderer.render(scene, camera);
}

function exportSVG() {
  saveString(document.getElementById("plot").innerHTML, "plot.svg");
}

function save(blob, filename) {
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

function saveString(text, filename) {
  save(new Blob([text], { type: "text/plain" }), filename);
}

var link = document.createElement("a");
link.style.display = "none";
document.body.appendChild(link);
