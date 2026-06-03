// ===============================
// 手机访问提示隐藏导航栏
// ===============================
window.addEventListener("load", () => {
  // 仅在移动端触发
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    const hideNav = confirm("检测到移动设备，是否隐藏浏览器顶部导航栏以便更好操作右下角VR按钮？");

    if (hideNav) {
      // 尝试请求全屏
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else if (docEl.webkitRequestFullscreen) { // Safari
        docEl.webkitRequestFullscreen();
      } else if (docEl.msRequestFullscreen) { // IE11
        docEl.msRequestFullscreen();
      }

      // 简单调整 body 样式，避免顶部占位
      document.body.style.marginTop = "0";
      document.body.style.overflow = "hidden";
    }
  }
});
// ===============================
// 基础变量
// ===============================

const THREE = AFRAME.THREE;

let sceneEl = null;
let levelRoot = null;
let cameraEl = null;
let cameraObject = null;

let gamepadIndex = null;
let controlMode = "gaze"; // "gamepad" 或 "gaze"
let hasEnteredScene = false;

let currentLevelIndex = 0;
const levelOrder = ["floor1", "floor2", "floor3"];
let currentLevelName = levelOrder[currentLevelIndex];

let panoramas = {};
let isLevelTransitioning = false;

const interactiveObjects = [];
let selectableObjects = [];
let selectedIndex = 0;

const activeAudios = {};
const confirmedSoundIds = new Set();

let previousAButtonPressed = false;
let previousStickDirection = 0;
let lastStickMoveTime = 0;
const stickMoveCooldown = 260;
let previousDownStickPressed = false;

let finishHintEl = null;
let finishHintTimer = null;

const playedSoundRecords = {
  floor1: [],
  floor2: [],
  floor3: []
};

const levelDisplayNames = {
  floor1: "F1 一楼走廊",
  floor2: "F2 室外空地",
  floor3: "F3 二楼中庭"
};

// ===============================
// 可调节视觉参数
// ===============================

const IMAGE_SIZE = 1.35;

// 预选白色滤镜强度：越大越白，建议 0.55 - 0.9
const PRESELECT_WHITE_OPACITY = 0.72;

// 预选放大程度：越大越明显，建议 1.08 - 1.25
const PRESELECT_SCALE = 1.16;

// 确认描边贴图大小：如果描边看不明显，可以调到 1.12 / 1.18
const OUTLINE_SCALE = 1.1;

// ===============================
// 三关数据
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
        id: "f1-cricket",
        label: "蛐蛐",
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
// 初始化
// ===============================

window.addEventListener("DOMContentLoaded", () => {
  sceneEl = document.querySelector("#vr-scene");
  levelRoot = document.querySelector("#level-root");
  cameraEl = document.querySelector("#main-camera");

  sceneEl.addEventListener("loaded", () => {
    cameraObject = cameraEl.object3D;
    loadPanoramas();
  });

  initLoadingFlow();
  setupGuideButtons();
  setupKeyboardInput();
  setupGamepadEvents();
  setupImageFallbacks();

  requestAnimationFrame(updateLoop);
});

// ===============================
// 加载流程
// ===============================

function initLoadingFlow() {
  const loadingPanel = document.querySelector("#loading-panel");
  const detectPanel = document.querySelector("#detect-panel");
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
        detectPanel.classList.remove("hidden");
        startControllerDetection();
      }, 300);
    }

    loadingBar.style.width = `${progress}%`;
    loadingText.textContent = `Loading ${Math.round(progress)}%`;
  }, intervalTime);
}

function startControllerDetection() {
  const detectText = document.querySelector("#detect-text");

  let elapsed = 0;
  const detectDuration = 5000;
  const intervalTime = 250;

  const timer = setInterval(() => {
    elapsed += intervalTime;

    const gamepad = findConnectedGamepad();

    if (gamepad) {
      clearInterval(timer);
      gamepadIndex = gamepad.index;
      controlMode = "gamepad";
      showControllerGuide();
      return;
    }

    const leftSeconds = Math.max(0, Math.ceil((detectDuration - elapsed) / 1000));
    detectText.textContent = `正在检测手柄连接，请稍候... ${leftSeconds}s`;

    if (elapsed >= detectDuration) {
      clearInterval(timer);
      controlMode = "gaze";
      showGazeGuide();
    }
  }, intervalTime);
}

