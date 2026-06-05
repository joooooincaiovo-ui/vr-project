// =====================================================
// VR Project - 稳定自制分屏 + Three.js Mesh 意象 + 手柄修复版
// 直接复制本文件全部内容，覆盖原 script.js
// =====================================================

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
//const PRESELECT_WHITE_OPACITY = 0;

// 预选放大程度：越大越明显，建议 1.08 - 1.25
const PRESELECT_SCALE = 1.16;

// 确认描边贴图大小：如果描边看不明显，可以调到 1.12 / 1.18
const OUTLINE_SCALE = 1.0;

// ===============================
// 眼神凝视确认参数
// ===============================

// 凝视多少秒后确认 / 取消 / 完成
// 想改成 2 秒就写 2，想改成 4 秒就写 4
const GAZE_CONFIRM_SECONDS = 2;

// 完成按钮相对于“前两个意象中点”的下移距离
// 数值越小越靠下，例如 -1.2 会更低，-0.5 会更高
const FINISH_BUTTON_Y_OFFSET = -1.5;

// 完成按钮稍微向镜头方向靠近一点，避免和意象重叠
// 数值越大越靠近玩家
const FINISH_BUTTON_FORWARD_OFFSET = 0.35;

let gazeTargetEl = null;
let gazeTimer = null;
let gazeProgressTimer = null;
let gazeStartTime = 0;

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
      imageSrc: "./assets/f2-images/f2-guitar.png",
      solidOutlineSrc: "./assets/f2-images/f2-guitar-selected.png",
      position: createPositionByAngle(-55, 8, 5)
    },
    {
      id: "f2-piano",
      label: "钢琴键",
      soundName: "钢琴",
      audioSrc: "./assets/sounds/f2-02.mp3",
      imageSrc: "./assets/f2-images/f2-piano.png",
      solidOutlineSrc: "./assets/f2-images/f2-piano-selected.png",
      position: createPositionByAngle(15, 7, 5)
    },
    {
      id: "f2-glass",
      label: "玻璃碎片",
      soundName: "舞蹈律动声音",
      audioSrc: "./assets/sounds/f2-03.mp3",
      imageSrc: "./assets/f2-images/f2-glass.png",
      solidOutlineSrc: "./assets/f2-images/f2-glass-selected.png",
      position: createPositionByAngle(75, 12, 5)
    },
    {
      id: "f2-leaf",
      label: "树叶",
      soundName: "阳光的声音",
      audioSrc: "./assets/sounds/f2-04.mp3",
      imageSrc: "./assets/f2-images/f2-leaf.png",
      solidOutlineSrc: "./assets/f2-images/f2-leaf-selected.png",
      position: createPositionByAngle(145, 8, 5)
    },
    {
      id: "f2-stone",
      label: "小石头",
      soundName: "石质乐器的声音",
      audioSrc: "./assets/sounds/f2-05.mp3",
      imageSrc: "./assets/f2-images/f2-stone.png",
      solidOutlineSrc: "./assets/f2-images/f2-stone-selected.png",
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
      imageSrc: "./assets/f3-images/f3-book.png",
      solidOutlineSrc: "./assets/f3-images/f3-book-selected.png",
      position: createPositionByAngle(-60, 6, 5)
    },
    {
      id: "f3-camera",
      label: "相机",
      soundName: "清晨阳光洒落的声音",
      audioSrc: "./assets/sounds/f3-02.mp3",
      imageSrc: "./assets/f3-images/f3-camera.png",
      solidOutlineSrc: "./assets/f3-images/f3-camera-selected.png",
      position: createPositionByAngle(10, 10, 5)
    },
    {
      id: "f3-doll",
      label: "玩偶",
      soundName: "灰尘漂浮的声音",
      audioSrc: "./assets/sounds/f3-03.mp3",
      imageSrc: "./assets/f3-images/f3-bear.png",
      solidOutlineSrc: "./assets/f3-images/f3-bear-selected.png",
      position: createPositionByAngle(75, 8, 5)
    },
    {
      id: "f3-hand",
      label: "木制的手",
      soundName: "轻微触碰木头的声音",
      audioSrc: "./assets/sounds/f3-04.mp3",
      imageSrc: "./assets/f3-images/f3-woodheand.png",
      solidOutlineSrc: "./assets/f3-images/f3-woodheand-selected.png",
      position: createPositionByAngle(145, 9, 5)
    },
    {
      id: "f3-pupa",
      label: "黄门",
      soundName: "细小的生命声",
      audioSrc: "./assets/sounds/f3-05.mp3",
      imageSrc: "./assets/f3-images/f3-yellowdoor.png",
      solidOutlineSrc: "./assets/f3-images/f3-yellowdoor-selected.png",
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

  preloadAssets();

  sceneEl.addEventListener("loaded", () => {
    cameraObject = cameraEl.object3D;

    // 稳定普通渲染：我们不再调用 A-Frame 内置 enterVR，避免手机分屏白色叠层
    if (sceneEl.renderer) {
      sceneEl.renderer.autoClear = true;
      sceneEl.renderer.sortObjects = true;
      sceneEl.renderer.setClearColor(0x000000, 1);
    }

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
// 稳定版手机分屏 VR
// 关键：不调用 A-Frame 的 sceneEl.enterVR()，避免手机分屏白色叠层。
// 这里复制普通 canvas 画面为左右两屏，流程和手柄输入仍然照常运行。
// ===============================

let customSplitMode = false;
let splitOverlay = null;
let splitStream = null;

injectCustomSplitVRStyles();

const vrToggleBtn = document.createElement("button");
vrToggleBtn.id = "vr-toggle-btn";
vrToggleBtn.innerText = "VR / 3D";

Object.assign(vrToggleBtn.style, {
  position: "fixed",
  bottom: "16px",
  right: "16px",
  zIndex: "80",
  padding: "10px 16px",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.88)",
  color: "black",
  fontWeight: "bold",
  border: "none"
});

document.body.appendChild(vrToggleBtn);

vrToggleBtn.addEventListener("click", () => {
  if (customSplitMode) {
    exitCustomSplitVR();
  } else {
    enterCustomSplitVR();
  }
});

function enterCustomSplitVR() {
  if (customSplitMode) return;

  const canvas = document.querySelector("canvas");

  if (!canvas || !canvas.captureStream) {
    alert("当前浏览器不支持稳定分屏模式，请换 Safari / Chrome 再试。");
    return;
  }

  customSplitMode = true;

  // 进入分屏后，如果有手柄，就自动切回手柄模式。
  // 这样即使加载页最初没有检测到手柄，后面连接手柄也能继续用。
  const gamepad = findConnectedGamepad();
  if (gamepad) {
    gamepadIndex = gamepad.index;
    setControlMode("gamepad");
  }

  splitStream = canvas.captureStream(60);

  splitOverlay = document.createElement("div");
  splitOverlay.id = "custom-split-vr-overlay";

  const leftEyeWrap = document.createElement("div");
  const rightEyeWrap = document.createElement("div");
  leftEyeWrap.className = "custom-split-eye-wrap left-eye";
  rightEyeWrap.className = "custom-split-eye-wrap right-eye";

  const leftEye = document.createElement("video");
  const rightEye = document.createElement("video");

  [leftEye, rightEye].forEach((video) => {
    video.srcObject = splitStream;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    video.className = "custom-split-eye-video";
    video.play().catch(() => {});
  });

  leftEyeWrap.appendChild(leftEye);
  rightEyeWrap.appendChild(rightEye);

  const centerDivider = document.createElement("div");
  centerDivider.id = "custom-split-center-divider";

  const exitBtn = document.createElement("button");
  exitBtn.id = "custom-split-exit-btn";
  exitBtn.innerText = "退出";
  exitBtn.addEventListener("click", exitCustomSplitVR);

  splitOverlay.appendChild(leftEyeWrap);
  splitOverlay.appendChild(rightEyeWrap);
  splitOverlay.appendChild(centerDivider);
  splitOverlay.appendChild(exitBtn);
  document.body.appendChild(splitOverlay);

  const docEl = document.documentElement;
  if (docEl.requestFullscreen) {
    docEl.requestFullscreen().catch(() => {});
  } else if (docEl.webkitRequestFullscreen) {
    docEl.webkitRequestFullscreen();
  }

  vrToggleBtn.classList.add("hidden-in-split");

  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock("landscape").catch(() => {});
  }
}

function exitCustomSplitVR() {
  customSplitMode = false;

  if (splitOverlay) {
    splitOverlay.remove();
    splitOverlay = null;
  }

  if (splitStream) {
    splitStream.getTracks().forEach((track) => track.stop());
    splitStream = null;
  }

  vrToggleBtn.classList.remove("hidden-in-split");

  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  } else if (document.webkitFullscreenElement && document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  }
}

