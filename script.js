import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.158.0/examples/jsm/controls/OrbitControls.js";

let scene, camera, renderer, controls;

let gamepadIndex = null;

let targetFov = 75;
const minFov = 35;
const maxFov = 90;
const zoomSpeed = 0.8;
const deadZone = 0.15;

let fogOverlay = null;
let isLevelTransitioning = false;

let useDeviceOrientation = false;
let latestDeviceOrientation = null;

let playMode = null;

let leftCamera, rightCamera;
const eyeOffset = 0.03;

// ===============================
// 移动端 VR 盒子显示参数
// ===============================

const mobileEyeScale = 0.72;
const mobileEyeGap = 80;
const mobileEyeRadius = 999;

// ===============================
// 三关场景系统
// ===============================

const levelOrder = ["floor1", "floor2", "floor3"];
let currentLevelIndex = 0;
let currentLevelName = levelOrder[currentLevelIndex];

let panoramas = {};

const levelDisplayNames = {
  floor1: "F1 一楼走廊",
  floor2: "F2 室外空地",
  floor3: "F3 二楼中庭"
};

// ===============================
// 每关意象与声音配置
// 后续主要改这里
// ===============================

const levelData = {
  floor1: {
  title: "F1 一楼走廊",
  objects: [
    {
  id: "f1-fish",
  label: "金鱼",
  soundName: "门口鱼缸水流声",
  audioSrc: "./assets/sounds/f1-01.mp3",
  imageSrc: "./assets/f1-images/f1-fish.png",
  solidOutlineSrc: "./assets/f1-images/f1-fish-selected.png",
  position: createPositionByAngle(-45, 8, 5)
},
    {
      id: "f1-moth",
      label: "蛾子",
      soundName: "蝉鸣声",
      audioSrc: "./assets/sounds/f1-02.mp3",
      imageSrc: "./assets/f1-images/f1-moth.png",
      solidOutlineSrc: "./assets/f1-images/f1-moth-selected.png",
      position: createPositionByAngle(25, 5, 5)
    },
    {
      id: "f1-lilac",
      label: "紫丁香",
      soundName: "寂静中的风声",
      audioSrc: "./assets/sounds/f1-03.mp3",
      imageSrc: "./assets/f1-images/f1-flower.png",
      solidOutlineSrc: "./assets/f1-images/f1-flower-selected.png",
      position: createPositionByAngle(90, 10, 5)
    },
    {
      id: "f1-red-door",
      label: "红门",
      soundName: "雨声",
      audioSrc: "./assets/sounds/f1-04.mp3",
      imageSrc: "./assets/f1-images/f1-reddoor.png",
      solidOutlineSrc: "./assets/f1-images/f1-reddoor-selected.png",
      position: createPositionByAngle(155, 6, 5)
    },
    {
      id: "f1-tile",
      label: "花砖",
      soundName: "风吹树叶的声音",
      audioSrc: "./assets/sounds/f1-05.mp3",
      imageSrc: "./assets/f1-images/f1-tili.png",
      solidOutlineSrc: "./assets/f1-images/f1-tili-selected.png",
      position: createPositionByAngle(-140, 12, 5)
    }
  ]
},

  floor2: {
    title: "F2 室外空地",
    objects: [
      {
        id: "f2-guitar",
        label: "吉他",
        soundName: "吉他",
        audioSrc: "./assets/sounds/f2-01.mp3",
        position: createPositionByAngle(-55, 8, 5)
      },
      {
        id: "f2-piano",
        label: "钢琴键",
        soundName: "钢琴",
        audioSrc: "./assets/sounds/f2-02.mp3",
        position: createPositionByAngle(15, 7, 5)
      },
      {
        id: "f2-glass",
        label: "玻璃碎片",
        soundName: "舞蹈律动声音",
        audioSrc: "./assets/sounds/f2-03.mp3",
        position: createPositionByAngle(75, 12, 5)
      },
      {
        id: "f2-leaf",
        label: "树叶",
        soundName: "阳光的声音",
        audioSrc: "./assets/sounds/f2-04.mp3",
        position: createPositionByAngle(145, 8, 5)
      },
      {
        id: "f2-stone",
        label: "小石头",
        soundName: "石质乐器的声音",
        audioSrc: "./assets/sounds/f2-05.mp3",
        position: createPositionByAngle(-145, 5, 5)
      }
    ]
  },

  floor3: {
    title: "F3 二楼中庭",
    objects: [
      {
        id: "f3-book",
        label: "绘本",
        soundName: "木地板脚步声",
        audioSrc: "./assets/sounds/f3-01.mp3",
        position: createPositionByAngle(-60, 6, 5)
      },
      {
        id: "f3-camera",
        label: "相机",
        soundName: "清晨阳光洒落的声音",
        audioSrc: "./assets/sounds/f3-02.mp3",
        position: createPositionByAngle(10, 10, 5)
      },
      {
        id: "f3-doll",
        label: "玩偶",
        soundName: "灰尘漂浮的声音",
        audioSrc: "./assets/sounds/f3-03.mp3",
        position: createPositionByAngle(75, 8, 5)
      },
      {
        id: "f3-hand",
        label: "木制的手",
        soundName: "轻微触碰木头的声音",
        audioSrc: "./assets/sounds/f3-04.mp3",
        position: createPositionByAngle(145, 9, 5)
      },
      {
        id: "f3-pupa",
        label: "茧",
        soundName: "细小的生命声",
        audioSrc: "./assets/sounds/f3-05.mp3",
        position: createPositionByAngle(-145, 7, 5)
      }
    ]
  }
};