function showControllerGuide() {
  document.querySelector("#detect-panel").classList.add("hidden");
  document.querySelector("#controller-guide-panel").classList.remove("hidden");
}

function showGazeGuide() {
  document.querySelector("#detect-panel").classList.add("hidden");
  document.querySelector("#gaze-guide-panel").classList.remove("hidden");
}
// ===============================
// 加载流程
// ===============================

// ===============================
// 手机教学页进入场景逻辑改进
// ===============================
function setupGuideButtonsAndFullScreen() {
  const controllerBtn = document.querySelector("#enter-controller-btn");
  const gazeBtn = document.querySelector("#enter-gaze-btn");
  const sceneEl = document.querySelector("#vr-scene");

  // 统一绑定事件
  const enterHandler = () => {
    if (hasEnteredScene) return;
    hasEnteredScene = true;

    // 隐藏教学界面
    document.querySelector("#start-screen").classList.add("hidden");
    document.querySelector("#info").classList.remove("hidden");
    sceneEl.classList.remove("hidden");

    // 手机端全屏请求
    const docEl = document.documentElement;
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen().catch(() => {});
    } else if (docEl.webkitRequestFullscreen) { // Safari
      docEl.webkitRequestFullscreen();
    } else if (docEl.msRequestFullscreen) { // IE11
      docEl.msRequestFullscreen();
    }

    // 判断控制方式
    const gazeCursor = document.querySelector("#gaze-cursor");
    if (controlMode === "gaze") {
      gazeCursor.classList.remove("hidden");
      gazeCursor.setAttribute("visible", true);
      updateInfo("眼神控制：看向意象预选，点击屏幕确认 / 取消");
    } else {
      gazeCursor.classList.add("hidden");
      gazeCursor.setAttribute("visible", false);
      updateInfo("手柄模式：左摇杆切换 / 向下选择完成 / A确认");
    }

    // 初始化第一关
    currentLevelIndex = 0;
    currentLevelName = levelOrder[currentLevelIndex];
    setPanorama(currentLevelName);
    loadLevel(currentLevelName);
  };

  controllerBtn.addEventListener("click", enterHandler);
  gazeBtn.addEventListener("click", enterHandler);

  // 手机触摸也能进入场景
  sceneEl.addEventListener("touchstart", (e) => {
    if (!hasEnteredScene) enterHandler();
  });

  // 键盘 Enter 也可以进入
  window.addEventListener("keydown", (e) => {
    if (!hasEnteredScene && e.code === "Enter") enterHandler();
  });
}

// ===============================
// 图片资源预加载，解决手机端不显示问题
// ===============================
function preloadAssets() {
  const assetsEl = document.querySelector("a-assets");
  Object.values(levelData).forEach((level) => {
    level.objects.forEach((item) => {
      if (item.imageSrc) {
        const img = document.createElement("img");
        const id = item.id + "-img";
        img.setAttribute("id", id);
        img.setAttribute("src", item.imageSrc);
        assetsEl.appendChild(img);
      }
      if (item.solidOutlineSrc) {
        const outline = document.createElement("img");
        const id = item.id + "-outline";
        outline.setAttribute("id", id);
        outline.setAttribute("src", item.solidOutlineSrc);
        assetsEl.appendChild(outline);
      }
    });
  });
}

// ===============================
// 页面加载时调用
// ===============================


function showControllerGuide() {
  document.querySelector("#detect-panel").classList.add("hidden");
  document.querySelector("#controller-guide-panel").classList.remove("hidden");
}

function showGazeGuide() {
  document.querySelector("#detect-panel").classList.add("hidden");
  document.querySelector("#gaze-guide-panel").classList.remove("hidden");
}

function setupGuideButtons() {
  document.querySelector("#enter-controller-btn").addEventListener("click", enterScene);
  document.querySelector("#enter-gaze-btn").addEventListener("click", enterScene);
}

function setupImageFallbacks() {
  const guideImages = document.querySelectorAll(".guide-image");

  guideImages.forEach((image) => {
    image.addEventListener("error", () => {
      image.style.display = "none";
    });
  });
}