function injectCustomSplitVRStyles() {
  if (document.querySelector("#custom-split-vr-style")) return;

  const style = document.createElement("style");
  style.id = "custom-split-vr-style";
  style.textContent = `
    .a-enter-vr { display: none !important; }

    #custom-split-vr-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      flex-direction: row;
      background: #000;
      overflow: hidden;
      touch-action: none;
    }

    .custom-split-eye-wrap {
      position: relative;
      width: 50vw;
      height: 100vh;
      overflow: hidden;
      background: #000;
    }

    .custom-split-eye-video {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 104vw;
      height: 104vh;
      object-fit: cover;
      transform: translate(-50%, -50%) scale(1.02);
      transform-origin: center center;
      background: #000;
    }

    .left-eye .custom-split-eye-video { object-position: 52% 50%; }
    .right-eye .custom-split-eye-video { object-position: 48% 50%; }

    #custom-split-center-divider {
      position: fixed;
      top: 0;
      left: 50%;
      width: 2px;
      height: 100vh;
      transform: translateX(-1px);
      background: rgba(0, 0, 0, 0.96);
      z-index: 10001;
      pointer-events: none;
    }

    #custom-split-exit-btn {
      position: fixed;
      top: 12px;
      right: 14px;
      z-index: 10002;
      padding: 6px 12px;
      border: none;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.72);
      color: #000;
      font-size: 12px;
      font-weight: bold;
      opacity: 0.72;
    }

    #vr-toggle-btn.hidden-in-split { display: none !important; }
  `;

  document.head.appendChild(style);
}