// ===============================
// 交互对象状态
// ===============================

const interactiveObjects = [];
let selectableObjects = [];
let selectedIndex = 0;

const activeAudios = {};
const confirmedSoundIds = new Set();

let finishHintSprite = null;
let finishHintTimer = null;

const playedSoundRecords = {
  floor1: [],
  floor2: [],
  floor3: []
};

// A键防止长按连续触发
let previousAButtonPressed = false;

// 摇杆防止连续快速跳动
let previousStickDirection = 0;
let lastStickMoveTime = 0;
const stickMoveCooldown = 260;

let previousDownStickPressed = false;

// ===============================
// 初始化
// ===============================

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
    updateInfo("PC模式：鼠标拖动环顾场景 / A确认 / 左右键切换 / LT放大 / RT缩小");
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

  fogOverlay = document.querySelector("#fog-overlay");

  // ===============================
  // 修改：三关六面图加载
  // 原本 initScene 里的 const texture = loader.load(...) 已经删掉
  // ===============================

  const loader = new THREE.CubeTextureLoader();
  loader.setPath("./assets/images/");

  panoramas = {
    floor1: loader.load([
      "px.png",
      "nx.png",
      "py.png",
      "ny.png",
      "pz.png",
      "nz.png"
    ]),

    floor2: loader.load([
      "2-4.png", // px
      "2-1.png", // nx
      "2-5.png", // py
      "2-2.png", // ny
      "2-6.png", // pz
      "2-3.png"  // nz
    ]),

    floor3: loader.load([
      "3-4.png", // px
      "3-1.png", // nx
      "3-5.png", // py
      "3-2.png", // ny
      "3-6.png", // pz
      "3-3.png"  // nz
    ])
  };

  scene.background = panoramas.floor1;

  setupStereoCameras();
  setupGamepadTest();
  setupDeviceOrientation();

  loadLevel("floor1");

  // 键盘测试：
  // ArrowLeft / ArrowRight = 模拟摇杆左右切换
  // Space / Enter = 模拟 A 键
  window.addEventListener("keydown", handleKeyboardTest);

  window.addEventListener("resize", onWindowResize);
}

// ===============================
// 根据角度生成物体在VR空间中的位置
// ===============================

function createPositionByAngle(yawDeg, pitchDeg, radius) {
  const yaw = THREE.MathUtils.degToRad(yawDeg);
  const pitch = THREE.MathUtils.degToRad(pitchDeg);

  const x = Math.sin(yaw) * Math.cos(pitch) * radius;
  const y = Math.sin(pitch) * radius;
  const z = -Math.cos(yaw) * Math.cos(pitch) * radius;

  return new THREE.Vector3(x, y, z);
}

// ===============================
// 加载当前关卡
// ===============================