function enterScene() {
  if (hasEnteredScene) return;

  hasEnteredScene = true;

  document.querySelector("#start-screen").classList.add("hidden");
  document.querySelector("#info").classList.remove("hidden");
  sceneEl.classList.remove("hidden");

  const gazeCursor = document.querySelector("#gaze-cursor");

  if (controlMode === "gaze") {
    gazeCursor.classList.remove("hidden");
    gazeCursor.setAttribute("visible", true);
    updateInfo("眼神控制：看向意象预选，点击屏幕确认 / 取消");
  } else {
    gazeCursor.classList.add("hidden");
    gazeCursor.setAttribute("visible", false);
    updateInfo("手柄模式：左摇杆切换 / 向下选择完成 / A确认");
  }

  currentLevelIndex = 0;
  currentLevelName = levelOrder[currentLevelIndex];

  setPanorama(currentLevelName);
  loadLevel(currentLevelName);
}

// ===============================
// A-Frame / Three.js 六面图背景
// ===============================

function loadPanoramas() {
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
      "2-4.png",
      "2-1.png",
      "2-5.png",
      "2-2.png",
      "2-6.png",
      "2-3.png"
    ]),

    floor3: loader.load([
      "3-4.png",
      "3-1.png",
      "3-5.png",
      "3-2.png",
      "3-6.png",
      "3-3.png"
    ])
  };
}

function setPanorama(levelName) {
  if (!sceneEl || !panoramas[levelName]) return;
  sceneEl.object3D.background = panoramas[levelName];
}

// ===============================
// 根据角度生成物体位置
// ===============================

function createPositionByAngle(yawDeg, pitchDeg, radius) {
  const yaw = THREE.MathUtils.degToRad(yawDeg);
  const pitch = THREE.MathUtils.degToRad(pitchDeg);

  const x = Math.sin(yaw) * Math.cos(pitch) * radius;
  const y = Math.sin(pitch) * radius;
  const z = -Math.cos(yaw) * Math.cos(pitch) * radius;

  return new THREE.Vector3(x, y, z);
}

function vectorToPositionString(vector) {
  return `${vector.x} ${vector.y} ${vector.z}`;
}

// ===============================
// 加载关卡
// ===============================

function loadLevel(levelName) {
  clearInteractiveObjects();

  currentLevelName = levelName;

  const data = levelData[levelName];
  if (!data) return;

  data.objects.forEach((item, index) => {
    const objectEntity = createFloatingObject(item, index);
    levelRoot.appendChild(objectEntity);
  });

  const finishButton = createFinishButton();
  levelRoot.appendChild(finishButton);

  selectedIndex = Math.floor(Math.random() * data.objects.length);
  updateSelectionInfo();
  updateObjectVisualStates();
}

function clearInteractiveObjects() {
  interactiveObjects.forEach((objectData) => {
    objectData.el.remove();
  });

  interactiveObjects.length = 0;
  selectableObjects.length = 0;

  finishHintEl = null;

  if (finishHintTimer) {
    clearTimeout(finishHintTimer);
    finishHintTimer = null;
  }
}

// ===============================
// 创建漂浮意象
// ===============================

