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

  renderer = new THREE.WebGLRenderer({
    antialias: true
  });

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.rotateSpeed = -0.35;

  const loader = new THREE.CubeTextureLoader();

  // 注意：这里是你现在的新图片目录
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

  setupGamepadTest();
  setupDeviceOrientation();

  window.addEventListener("resize", onWindowResize);
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
    controls.enabled = false;

    orientationButton.classList.add("hidden");

    updateInfo("手机陀螺仪已开启：转动手机即可环顾场景");
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

// 这一段是手机陀螺仪方向换算
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

function updateInfo(text) {
  const infoText = document.querySelector("#info p");

  if (infoText) {
    infoText.textContent = text;
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );
}

function animate() {
  renderer.setAnimationLoop(() => {
    checkGamepadInput();

    if (useDeviceOrientation) {
      updateCameraByDeviceOrientation();
    } else {
      controls.update();
    }

    renderer.render(scene, camera);
  });
}