function loadLevel(levelName) {
  clearInteractiveObjects();

  currentLevelName = levelName;

  const data = levelData[levelName];

  if (!data) return;

  data.objects.forEach((item, index) => {
    const objectGroup = createFloatingObject(item, index);
    scene.add(objectGroup);
  });

  const finishButton = createFinishButton();
  scene.add(finishButton);

  // 每次进入新关卡，随机选择一个意象作为初始预选
  // 注意：只从声音意象里随机，不从“完成”按钮里随机
  selectedIndex = Math.floor(Math.random() * data.objects.length);

  updateSelectionInfo();
}

// ===============================
// 创建完成按钮
// ===============================

function createFinishButton() {
  const group = new THREE.Group();

  // 初始位置随便给一个，后面每一帧会自动跟随摄像机
  group.position.copy(createPositionByAngle(0, -12, 4.5));

  // 标记这是一个跟随摄像机的按钮
  group.userData.followCamera = true;

  const geometry = new THREE.TorusGeometry(0.32, 0.035, 16, 48);

  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9
  });

  const ring = new THREE.Mesh(geometry, material);

  ring.userData.type = "finish-button";
  ring.userData.label = "完成";
  ring.userData.parentGroup = group;

  // 新增：记录完成按钮的基础大小
  // 后面 updateObjectVisualStates 里会用它来控制选中放大
  ring.userData.baseScale = new THREE.Vector3(1, 1, 1);

  group.add(ring);

  const dashedRing = createDashedSelectionRing(0.48);
  dashedRing.visible = false;
  group.add(dashedRing);

  const solidRing = createSolidConfirmedRing(0.48);
  solidRing.visible = false;
  group.add(solidRing);

  const labelSprite = createTextSprite("完成");
  labelSprite.position.set(0, -0.62, 0);
  group.add(labelSprite);

  group.userData.floatOffset = 9;
  group.userData.mainMesh = ring;
  group.userData.dashedRing = dashedRing;
  group.userData.solidRing = solidRing;
  group.userData.labelSprite = labelSprite;

  interactiveObjects.push(ring);
  selectableObjects.push(ring);

  return group;
}

// ===============================
// 清除上一关物体
// ===============================

function clearInteractiveObjects() {
  interactiveObjects.forEach((mesh) => {
    if (mesh.userData.parentGroup) {
      scene.remove(mesh.userData.parentGroup);
    }
  });

  interactiveObjects.length = 0;
  selectableObjects.length = 0;

  finishHintSprite = null;

if (finishHintTimer) {
  clearTimeout(finishHintTimer);
  finishHintTimer = null;
}
}

// ===============================
// 创建漂浮意象
// 当前先用球体占位
// 之后可以把球体替换成图片、模型或更抽象的造型
// ===============================

