import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.158.0/examples/jsm/controls/OrbitControls.js";

let scene, camera, renderer, controls;
let gamepadIndex = null;

let targetFov = 75;
const minFov = 35;
const maxFov = 90;
const zoomSpeed = 0.35;
const deadZone = 0.15;

let fogOverlay = null;

init();
animate();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 0.1);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.rotateSpeed = -0.35;

   const loader = new THREE.CubeTextureLoader();
  loader.setPath("./assets/images/");

  const texture = loader.load([
    "px.png",
    "nx.png",
    "py.png",
    "ny.png",
    "pz.png",
    "nz.png"
  ]);

  scene.background = texture;

  setupGamepadTest();

  window.addEventListener("resize", onWindowResize);
  fogOverlay = document.querySelector("#fog-overlay");
}

function setupGamepadTest() {
  updateInfo("等待手柄连接：请先按一下手柄任意按键");

  window.addEventListener("gamepadconnected", function (event) {
    gamepadIndex = event.gamepad.index;

    console.log("手柄已连接：", event.gamepad);

    updateInfo(
      `手柄已连接：${event.gamepad.id} / 按键数：${event.gamepad.buttons.length} / 摇杆轴数：${event.gamepad.axes.length}`
    );
  });

  window.addEventListener("gamepaddisconnected", function (event) {
    console.log("手柄已断开：", event.gamepad);

    gamepadIndex = null;
    updateInfo("手柄已断开");
  });
}

function checkGamepadInput() {
  if (gamepadIndex === null) return;

  const gamepads = navigator.getGamepads();
  const gamepad = gamepads[gamepadIndex];

  if (!gamepad) return;

  const axes = gamepad.axes.map((axis) => axis.toFixed(2));
  const pressedButtons = [];

  gamepad.buttons.forEach((button, index) => {
    if (button.pressed) {
      pressedButtons.push(index);
    }
  });

  // 左摇杆通常是 axes[0] 和 axes[1]
  // axes[0] = 左右
  // axes[1] = 上下
  const leftStickY = gamepad.axes[1];

  if (Math.abs(leftStickY) > deadZone) {
    targetFov += leftStickY * zoomSpeed;
    targetFov = THREE.MathUtils.clamp(targetFov, minFov, maxFov);
  }

  camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.08);
  camera.updateProjectionMatrix();

  updateFogByFov();

  const infoText = document.querySelector("#info p");
  if (infoText) {
    infoText.textContent =
      `手柄已连接 | 左摇杆：${axes[0]}, ${axes[1]} | 当前视角FOV：${camera.fov.toFixed(1)} | 按下按钮：${pressedButtons.join(", ") || "无"}`;
  }
}

function updateInfo(text) {
  const infoText = document.querySelector("#info p");
  if (infoText) {
    infoText.textContent = text;
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.setAnimationLoop(() => {
    checkGamepadInput();
    controls.update();
    renderer.render(scene, camera);
  });
}

function updateFogByFov() {

  if (!fogOverlay) return;

  let fogOpacity = 0;
  let blurAmount = 0;

  if (camera.fov < 65) {

    fogOpacity = THREE.MathUtils.mapLinear(
      camera.fov,
      65,
      35,
      0,
      0.35
    );

    blurAmount = THREE.MathUtils.mapLinear(
      camera.fov,
      65,
      35,
      0,
    );

  }

  fogOpacity = THREE.MathUtils.clamp(
    fogOpacity,
    0,
    0.35
  );

  fogOverlay.style.opacity = fogOpacity;

  fogOverlay.style.backdropFilter =
    `blur(${blurAmount}px)`;
}