// ===============================
// 教学页点击进入场景
// ===============================

// ===============================
// 浮动意象创建
// ===============================
function createFloatingObject(item, index) {
  const group = document.createElement("a-entity");

  // 关键：让 A-Frame 的 raycaster 可以直接检测这个 group 里的 Three.js mesh
  group.classList.add("interactive", "interactive-hitbox");

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
    confirmed: false,
    mainImage: null,
    selectedImage: null,
    selectionRing: null,
    outlineImage: null
  };

  // ===============================
  // 底层：用 Three.js Mesh 替代 a-image
  // ===============================
  const texture = loadStableTexture(item.imageSrc);

  const geometry = new THREE.PlaneGeometry(IMAGE_SIZE, IMAGE_SIZE);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.94,
    alphaTest: 0.08,
    depthWrite: false,
    depthTest: false,
    side: THREE.FrontSide,
    toneMapped: false
  });

  const mainMesh = new THREE.Mesh(geometry, material);
  mainMesh.name = `${item.id}-main-mesh`;
  mainMesh.position.set(0, 0, 0);
  mainMesh.renderOrder = 15;
  mainMesh.userData.ownerEntity = group;

  group.object3D.add(mainMesh);
  group.objectData.mainImage = mainMesh;

  // ===============================
  // 眼神控制命中区域：透明 a-plane
  // 说明：Three.js Mesh 负责显示图片；这个透明平面只负责被 A-Frame 光标射线检测。
  // 这样电脑端/手机端 gaze cursor 都能稳定触发 mouseenter / mouseleave / click。
  // ===============================
  const hitbox = document.createElement("a-plane");
  hitbox.classList.add("interactive-hitbox");
  hitbox.setAttribute("width", IMAGE_SIZE * 1.15);
  hitbox.setAttribute("height", IMAGE_SIZE * 1.15);
  hitbox.setAttribute("position", "0 0 0.08");
  hitbox.setAttribute(
    "material",
    "shader: flat; color: #ffffff; transparent: true; opacity: 0.001; depthWrite: false; depthTest: false; side: front"
  );
  hitbox.setAttribute("visible", true);
  group.appendChild(hitbox);
  group.objectData.hitbox = hitbox;

  // ===============================
  // 选中/确认效果：使用你自己的 selected images
  // 注意：这里用 Three.js Mesh 渲染 selected PNG，不再使用 A-Frame <a-image>，
  // 所以不会触发 A-Frame 内置分屏的白色叠层问题。
  // ===============================
  if (item.solidOutlineSrc) {
    const selectedTexture = loadStableTexture(item.solidOutlineSrc);

    const selectedGeometry = new THREE.PlaneGeometry(
      IMAGE_SIZE * OUTLINE_SCALE,
      IMAGE_SIZE * OUTLINE_SCALE
    );

    const selectedMaterial = new THREE.MeshBasicMaterial({
      map: selectedTexture,
      transparent: true,
      opacity: 0,
      // 关键：不要 alphaTest 裁切柔和光晕，否则发光会变硬、变粗。
      alphaTest: 0,
      depthWrite: false,
      depthTest: false,
      side: THREE.FrontSide,
      toneMapped: false,
      premultipliedAlpha: false
    });

    const selectedMesh = new THREE.Mesh(selectedGeometry, selectedMaterial);
    selectedMesh.name = `${item.id}-selected-image`;
    selectedMesh.position.set(0, 0, 0.045);
    selectedMesh.visible = false;
    selectedMesh.renderOrder = 30;

    group.object3D.add(selectedMesh);
    group.objectData.selectedImage = selectedMesh;
  }

  // ===============================
  // 标签
  // ===============================
  const label = createTextLabel(item.label);
  label.setAttribute("position", "0 -1.05 0.04");
  group.appendChild(label);
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
// 互动事件
// ===============================