// ===============================
// 创建漂浮意象（支持预选白色滤镜 + 确认实线轮廓）
// ===============================
function createFloatingObject(item, index) {
  const group = new THREE.Group();
  group.position.copy(item.position);
  group.userData.basePosition = item.position.clone();

  const imageSize = 1.35;

  const texture = new THREE.TextureLoader().load(item.imageSrc);
  texture.colorSpace = THREE.SRGBColorSpace;

  const mainMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    depthTest: false
  });

  const mainMesh = new THREE.Sprite(mainMaterial);
  mainMesh.scale.set(imageSize, imageSize, 1);
  mainMesh.renderOrder = 1;

  mainMesh.userData.baseScale = new THREE.Vector3(imageSize, imageSize, 1);
  mainMesh.userData.type = "sound-object";
  mainMesh.userData.soundId = item.id;
  mainMesh.userData.label = item.label;
  mainMesh.userData.soundName = item.soundName;
  mainMesh.userData.audioSrc = item.audioSrc;
  mainMesh.userData.parentGroup = group;

  group.add(mainMesh);

  // ============================
  // 预选效果：白色滤镜层
  // 调整预选明显程度主要看这里的 opacity
  // ============================
  const highlightMaterial = new THREE.SpriteMaterial({
    map: texture,
    color: 0xffffff,
    transparent: true,
    opacity: 0.68,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending
  });

  const highlightSprite = new THREE.Sprite(highlightMaterial);
  highlightSprite.scale.set(imageSize, imageSize, 1);
  highlightSprite.renderOrder = 2;
  highlightSprite.visible = false;

  group.add(highlightSprite);
  group.userData.highlightSprite = highlightSprite;

  // ============================
  // 确认效果：白色实线轮廓贴图
  // 调整确认描边明显程度主要看这里的 opacity 和 outlineScale
  // ============================
  if (item.solidOutlineSrc) {
    const solidTexture = new THREE.TextureLoader().load(item.solidOutlineSrc);
    solidTexture.colorSpace = THREE.SRGBColorSpace;

    const solidMaterial = new THREE.SpriteMaterial({
      map: solidTexture,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending
    });

    const solidOutlineSprite = new THREE.Sprite(solidMaterial);

    // 描边贴图可以比原图稍微大一点点，更容易看见
    const outlineScale = 1.08;
    solidOutlineSprite.scale.set(
      imageSize * outlineScale,
      imageSize * outlineScale,
      1
    );

    solidOutlineSprite.renderOrder = 3;
    solidOutlineSprite.visible = false;

    group.add(solidOutlineSprite);
    group.userData.solidOutlineSprite = solidOutlineSprite;
    group.userData.solidOutlineBaseScale = new THREE.Vector3(
      imageSize * outlineScale,
      imageSize * outlineScale,
      1
    );
  }

  const labelSprite = createTextSprite(item.label);
  labelSprite.position.set(0, -1.05, 0);
  labelSprite.renderOrder = 4;
  group.add(labelSprite);

  group.userData.floatOffset = index * 0.8;
  group.userData.mainMesh = mainMesh;
  group.userData.labelSprite = labelSprite;
  group.userData.highlightBaseScale = new THREE.Vector3(imageSize, imageSize, 1);

  interactiveObjects.push(mainMesh);
  selectableObjects.push(mainMesh);

  return group;
}
// ===============================
// 新增：虚线预选描边
// ===============================

function createDashedSelectionRing(radius = 0.4) {
  const group = new THREE.Group();

  const segmentCount = 28;
  const segmentAngle = Math.PI * 2 / segmentCount;

  for (let i = 0; i < segmentCount; i++) {
    const startAngle = i * segmentAngle;
    const endAngle = startAngle + segmentAngle * 0.48;

    const curve = new THREE.EllipseCurve(
      0,
      0,
      radius,
      radius,
      startAngle,
      endAngle,
      false,
      0
    );

    const points = curve.getPoints(8);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95
    });

    const line = new THREE.Line(geometry, material);

    // 新增：记录虚线段编号，后面做流动动画
    line.userData.dashIndex = i;

    group.add(line);
  }

  group.position.z = 0.03;

  // 新增：标记这是蚂蚁线描边
  group.userData.isMarchingDash = true;
  group.userData.segmentCount = segmentCount;

  return group;
}
// ===============================
// 新增：确认后的实线发光描边
// ===============================

function createSolidConfirmedRing(radius = 0.42) {
  const group = new THREE.Group();

  const outerGeometry = new THREE.TorusGeometry(radius, 0.018, 12, 96);
  const outerMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.95
  });

  const outerRing = new THREE.Mesh(outerGeometry, outerMaterial);
  group.add(outerRing);

  const glowGeometry = new THREE.TorusGeometry(radius, 0.055, 12, 96);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.2
  });

  const glowRing = new THREE.Mesh(glowGeometry, glowMaterial);
  group.add(glowRing);

  group.position.z = 0.025;
  return group;
}

// ===============================
// 创建文字标签
// ===============================

function createTextSprite(text) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = 512;
  canvas.height = 180;

  context.clearRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "rgba(0, 0, 0, 0.48)";
  roundRect(context, 36, 44, 440, 92, 46);
  context.fill();

  context.font = "bold 44px Arial";
  context.fillStyle = "white";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, canvas.width / 2, canvas.height / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.45, 0.5, 1);

  return sprite;
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

// ===============================
// 摇杆切换当前预选对象
// ===============================

