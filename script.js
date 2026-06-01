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

let useDeviceOrientation = false;
let latestDeviceOrientation = null;

let playMode = null;
// playMode = "pc" 或 "mobile"

let leftCamera, rightCamera;
const eyeOffset = 0.03;

// ===============================
// 移动端 VR 盒子显示参数
// ===============================

// 单个眼睛画面的缩放比例
// 数值越小，左右眼画面越小，黑边越大
const mobileEyeScale = 0.72;

// 两个眼睛画面之间的距离
// 数值越大，中间黑色间隔越宽
const mobileEyeGap = 80;

// 圆角黑框的圆角大小
const mobileEyeRadius = 999;

initLoading();

function initLoading() {
  const loadingPanel = document.querySelector("#loading-panel");
  const modePanel = document.querySelector("#mode-panel");
  const loadingBar = document.querySelector("#loading-bar");
  const loadingText = document.querySelector("#loading-text");

  let progress = 0;
  const totalTime = 5000;
  const intervalTime = 50;
  const step = 100 / (totalTime / intervalTime);

  const timer = setInterval(() => {
    progress += step;

    if (progress >= 100) {
      progress = 100;
      clearInterval(timer);

      setTimeout(() => {
        loadingPanel.classList.add("hidden");
        modePanel.classList.remove("hidden");
      }, 300);
    }

    loadingBar.style.width = `${progress}%`;
    loadingText.textContent = `Loading ${Math.round(progress)}%`;
  }, intervalTime);

  document.querySelector("#pc-mode-btn").addEventListener("click", () => {
    startExperience("pc");
  });

  document.querySelector("#mobile-mode-btn").addEventListener("click", () => {
    startExperience("mobile");
  });
}

function startExperience(mode) {
  playMode = mode;

  document.querySelector("#start-screen").classList.add("hidden");
  document.querySelector("#info").classList.remove("hidden");

if (mode === "mobile") {
  document.querySelector("#orientation-btn").classList.remove("hidden");
  document.querySelector("#vr-frame-overlay").classList.remove("hidden");
  updateInfo("移动端模式：请横屏并点击开启手机陀螺仪");
} else {
  document.querySelector("#vr-frame-overlay").classList.add("hidden");
  updateInfo("PC模式：鼠标拖动环顾场景 / 手柄左摇杆控制前进");
}

  initScene();
  animate();
}

function initScene() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    targetFov,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  camera.position.set(0, 0, 0.1);

  renderer = new THREE.WebGLRenderer({
    antialias: true
  });

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.autoClear = false;

  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.rotateSpeed = -0.35;

  const loader = new THREE.CubeTextureLoader();

  // 这里是你现在的图片目录
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

  fogOverlay = document.querySelector("#fog-overlay");

  setupStereoCameras();
  setupGamepadTest();
  setupDeviceOrientation();

  window.addEventListener("resize", onWindowResize);
}

function setupStereoCameras() {
  leftCamera = camera.clone();
  rightCamera = camera.clone();

  leftCamera.aspect = window.innerWidth / 2 / window.innerHeight;
  rightCamera.aspect = window.innerWidth / 2 / window.innerHeight;

  leftCamera.updateProjectionMatrix();
  rightCamera.updateProjectionMatrix();
}