// ===============================
// 电脑键盘测试（非手柄）

// ===============================
// 加载流程
// ===============================

// ===============================
// 手机教学页进入场景逻辑改进
// ===============================
function setupGuideButtonsAndFullScreen() {
  const controllerBtn = document.querySelector("#enter-controller-btn");
  const gazeBtn = document.querySelector("#enter-gaze-btn");
  const currentSceneEl = document.querySelector("#vr-scene");

  const enterHandler = () => {
    if (hasEnteredScene) return;

    hasEnteredScene = true;

    const startScreen = document.querySelector("#start-screen");
    const infoPanel = document.querySelector("#info");
    const gazeCursor = document.querySelector("#gaze-cursor");

    if (startScreen) {
      startScreen.classList.add("hidden");
    }

    if (infoPanel) {
      infoPanel.classList.remove("hidden");
    }

    if (currentSceneEl) {
      currentSceneEl.classList.remove("hidden");
    }

    // 手机端全屏请求
    const docEl = document.documentElement;

    if (docEl.requestFullscreen) {
      docEl.requestFullscreen().catch(() => {});
    } else if (docEl.webkitRequestFullscreen) {
      docEl.webkitRequestFullscreen();
    } else if (docEl.msRequestFullscreen) {
      docEl.msRequestFullscreen();
    }

    // 判断控制方式
    if (gazeCursor) {
      if (controlMode === "gaze") {
        gazeCursor.classList.remove("hidden");
        gazeCursor.setAttribute("visible", true);
        updateInfo(`眼神控制：看向意象，凝视 ${GAZE_CONFIRM_SECONDS} 秒确认 / 取消`);
      } else {
        gazeCursor.classList.add("hidden");
        gazeCursor.setAttribute("visible", false);
        updateInfo("手柄模式：左摇杆切换 / 向下选择完成 / A确认");
      }
    }

    // 初始化第一关
    currentLevelIndex = 0;
    currentLevelName = levelOrder[currentLevelIndex];

    setPanorama(currentLevelName);
    loadLevel(currentLevelName);
  };

  // 安全绑定：元素存在才绑定，不存在也不让页面卡死
  if (controllerBtn) {
    controllerBtn.addEventListener("click", () => {
      controlMode = "gamepad";
      enterHandler();
    });
  } else {
    console.warn("没有找到 #enter-controller-btn，请检查 index.html 里的按钮 id");
  }

  if (gazeBtn) {
    gazeBtn.addEventListener("click", () => {
      controlMode = "gaze";
      enterHandler();
    });
  } else {
    console.warn("没有找到 #enter-gaze-btn，请检查 index.html 里的按钮 id");
  }

  if (currentSceneEl) {
    currentSceneEl.addEventListener("touchstart", () => {
      if (!hasEnteredScene) {
        enterHandler();
      }
    });
  } else {
    console.warn("没有找到 #vr-scene，请检查 index.html 里的 a-scene id");
  }

  window.addEventListener("keydown", (e) => {
    if (!hasEnteredScene && e.code === "Enter") {
      enterHandler();
    }
  });
}