function moveSelection(direction) {
  if (selectableObjects.length === 0) return;

  const soundObjectCount = selectableObjects.filter((object) => {
    return object.userData.type === "sound-object";
  }).length;

  if (soundObjectCount === 0) return;

  // 如果当前选中的是“完成”，左右拨动时先回到第一个或最后一个意象
  const currentObject = getSelectedObject();

  if (currentObject?.userData.type === "finish-button") {
    selectedIndex = direction > 0 ? 0 : soundObjectCount - 1;
    updateSelectionInfo();
    return;
  }

  selectedIndex += direction;

  if (selectedIndex < 0) {
    selectedIndex = soundObjectCount - 1;
  }

  if (selectedIndex >= soundObjectCount) {
    selectedIndex = 0;
  }

  updateSelectionInfo();
}

// ===============================
// 更新当前选择提示
// ===============================

function updateSelectionInfo() {
  const selectedObject = getSelectedObject();

  if (!selectedObject) return;

  const label = selectedObject.userData.label;
  const type = selectedObject.userData.type;
  const soundId = selectedObject.userData.soundId;
  const isConfirmed = soundId && confirmedSoundIds.has(soundId);

  if (type === "finish-button") {
    updateInfo(`${levelDisplayNames[currentLevelName]} | 当前预选：完成 | 按A进入下一关`);
    return;
  }

  if (isConfirmed) {
    updateInfo(`${levelDisplayNames[currentLevelName]} | 当前选择：${label} | 已确认，按A可取消`);
  } else {
    updateInfo(`${levelDisplayNames[currentLevelName]} | 当前预选：${label} | 按A确认播放声音`);
  }
}

function getSelectedObject() {
  return selectableObjects[selectedIndex] || null;
}

function hasConfirmedObjectInCurrentLevel() {
  const currentObjects = levelData[currentLevelName]?.objects || [];

  return currentObjects.some((item) => {
    return confirmedSoundIds.has(item.id);
  });
}

function showFinishHint() {
  const finishObject = selectableObjects[selectableObjects.length - 1];

  if (!finishObject) return;

  const finishGroup = finishObject.userData.parentGroup;

  if (!finishGroup) return;

  if (!finishHintSprite) {
    finishHintSprite = createSmallHintSprite("请选择一个或以上的意象组成乐曲");
    finishHintSprite.position.set(1.25, 0.15, 0);
    finishGroup.add(finishHintSprite);
  }

  finishHintSprite.visible = true;

  if (finishHintTimer) {
    clearTimeout(finishHintTimer);
  }

  finishHintTimer = setTimeout(() => {
    if (finishHintSprite) {
      finishHintSprite.visible = false;
    }
  }, 2200);
}

function createSmallHintSprite(text) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = 900;
  canvas.height = 180;

  context.clearRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "rgba(0, 0, 0, 0.62)";
  roundRect(context, 36, 42, 828, 96, 48);
  context.fill();

  context.font = "bold 38px Arial";
  context.fillStyle = "white";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, canvas.width / 2, canvas.height / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2.6, 0.52, 1);
  sprite.visible = false;

  return sprite;
}

// ===============================
// A键确认当前对象
// ===============================

function handleAButtonClick() {
  const selectedObject = getSelectedObject();

  if (!selectedObject) {
    updateInfo(`${levelDisplayNames[currentLevelName]} | 当前没有可选择对象`);
    return;
  }

  const type = selectedObject.userData.type;

  if (type === "sound-object") {
    toggleSoundObjectConfirm(selectedObject);
    return;
  }

  if (type === "finish-button") {
    if (!hasConfirmedObjectInCurrentLevel()) {
      showFinishHint();
      updateInfo(`${levelDisplayNames[currentLevelName]} | 请至少选择一个意象后再完成`);
      return;
    }

    goToNextLevel();
  }
}

// ===============================
// 确认 / 取消确认声音物体
// ===============================

function toggleSoundObjectConfirm(mesh) {
  const soundId = mesh.userData.soundId;

  if (!soundId) return;

  if (confirmedSoundIds.has(soundId)) {
    confirmedSoundIds.delete(soundId);
    stopSound(mesh);
    updateInfo(`${levelDisplayNames[currentLevelName]} | 已取消：${mesh.userData.label}`);
  } else {
    confirmedSoundIds.add(soundId);
    playSound(mesh);

    if (!playedSoundRecords[currentLevelName].includes(soundId)) {
      playedSoundRecords[currentLevelName].push(soundId);
    }

    updateInfo(`${levelDisplayNames[currentLevelName]} | 已确认：${mesh.userData.label} / ${mesh.userData.soundName}`);
  }
}