function createFloatingObject(item, index) {
  const group = document.createElement("a-entity");
  group.classList.add("interactive");

  group.setAttribute("position", vectorToPositionString(item.position));

  group.objectData = {
    type: "sound-object",
    item,
    id: item.id,
    label: item.label,
    soundName: item.soundName,
    audioSrc: item.audioSrc,
    basePosition: item.position.clone(),
    floatOffset: index * 0.8,
    baseScale: 1,
    confirmed: false
  };

  let mainImage = null;

  if (item.imageSrc) {
    mainImage = document.createElement("a-image");
    mainImage.classList.add("interactive-hitbox");
    mainImage.setAttribute("src", item.imageSrc);
    mainImage.setAttribute("width", IMAGE_SIZE);
    mainImage.setAttribute("height", IMAGE_SIZE);
    
    mainImage.setAttribute(
      "material",
      "transparent: true; opacity: 0.95; depthWrite: false; depthTest: false"
    );
    mainImage.object3D.renderOrder = 1;
    group.appendChild(mainImage);
  } else {
    mainImage = document.createElement("a-sphere");
    mainImage.classList.add("interactive-hitbox");
    mainImage.setAttribute("radius", "0.22");
    mainImage.setAttribute("color", "#ffffff");
    mainImage.setAttribute("material", "transparent: true; opacity: 0.82");
    mainImage.object3D.renderOrder = 1;
    group.appendChild(mainImage);
  }

  const highlightImage = document.createElement("a-image");

  if (item.imageSrc) {
    highlightImage.setAttribute("src", item.imageSrc);
    highlightImage.setAttribute("width", IMAGE_SIZE);
    highlightImage.setAttribute("height", IMAGE_SIZE);
    highlightImage.setAttribute(
      "material",
      `transparent: true; opacity: ${PRESELECT_WHITE_OPACITY}; color: #ffffff; blending: additive; depthWrite: false; depthTest: false`
    );
  } else {
    highlightImage.setAttribute("width", 0.7);
    highlightImage.setAttribute("height", 0.7);
    highlightImage.setAttribute(
      "material",
      `transparent: true; opacity: ${PRESELECT_WHITE_OPACITY}; color: #ffffff; depthWrite: false; depthTest: false`
    );
  }

  highlightImage.setAttribute("visible", false);
  highlightImage.setAttribute("position", "0 0 0.015");
  highlightImage.object3D.renderOrder = 2;
  group.appendChild(highlightImage);

  let solidOutlineImage = null;

  if (item.solidOutlineSrc) {
    solidOutlineImage = document.createElement("a-image");
    solidOutlineImage.setAttribute("src", item.solidOutlineSrc);
    solidOutlineImage.setAttribute("width", IMAGE_SIZE * OUTLINE_SCALE);
    solidOutlineImage.setAttribute("height", IMAGE_SIZE * OUTLINE_SCALE);
    solidOutlineImage.setAttribute(
      "material",
      "transparent: true; opacity: 1; blending: additive; depthWrite: false; depthTest: false"
    );
    solidOutlineImage.setAttribute("position", "0 0 0.03");
    solidOutlineImage.setAttribute("visible", false);
    solidOutlineImage.object3D.renderOrder = 3;
    group.appendChild(solidOutlineImage);
  }

  const label = createTextLabel(item.label);
  label.setAttribute("position", "0 -1.05 0.04");
  label.object3D.renderOrder = 4;
  group.appendChild(label);

  group.objectData.mainImage = mainImage;
  group.objectData.highlightImage = highlightImage;
  group.objectData.solidOutlineImage = solidOutlineImage;
  group.objectData.labelEntity = label;

  setupInteractiveEvents(group);

  const objectRecord = {
    el: group,
    type: "sound-object",
    id: item.id
  };

  interactiveObjects.push(objectRecord);
  selectableObjects.push(objectRecord);

  return group;
}

// ===============================
// 创建完成按钮
// ===============================

function createFinishButton() {
  const group = document.createElement("a-entity");
  group.classList.add("interactive");

  group.setAttribute("position", vectorToPositionString(createPositionByAngle(0, -12, 4.5)));

  group.objectData = {
    type: "finish-button",
    label: "完成",
    followCamera: true,
    baseScale: 1,
    floatOffset: 9
  };

  const ring = document.createElement("a-entity");
  ring.classList.add("interactive-hitbox");
  ring.setAttribute(
    "geometry",
    "primitive: torus; radius: 0.32; radiusTubular: 0.035; segmentsRadial: 16; segmentsTubular: 48"
  );
  ring.setAttribute(
    "material",
    "color: #ffffff; transparent: true; opacity: 0.9; depthWrite: false"
  );
  ring.object3D.renderOrder = 2;
  group.appendChild(ring);

  const label = createTextLabel("完成");
  label.setAttribute("position", "0 -0.62 0.04");
  label.object3D.renderOrder = 4;
  group.appendChild(label);

  group.objectData.mainImage = ring;
  group.objectData.labelEntity = label;

  setupInteractiveEvents(group);

  const objectRecord = {
    el: group,
    type: "finish-button",
    id: "finish-button"
  };

  interactiveObjects.push(objectRecord);
  selectableObjects.push(objectRecord);

  return group;
}

// ===============================
// 创建文字标签
// ===============================

function createTextLabel(text) {
  const label = document.createElement("a-entity");

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

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false
  });

  const geometry = new THREE.PlaneGeometry(1.45, 0.5);
  const mesh = new THREE.Mesh(geometry, material);

  label.setObject3D("mesh", mesh);

  return label;
}