// ===============================
// 图片资源预加载，解决手机端不显示问题
// ===============================
function preloadAssets() {
  const assetsEl = document.querySelector("a-assets");

  if (!assetsEl) {
    console.warn("没有找到 a-assets，跳过图片预加载");
    return;
  }

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


// ===============================
// 加载流程：进度条结束后进入控制方式检测
// ===============================

function initLoadingFlow() {
  const loadingPanel = document.querySelector("#loading-panel");
  const detectPanel = document.querySelector("#detect-panel");
  const loadingBar = document.querySelector("#loading-bar");
  const loadingText = document.querySelector("#loading-text");
  const detectText = document.querySelector("#detect-text");

  let progress = 0;

  const timer = setInterval(() => {
    progress += 4;

    if (progress > 100) {
      progress = 100;
    }

    if (loadingBar) {
      loadingBar.style.width = `${progress}%`;
    }

    if (loadingText) {
      loadingText.textContent = `Loading ${progress}%`;
    }

    if (progress >= 100) {
      clearInterval(timer);

      setTimeout(() => {
        if (loadingPanel) {
          loadingPanel.classList.add("hidden");
        }

        if (detectPanel) {
          detectPanel.classList.remove("hidden");
        }

        if (detectText) {
          detectText.textContent = "正在检测手柄连接，请稍候...";
        }

        setTimeout(() => {
          const gamepad = findConnectedGamepad();

          if (gamepad) {
            gamepadIndex = gamepad.index;
            controlMode = "gamepad";
            showControllerGuide();
          } else {
            controlMode = "gaze";
            showGazeGuide();
          }
        }, 900);
      }, 250);
    }
  }, 35);
}

function setupGuideButtons() {
  setupGuideButtonsAndFullScreen();
}

function showControllerGuide() {
  const detectPanel = document.querySelector("#detect-panel");
  const controllerGuidePanel = document.querySelector("#controller-guide-panel");

  if (detectPanel) {
    detectPanel.classList.add("hidden");
  }

  if (controllerGuidePanel) {
    controllerGuidePanel.classList.remove("hidden");
  } else {
    console.warn("没有找到 #controller-guide-panel，自动进入场景");
    enterScene();
  }
}

function showGazeGuide() {
  const detectPanel = document.querySelector("#detect-panel");
  const gazeGuidePanel = document.querySelector("#gaze-guide-panel");

  if (detectPanel) {
    detectPanel.classList.add("hidden");
  }

  if (gazeGuidePanel) {
    gazeGuidePanel.classList.remove("hidden");
  } else {
    console.warn("没有找到 #gaze-guide-panel，自动进入场景");
    enterScene();
  }
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
  panoramas = {
    floor1: "./assets/images/floor1-equirect.jpg",
    floor2: "./assets/images/floor2-equirect.jpg",
    floor3: "./assets/images/floor3-equirect.jpg"
  };
}

function createStableCubeTexture(loader, files) {
  const texture = loader.load(files);

  // 手机端 VR 模式下，CubeTexture 的边缘采样容易出现白色锯齿/接缝
  // 这里关闭 mipmap，并强制使用边缘夹取，减少六面图边缘被错误采样
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  // A-Frame 1.5 / Three r158 使用 colorSpace
  if ("colorSpace" in texture) {
    texture.colorSpace = THREE.SRGBColorSpace;
  } else {
    texture.encoding = THREE.sRGBEncoding;
  }

  texture.needsUpdate = true;

  return texture;
}

function setPanorama(levelName) {
  if (!sceneEl || !panoramas[levelName]) return;

  let sky = document.querySelector("#panorama-sky");

  if (!sky) {
    sky = document.createElement("a-sky");
    sky.setAttribute("id", "panorama-sky");
    sky.setAttribute("radius", "500");
    sky.setAttribute("rotation", "0 -90 0");
    sky.setAttribute("material", "shader: flat; side: back");
    sceneEl.appendChild(sky);
  }

  sky.setAttribute("src", panoramas[levelName]);

  sceneEl.object3D.background = null;
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
// Three.js 贴图 / 显示工具
// ===============================
function loadStableTexture(src) {
  const texture = new THREE.TextureLoader().load(src);

  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  if ("colorSpace" in texture) {
    texture.colorSpace = THREE.SRGBColorSpace;
  } else {
    texture.encoding = THREE.sRGBEncoding;
  }

  texture.needsUpdate = true;
  return texture;
}

function setVisualOpacity(target, opacity) {
  if (!target) return;

  // Three.js Mesh
  if (target.isMesh && target.material) {
    target.material.opacity = opacity;
    target.material.transparent = opacity < 1;
    target.material.needsUpdate = true;
    return;
  }

  // A-Frame Entity
  if (target.setAttribute) {
    target.setAttribute("material", "opacity", opacity);
  }
}

function setVisualVisible(target, visible) {
  if (!target) return;

  // Three.js Mesh / Object3D
  if (target.isObject3D || target.isMesh) {
    target.visible = visible;
    return;
  }

  // A-Frame Entity
  if (target.setAttribute) {
    target.setAttribute("visible", visible);
  }
}

function setVisualScale(target, x, y, z) {
  if (!target) return;

  if (target.isObject3D || target.isMesh) {
    target.scale.set(x, y, z);
    return;
  }

  if (target.object3D) {
    target.object3D.scale.set(x, y, z);
  }
}

// ===============================
// 加载关卡
// ===============================

function loadLevel(levelName) {
  clearInteractiveObjects();

  cancelGazeConfirm();

  currentLevelName = levelName;

  const data = levelData[levelName];
  if (!data) return;

  data.objects.forEach((item, index) => {
    const objectEntity = createFloatingObject(item, index);
    levelRoot.appendChild(objectEntity);
  });

  const finishButton = createFinishButton();
  levelRoot.appendChild(finishButton);

  // 手柄模式：默认预选第一个意象，方便摇杆操作
  // 眼神模式：默认不预选任何物体，只有视线看过去才预选
  if (controlMode === "gamepad") {
    selectedIndex = 0;
    updateSelectionInfo();
  } else {
    selectedIndex = -1;
    updateInfo(`${levelDisplayNames[currentLevelName]} | 请看向一个意象，凝视 ${GAZE_CONFIRM_SECONDS} 秒确认`);
  }

  updateObjectVisualStates();
}

function clearInteractiveObjects() {
  cancelGazeConfirm();

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


// ===============================
// 创建完成按钮
// ===============================

function createFinishButton() {
  const group = document.createElement("a-entity");
  group.classList.add("interactive");

  const finishPosition = getFixedFinishButtonPosition();
  group.setAttribute("position", vectorToPositionString(finishPosition));

  group.objectData = {
    type: "finish-button",
    label: "完成",
    followCamera: false,
    basePosition: finishPosition.clone(),
    baseScale: 1,
    floatOffset: 9
  };

  // 完成按钮：实心圆，避免视线扫到圆环中空处导致凝视中断
  const ring = document.createElement("a-circle");
  ring.classList.add("interactive-hitbox");
  ring.setAttribute("radius", "0.38");
  ring.setAttribute("segments", "64");
  ring.setAttribute(
    "material",
    "shader: flat; color: #ffffff; transparent: true; opacity: 0.88; depthWrite: false; depthTest: false; side: double"
  );
  ring.setAttribute("position", "0 0 0");
  ring.object3D.renderOrder = 25;
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

function getFixedFinishButtonPosition() {
  const data = levelData[currentLevelName];

  // 如果当前关卡至少有两个意象，就放在前两个意象中间偏下
  if (data && data.objects && data.objects.length >= 2) {
    const posA = data.objects[0].position;
    const posB = data.objects[1].position;

    const middle = new THREE.Vector3()
      .addVectors(posA, posB)
      .multiplyScalar(0.5);

    // 向下移动
    middle.y += FINISH_BUTTON_Y_OFFSET;

    // 稍微往玩家方向靠近，避免和意象贴太近
    const towardCamera = middle.clone().normalize().multiplyScalar(-FINISH_BUTTON_FORWARD_OFFSET);
    middle.add(towardCamera);

    return middle;
  }

  // 备用位置：如果某关数据异常，就放在正前方偏下
  return createPositionByAngle(0, -12, 4.5);
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
  const bindEvents = (target) => {
    // 视线进入：进入预选，并开始凝视计时
    target.addEventListener("mouseenter", () => {
      if (!hasEnteredScene || controlMode !== "gaze") return;

      selectedIndex = selectableObjects.findIndex(o => o.el === group);

      updateObjectVisualStates();
      updateSelectionInfo();

      startGazeConfirm(group);
    });

    // 视线离开：取消预选，并取消凝视计时
    target.addEventListener("mouseleave", () => {
      if (!hasEnteredScene || controlMode !== "gaze") return;

      const currentIndex = selectableObjects.findIndex(o => o.el === group);

      if (selectedIndex === currentIndex) {
        selectedIndex = -1;
        updateObjectVisualStates();
        updateInfo(`${levelDisplayNames[currentLevelName]} | 请看向一个意象进行预选`);
      }

      cancelGazeConfirm(group);
    });

    // 电脑点击测试：看向/点到对象后，点击可直接确认或取消
    target.addEventListener("click", () => {
      if (!hasEnteredScene || controlMode !== "gaze") return;

      selectedIndex = selectableObjects.findIndex(o => o.el === group);
      updateObjectVisualStates();
      updateSelectionInfo();

      // 电脑端调试时，点击等同于凝视满 2 秒后的确认
      handleAButtonClick();
      updateObjectVisualStates();
    });

    // 手机触屏辅助：点到对象也可以确认/取消，防止凝视事件在某些浏览器里失灵
    target.addEventListener("touchstart", () => {
      if (!hasEnteredScene || controlMode !== "gaze") return;

      selectedIndex = selectableObjects.findIndex(o => o.el === group);
      updateObjectVisualStates();
      updateSelectionInfo();

      handleAButtonClick();
      updateObjectVisualStates();
    });
  };

  bindEvents(group);
  group.querySelectorAll(".interactive-hitbox").forEach(bindEvents);
}

// ===============================
// 眼神凝视确认
// ===============================

function startGazeConfirm(entity) {
  if (!entity || controlMode !== "gaze") return;

  // 如果已经在凝视同一个物体，不重复开计时器
  if (gazeTargetEl === entity) return;

  cancelGazeConfirm();

  gazeTargetEl = entity;
  gazeStartTime = performance.now();

  const data = entity.objectData;
  if (!data) return;

  const durationMs = GAZE_CONFIRM_SECONDS * 1000;

  updateGazeProgressInfo(entity, 0);

  gazeProgressTimer = setInterval(() => {
    if (!gazeTargetEl || gazeTargetEl !== entity) return;

    const elapsed = performance.now() - gazeStartTime;
    const progress = Math.min(elapsed / durationMs, 1);

    updateGazeProgressInfo(entity, progress);
  }, 80);

  gazeTimer = setTimeout(() => {
    if (!gazeTargetEl || gazeTargetEl !== entity) return;

    selectedIndex = selectableObjects.findIndex(o => o.el === entity);

    updateObjectVisualStates();
    handleAButtonClick();

    // 触发一次后停止计时。
    // 如果想取消已确认的意象，需要视线移开后再重新看它 3 秒。
    cancelGazeConfirm();
  }, durationMs);
}

function cancelGazeConfirm(entity = null) {
  if (entity && gazeTargetEl && gazeTargetEl !== entity) return;

  if (gazeTimer) {
    clearTimeout(gazeTimer);
    gazeTimer = null;
  }

  if (gazeProgressTimer) {
    clearInterval(gazeProgressTimer);
    gazeProgressTimer = null;
  }

  gazeTargetEl = null;
  gazeStartTime = 0;
}

function updateGazeProgressInfo(entity, progress) {
  if (!entity || !entity.objectData) return;

  const data = entity.objectData;
  const percent = Math.round(progress * 100);

  if (data.type === "finish-button") {
    updateInfo(`${levelDisplayNames[currentLevelName]} | 凝视完成 ${percent}% | 满 ${GAZE_CONFIRM_SECONDS} 秒进入下一关`);
    return;
  }

  const isConfirmed = data.id && confirmedSoundIds.has(data.id);

  if (isConfirmed) {
    updateInfo(`${levelDisplayNames[currentLevelName]} | 凝视取消：${data.label} ${percent}%`);
  } else {
    updateInfo(`${levelDisplayNames[currentLevelName]} | 凝视确认：${data.label} ${percent}%`);
  }
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
  if (isLevelTransitioning) return;

  isLevelTransitioning = true;

  const fogOverlay = document.querySelector("#fog-overlay");

  if (!fogOverlay) {
    setPanorama(levelName);
    loadLevel(levelName);
    isLevelTransitioning = false;
    return;
  }

  // 关卡切换白色氛围动画，总时长约 3 秒
  // 1.2s 渐显 + 0.4s 白屏停留并切换 + 1.4s 渐隐
  fogOverlay.style.display = "block";
  fogOverlay.style.transition = "opacity 1.2s ease-in-out";
  fogOverlay.style.opacity = "1";

  setTimeout(() => {
    setPanorama(levelName);
    loadLevel(levelName);

    fogOverlay.style.transition = "opacity 1.4s ease-in-out";
    fogOverlay.style.opacity = "0";

    setTimeout(() => {
      isLevelTransitioning = false;
      fogOverlay.style.transition = "";
      fogOverlay.style.display = "";
    }, 1400);
  }, 1600);
}

function showEndingState() {
  clearInteractiveObjects();

  updateInfo("三首声音已经完成。之后可以在这里制作总结页面，回放三关的声音作品。");

  const fogOverlay = document.querySelector("#fog-overlay");
  fogOverlay.style.transition = "opacity 0.8s ease";
  fogOverlay.style.opacity = "0.18";

  console.log("每关记录的声音：", playedSoundRecords);
}


function setControlMode(mode) {
  controlMode = mode;

  const gazeCursor = document.querySelector("#gaze-cursor");

  if (gazeCursor) {
    if (mode === "gaze") {
      gazeCursor.classList.remove("hidden");
      gazeCursor.setAttribute("visible", true);
    } else {
      gazeCursor.classList.add("hidden");
      gazeCursor.setAttribute("visible", false);
    }
  }

  if (hasEnteredScene) {
    if (mode === "gamepad") {
      if (selectedIndex < 0 || getSelectedObject()?.type === "finish-button") {
        selectedIndex = 0;
      }
      updateObjectVisualStates();
      updateInfo("手柄模式：左摇杆切换 / 向下选择完成 / A确认");
    } else {
      selectedIndex = -1;
      updateObjectVisualStates();
      updateInfo(`${levelDisplayNames[currentLevelName]} | 请看向一个意象，凝视 ${GAZE_CONFIRM_SECONDS} 秒确认`);
    }
  }
}

function isMeaningfulGamepadInput(gamepad) {
  if (!gamepad) return false;

  const leftStickX = gamepad.axes[0] || 0;
  const leftStickY = gamepad.axes[1] || 0;
  const aButtonPressed = gamepad.buttons[0]?.pressed || false;

  return (
    aButtonPressed ||
    Math.abs(leftStickX) > 0.45 ||
    Math.abs(leftStickY) > 0.45
  );
}

// ===============================
// 手柄
// ===============================

function setupGamepadEvents() {
  window.addEventListener("gamepadconnected", (event) => {
    gamepadIndex = event.gamepad.index;

    if (!hasEnteredScene) {
      controlMode = "gamepad";
    } else {
      setControlMode("gamepad");
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

  // 有些手机浏览器不会及时触发 gamepadconnected，
  // 所以每帧只要发现手柄，就补上 gamepadIndex。
  if (gamepadIndex === null || gamepadIndex === undefined) {
    gamepadIndex = gamepad.index;
  }

  // 教学页 / 未进入场景时：按 A 直接进入手柄模式
  if (!hasEnteredScene) {
    if (aButtonPressed && !previousAButtonPressed) {
      setControlMode("gamepad");
      enterScene();
    }

    previousAButtonPressed = aButtonPressed;
    return;
  }

  // 已进入场景后：只要检测到手柄输入，就自动切到手柄模式。
  // 这一步是为了修复自制分屏后，手机端手柄连接但仍停在 gaze 模式的问题。
  if (controlMode !== "gamepad" && isMeaningfulGamepadInput(gamepad)) {
    setControlMode("gamepad");
  }

  if (controlMode !== "gamepad") {
    previousAButtonPressed = aButtonPressed;
    return;
  }

  const downStickPressed = leftStickY > 0.65;

  if (downStickPressed && !previousDownStickPressed) {
    selectFinishButton();
    updateObjectVisualStates();
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
    updateObjectVisualStates();
    lastStickMoveTime = now;
  }

  previousStickDirection = currentStickDirection;

  if (aButtonPressed && !previousAButtonPressed) {
    handleAButtonClick();
    updateObjectVisualStates();
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

    // ===============================
    // 位置与朝向
    // ===============================
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

    // ===============================
    // 完成按钮
    // ===============================
    if (isFinishButton) {
      const finishScale = isSelected ? 1.28 : 1;
      entity.object3D.scale.set(finishScale, finishScale, finishScale);

      setVisualOpacity(data.mainImage, isSelected ? 1 : 0.9);
      return;
    }

    // ===============================
    // 普通意象缩放
    // ===============================
    let scaleMultiplier = 1;

    if (isConfirmed) {
      scaleMultiplier = 1.08 + Math.sin(time * 2.4) * 0.018;
    } else if (isSelected) {
      scaleMultiplier = PRESELECT_SCALE;
    }

    entity.object3D.scale.set(scaleMultiplier, scaleMultiplier, scaleMultiplier);

    // ===============================
    // 原图透明度：兼容 Three.js Mesh / A-Frame Entity
    // ===============================
    if (data.mainImage) {
      if (isConfirmed || isSelected) {
        setVisualOpacity(data.mainImage, 1);
      } else {
        setVisualOpacity(data.mainImage, 0.92);
      }
    }

    // ===============================
    // selected image 选中 / 确认状态
    // ===============================
    if (data.selectedImage) {
      if (isConfirmed) {
        setVisualVisible(data.selectedImage, true);
        setVisualOpacity(data.selectedImage, 0.82);

        const breatheScale = 1 + Math.sin(time * 2.4) * 0.018;
        setVisualScale(data.selectedImage, breatheScale, breatheScale, breatheScale);
      } else if (isSelected) {
        setVisualVisible(data.selectedImage, true);
        setVisualOpacity(data.selectedImage, 0.48);
        setVisualScale(data.selectedImage, 1, 1, 1);
      } else {
        setVisualVisible(data.selectedImage, false);
        setVisualOpacity(data.selectedImage, 0);
        setVisualScale(data.selectedImage, 1, 1, 1);
      }
    }

    // 彻底隐藏旧白圈
    if (data.selectionRing) {
      setVisualVisible(data.selectionRing, false);
      setVisualOpacity(data.selectionRing, 0);
    }

    // 保险：如果旧描边 PNG 图层还残留，强制关闭
    if (data.outlineImage) {
      setVisualVisible(data.outlineImage, false);
      setVisualOpacity(data.outlineImage, 0);
    }

    if (data.highlightImage) {
      setVisualVisible(data.highlightImage, false);
    }

    if (data.preselectRing) {
      setVisualVisible(data.preselectRing, false);
    }

    if (data.solidOutlineImage) {
      setVisualVisible(data.solidOutlineImage, false);
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