// ===============================
// 播放声音
// ===============================

function playSound(mesh) {
  const soundId = mesh.userData.soundId;
  const audioSrc = mesh.userData.audioSrc;
  const soundName = mesh.userData.soundName;

  if (!activeAudios[soundId]) {
    const audio = new Audio(audioSrc);
    audio.loop = true;
    audio.volume = 0.75;

    activeAudios[soundId] = audio;
  }

  const audio = activeAudios[soundId];

  audio.play().catch((error) => {
    console.warn("声音播放失败：", error);
    updateInfo(`声音暂时无法播放：${soundName}。请检查音频文件路径。`);
  });
}

// ===============================
// 停止声音
// ===============================

function stopSound(mesh) {
  const soundId = mesh.userData.soundId;
  const audio = activeAudios[soundId];

  if (!audio) return;

  audio.pause();
  audio.currentTime = 0;
}

// ===============================
// 更新所有物体视觉状态
// ===============================

function updateObjectVisualStates() {
  const time = performance.now() * 0.001;

  selectableObjects.forEach((mesh, index) => {
    const group = mesh.userData.parentGroup;
    if (!group) return;

    const isSelected = index === selectedIndex;
    const isSoundObject = mesh.userData.type === "sound-object";
    const isFinishButton = mesh.userData.type === "finish-button";
    const soundId = mesh.userData.soundId;
    const isConfirmed = isSoundObject && confirmedSoundIds.has(soundId);

    // ===============================
    // 完成按钮跟随摄像机
    // ===============================
    if (group.userData.followCamera) {
      updateFinishButtonFollowCamera(group);
    } else {
      const basePosition = group.userData.basePosition;

      if (basePosition) {
        const offset = group.userData.floatOffset || 0;
        const floatY = Math.sin(time * 1.3 + offset) * 0.08;

        group.position.set(
          basePosition.x,
          basePosition.y + floatY,
          basePosition.z
        );
      }

      group.quaternion.copy(camera.quaternion);
    }

    // ===============================
    // 缩放规则
    // ===============================
    const baseScale = mesh.userData.baseScale || new THREE.Vector3(1, 1, 1);

    let scaleMultiplier = 1;

    if (isSelected) {
      if (isFinishButton) {
        scaleMultiplier = 1.28;
      } else {
        scaleMultiplier = 1.16;
      }
    }

    mesh.scale.copy(baseScale).multiplyScalar(scaleMultiplier);

    // 预选白色滤镜显示
    const highlightSprite = group.userData.highlightSprite;

    if (highlightSprite) {
      highlightSprite.visible = isSelected && !isConfirmed;

      const highlightBaseScale =
        group.userData.highlightBaseScale || baseScale;

      highlightSprite.scale
        .copy(highlightBaseScale)
        .multiplyScalar(scaleMultiplier);
    }

    // 确认白色实线描边显示
    const solidOutlineSprite = group.userData.solidOutlineSprite;

    if (solidOutlineSprite) {
      solidOutlineSprite.visible = isConfirmed;

      const solidBaseScale =
        group.userData.solidOutlineBaseScale || baseScale;

      const breatheScale = isConfirmed
        ? 1 + Math.sin(time * 2.4) * 0.025
        : 1;

      solidOutlineSprite.scale
        .copy(solidBaseScale)
        .multiplyScalar(scaleMultiplier * breatheScale);

      solidOutlineSprite.material.opacity =
        0.85 + Math.sin(time * 2.4) * 0.15;
    }

    // ===============================
    // 原图透明度
    // ===============================
    if (isSelected) {
      mesh.material.opacity = 1;
    } else if (isConfirmed) {
      mesh.material.opacity = 0.96;
    } else {
      mesh.material.opacity = 0.86;
    }
  });
}

function selectFinishButton() {
  if (selectableObjects.length === 0) return;

  // 完成按钮永远是最后一个加入 selectableObjects 的对象
  selectedIndex = selectableObjects.length - 1;

  updateSelectionInfo();
}