function setupGamepadTest() {
  window.addEventListener("gamepadconnected", function (event) {
    gamepadIndex = event.gamepad.index;

    console.log("手柄已连接：", event.gamepad);

    updateInfo(
      `手柄已连接：${event.gamepad.id} / 左摇杆控制前进后退`
    );
  });

  window.addEventListener("gamepaddisconnected", function () {
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

  // 左摇杆上下方向
  const leftStickY = gamepad.axes[1];

  if (Math.abs(leftStickY) > deadZone) {
    targetFov += leftStickY * zoomSpeed;

    targetFov = THREE.MathUtils.clamp(
      targetFov,
      minFov,
      maxFov
    );
  }

  camera.fov = THREE.MathUtils.lerp(
    camera.fov,
    targetFov,
    0.08
  );

  camera.updateProjectionMatrix();

  updateFogByFov();

  const infoText = document.querySelector("#info p");

  if (infoText) {
    infoText.textContent =
      `手柄已连接 | 左摇杆：${axes[0]}, ${axes[1]} | 当前FOV：${camera.fov.toFixed(1)} | 按下按钮：${pressedButtons.join(", ") || "无"}`;
  }
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
      0.45
    );

    blurAmount = THREE.MathUtils.mapLinear(
      camera.fov,
      65,
      35,
      0,
      12
    );
  }

  fogOpacity = THREE.MathUtils.clamp(
    fogOpacity,
    0,
    0.45
  );

  blurAmount = THREE.MathUtils.clamp(
    blurAmount,
    0,
    12
  );

  fogOverlay.style.opacity = fogOpacity.toFixed(3);
  fogOverlay.style.backdropFilter = `blur(${blurAmount}px)`;
}

function setupDeviceOrientation() {
  const orientationButton = document.querySelector("#orientation-btn");

  if (!orientationButton) return;

  orientationButton.addEventListener("click", async () => {
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();

        if (permission !== "granted") {
          updateInfo("陀螺仪权限未开启");
          return;
        }
      } catch (error) {
        console.error("陀螺仪权限申请失败：", error);
        updateInfo("陀螺仪权限申请失败");
        return;
      }
    }

    window.addEventListener(
      "deviceorientation",
      function (event) {
        latestDeviceOrientation = event;
      },
      true
    );

    useDeviceOrientation = true;

    if (controls) {
      controls.enabled = false;
    }

    orientationButton.classList.add("hidden");

    updateInfo("手机陀螺仪已开启：请横屏放入 VR 盒子");
  });
}

function updateCameraByDeviceOrientation() {
  if (!latestDeviceOrientation) return;

  const alpha = THREE.MathUtils.degToRad(
    latestDeviceOrientation.alpha || 0
  );

  const beta = THREE.MathUtils.degToRad(
    latestDeviceOrientation.beta || 0
  );

  const gamma = THREE.MathUtils.degToRad(
    latestDeviceOrientation.gamma || 0
  );

  const orient = THREE.MathUtils.degToRad(
    window.orientation || 0
  );

  setObjectQuaternion(
    camera.quaternion,
    alpha,
    beta,
    gamma,
    orient
  );
}

// ===============================
// 手机陀螺仪方向换算
// ===============================

const zee = new THREE.Vector3(0, 0, 1);
const euler = new THREE.Euler();
const q0 = new THREE.Quaternion();
const q1 = new THREE.Quaternion(
  -Math.sqrt(0.5),
  0,
  0,
  Math.sqrt(0.5)
);

function setObjectQuaternion(
  quaternion,
  alpha,
  beta,
  gamma,
  orient
) {
  euler.set(
    beta,
    alpha,
    -gamma,
    "YXZ"
  );

  quaternion.setFromEuler(euler);
  quaternion.multiply(q1);
  quaternion.multiply(
    q0.setFromAxisAngle(zee, -orient)
  );
}

function updateStereoCameras() {
  leftCamera.position.copy(camera.position);
  rightCamera.position.copy(camera.position);

  leftCamera.quaternion.copy(camera.quaternion);
  rightCamera.quaternion.copy(camera.quaternion);

  leftCamera.fov = camera.fov;
  rightCamera.fov = camera.fov;

  // 移动端每只眼睛的画面不是占满半屏，而是缩小后的窗口比例
  const eyeWidth = window.innerWidth * mobileEyeScale / 2;
  const eyeHeight = window.innerHeight * mobileEyeScale;

  leftCamera.aspect = eyeWidth / eyeHeight;
  rightCamera.aspect = eyeWidth / eyeHeight;

  // 轻微左右眼偏移，模拟双眼间距
  const eyeDirection = new THREE.Vector3(1, 0, 0);
  eyeDirection.applyQuaternion(camera.quaternion);

  leftCamera.position.addScaledVector(eyeDirection, -eyeOffset);
  rightCamera.position.addScaledVector(eyeDirection, eyeOffset);

  leftCamera.updateProjectionMatrix();
  rightCamera.updateProjectionMatrix();
}