function createSmallHintText(text) {
  const label = createTextLabel(text);
  label.setAttribute("scale", "1.75 1 1");
  label.setAttribute("position", "1.25 0.15 0.05");
  return label;
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
// 交互事件
// ===============================

function setupInteractiveEvents(group) {
  const bindTargetEvents = (target) => {
    target.addEventListener("mouseenter", () => {
      if (!hasEnteredScene) return;
      if (controlMode !== "gaze") return;

      const index = selectableObjects.findIndex((object) => {
        return object.el === group;
      });

      if (index >= 0) {
        selectedIndex = index;
        updateSelectionInfo();
        updateObjectVisualStates();
      }
    });

    target.addEventListener("click", () => {
      if (!hasEnteredScene) return;
      if (controlMode !== "gaze") return;

      const index = selectableObjects.findIndex((object) => {
        return object.el === group;
      });

      if (index >= 0) {
        selectedIndex = index;
        updateSelectionInfo();
        handleAButtonClick();
      }
    });
  };

  // 父级也绑定一次，保险
  bindTargetEvents(group);

  // 真正被 raycaster 扫到的是这些有几何体的子元素
  const hitboxes = group.querySelectorAll(".interactive-hitbox");

  hitboxes.forEach((hitbox) => {
    bindTargetEvents(hitbox);
  });
}

// ===============================
// 选择逻辑
// ===============================

function moveSelection(direction) {
  if (selectableObjects.length === 0) return;

  const soundObjectCount = selectableObjects.filter((object) => {
    return object.type === "sound-object";
  }).length;

  if (soundObjectCount === 0) return;

  const currentObject = getSelectedObject();

  if (currentObject?.type === "finish-button") {
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

function selectFinishButton() {
  if (selectableObjects.length === 0) return;

  selectedIndex = selectableObjects.length - 1;
  updateSelectionInfo();
}

function getSelectedObject() {
  return selectableObjects[selectedIndex] || null;
}

function updateSelectionInfo() {
  const selectedObject = getSelectedObject();
  if (!selectedObject) return;

  const data = selectedObject.el.objectData;
  const label = data.label;
  const type = data.type;
  const soundId = data.id;
  const isConfirmed = soundId && confirmedSoundIds.has(soundId);

  if (type === "finish-button") {
    updateInfo(`${levelDisplayNames[currentLevelName]} | 当前预选：完成 | 确认后进入下一关`);
    return;
  }

  if (isConfirmed) {
    updateInfo(`${levelDisplayNames[currentLevelName]} | 当前选择：${label} | 已确认，再次确认可取消`);
  } else {
    updateInfo(`${levelDisplayNames[currentLevelName]} | 当前预选：${label} | 确认后播放声音`);
  }
}

function hasConfirmedObjectInCurrentLevel() {
  const currentObjects = levelData[currentLevelName]?.objects || [];

  return currentObjects.some((item) => {
    return confirmedSoundIds.has(item.id);
  });
}

// ===============================
// 确认逻辑
// ===============================

function handleAButtonClick() {
  const selectedObject = getSelectedObject();

  if (!selectedObject) {
    updateInfo(`${levelDisplayNames[currentLevelName]} | 当前没有可选择对象`);
    return;
  }

  const data = selectedObject.el.objectData;

  if (data.type === "sound-object") {
    toggleSoundObjectConfirm(selectedObject.el);
    return;
  }

  if (data.type === "finish-button") {
    if (!hasConfirmedObjectInCurrentLevel()) {
      showFinishHint(selectedObject.el);
      updateInfo(`${levelDisplayNames[currentLevelName]} | 请至少选择一个意象后再完成`);
      return;
    }

    goToNextLevel();
  }
}

function toggleSoundObjectConfirm(entity) {
  const data = entity.objectData;
  const soundId = data.id;

  if (!soundId) return;

  if (confirmedSoundIds.has(soundId)) {
    confirmedSoundIds.delete(soundId);
    stopSound(soundId);
    updateInfo(`${levelDisplayNames[currentLevelName]} | 已取消：${data.label}`);
  } else {
    confirmedSoundIds.add(soundId);
    playSound(data.audioSrc, soundId, data.soundName);

    if (!playedSoundRecords[currentLevelName].includes(soundId)) {
      playedSoundRecords[currentLevelName].push(soundId);
    }

    updateInfo(`${levelDisplayNames[currentLevelName]} | 已确认：${data.label} / ${data.soundName}`);
  }

  updateObjectVisualStates();
}

function showFinishHint(finishEntity) {
  if (!finishEntity) return;

  if (!finishHintEl) {
    finishHintEl = createSmallHintText("请选择一个或以上的意象组成乐曲");
    finishEntity.appendChild(finishHintEl);
  }

  finishHintEl.setAttribute("visible", true);

  if (finishHintTimer) {
    clearTimeout(finishHintTimer);
  }

  finishHintTimer = setTimeout(() => {
    if (finishHintEl) {
      finishHintEl.setAttribute("visible", false);
    }
  }, 2200);
}

// ===============================
// 声音逻辑：文件缺失也不影响视觉
// ===============================

function playSound(audioSrc, soundId, soundName) {
  if (!audioSrc) return;

  if (!activeAudios[soundId]) {
    const audio = new Audio(audioSrc);
    audio.loop = true;
    audio.volume = 0.75;

    activeAudios[soundId] = audio;
  }

  const audio = activeAudios[soundId];

  audio.play().catch(() => {
    console.warn(`声音暂时无法播放：${soundName}，请检查音频路径：${audioSrc}`);
  });
}

function stopSound(soundId) {
  const audio = activeAudios[soundId];

  if (!audio) return;

  audio.pause();
  audio.currentTime = 0;
}

function stopAllSoundsAndClearConfirmState() {
  Object.values(activeAudios).forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
  });

  confirmedSoundIds.clear();
}

// ===============================
// 关卡切换
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

function transitionToLevel(levelName) {
  isLevelTransitioning = true;

  const fogOverlay = document.querySelector("#fog-overlay");

  fogOverlay.style.transition = "opacity 0.45s ease";
  fogOverlay.style.opacity = "1";

  setTimeout(() => {
    setPanorama(levelName);
    loadLevel(levelName);

    fogOverlay.style.opacity = "0";

    setTimeout(() => {
      isLevelTransitioning = false;
      fogOverlay.style.transition = "";
    }, 500);
  }, 450);
}

function showEndingState() {
  clearInteractiveObjects();

  updateInfo("三首声音已经完成。之后可以在这里制作总结页面，回放三关的声音作品。");

  const fogOverlay = document.querySelector("#fog-overlay");
  fogOverlay.style.transition = "opacity 0.8s ease";
  fogOverlay.style.opacity = "0.18";

  console.log("每关记录的声音：", playedSoundRecords);
}

// ===============================
// 手柄
// ===============================

function setupGamepadEvents() {
  window.addEventListener("gamepadconnected", (event) => {
    gamepadIndex = event.gamepad.index;

    if (!hasEnteredScene) {
      controlMode = "gamepad";
    }

    console.log("手柄已连接：", event.gamepad);
  });

  window.addEventListener("gamepaddisconnected", () => {
    gamepadIndex = null;

    if (hasEnteredScene && controlMode === "gamepad") {
      updateInfo("手柄已断开，请刷新后使用眼神控制模式");
    }
  });
}

function findConnectedGamepad() {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

  for (const gamepad of gamepads) {
    if (gamepad) return gamepad;
  }

  return null;
}

function checkGamepadInput() {
  const gamepad = getActiveGamepad();
  if (!gamepad) return;

  const aButtonPressed = gamepad.buttons[0]?.pressed || false;
  const leftStickX = gamepad.axes[0] || 0;
  const leftStickY = gamepad.axes[1] || 0;

  if (!hasEnteredScene) {
    if (aButtonPressed && !previousAButtonPressed && controlMode === "gamepad") {
      enterScene();
    }

    previousAButtonPressed = aButtonPressed;
    return;
  }

  if (controlMode !== "gamepad") return;

  const downStickPressed = leftStickY > 0.65;

  if (downStickPressed && !previousDownStickPressed) {
    selectFinishButton();
  }

  previousDownStickPressed = downStickPressed;

  let currentStickDirection = 0;

  if (leftStickX > 0.55) {
    currentStickDirection = 1;
  } else if (leftStickX < -0.55) {
    currentStickDirection = -1;
  }

  const now = performance.now();

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

  if (aButtonPressed && !previousAButtonPressed) {
    handleAButtonClick();
  }

  previousAButtonPressed = aButtonPressed;
}

function getActiveGamepad() {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

  if (gamepadIndex !== null && gamepads[gamepadIndex]) {
    return gamepads[gamepadIndex];
  }

  return findConnectedGamepad();
}

// ===============================
// 键盘
// ===============================

function setupKeyboardInput() {
  window.addEventListener("keydown", (event) => {
    // 教学页：按 Enter 进入场景
    if (event.code === "Enter" && !hasEnteredScene) {
      enterScene();
      return;
    }

    if (!hasEnteredScene) return;

    // 电脑测试通用键盘控制：
    // 不管现在是 gaze 模式还是 gamepad 模式，都允许键盘辅助测试
    if (event.code === "ArrowRight") {
      moveSelection(1);
      updateObjectVisualStates();
      return;
    }

    if (event.code === "ArrowLeft") {
      moveSelection(-1);
      updateObjectVisualStates();
      return;
    }

    if (event.code === "ArrowDown") {
      selectFinishButton();
      updateObjectVisualStates();
      return;
    }

    if (event.code === "Space" || event.code === "Enter") {
      handleAButtonClick();
      updateObjectVisualStates();
      return;
    }
  });
}

// ===============================
// 每帧视觉更新
// ===============================

function updateLoop() {
  checkGamepadInput();

  if (hasEnteredScene) {
    updateObjectVisualStates();
  }

  requestAnimationFrame(updateLoop);
}

function updateObjectVisualStates() {
  if (!cameraObject) return;

  const time = performance.now() * 0.001;
  const cameraWorldPosition = new THREE.Vector3();

  cameraObject.getWorldPosition(cameraWorldPosition);

  selectableObjects.forEach((objectRecord, index) => {
    const entity = objectRecord.el;
    const data = entity.objectData;

    if (!data) return;

    const isSelected = index === selectedIndex;
    const isConfirmed = data.id && confirmedSoundIds.has(data.id);
    const isFinishButton = data.type === "finish-button";

    if (data.followCamera) {
      updateFinishButtonFollowCamera(entity);
    } else {
      const basePosition = data.basePosition;

      if (basePosition) {
        const offset = data.floatOffset || 0;
        const floatY = Math.sin(time * 1.3 + offset) * 0.08;

        entity.object3D.position.set(
          basePosition.x,
          basePosition.y + floatY,
          basePosition.z
        );
      }

      entity.object3D.lookAt(cameraWorldPosition);
    }

    let scaleMultiplier = 1;

    if (isSelected) {
      scaleMultiplier = isFinishButton ? 1.28 : PRESELECT_SCALE;
    }

    entity.object3D.scale.set(scaleMultiplier, scaleMultiplier, scaleMultiplier);

    if (data.highlightImage) {
      data.highlightImage.setAttribute("visible", isSelected && !isConfirmed);
    }

    if (data.solidOutlineImage) {
      data.solidOutlineImage.setAttribute("visible", isConfirmed);

      const breatheScale = isConfirmed
        ? 1 + Math.sin(time * 2.4) * 0.025
        : 1;

      data.solidOutlineImage.object3D.scale.set(
        breatheScale,
        breatheScale,
        breatheScale
      );
    }

    if (data.mainImage && data.mainImage.getAttribute("material")) {
      if (isSelected) {
        data.mainImage.setAttribute("material", "opacity", 1);
      } else if (isConfirmed) {
        data.mainImage.setAttribute("material", "opacity", 0.96);
      } else {
        data.mainImage.setAttribute("material", "opacity", 0.86);
      }
    }
  });
}

function updateFinishButtonFollowCamera(entity) {
  if (!cameraObject) return;

  const localOffset = new THREE.Vector3(0, -0.85, -3.2);
  const cameraWorldPosition = new THREE.Vector3();
  const cameraQuaternion = new THREE.Quaternion();

  cameraObject.getWorldPosition(cameraWorldPosition);
  cameraObject.getWorldQuaternion(cameraQuaternion);

  localOffset.applyQuaternion(cameraQuaternion);

  entity.object3D.position.copy(cameraWorldPosition).add(localOffset);
  entity.object3D.quaternion.copy(cameraQuaternion);
}

// ===============================
// UI
// ===============================

function updateInfo(text) {
  const infoText = document.querySelector("#info p");

  if (infoText) {
    infoText.textContent = text;
  }
}