function updateFinishButtonFollowCamera(group) {
  if (!camera || !group) return;

  const localOffset = new THREE.Vector3(0, -0.85, -3.2);

  localOffset.applyQuaternion(camera.quaternion);

  group.position.copy(camera.position).add(localOffset);

  // 让按钮平面始终朝向玩家
  group.quaternion.copy(camera.quaternion);
}

function updateDashedRingMarching(dashedRing, time) {
  if (!dashedRing || !dashedRing.userData.isMarchingDash) return;

  const flowIndex = Math.floor(time * 10);

  dashedRing.children.forEach((segment) => {
    const dashIndex = segment.userData.dashIndex || 0;

    // 这里决定虚线的疏密和流动节奏
    const visible = (dashIndex + flowIndex) % 3 !== 0;

    segment.visible = visible;
  });
}

// ===============================
// 进入下一关
// ===============================

function goToNextLevel() {
  if (isLevelTransitioning) return;

  stopAllSoundsAndClearConfirmState();

  if (currentLevelIndex < levelOrder.length - 1) {
    currentLevelIndex += 1;
    const nextLevelName = levelOrder[currentLevelIndex];

    transitionToLevel(nextLevelName);
  } else {
    showEndingState();
  }
}

// ===============================
// 切换关卡时停止所有声音，并清空确认状态
// 每一关不可返回，所以这里清空是合理的
// 但 playedSoundRecords 会保留每关选择记录
// ===============================

function stopAllSoundsAndClearConfirmState() {
  Object.values(activeAudios).forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
  });

  confirmedSoundIds.clear();
}

// ===============================
// 带白雾过渡的关卡切换
// ===============================

function transitionToLevel(levelName) {
  isLevelTransitioning = true;

  if (fogOverlay) {
    fogOverlay.style.transition = "opacity 0.45s ease";
    fogOverlay.style.opacity = "1";
  }

  setTimeout(() => {
    scene.background = panoramas[levelName];

    loadLevel(levelName);

    targetFov = 75;
    camera.fov = targetFov;
    camera.updateProjectionMatrix();

    if (fogOverlay) {
      fogOverlay.style.opacity = "0";
    }

    setTimeout(() => {
      isLevelTransitioning = false;

      if (fogOverlay) {
        fogOverlay.style.transition = "";
      }

      updateFogByFov();
    }, 500);
  }, 450);
}

// ===============================
// 最后结束状态
// ===============================

function showEndingState() {
  clearInteractiveObjects();

  updateInfo(
    "三首声音已经完成。之后可以在这里制作总结页面，回放三关的声音作品。"
  );

  if (fogOverlay) {
    fogOverlay.style.transition = "opacity 0.8s ease";
    fogOverlay.style.opacity = "0.18";
  }

  console.log("每关记录的声音：", playedSoundRecords);
}

// ===============================
// 键盘测试
// ===============================

function handleKeyboardTest(event) {
  if (event.code === "ArrowRight") {
    moveSelection(1);
  }

  if (event.code === "ArrowLeft") {
    moveSelection(-1);
  }

  // 新增：键盘向下也必选中完成按钮
  if (event.code === "ArrowDown") {
    selectFinishButton();
  }

  if (event.code === "Space" || event.code === "Enter") {
    handleAButtonClick();
  }
}

// ===============================
// 双眼相机
// ===============================

function setupStereoCameras() {
  leftCamera = camera.clone();
  rightCamera = camera.clone();

  leftCamera.aspect = window.innerWidth / 2 / window.innerHeight;
  rightCamera.aspect = window.innerWidth / 2 / window.innerHeight;

  leftCamera.updateProjectionMatrix();
  rightCamera.updateProjectionMatrix();
}

// ===============================
// 手柄
// ===============================