function renderPCMode() {
  renderer.setScissorTest(false);
  renderer.setViewport(
    0,
    0,
    window.innerWidth,
    window.innerHeight
  );

  renderer.clear();
  renderer.render(scene, camera);
}

function renderMobileMode() {
  updateStereoCameras();

  const width = window.innerWidth;
  const height = window.innerHeight;

  // 单个眼睛窗口尺寸
  const eyeWidth = width * mobileEyeScale / 2;
  const eyeHeight = height * mobileEyeScale;

  // 左右眼整体占用宽度
  const totalEyeWidth = eyeWidth * 2 + mobileEyeGap;

  // 让左右眼画面整体居中
  const startX = (width - totalEyeWidth) / 2;
  const eyeY = (height - eyeHeight) / 2;

  const leftX = startX;
  const rightX = startX + eyeWidth + mobileEyeGap;

  // 黑色背景
  renderer.setClearColor(0x000000, 1);
  renderer.clear();

  renderer.setScissorTest(true);

  // ===============================
  // 左眼画面
  // ===============================
  renderer.setViewport(
    leftX,
    eyeY,
    eyeWidth,
    eyeHeight
  );

  renderer.setScissor(
    leftX,
    eyeY,
    eyeWidth,
    eyeHeight
  );

  renderer.render(scene, leftCamera);

  // ===============================
  // 右眼画面
  // ===============================
  renderer.setViewport(
    rightX,
    eyeY,
    eyeWidth,
    eyeHeight
  );

  renderer.setScissor(
    rightX,
    eyeY,
    eyeWidth,
    eyeHeight
  );

  renderer.render(scene, rightCamera);

  renderer.setScissorTest(false);
  updateMobileFrameOverlay();
}

function updateMobileFrameOverlay() {
  const overlay = document.querySelector("#vr-frame-overlay");
  const leftFrame = document.querySelector(".left-eye-frame");
  const rightFrame = document.querySelector(".right-eye-frame");

  if (!overlay || !leftFrame || !rightFrame) return;

  const width = window.innerWidth;
  const height = window.innerHeight;

  const eyeWidth = width * mobileEyeScale / 2;
  const eyeHeight = height * mobileEyeScale;

  const totalEyeWidth = eyeWidth * 2 + mobileEyeGap;

  const startX = (width - totalEyeWidth) / 2;
  const eyeY = (height - eyeHeight) / 2;

  const leftX = startX;
  const rightX = startX + eyeWidth + mobileEyeGap;

  leftFrame.style.left = `${leftX}px`;
  leftFrame.style.top = `${eyeY}px`;
  leftFrame.style.width = `${eyeWidth}px`;
  leftFrame.style.height = `${eyeHeight}px`;
  leftFrame.style.borderRadius = "0px";

  rightFrame.style.left = `${rightX}px`;
  rightFrame.style.top = `${eyeY}px`;
  rightFrame.style.width = `${eyeWidth}px`;
  rightFrame.style.height = `${eyeHeight}px`;
  rightFrame.style.borderRadius = "0px";
}

function updateInfo(text) {
  const infoText = document.querySelector("#info p");

  if (infoText) {
    infoText.textContent = text;
  }
}

function onWindowResize() {
  if (!camera || !renderer) return;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );

  if (leftCamera && rightCamera) {
    leftCamera.aspect = window.innerWidth / 2 / window.innerHeight;
    rightCamera.aspect = window.innerWidth / 2 / window.innerHeight;

    leftCamera.updateProjectionMatrix();
    rightCamera.updateProjectionMatrix();
  }
}

function animate() {
  renderer.setAnimationLoop(() => {
    checkGamepadInput();

    if (useDeviceOrientation) {
      updateCameraByDeviceOrientation();
    } else {
      controls.update();
    }

    if (playMode === "mobile") {
      renderMobileMode();
    } else {
      renderPCMode();
    }
  });
}