function setupGamepadTest() {
  window.addEventListener("gamepadconnected", function (event) {
    gamepadIndex = event.gamepad.index;

    console.log("手柄已连接：", event.gamepad);

    updateInfo(
      `手柄已连接：${event.gamepad.id} / 左摇杆切换 / A确认 / LT放大 / RT缩小`
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

  const pressedButtons = [];

  gamepad.buttons.forEach((button, index) => {
    if (button.pressed) {
      pressedButtons.push(index);
    }
  });

  const aButtonPressed = gamepad.buttons[0]?.pressed || false;
  const ltValue = gamepad.buttons[6]?.value || 0;
  const rtValue = gamepad.buttons[7]?.value || 0;

  const leftStickX = gamepad.axes[0] || 0;
  const leftStickY = gamepad.axes[1] || 0;

  const now = performance.now();

  // ===============================
  // 新增：左摇杆向下，必选中完成按钮
  // ===============================

  const downStickPressed = leftStickY > 0.65;

  if (downStickPressed && !previousDownStickPressed) {
    selectFinishButton();
  }

  previousDownStickPressed = downStickPressed;

  // ===============================
  // 左摇杆左右切换选项
  // 即使现在选中的是完成按钮，左右拨动也可以回到物体
  // ===============================

  let currentStickDirection = 0;

  if (leftStickX > 0.55) {
    currentStickDirection = 1;
  } else if (leftStickX < -0.55) {
    currentStickDirection = -1;
  }

  if (
    currentStickDirection !== 0 &&
    (
      previousStickDirection === 0 ||
      now - lastStickMoveTime > stickMoveCooldown
    )
  ) {
    moveSelection(currentStickDirection);
    lastStickMoveTime = now;
  }

  previousStickDirection = currentStickDirection;

  // ===============================
  // LT / RT 控制放大缩小
  // LT 放大：FOV变小
  // RT 缩小：FOV变大
  // ===============================

  if (ltValue > deadZone) {
    targetFov -= ltValue * zoomSpeed;
  }

  if (rtValue > deadZone) {
    targetFov += rtValue * zoomSpeed;
  }

  targetFov = THREE.MathUtils.clamp(
    targetFov,
    minFov,
    maxFov
  );

  camera.fov = THREE.MathUtils.lerp(
    camera.fov,
    targetFov,
    0.08
  );

  camera.updateProjectionMatrix();
  updateFogByFov();

  // ===============================
  // A键确认
  // 只在刚按下时触发一次
  // ===============================

  if (aButtonPressed && !previousAButtonPressed) {
    handleAButtonClick();
  }

  previousAButtonPressed = aButtonPressed;
}

// ===============================
// 雾气效果
// ===============================

function updateFogByFov() {
  if (!fogOverlay) return;
  if (isLevelTransitioning) return;

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

// ===============================
// 手机陀螺仪
// ===============================

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

// ===============================
// 移动端双眼渲染
// ===============================

function updateStereoCameras() {
  leftCamera.position.copy(camera.position);
  rightCamera.position.copy(camera.position);

  leftCamera.quaternion.copy(camera.quaternion);
  rightCamera.quaternion.copy(camera.quaternion);

  leftCamera.fov = camera.fov;
  rightCamera.fov = camera.fov;

  const eyeWidth = window.innerWidth * mobileEyeScale / 2;
  const eyeHeight = window.innerHeight * mobileEyeScale;

  leftCamera.aspect = eyeWidth / eyeHeight;
  rightCamera.aspect = eyeWidth / eyeHeight;

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

  const eyeWidth = width * mobileEyeScale / 2;
  const eyeHeight = height * mobileEyeScale;

  const totalEyeWidth = eyeWidth * 2 + mobileEyeGap;

  const startX = (width - totalEyeWidth) / 2;
  const eyeY = (height - eyeHeight) / 2;

  const leftX = startX;
  const rightX = startX + eyeWidth + mobileEyeGap;

  renderer.setClearColor(0x000000, 1);
  renderer.clear();

  renderer.setScissorTest(true);

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

// ===============================
// UI提示
// ===============================

function updateInfo(text) {
  const infoText = document.querySelector("#info p");

  if (infoText) {
    infoText.textContent = text;
  }
}

// ===============================
// 窗口尺寸变化
// ===============================

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

// ===============================
// 动画循环
// ===============================

function animate() {
  renderer.setAnimationLoop(() => {
    checkGamepadInput();

    if (useDeviceOrientation) {
      updateCameraByDeviceOrientation();
    } else {
      controls.update();
    }

    updateObjectVisualStates();

    if (playMode === "mobile") {
      renderMobileMode();
    } else {
      renderPCMode();
    }
  });
}