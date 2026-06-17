// =====================================================
// VR Project - 稳定自制分屏 + Three.js Mesh 意象 + 第0关VR教学版
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

let audioUnlocked = false;

const IS_MOBILE_AUDIO_MODE = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const backgroundAudios = {};

let backgroundAudio = null;
let backgroundAudioId = null;

const levelBackgroundMusic = {
  // 如果教学页不需要背景音乐，就先不写 guide
  // guide: {
  //   src: "./assets/sounds/bg-guide.MP3",
  //   volume: 0.25
  // },

  //floor1: {
   // src: "./assets/sounds/bg-f1.MP3",
   // volume: 0.05
  //},

  //floor2: {
   // src: "./assets/sounds/bg-f2.MP3",
    //volume: 0.05
  //},

  //floor3: {
   // src: "./assets/sounds/bg-f3.MP3",
   // volume: 0.05
  //}
};

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

// 每一关点击“完成”时，真正保存下来的最终声音组合
const finalSoundRecords = {
  floor1: [],
  floor2: [],
  floor3: []
};

// 结尾页回放用
let endingRoot = null;
let endingReplayAudios = [];
let endingActiveReplayLevel = null;
let easterEggRoot = null;
let hasShownAuthorMatchEasterEgg = false;

const authorFavoriteSoundSets = {
  floor1: {
    label: "F1",
    ids: ["f1-fish", "f1-cricket", "f1-lilac", "f1-tile"]
  },

  floor2: {
    label: "F2",
    ids: ["f2-stone", "f2-leaf", "f2-glass"]
  },

  floor3: {
    label: "F3",
    ids: ["f3-book", "f3-hand", "f3-doll"]
  }
};

const levelDisplayNames = {
  guide: "Guide",
  floor1: "F1 Hallway",
  floor2: "F2 Outdoor Space",
  floor3: "F3 Atrium",
  ending: "Finale"
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

// 凝视多少秒后确认 / 取消 / Done
// 想改成 2 秒就写 2，想改成 4 秒就写 4
const GAZE_CONFIRM_SECONDS = 2;

// Done按钮相对于“前两个意象中点”的下移距离
// 数值越小越靠下，例如 -1.2 会更低，-0.5 会更高
const FINISH_BUTTON_Y_OFFSET = -1.5;

// Done按钮稍微向镜头方向靠近一点，避免和意象重叠
// 数值越大越靠近玩家
const FINISH_BUTTON_FORWARD_OFFSET = 0.35;

let gazeTargetEl = null;
let gazeTimer = null;
let gazeProgressTimer = null;
let gazeStartTime = 0;


// ===============================
// VR 黑色教学空间参数
// ===============================

const GUIDE_IMAGES = {
  gamepad: "./assets/ui/controller-guide-vr.png",
  gaze: "./assets/ui/gaze-guide-vr.png"
};

const GUIDE_GAZE_SECONDS = 3;

// 教学图尺寸：现在比上一版约放大 2 倍，可继续调
const GUIDE_PANEL_WIDTH = 5.4;
const GUIDE_PANEL_HEIGHT = 4.0;

// 两张教学图的位置：左斜前 / 右斜前
const GUIDE_PANEL_X = 3.05;
const GUIDE_PANEL_Z = -4.1;
const GUIDE_PANEL_Y = 0.35;
const GUIDE_PANEL_YAW = 18;

let guideRoot = null;
let guideControllerPlane = null;
let guideGazePlane = null;
let guideEnterButton = null;
let guideProgressCircle = null;
let guideGazeTimer = null;
let guideGazeProgressTimer = null;
let guideGazeStartTime = 0;
let isGuideVisible = false;
let isGuideEnteringGame = false;

const GUIDE_OK_X = 0;
const GUIDE_OK_Y = -1.68;
const GUIDE_OK_Z = 0.16;
const GUIDE_OK_WIDTH = 2.6;
const GUIDE_OK_HEIGHT = 0.9;

let guideGazeTarget = null;
const guideOkRaycastObjects = [];
const guideRaycaster = new THREE.Raycaster();
const guideRayOrigin = new THREE.Vector3();
const guideRayDirection = new THREE.Vector3();

let lastConfirmActionTime = 0;
let lastConfirmActionKey = "";
const CONFIRM_DEBOUNCE_MS = 450;

// ===============================
// 三关数据
// ===============================

const levelData = {
  floor1: {
    title: "F1 一楼走廊",
    objects: [
      {
        id: "f1-fish",
        label: "Goldfish",
        soundName: "门口鱼缸水流声",
        audioSrc: "./assets/sounds/f1-01.MP3",
        volume: 0.75,
        imageSrc: "./assets/f1-images/f1-fish.png",
        solidOutlineSrc: "./assets/f1-images/f1-fish-selected.png",
        position: createPositionByAngle(-45, 8, 5)
      },
      {
        id: "f1-cricket",
        label: "Cricket",
        soundName: "蝉鸣声",
        audioSrc: "./assets/sounds/f1-02.MP3",
        volume: 0.75,
        imageSrc: "./assets/f1-images/f1-moth.png",
        solidOutlineSrc: "./assets/f1-images/f1-moth-selected.png",
        position: createPositionByAngle(25, 5, 5)
      },
      {
        id: "f1-lilac",
        label: "Lilac",
        soundName: "寂静中的风声",
        audioSrc: "./assets/sounds/f1-03.MP3",
        volume: 0.75,
        imageSrc: "./assets/f1-images/f1-flower.png",
        solidOutlineSrc: "./assets/f1-images/f1-flower-selected.png",
        position: createPositionByAngle(90, 10, 5)
      },
      {
        id: "f1-red-door",
        label: "Red Door",
        soundName: "雨声",
        audioSrc: "./assets/sounds/f1-04.MP3",
        volume: 0.25,
        imageSrc: "./assets/f1-images/f1-reddoor.png",
        solidOutlineSrc: "./assets/f1-images/f1-reddoor-selected.png",
        position: createPositionByAngle(155, 6, 5)
      },
      {
        id: "f1-tile",
        label: "Floral Tile",
        soundName: "风吹树叶的声音",
        audioSrc: "./assets/sounds/f1-05.MP3",
        volume: 0.75,
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
      label: "Guitar",
      soundName: "Guitar",
      audioSrc: "./assets/sounds/f2-01.MP3",
      volume: 0.45,
      imageSrc: "./assets/f2-images/f2-guitar.png",
      solidOutlineSrc: "./assets/f2-images/f2-guitar-selected.png",
      position: createPositionByAngle(-55, 8, 5)
    },
    {
      id: "f2-piano",
      label: "Piano Key",
      soundName: "Piano",
      audioSrc: "./assets/sounds/f2-02.MP3",
      volume: 0.45,
      imageSrc: "./assets/f2-images/f2-piano.png",
      solidOutlineSrc: "./assets/f2-images/f2-piano-selected.png",
      position: createPositionByAngle(15, 7, 5)
    },
    {
      id: "f2-glass",
      label: "Glass Shard",
      soundName: "舞蹈律动声音",
      audioSrc: "./assets/sounds/f2-03.MP3",
      volume: 0.75,
      imageSrc: "./assets/f2-images/f2-glass.png",
      solidOutlineSrc: "./assets/f2-images/f2-glass-selected.png",
      position: createPositionByAngle(75, 12, 5)
    },
    {
      id: "f2-leaf",
      label: "Leaf",
      soundName: "阳光的声音",
      audioSrc: "./assets/sounds/f2-04.MP3",
      volume: 0.75,
      imageSrc: "./assets/f2-images/f2-leaf.png",
      solidOutlineSrc: "./assets/f2-images/f2-leaf-selected.png",
      position: createPositionByAngle(145, 8, 5)
    },
    {
      id: "f2-stone",
      label: "Small Stone",
      soundName: "石质乐器的声音",
      audioSrc: "./assets/sounds/f2-05.MP3",
      volume: 0.75,
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
      label: "Picture Book",
      soundName: "Wooden Floor Footsteps",
      audioSrc: "./assets/sounds/f3-01.MP3",
      volume: 0.75,
      imageSrc: "./assets/f3-images/f3-book.png",
      solidOutlineSrc: "./assets/f3-images/f3-book-selected.png",
      position: createPositionByAngle(-60, 6, 5)
    },
    {
      id: "f3-camera",
      label: "Camera",
      soundName: "清晨阳光洒落的声音",
      audioSrc: "./assets/sounds/f3-02.MP3",
      volume: 0.75,
      imageSrc: "./assets/f3-images/f3-camera.png",
      solidOutlineSrc: "./assets/f3-images/f3-camera-selected.png",
      position: createPositionByAngle(10, 10, 5)
    },
    {
      id: "f3-doll",
      label: "Plaything",
      soundName: "灰尘漂浮的声音",
      audioSrc: "./assets/sounds/f3-03.MP3",
      volume: 0.55,
      imageSrc: "./assets/f3-images/f3-bear.png",
      solidOutlineSrc: "./assets/f3-images/f3-bear-selected.png",
      position: createPositionByAngle(75, 8, 5)
    },
    {
      id: "f3-hand",
      label: "Wooden Hand",
      soundName: "轻微触碰木头的声音",
      audioSrc: "./assets/sounds/f3-04.MP3",
      volume: 0.75,
      imageSrc: "./assets/f3-images/f3-woodheand.png",
      solidOutlineSrc: "./assets/f3-images/f3-woodheand-selected.png",
      position: createPositionByAngle(145, 9, 5)
    },
    {
      id: "f3-pupa",
      label: "Yellow Door",
      soundName: "细小的生命声",
      audioSrc: "./assets/sounds/f3-05.MP3",
      volume: 0.75,
      imageSrc: "./assets/f3-images/f3-yellowdoor.png",
      solidOutlineSrc: "./assets/f3-images/f3-yellowdoor-selected.png",
      position: createPositionByAngle(-145, 7, 5)
    }
  ]
}
};

async function loadProjectFont() {
  if (!document.fonts) return;

  try {
    await document.fonts.load('44px "AkzidenzCondensed"');
    await document.fonts.ready;
    console.log("Project font loaded.");
  } catch (error) {
    console.warn("Project font failed to load. Fallback font will be used.", error);
  }
}

// ===============================
// 初始化
// ===============================

async function bootProject() {
  // 防止重复初始化
  if (window.__vrProjectBooted) return;
  window.__vrProjectBooted = true;

  sceneEl = document.querySelector("#vr-scene");
  levelRoot = document.querySelector("#level-root");
  cameraEl = document.querySelector("#main-camera");

  if (!sceneEl || !levelRoot || !cameraEl) {
    console.error("初始化失败：没有找到 vr-scene / level-root / main-camera");
    return;
  }

  const gazeCursor = document.querySelector("#gaze-cursor");

  if (gazeCursor) {
    gazeCursor.object3D.renderOrder = 999;

    gazeCursor.addEventListener("loaded", () => {
      const mesh = gazeCursor.getObject3D("mesh");

      if (mesh) {
        mesh.renderOrder = 999;
        mesh.material.depthTest = false;
        mesh.material.depthWrite = false;
        mesh.material.needsUpdate = true;
      }
    });
  }

  preloadAssets();

  await loadProjectFont();

  sceneEl.addEventListener("loaded", () => {
    cameraObject = cameraEl.object3D;

    if (sceneEl.renderer) {
      sceneEl.renderer.autoClear = true;
      sceneEl.renderer.sortObjects = true;
      sceneEl.renderer.setClearColor(0x000000, 1);
    }

    loadPanoramas();
  });

  // 关键：这些不能再只等 DOMContentLoaded，否则动态加载 script.js 时会错过
  initLoadingFlow();
  setupGuideButtons();
  setupKeyboardInput();
  setupGamepadEvents();
  setupImageFallbacks();
  createMobileAudioUnlockButton();

  requestAnimationFrame(updateLoop);

  console.log("VR Project 初始化Done");
}

// 如果 DOM 还没加载完，就等 DOMContentLoaded
if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", bootProject);
} else {
  // 如果 DOMContentLoaded 已经过去了，就立刻初始化
  bootProject();
}

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

  // Enter分屏后，如果有手柄，就自动切回手柄模式。
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
// 教学页点击Enter场景
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
// 手机教学页Enter场景逻辑改进
// ===============================
function setupGuideButtonsAndFullScreen() {
  // 现在教学页已经改为 3D 黑色 VR 教学空间。
  // 旧 HTML 按钮不再作为主要入口，只保留兼容：如果按钮仍存在，点击也Enter游戏。
  const controllerBtn = document.querySelector("#enter-controller-btn");
  const gazeBtn = document.querySelector("#enter-gaze-btn");

  if (controllerBtn) {
    controllerBtn.addEventListener("click", () => {
      setControlMode("gamepad");
      enterSceneFromGuide();
    });
  }

  if (gazeBtn) {
    gazeBtn.addEventListener("click", () => {
      setControlMode("gaze");
      enterSceneFromGuide();
    });
  }

  window.addEventListener("keydown", (e) => {
    if (!hasEnteredScene && isGuideVisible && e.code === "Enter") {
      enterSceneFromGuide();
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

  Object.entries(GUIDE_IMAGES).forEach(([key, src]) => {
    const img = document.createElement("img");
    img.setAttribute("id", `${key}-guide-vr-img`);
    img.setAttribute("src", src);
    assetsEl.appendChild(img);
  });

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
// 加载流程：进度条结束后Enter控制方式检测
// ===============================

function initLoadingFlow() {
  const loadingPanel = document.querySelector("#loading-panel");
  const detectPanel = document.querySelector("#detect-panel");
  const loadingBar = document.querySelector("#loading-bar");
  const loadingText = document.querySelector("#loading-text");

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
        // 不再显示“正在检测手柄”的中间页面，检测在后台Done
        if (loadingPanel) loadingPanel.classList.add("hidden");
        if (detectPanel) detectPanel.classList.add("hidden");

        const gamepad = findConnectedGamepad();

        if (gamepad) {
          gamepadIndex = gamepad.index;
          setControlMode("gamepad");
        } else {
          setControlMode("gaze");
        }

        // 加载Done后直接Enter“第0关”黑色 VR 教学空间
        enterScene();
      }, 250);
    }
  }, 35);
}

function setupGuideButtons() {
  setupGuideButtonsAndFullScreen();
}

function showControllerGuide() {
  showVRGuideScene();
}

function showGazeGuide() {
  showVRGuideScene();
}

// ===============================
// VR 黑色教学空间：左右并列显示手柄 / 眼神教学图
// ===============================

function showVRGuideScene() {
  if (!sceneEl || !cameraEl) return;

  isGuideVisible = true;
  isGuideEnteringGame = false;

  const startScreen = document.querySelector("#start-screen");
  const infoPanel = document.querySelector("#info");
  const detectPanel = document.querySelector("#detect-panel");
  const controllerGuidePanel = document.querySelector("#controller-guide-panel");
  const gazeGuidePanel = document.querySelector("#gaze-guide-panel");

  // 旧 HTML 页面全部隐藏，改为 3D 黑色教学空间
  if (startScreen) startScreen.classList.add("hidden");
  if (infoPanel) infoPanel.classList.add("hidden");
  if (detectPanel) detectPanel.classList.add("hidden");
  if (controllerGuidePanel) controllerGuidePanel.classList.add("hidden");
  if (gazeGuidePanel) gazeGuidePanel.classList.add("hidden");

  clearInteractiveObjects();
  stopAllSoundsAndClearConfirmState();

  // 教学空间保持纯黑
  const oldSky = document.querySelector("#panorama-sky");
  if (oldSky) oldSky.remove();
  if (sceneEl.object3D) {
    sceneEl.object3D.background = new THREE.Color(0x000000);
  }

  removeVRGuideScene();

  // 注意：这里不再把教学图挂在 camera 上。
  // 它们会固定在世界空间的左斜前 / 右斜前，所以电脑端鼠标拖拽视角可以正常看到移动。
  guideRoot = document.createElement("a-entity");
  guideRoot.setAttribute("id", "guide-scene-root");
  guideRoot.setAttribute("position", "0 0 0");
  levelRoot.appendChild(guideRoot);

  // 左斜前：手柄教学图
  guideControllerPlane = createGuideImagePlane({
    id: "guide-controller-plane",
    src: GUIDE_IMAGES.gamepad,
    position: `-${GUIDE_PANEL_X} ${GUIDE_PANEL_Y} ${GUIDE_PANEL_Z}`,
    rotation: `0 ${GUIDE_PANEL_YAW} 0`
  });

  // 右斜前：眼神教学图
  guideGazePlane = createGuideImagePlane({
    id: "guide-gaze-plane",
    src: GUIDE_IMAGES.gaze,
    position: `${GUIDE_PANEL_X} ${GUIDE_PANEL_Y} ${GUIDE_PANEL_Z}`,
    rotation: `0 -${GUIDE_PANEL_YAW} 0`
  });

  guideRoot.appendChild(guideControllerPlane);
  guideRoot.appendChild(guideGazePlane);

// 左侧手柄教学图里的 OK 区域：点击可Enter，手柄 A 也可Enter
createGuideOkButton({
  parentPanel: guideControllerPlane,
  mode: "gamepad",
  position: `${GUIDE_OK_X} ${GUIDE_OK_Y} ${GUIDE_OK_Z}`
});

// 右侧眼神教学图里的 OK 区域：凝视 3 秒Enter
guideEnterButton = createGuideOkButton({
  parentPanel: guideGazePlane,
  mode: "gaze",
  position: `${GUIDE_OK_X} ${GUIDE_OK_Y} ${GUIDE_OK_Z}`
});

  // 保证Enter教学空间时 look-controls 仍然可用，电脑端鼠标拖拽视角能移动
  cameraEl.setAttribute("look-controls", "enabled: true");
  const canvas = sceneEl.canvas || document.querySelector("canvas");
  if (canvas) {
    canvas.style.pointerEvents = "auto";
    canvas.style.touchAction = "none";
  }

  // 有手柄就默认手柄模式，否则默认眼神模式。两张图始终同时显示。
  const gamepad = findConnectedGamepad();
  if (gamepad) {
    gamepadIndex = gamepad.index;
    setControlMode("gamepad");
  } else {
    setControlMode("gaze");
  }
}

function createGuideImagePlane({ id, src, position, rotation }) {
  const plane = document.createElement("a-plane");
  plane.setAttribute("id", id);
  plane.setAttribute("width", GUIDE_PANEL_WIDTH);
  plane.setAttribute("height", GUIDE_PANEL_HEIGHT);
  plane.setAttribute("position", position);
  plane.setAttribute("rotation", rotation);
  plane.setAttribute(
    "material",
    `shader: flat; src: url(${src}); transparent: true; opacity: 1; depthWrite: false; depthTest: false; side: double`
  );
  plane.object3D.renderOrder = 10;
  return plane;
}


function createGuideOkButton({ parentPanel, mode, position }) {
  const okGroup = document.createElement("a-entity");
  okGroup.classList.add("interactive-hitbox");
  okGroup.setAttribute("position", position);
  okGroup.objectData = {
    type: "guide-ok-button",
    mode,
    feedbackPlane: null,
    progressCircle: null
  };

  const hitbox = document.createElement("a-plane");
  hitbox.classList.add("interactive-hitbox");
  hitbox.setAttribute("width", GUIDE_OK_WIDTH);
  hitbox.setAttribute("height", GUIDE_OK_HEIGHT);
  hitbox.setAttribute("position", "0 0 0");
  hitbox.setAttribute(
    "material",
    "shader: flat; color: #ffffff; transparent: true; opacity: 0.001; depthWrite: false; depthTest: false; side: double"
  );
  hitbox.object3D.renderOrder = 200;

  // 注册给自定义视线检测使用：
  // 这样即使 A-Frame 的 mouseenter 在某些浏览器里不稳定，
  // updateGuideGazeRaycast() 也能稳定检测到右侧 OK 按钮。
  hitbox.object3D.userData.guideOkButton = okGroup;
  guideOkRaycastObjects.push(hitbox.object3D);

  hitbox.addEventListener("loaded", () => {
    const mesh = hitbox.getObject3D("mesh");
    if (mesh) {
      mesh.userData.guideOkButton = okGroup;
      if (!guideOkRaycastObjects.includes(mesh)) {
        guideOkRaycastObjects.push(mesh);
      }
    }
  });

  okGroup.appendChild(hitbox);

  const feedback = document.createElement("a-plane");
  feedback.setAttribute("width", GUIDE_OK_WIDTH);
  feedback.setAttribute("height", GUIDE_OK_HEIGHT);
  feedback.setAttribute("position", "0 0 0.02");
  feedback.setAttribute(
    "material",
    "shader: flat; color: #ffffff; transparent: true; opacity: 0; depthWrite: false; depthTest: false; side: double"
  );
  feedback.object3D.renderOrder = 201;
  okGroup.appendChild(feedback);

  const progressRing = document.createElement("a-ring");

progressRing.setAttribute("radius-inner", "0.18");
progressRing.setAttribute("radius-outer", "0.24");

// 初始进度 = 0
progressRing.setAttribute("theta-start", "0");
progressRing.setAttribute("theta-length", "0");

progressRing.setAttribute(
  "material",
  "shader: flat; color: white; transparent: true; opacity: 0.9; side: double"
);

progressRing.object3D.renderOrder = 302;

okGroup.appendChild(progressRing);

  const onEnter = () => {
    if (!isGuideVisible || isGuideEnteringGame) return;

    updateGuideOkVisual(okGroup, 0.12);

    if (mode === "gaze") {
      setControlMode("gaze");
      startGuideGazeEnter(okGroup);
    }
  };

  const onLeave = () => {
    if (mode === "gaze") {
      cancelGuideGazeEnter(okGroup);
    }
    updateGuideOkVisual(okGroup, 0);
  };

  const onClick = () => {
    if (!isGuideVisible || isGuideEnteringGame) return;

    if (mode === "gamepad") {
      setControlMode("gamepad");
      enterSceneFromGuide();
    } else {
      setControlMode("gaze");
      enterSceneFromGuide();
    }
  };

  [okGroup, hitbox].forEach((target) => {
    target.addEventListener("mouseenter", onEnter);
    target.addEventListener("mouseleave", onLeave);
    target.addEventListener("click", onClick);
    target.addEventListener("touchstart", onClick);
  });

  parentPanel.appendChild(okGroup);
  return okGroup;
}

function removeVRGuideScene() {
  cancelGuideGazeEnter();

  if (guideRoot) {
    guideRoot.remove();
    guideRoot = null;
  }

  guideControllerPlane = null;
  guideGazePlane = null;
  guideEnterButton = null;
  guideOkRaycastObjects.length = 0;
guideGazeTarget = null;
  guideProgressCircle = null;
  isGuideVisible = false;
}

function startGuideGazeEnter(target) {
  if (!isGuideVisible || controlMode !== "gaze" || isGuideEnteringGame) return;
  if (!target) return;

  cancelGuideGazeEnter();

  if (guideGazeTarget?.guideProgressRing) {
  guideGazeTarget.guideProgressRing.setAttribute("theta-length", 0);
}

  guideGazeTarget = target;
  guideGazeStartTime = performance.now();

  const durationMs = GUIDE_GAZE_SECONDS * 1000;

  guideGazeProgressTimer = setInterval(() => {
    if (!guideGazeTarget) return;

    const elapsed = performance.now() - guideGazeStartTime;
    const progress = Math.min(elapsed / durationMs, 1);

    updateGuideOkVisual(guideGazeTarget, progress);
  }, 70);

  guideGazeTimer = setTimeout(() => {
    cancelGuideGazeEnter();
    enterSceneFromGuide();
  }, durationMs);
}

function cancelGuideGazeEnter(target = null) {
  if (target && guideGazeTarget && target !== guideGazeTarget) return;

  if (guideGazeTimer) {
    clearTimeout(guideGazeTimer);
    guideGazeTimer = null;
  }

  if (guideGazeProgressTimer) {
    clearInterval(guideGazeProgressTimer);
    guideGazeProgressTimer = null;
  }

  if (guideGazeTarget) {
    updateGuideOkVisual(guideGazeTarget, 0);
  }

  guideGazeTarget = null;
  guideGazeStartTime = 0;
}

function updateGuideOkVisual(target, progress) {
  if (!target) return;

  // 如果还没创建 ring，就创建
  if (!target.guideProgressRing) {
    const ring = document.createElement("a-ring");

    ring.setAttribute("radius-inner", "0.18");
    ring.setAttribute("radius-outer", "0.25");

    ring.setAttribute("theta-start", "0");
    ring.setAttribute("theta-length", "0");

    ring.setAttribute(
      "material",
      "shader: flat; color: white; transparent: true; opacity: 0.9; side: double"
    );

    ring.object3D.renderOrder = 999;

    target.appendChild(ring);
    target.guideProgressRing = ring;
  }

  const ring = target.guideProgressRing;

  // progress = 0 → 1
  const safeProgress = Math.max(0, Math.min(1, progress || 0));

  // 关键：转成角度
  const angle = safeProgress * 360;

  ring.setAttribute("theta-length", angle);
}

function updateGuideGazeRaycast() {
  if (!isGuideVisible || hasEnteredScene || isGuideEnteringGame) return;
  if (controlMode !== "gaze") return;
  if (!cameraObject || guideOkRaycastObjects.length === 0) return;

  cameraObject.getWorldPosition(guideRayOrigin);
  cameraObject.getWorldDirection(guideRayDirection);

  guideRaycaster.set(guideRayOrigin, guideRayDirection);

  const intersections = guideRaycaster.intersectObjects(guideOkRaycastObjects, true);

  if (intersections.length > 0) {
    const hit = intersections[0].object;
    const target = hit.userData.guideOkButton;

    if (target && target.objectData && target.objectData.mode === "gaze") {
      startGuideGazeEnter(target);
      return;
    }
  }

  cancelGuideGazeEnter();
}

function updateGuideInfo(text) {
  // 教学空间的说明已经写在图片里，不再显示左上角信息，避免干扰画面。
  // Enter正式关卡后，updateInfo() 会继续正常显示关卡提示。
  if (isGuideVisible) return;

  const infoPanel = document.querySelector("#info");
  const infoText = document.querySelector("#info p");

  if (infoPanel) infoPanel.classList.remove("hidden");
  if (infoText) infoText.textContent = text;
}

function enterSceneFromGuide() {
  if (hasEnteredScene || isGuideEnteringGame) return;

  isGuideEnteringGame = true;

  const fogOverlay = document.querySelector("#fog-overlay");

  if (!fogOverlay) {
    removeVRGuideScene();
    enterScene();
    return;
  }

  // Enter第一关也使用白色渐显/渐隐，让教学空间自然过渡到真实关卡
  fogOverlay.style.display = "block";
  fogOverlay.style.transition = "opacity 1.2s ease-in-out";
  fogOverlay.style.opacity = "1";

  setTimeout(() => {
    removeVRGuideScene();
    enterScene();

    fogOverlay.style.transition = "opacity 1.4s ease-in-out";
    fogOverlay.style.opacity = "0";

    setTimeout(() => {
      fogOverlay.style.transition = "";
      fogOverlay.style.display = "";
      isGuideEnteringGame = false;
    }, 1400);
  }, 1400);
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

  // A-Frame 场景和摄像机有时比 loading 稍慢，没准备好就等一下再Enter。
  if (!sceneEl || !cameraEl || !cameraObject || !levelRoot) {
    setTimeout(enterScene, 120);
    return;
  }

  removeVRGuideScene();

  hasEnteredScene = true;

  const startScreen = document.querySelector("#start-screen");
  const infoPanel = document.querySelector("#info");

  if (startScreen) startScreen.classList.add("hidden");
  if (infoPanel) infoPanel.classList.remove("hidden");
  if (sceneEl) sceneEl.classList.remove("hidden");

  const gazeCursor = document.querySelector("#gaze-cursor");

  if (gazeCursor) {
    if (controlMode === "gaze") {
      gazeCursor.classList.remove("hidden");
      gazeCursor.setAttribute("visible", true);
    } else {
      gazeCursor.classList.add("hidden");
      gazeCursor.setAttribute("visible", false);
    }
  }

  // 先Enter第0关教学空间，而不是直接Enter floor1。
  currentLevelIndex = 0;
  loadGuideLevel();
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

  // A-Frame entity 里手动 setObject3D("mesh", mesh) 的情况
  // 结尾页按钮就是这种，所以必须优先处理它
  if (target.getObject3D) {
    const mesh = target.getObject3D("mesh");

    if (mesh && mesh.material) {
      mesh.material.opacity = opacity;
      mesh.material.transparent = opacity < 1;
      mesh.material.needsUpdate = true;
      return;
    }
  }

  // 普通 A-Frame Entity
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
// 第0关：黑色 VR 教学空间
// ===============================

function loadGuideLevel() {
  clearInteractiveObjects();
  cancelGazeConfirm();
  stopAllSoundsAndClearConfirmState();

  currentLevelName = "guide";

  // 第0关使用纯黑空间。这里不用额外黑色全景图，直接让场景背景为黑色。
  const oldSky = document.querySelector("#panorama-sky");
  if (oldSky) oldSky.remove();

  if (sceneEl && sceneEl.object3D) {
    sceneEl.object3D.background = new THREE.Color(0x000000);
  }

  // 左侧：手柄教学图
  const controllerGuide = createGuideImagePlane({
    id: "guide-controller-panel",
    src: GUIDE_IMAGES.gamepad,
    position: `-${GUIDE_PANEL_X} ${GUIDE_PANEL_Y} ${GUIDE_PANEL_Z}`,
    rotation: `0 ${GUIDE_PANEL_YAW} 0`
  });

  // 右侧：眼神教学图
  const gazeGuide = createGuideImagePlane({
    id: "guide-gaze-panel",
    src: GUIDE_IMAGES.gaze,
    position: `${GUIDE_PANEL_X} ${GUIDE_PANEL_Y} ${GUIDE_PANEL_Z}`,
    rotation: `0 -${GUIDE_PANEL_YAW} 0`
  });

  levelRoot.appendChild(controllerGuide);
  levelRoot.appendChild(gazeGuide);

  interactiveObjects.push({ el: controllerGuide, type: "guide-panel", id: "guide-controller-panel" });
  interactiveObjects.push({ el: gazeGuide, type: "guide-panel", id: "guide-gaze-panel" });

  // 中间白色圆球：沿用正式关卡的凝视/确认模式
  const enterButton = createGuideEnterButton();
  levelRoot.appendChild(enterButton);

  if (controlMode === "gamepad") {
    selectedIndex = 0;
    updateInfo("教学页 | 手柄模式：按 A Enter第一关");
  } else {
    selectedIndex = -1;
    updateInfo(`教学页 | 凝视中间白色圆球 ${GAZE_CONFIRM_SECONDS} 秒Enter第一关`);
  }

  updateObjectVisualStates();
}

function createGuideEnterButton() {
  const group = document.createElement("a-entity");
  group.classList.add("interactive");

  // 白色圆球放在两张教学图中间偏下的位置。
  // 你想上下左右微调，就改这里的 x / y / z。
  const enterPosition = new THREE.Vector3(0, -1.45, -3.95);
  group.setAttribute("position", vectorToPositionString(enterPosition));

  group.objectData = {
    type: "guide-enter-button",
    label: "Enter",
    followCamera: false,
    basePosition: enterPosition.clone(),
    baseScale: 1,
    floatOffset: 5,
    mainImage: null,
    labelEntity: null
  };

  const sphere = document.createElement("a-circle");
  sphere.classList.add("interactive-hitbox");
  sphere.setAttribute("radius", "0.38");
  sphere.setAttribute("segments", "64");
  sphere.setAttribute(
    "material",
    "shader: flat; color: #ffffff; transparent: true; opacity: 0.9; depthWrite: false; depthTest: false; side: double"
  );
  sphere.setAttribute("position", "0 0 0");
  sphere.object3D.renderOrder = 25;
  group.appendChild(sphere);

  const label = createTextLabel("Enter");
  label.setAttribute("position", "0 -0.62 0.04");
  label.object3D.renderOrder = 4;
  group.appendChild(label);

  group.objectData.mainImage = sphere;
  group.objectData.labelEntity = label;

  setupInteractiveEvents(group);

  const objectRecord = {
    el: group,
    type: "guide-enter-button",
    id: "guide-enter-button"
  };

  interactiveObjects.push(objectRecord);
  selectableObjects.push(objectRecord);

  return group;
}

function enterFirstLevelFromGuide() {
  if (isLevelTransitioning) return;

  stopAllSoundsAndClearConfirmState();
  cancelGazeConfirm();

  currentLevelIndex = 0;
  transitionToLevel(levelOrder[currentLevelIndex]);
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

  playLevelBackgroundMusic(levelName);

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
// 创建Done按钮
// ===============================

function createFinishButton() {
  const group = document.createElement("a-entity");
  group.classList.add("interactive");

  const finishPosition = getFixedFinishButtonPosition();
  group.setAttribute("position", vectorToPositionString(finishPosition));

  group.objectData = {
    type: "finish-button",
    label: "Done",
    followCamera: false,
    basePosition: finishPosition.clone(),
    baseScale: 1,
    floatOffset: 9
  };

  // Done按钮：实心圆，避免视线扫到圆环中空处导致凝视中断
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

  const label = createTextLabel("Done");
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

  context.font = '44px "AkzidenzCondensed", Arial';
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
    // 视线Enter：Enter预选，并开始凝视计时
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
        if (currentLevelName === "guide") {
          updateInfo(`教学页 | 凝视中间白色圆球 ${GAZE_CONFIRM_SECONDS} 秒Enter第一关`);
        } else {
          updateInfo(`${levelDisplayNames[currentLevelName]} | Look at an image to preview`);
        }
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
  updateGazeRingVisual(entity, 0);

  gazeProgressTimer = setInterval(() => {
    if (!gazeTargetEl || gazeTargetEl !== entity) return;

    const elapsed = performance.now() - gazeStartTime;
    const progress = Math.min(elapsed / durationMs, 1);

    updateGazeProgressInfo(entity, progress);

    // 新增：让白色圆球外侧进度环跟随凝视百分比绕圈
    updateGazeRingVisual(entity, progress);
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

function ensureGazeProgressRing(entity) {
  if (!entity || !entity.objectData) return null;

  const data = entity.objectData;

  // 只给“第0关Enter按钮”和“正式关卡Done按钮”加环形进度
  // 普通意象图片不加，避免画面太乱
  if (
  data.type !== "guide-enter-button" &&
  data.type !== "finish-button" &&
  data.type !== "ending-replay-button"
) {
  return null;
}

  if (data.gazeProgressRing) {
    return data.gazeProgressRing;
  }

  const ring = document.createElement("a-ring");

  // 这两个数值决定进度环的粗细和大小
  // radius-inner 越小，环越厚；整体越大越靠外
  ring.setAttribute("radius-inner", "0.43");
  ring.setAttribute("radius-outer", "0.50");

  // 从上方开始绕圈
  ring.setAttribute("theta-start", "90");

  // 初始没有进度
  ring.setAttribute("theta-length", "0");

  ring.setAttribute("position", "0 0 0.08");

  ring.setAttribute(
    "material",
    "shader: flat; color: #ffffff; transparent: true; opacity: 0; depthWrite: false; depthTest: false; side: double"
  );

  ring.object3D.renderOrder = 80;
  ring.setAttribute("visible", false);

  entity.appendChild(ring);

  data.gazeProgressRing = ring;

  return ring;
}

function updateGazeRingVisual(entity, progress) {
  const ring = ensureGazeProgressRing(entity);

  if (!ring) return;

  const safeProgress = Math.max(0, Math.min(1, progress || 0));
  const angle = safeProgress * 360;

  ring.setAttribute("theta-length", angle);

  if (safeProgress > 0) {
    ring.setAttribute("visible", true);
    ring.setAttribute("material", "opacity", 0.95);
  } else {
    ring.setAttribute("theta-length", 0);
    ring.setAttribute("material", "opacity", 0);
    ring.setAttribute("visible", false);
  }
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

  // 新增：移开凝视时，进度环回到 0
  if (gazeTargetEl) {
    updateGazeRingVisual(gazeTargetEl, 0);
  }

  gazeTargetEl = null;
  gazeStartTime = 0;
}

function updateGazeProgressInfo(entity, progress) {
  if (!entity || !entity.objectData) return;

  const data = entity.objectData;
  const percent = Math.round(progress * 100);

  if (data.type === "ending-replay-button") {
  updateInfo(`Finale | Gaze to replay ${data.label} ${percent}%`);
  return;
}

  if (data.type === "guide-enter-button") {
    updateInfo(`${levelDisplayNames[currentLevelName]} | 凝视Enter ${percent}% | 满 ${GAZE_CONFIRM_SECONDS} 秒Enter第一关`);
    return;
  }

  if (data.type === "finish-button") {
    updateInfo(`${levelDisplayNames[currentLevelName]} | 凝视Done ${percent}% | 满 ${GAZE_CONFIRM_SECONDS} 秒Enter下一关`);
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

  if (currentLevelName === "ending") {
  selectedIndex += direction;

  if (selectedIndex < 0) {
    selectedIndex = selectableObjects.length - 1;
  }

  if (selectedIndex >= selectableObjects.length) {
    selectedIndex = 0;
  }

  updateSelectionInfo();
  return;
}

  const soundObjectCount = selectableObjects.filter((object) => {
    return object.type === "sound-object";
  }).length;

  if (soundObjectCount === 0) return;

  const currentObject = getSelectedObject();

  if (currentObject?.type === "finish-button" || currentObject?.type === "guide-enter-button") {
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

  if (type === "ending-replay-button") {
  updateInfo(`Finale | Preview: ${label} | Confirm to replay`);
  return;
}

  if (type === "guide-enter-button") {
    updateInfo(`${levelDisplayNames[currentLevelName]} | 当前预选：Enter | 确认后Enter第一关`);
    return;
  }

  if (type === "finish-button") {
    updateInfo(`${levelDisplayNames[currentLevelName]} | 当前预选：Done | 确认后Enter下一关`);
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

  // 防止手机 touchstart + click / group + hitbox 连续触发两次确认
  const now = performance.now();
  const actionKey = `${currentLevelName}:${data.type}:${data.id || data.levelName || data.label || ""}`;

  if (
    now - lastConfirmActionTime < CONFIRM_DEBOUNCE_MS &&
    actionKey === lastConfirmActionKey
  ) {
    return;
  }

  lastConfirmActionTime = now;
  lastConfirmActionKey = actionKey;

  if (data.type === "ending-replay-button") {
    playEndingReplay(data.levelName);
    updateObjectVisualStates();
    return;
  }

  if (data.type === "guide-enter-button") {
    enterFirstLevelFromGuide();
    return;
  }

  if (data.type === "sound-object") {
    toggleSoundObjectConfirm(selectedObject.el);
    return;
  }

  if (data.type === "finish-button") {
    if (!hasConfirmedObjectInCurrentLevel()) {
      showFinishHint(selectedObject.el);
      updateInfo(`${levelDisplayNames[currentLevelName]} | 请至少选择一个意象后再Done`);
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
    playSound(data.audioSrc, soundId, data.soundName, data.volume);

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
    finishHintEl = createSmallHintText("Select at least one image first");
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
function createMobileAudioUnlockButton() {
  if (document.querySelector("#audio-unlock-btn")) return;

  const btn = document.createElement("button");
  btn.id = "audio-unlock-btn";
  btn.innerText = "点击开启声音";

  Object.assign(btn.style, {
    position: "fixed",
    left: "50%",
    bottom: "84px",
    transform: "translateX(-50%)",
    zIndex: "99999",
    padding: "12px 24px",
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.75)",
    background: "rgba(255,255,255,0.92)",
    color: "#000",
    fontSize: "15px",
    fontWeight: "bold",
    letterSpacing: "1px"
  });

  const unlock = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    btn.innerText = "声音开启中...";

    await unlockAllAudioForMobile();

    btn.innerText = "声音已开启";
    btn.style.opacity = "0.65";

    setTimeout(() => {
      btn.remove();
    }, 700);
  };

  btn.addEventListener("pointerdown", unlock, { once: true });
  btn.addEventListener("touchstart", unlock, { once: true });
  btn.addEventListener("click", unlock, { once: true });

  document.body.appendChild(btn);
}

async function unlockAllAudioForMobile() {
  if (audioUnlocked) return;

  audioUnlocked = true;

  console.log("正在解锁手机音频：常驻播放 + muted 静音模式...");

  const unlockPromises = [];

  Object.values(levelData).forEach((level) => {
    level.objects.forEach((item) => {
      if (!item.audioSrc) return;

      let audio = activeAudios[item.id];

      if (!audio) {
        audio = new Audio(item.audioSrc);
        audio.loop = true;
        audio.preload = "auto";
        activeAudios[item.id] = audio;
      }

      // 关键：先用极小音量启动，让手机承认这是用户点击后的声音
      audio.muted = false;
      audio.volume = 0.001;
      audio.currentTime = 0;

      const p = audio.play()
        .then(() => {
          // 启动成功后，立刻真正静音
          muteAudioSafely(audio);
          console.log("手机意象音频已解锁：", item.id);
        })
        .catch((error) => {
          console.warn(
            "手机意象音频解锁失败：",
            item.id,
            item.audioSrc,
            error.name,
            error.message
          );
        });

      unlockPromises.push(p);
    });
  });

  if (typeof levelBackgroundMusic !== "undefined") {
    Object.entries(levelBackgroundMusic).forEach(([levelName, config]) => {
      if (!config || !config.src) return;

      let audio = backgroundAudios[levelName];

      if (!audio) {
        audio = new Audio(config.src);
        audio.loop = true;
        audio.preload = "auto";
        backgroundAudios[levelName] = audio;
      }

      audio.muted = false;
      audio.volume = 0.001;
      audio.currentTime = 0;

      const p = audio.play()
        .then(() => {
          muteAudioSafely(audio);
          console.log("手机背景音乐已解锁：", levelName);
        })
        .catch((error) => {
          console.warn(
            "手机背景音乐解锁失败：",
            levelName,
            config.src,
            error.name,
            error.message
          );
        });

      unlockPromises.push(p);
    });
  }

  await Promise.allSettled(unlockPromises);

  // 保险：全部解锁完成后，再全体静音一次
  muteAllActiveAudios();

  console.log("手机音频解锁流程已执行：muted 静音模式");
}





function unlockAllAudioForMobile() {
  if (audioUnlocked) return;

  audioUnlocked = true;

  console.log("正在解锁手机音频...");

  // 1. 解锁所有意象音频
  Object.values(levelData).forEach((level) => {
    level.objects.forEach((item) => {
      if (!item.audioSrc || activeAudios[item.id]) return;

      const audio = new Audio(item.audioSrc);
      audio.loop = true;
      audio.preload = "auto";
      audio.volume = 0;

      activeAudios[item.id] = audio;

      audio.play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = Math.max(0, Math.min(1, Number(item.volume ?? 0.75)));
        })
        .catch((error) => {
          console.warn("手机音频预解锁失败：", item.id, item.audioSrc, error);
        });
    });
  });

  // 2. 如果你加了每层背景音乐，也一起解锁
  if (typeof levelBackgroundMusic !== "undefined") {
    Object.entries(levelBackgroundMusic).forEach(([levelName, config]) => {
      if (!config || !config.src || backgroundAudios[levelName]) return;

      const audio = new Audio(config.src);
      audio.loop = true;
      audio.preload = "auto";
      audio.volume = 0;

      backgroundAudios[levelName] = audio;

      audio.play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = Math.max(0, Math.min(1, Number(config.volume ?? 0.28)));
        })
        .catch((error) => {
          console.warn("手机背景音乐预解锁失败：", levelName, config.src, error);
        });
    });
  }

  console.log("手机音频解锁流程已执行");
}

function muteAudioSafely(audio) {
  if (!audio) return;

  audio.muted = true;
  audio.volume = 0;

  try {
    audio.currentTime = 0;
  } catch (error) {}
}

function unmuteAudioSafely(audio, volume) {
  if (!audio) return;

  const safeVolume = Math.max(0, Math.min(1, Number(volume ?? 0.75)));

  audio.muted = false;
  audio.volume = safeVolume;
}

function muteAllActiveAudios() {
  Object.values(activeAudios).forEach((audio) => {
    muteAudioSafely(audio);
  });

  if (typeof backgroundAudios !== "undefined") {
    Object.values(backgroundAudios).forEach((audio) => {
      muteAudioSafely(audio);
    });
  }
}

// ===============================
// 声音逻辑：文件缺失也不影响视觉
// ===============================

function playLevelBackgroundMusic(levelName) {
  const config = levelBackgroundMusic[levelName];

  stopLevelBackgroundMusic();

  if (!config || !config.src) return;

  const safeVolume = Math.max(0, Math.min(1, Number(config.volume ?? 0.28)));

  let audio = backgroundAudios[levelName];

  if (!audio) {
    audio = new Audio(config.src);
    audio.loop = true;
    audio.preload = "auto";
    audio.muted = false;
    audio.volume = 0;
    backgroundAudios[levelName] = audio;
  }

  backgroundAudio = audio;
  backgroundAudioId = levelName;

  if (IS_MOBILE_AUDIO_MODE && audioUnlocked) {
    try {
      audio.currentTime = 0;
    } catch (error) {}

    unmuteAudioSafely(audio, safeVolume);

    if (audio.paused) {
      audio.play().catch((error) => {
        console.warn("手机端背景音乐恢复失败：", levelName, error);
      });
    }

    return;
  }

  audio.muted = false;
  audio.volume = safeVolume;
  audio.currentTime = 0;

  audio.play().catch((error) => {
    console.warn(
      `背景音乐暂时无法播放：${levelName}`,
      {
        path: config.src,
        volume: safeVolume,
        errorName: error.name,
        errorMessage: error.message
      }
    );
  });
}

function stopLevelBackgroundMusic() {
  if (!backgroundAudio) return;

  if (IS_MOBILE_AUDIO_MODE && audioUnlocked) {
    muteAudioSafely(backgroundAudio);
    backgroundAudio = null;
    backgroundAudioId = null;
    return;
  }

  backgroundAudio.pause();
  backgroundAudio.currentTime = 0;

  backgroundAudio = null;
  backgroundAudioId = null;
}

function playSound(audioSrc, soundId, soundName, volume = 0.75) {
  if (!audioSrc) return;

  const safeVolume = Math.max(0, Math.min(1, Number(volume ?? 0.75)));

  if (!activeAudios[soundId]) {
    const audio = new Audio(audioSrc);

    audio.loop = true;
    audio.preload = "auto";
    audio.muted = false;
    audio.volume = 0;

    audio.addEventListener("error", () => {
      const error = audio.error;

      console.warn(
        `音频加载错误：${soundName}`,
        {
          path: audioSrc,
          errorCode: error ? error.code : "unknown",
          message: getAudioErrorMessage(error)
        }
      );
    });

    activeAudios[soundId] = audio;
  }

  const audio = activeAudios[soundId];

  if (IS_MOBILE_AUDIO_MODE && audioUnlocked) {
    try {
      audio.currentTime = 0;
    } catch (error) {}

    // 手机端：不重新创建声音，只把这个已解锁音频打开
    unmuteAudioSafely(audio, safeVolume);

    if (audio.paused) {
      audio.play().catch((error) => {
        console.warn(
          `手机端声音恢复失败：${soundName}`,
          {
            path: audioSrc,
            errorName: error.name,
            errorMessage: error.message
          }
        );
      });
    }

    return;
  }

  audio.muted = false;
  audio.volume = safeVolume;

  audio.play().catch((error) => {
    console.warn(
      `声音暂时无法播放：${soundName}`,
      {
        path: audioSrc,
        volume: safeVolume,
        errorName: error.name,
        errorMessage: error.message
      }
    );
  });
}

function getAudioErrorMessage(error) {
  if (!error) return "未知错误";

  switch (error.code) {
    case 1:
      return "MEDIA_ERR_ABORTED：加载被中断";
    case 2:
      return "MEDIA_ERR_NETWORK：网络或路径问题";
    case 3:
      return "MEDIA_ERR_DECODE：音频编码无法解码，建议重新导出 MP3";
    case 4:
      return "MEDIA_ERR_SRC_NOT_SUPPORTED：浏览器不支持这个音频源，建议重新转码";
    default:
      return "未知音频错误";
  }
}

function stopSound(soundId) {
  const audio = activeAudios[soundId];

  if (!audio) return;

  if (IS_MOBILE_AUDIO_MODE && audioUnlocked) {
    muteAudioSafely(audio);
    return;
  }

  audio.pause();
  audio.currentTime = 0;
}

function stopAllSoundsAndClearConfirmState() {
  stopEndingReplaySounds();

  if (IS_MOBILE_AUDIO_MODE && audioUnlocked) {
    muteAllActiveAudios();
    confirmedSoundIds.clear();
    return;
  }

  Object.values(activeAudios).forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
  });

  stopLevelBackgroundMusic();

  confirmedSoundIds.clear();
}

function saveCurrentLevelSoundSelection() {
  if (!levelData[currentLevelName]) return;

  const currentObjects = levelData[currentLevelName].objects || [];

  finalSoundRecords[currentLevelName] = currentObjects
    .filter((item) => confirmedSoundIds.has(item.id))
    .map((item) => item.id);

  console.log("Saved final sound composition:", currentLevelName, finalSoundRecords[currentLevelName]);
}

// ===============================
// 关卡切换
// ===============================

function goToNextLevel() {
  if (isLevelTransitioning) return;

  // 关键：先保存当前关卡最终选择，再清空声音
  saveCurrentLevelSoundSelection();

  stopAllSoundsAndClearConfirmState();

  if (currentLevelIndex < levelOrder.length - 1) {
    currentLevelIndex += 1;
    const nextLevelName = levelOrder[currentLevelIndex];

    transitionToLevel(nextLevelName);
  } else {
    transitionToEndingState();
  }
}

function transitionToEndingState() {
  if (isLevelTransitioning) return;

  isLevelTransitioning = true;

  const fogOverlay = document.querySelector("#fog-overlay");

  if (!fogOverlay) {
    showEndingState();
    isLevelTransitioning = false;
    return;
  }

  fogOverlay.style.display = "block";
  fogOverlay.style.transition = "opacity 1.2s ease-in-out";
  fogOverlay.style.opacity = "1";

  setTimeout(() => {
    showEndingState();

    fogOverlay.style.transition = "opacity 1.4s ease-in-out";
    fogOverlay.style.opacity = "0";

    setTimeout(() => {
      isLevelTransitioning = false;
      fogOverlay.style.transition = "";
      fogOverlay.style.display = "";
    }, 1400);
  }, 1400);
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

function areSoundSetsEqual(selectedIds, targetIds) {
  if (!Array.isArray(selectedIds) || !Array.isArray(targetIds)) return false;
  if (selectedIds.length !== targetIds.length) return false;

  const selectedSet = new Set(selectedIds);
  const targetSet = new Set(targetIds);

  return targetIds.every((id) => selectedSet.has(id)) &&
    selectedIds.every((id) => targetSet.has(id));
}

function getAuthorMatchLevel() {
  for (const levelName of Object.keys(authorFavoriteSoundSets)) {
    const selectedIds = finalSoundRecords[levelName] || [];
    const target = authorFavoriteSoundSets[levelName];

    if (areSoundSetsEqual(selectedIds, target.ids)) {
      return {
        levelName,
        label: target.label
      };
    }
  }

  return null;
}

function showEndingState() {
  clearInteractiveObjects();
  cancelGazeConfirm();
  stopEndingReplaySounds();

  currentLevelName = "ending";
  selectedIndex = 0;

  // 保留 F3 全景作为背景
  setPanorama("floor3");

  // 用一层半透明遮罩模拟“背景被压暗 / 模糊”的感觉
  // 真正的实时背景模糊在 A-Frame 里会比较重，这里先做轻量稳定版
  const authorMatch = getAuthorMatchLevel();

if (authorMatch && !hasShownAuthorMatchEasterEgg) {
  hasShownAuthorMatchEasterEgg = true;
  showAuthorMatchEasterEgg(authorMatch, () => {
    createEndingScene();
  });
} else {
  createEndingScene();
}

  updateInfo("Finale | Select a sound piece to replay");

  console.log("Final sound records:", finalSoundRecords);
}
function showAuthorMatchEasterEgg(matchInfo, onComplete) {
  removeAuthorMatchEasterEgg();

  easterEggRoot = document.createElement("a-entity");
  easterEggRoot.setAttribute("id", "author-match-easter-egg");

  const cameraWorldPosition = new THREE.Vector3();
  const cameraWorldDirection = new THREE.Vector3();

  cameraObject.getWorldPosition(cameraWorldPosition);
  cameraObject.getWorldDirection(cameraWorldDirection);

  // 小彩蛋弹窗比最终大窗稍微近一点
  const distance = 3.6;

  const eggPosition = cameraWorldPosition
    .clone()
    .add(cameraWorldDirection.clone().multiplyScalar(-distance));

  easterEggRoot.objectData = {
    type: "author-match-easter-egg",
    basePosition: eggPosition.clone(),
    floatOffset: Math.random() * 10
  };

  easterEggRoot.object3D.position.copy(eggPosition);
  easterEggRoot.object3D.lookAt(cameraWorldPosition);

  const card = createAuthorMatchCard(matchInfo);
  card.setAttribute("position", "0 0 0");
  easterEggRoot.appendChild(card);

  levelRoot.appendChild(easterEggRoot);

  updateInfo(`Finale | A hidden match was found on ${matchInfo.label}`);

  // 小弹窗停留时间
  setTimeout(() => {
    removeAuthorMatchEasterEgg();

    if (typeof onComplete === "function") {
      onComplete();
    }
  }, 2600);
}

function removeAuthorMatchEasterEgg() {
  if (easterEggRoot) {
    easterEggRoot.remove();
    easterEggRoot = null;
  }
}

function createAuthorMatchCard(matchInfo) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = 900;
  canvas.height = 420;

  context.clearRect(0, 0, canvas.width, canvas.height);

  // 外层柔和阴影
  context.shadowColor = "rgba(255, 255, 255, 0.35)";
  context.shadowBlur = 32;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;

  // 简约毛玻璃小卡片
  context.fillStyle = "rgba(238, 238, 238, 0.78)";
  roundRect(context, 70, 62, 760, 296, 44);
  context.fill();

  context.shadowColor = "transparent";
  context.shadowBlur = 0;

  // 细边框
  context.strokeStyle = "rgba(255, 255, 255, 0.92)";
  context.lineWidth = 3;
  roundRect(context, 70, 62, 760, 296, 44);
  context.stroke();

  // 内层高光
  context.strokeStyle = "rgba(255, 255, 255, 0.46)";
  context.lineWidth = 2;
  roundRect(context, 88, 80, 724, 260, 36);
  context.stroke();

  context.textAlign = "center";
  context.textBaseline = "middle";

  context.font = '66px "AkzidenzCondensed", Arial';
  context.fillStyle = "rgba(10, 10, 10, 0.94)";
  context.fillText("A Hidden Match", canvas.width / 2, 150);

  context.font = '34px "AkzidenzCondensed", Arial';
  context.fillStyle = "rgba(20, 20, 20, 0.78)";
  context.fillText(
    `Your ${matchInfo.label} sound piece matches the author's favorite.`,
    canvas.width / 2,
    220
  );

  context.font = '28px "AkzidenzCondensed", Arial';
  context.fillStyle = "rgba(20, 20, 20, 0.52)";
  context.fillText("Thank you for listening so closely.", canvas.width / 2, 278);

  return createCanvasPlaneEntity(canvas, 3.7, 1.72, 180, 1);
}

function createEndingScene() {
  removeEndingScene();

  endingRoot = document.createElement("a-entity");
endingRoot.setAttribute("id", "ending-scene-root");

// 关键修改：不再挂到 cameraEl 上，而是放到世界空间里。
// 这样它不会跟着镜头旋转，玩家需要真正看向它才能选择按钮。
const cameraWorldPosition = new THREE.Vector3();
const cameraWorldDirection = new THREE.Vector3();

cameraObject.getWorldPosition(cameraWorldPosition);
cameraObject.getWorldDirection(cameraWorldDirection);

// 窗口距离玩家的远近。数值越大越远。
const endingPanelDistance = 4.2;

const endingPanelPosition = cameraWorldPosition
  .clone()
  .add(cameraWorldDirection.clone().multiplyScalar(-endingPanelDistance));

endingRoot.objectData = {
  type: "ending-root",
  basePosition: endingPanelPosition.clone(),
  floatOffset: Math.random() * 10
};

endingRoot.object3D.position.copy(endingPanelPosition);
endingRoot.object3D.lookAt(cameraWorldPosition);

levelRoot.appendChild(endingRoot);

  // 毛玻璃主面板
  const glassPanel = createEndingGlassPanel();
  glassPanel.setAttribute("position", "0 0 0");
  endingRoot.appendChild(glassPanel);

  // 三个回放按钮
  const buttonData = [
    {
      levelName: "floor1",
      title: "F1",
      subtitle: "Hallway Sound Piece",
      x: -1.65
    },
    {
      levelName: "floor2",
      title: "F2",
      subtitle: "Outdoor Sound Piece",
      x: 0
    },
    {
      levelName: "floor3",
      title: "F3",
      subtitle: "Atrium Sound Piece",
      x: 1.65
    }
  ];

  buttonData.forEach((data) => {
    const button = createEndingReplayButton(data);
    endingRoot.appendChild(button);

    const objectRecord = {
      el: button,
      type: "ending-replay-button",
      id: data.levelName
    };

    interactiveObjects.push(objectRecord);
    selectableObjects.push(objectRecord);
  });

  selectedIndex = 0;
  updateObjectVisualStates();
}

function removeEndingScene() {
  stopEndingReplaySounds();

  if (endingRoot) {
    endingRoot.remove();
    endingRoot = null;
  }
}

function updateEndingRootVisual() {
  if (!endingRoot || !endingRoot.objectData || !cameraObject) return;

  const data = endingRoot.objectData;
  const basePosition = data.basePosition;

  if (!basePosition) return;

  const time = performance.now() * 0.001;
  const floatOffset = data.floatOffset || 0;

  // 微微上下漂浮
  const floatY = Math.sin(time * 0.85 + floatOffset) * 0.055;

  endingRoot.object3D.position.set(
    basePosition.x,
    basePosition.y + floatY,
    basePosition.z
  );

  const cameraWorldPosition = new THREE.Vector3();
  cameraObject.getWorldPosition(cameraWorldPosition);

  // 始终面向玩家
  endingRoot.object3D.lookAt(cameraWorldPosition);
}

function updateAuthorMatchEasterEggVisual() {
  if (!easterEggRoot || !easterEggRoot.objectData || !cameraObject) return;

  const data = easterEggRoot.objectData;
  const basePosition = data.basePosition;

  if (!basePosition) return;

  const time = performance.now() * 0.001;
  const floatOffset = data.floatOffset || 0;

  const floatY = Math.sin(time * 1.1 + floatOffset) * 0.045;

  easterEggRoot.object3D.position.set(
    basePosition.x,
    basePosition.y + floatY,
    basePosition.z
  );

  const cameraWorldPosition = new THREE.Vector3();
  cameraObject.getWorldPosition(cameraWorldPosition);

  easterEggRoot.object3D.lookAt(cameraWorldPosition);
}

function createEndingGlassPanel() {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = 1024;
  canvas.height = 640;

  context.clearRect(0, 0, canvas.width, canvas.height);

  // ===============================
  // 和彩蛋卡片统一的浅色毛玻璃质感
  // ===============================

  // 外层柔和白色发光
  context.shadowColor = "rgba(255, 255, 255, 0.38)";
  context.shadowBlur = 44;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;

  // 主卡片底色：比原来更实，不再灰蒙蒙
  context.fillStyle = "rgba(238, 238, 238, 0.82)";
  roundRect(context, 56, 48, 912, 544, 54);
  context.fill();

  // 关闭阴影，避免影响后面的文字和线条
  context.shadowColor = "transparent";
  context.shadowBlur = 0;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;

  // 外层白色细边框
  context.strokeStyle = "rgba(255, 255, 255, 0.96)";
  context.lineWidth = 4;
  roundRect(context, 56, 48, 912, 544, 54);
  context.stroke();

  // 内层高光线
  context.strokeStyle = "rgba(255, 255, 255, 0.46)";
  context.lineWidth = 2;
  roundRect(context, 78, 70, 868, 500, 44);
  context.stroke();

  // 顶部轻微高光，让面板更像玻璃
  const highlight = context.createLinearGradient(0, 70, 0, 270);
  highlight.addColorStop(0, "rgba(255, 255, 255, 0.34)");
  highlight.addColorStop(1, "rgba(255, 255, 255, 0)");

  context.fillStyle = highlight;
  roundRect(context, 78, 70, 868, 210, 44);
  context.fill();

  // ===============================
  // 文字：改成深色，保证手机上看得清楚
  // ===============================

  context.textAlign = "center";
  context.textBaseline = "middle";

  context.font = '64px "AkzidenzCondensed", Arial';
  context.fillStyle = "rgba(10, 10, 10, 0.94)";
  context.fillText("The Sound Pieces Are Complete", canvas.width / 2, 150);

  context.font = '30px "AkzidenzCondensed", Arial';
  context.fillStyle = "rgba(20, 20, 20, 0.72)";
  context.fillText("Replay the compositions you made on each floor.", canvas.width / 2, 210);

  context.font = '24px "AkzidenzCondensed", Arial';
  context.fillStyle = "rgba(20, 20, 20, 0.48)";
  context.fillText("Gaze to play / Use joystick and A button", canvas.width / 2, 510);

  return createCanvasPlaneEntity(canvas, 4.8, 3.0, 100, 1);
}


function createCanvasPlaneEntity(canvas, width, height, renderOrder = 100, opacity = 1) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  if ("colorSpace" in texture) {
    texture.colorSpace = THREE.SRGBColorSpace;
  } else {
    texture.encoding = THREE.sRGBEncoding;
  }

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
    side: THREE.DoubleSide
  });

  const geometry = new THREE.PlaneGeometry(width, height);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = renderOrder;

  const entity = document.createElement("a-entity");
  entity.setObject3D("mesh", mesh);

  return entity;
}

function createInvisibleHitboxEntity(width, height, renderOrder = 130) {
  const geometry = new THREE.PlaneGeometry(width, height);

  const material = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = renderOrder;

  const entity = document.createElement("a-entity");
  entity.classList.add("interactive-hitbox");
  entity.setObject3D("mesh", mesh);

  return entity;
}

function createEndingReplayButton({ levelName, title, subtitle, x }) {
  const group = document.createElement("a-entity");

  group.classList.add("interactive");
  group.setAttribute("position", `${x} -0.58 0.08`);

  group.objectData = {
    type: "ending-replay-button",
    levelName,
    label: title,
    subtitle,
    baseScale: 1,
    mainImage: null,
    glowPlane: null,
    gazeProgressRing: null
  };

  // 不再使用单独的 glowPlane。
// 手机端会把透明 canvas 的背景渲染成黑方块，所以选中反馈改由按钮本体缩放 + 凝视圆环完成。
group.objectData.glowPlane = null;

  // 可见按钮：同时也是凝视命中区
  // 不再额外创建白色/透明 hitbox，避免出现难看的矩形块
  const buttonPlane = createEndingButtonPlane({
    title,
    subtitle,
    isActive: false
  });

  buttonPlane.classList.add("interactive-hitbox");
  buttonPlane.setAttribute("position", "0 0 0.04");

  group.appendChild(buttonPlane);
  group.objectData.mainImage = buttonPlane;

  setupInteractiveEvents(group);

  return group;
}

function createEndingButtonPlane({ title, subtitle, isActive }) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = 720;
  canvas.height = 380;

  context.clearRect(0, 0, canvas.width, canvas.height);

  // 白色发光阴影：和最终主浮窗、彩蛋保持一致
  context.shadowColor = isActive
    ? "rgba(255, 255, 255, 0.72)"
    : "rgba(255, 255, 255, 0.34)";
  context.shadowBlur = isActive ? 42 : 28;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;

  // 按钮底色：不再偏灰，变成更亮的浅色毛玻璃
  context.fillStyle = isActive
    ? "rgba(255, 255, 255, 0.94)"
    : "rgba(238, 238, 238, 0.82)";

  roundRect(context, 72, 74, 576, 232, 46);
  context.fill();

  // 关闭阴影，避免文字糊
  context.shadowColor = "transparent";
  context.shadowBlur = 0;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;

  // 外层白色边框
  context.strokeStyle = isActive
    ? "rgba(255, 255, 255, 1)"
    : "rgba(255, 255, 255, 0.9)";

  context.lineWidth = isActive ? 5 : 3;
  roundRect(context, 72, 74, 576, 232, 46);
  context.stroke();

  // 内层高光
  context.strokeStyle = "rgba(255, 255, 255, 0.48)";
  context.lineWidth = 2;
  roundRect(context, 90, 92, 540, 196, 36);
  context.stroke();

  // 顶部柔光
  const highlight = context.createLinearGradient(0, 80, 0, 190);
  highlight.addColorStop(0, "rgba(255, 255, 255, 0.34)");
  highlight.addColorStop(1, "rgba(255, 255, 255, 0)");

  context.fillStyle = highlight;
  roundRect(context, 90, 92, 540, 108, 36);
  context.fill();

  // 只保留 F1 / F2 / F3
  context.textAlign = "center";
  context.textBaseline = "middle";

  context.font = '118px "AkzidenzCondensed", Arial';
  context.fillStyle = "rgba(8, 8, 8, 0.96)";
  context.fillText(title, canvas.width / 2, canvas.height / 2 + 6);

  return createCanvasPlaneEntity(canvas, 1.42, 0.75, 120, 1);
}





function getSoundItemById(soundId) {
  for (const levelName of Object.keys(levelData)) {
    const found = levelData[levelName].objects.find((item) => item.id === soundId);
    if (found) return found;
  }

  return null;
}

function playEndingReplay(levelName) {

if (endingActiveReplayLevel === levelName) {
  stopEndingReplaySounds();
  updateInfo(`Finale | Stopped ${levelDisplayNames[levelName]}`);
  updateEndingButtonStates();
  return;
}

  stopEndingReplaySounds();

  const soundIds = finalSoundRecords[levelName] || [];

  if (soundIds.length === 0) {
    updateInfo(`Finale | No saved sound piece for ${levelDisplayNames[levelName]}`);
    return;
  }

  endingActiveReplayLevel = levelName;

  // 如果你有每层背景音乐，也一起作为回放底层播放
  if (typeof levelBackgroundMusic !== "undefined" && levelBackgroundMusic[levelName]) {
    const bgConfig = levelBackgroundMusic[levelName];
    const bgAudio = new Audio(bgConfig.src);

    bgAudio.loop = true;
    bgAudio.volume = Math.max(0, Math.min(1, Number(bgConfig.volume ?? 0.25)));

    endingReplayAudios.push(bgAudio);

    bgAudio.play().catch((error) => {
      console.warn("Ending background replay failed:", levelName, error);
    });
  }

  soundIds.forEach((soundId) => {
    const item = getSoundItemById(soundId);

    if (!item || !item.audioSrc) return;

    let audio = activeAudios[soundId];

if (!audio) {
  audio = new Audio(item.audioSrc);
  audio.loop = true;
  audio.preload = "auto";
  activeAudios[soundId] = audio;
}

try {
  audio.currentTime = 0;
} catch (error) {}

audio.loop = true;
unmuteAudioSafely(audio, item.volume ?? 0.75);

endingReplayAudios.push(audio);

if (audio.paused) {
  audio.play().catch((error) => {
    console.warn("Ending sound replay failed:", soundId, error);
  });
}
  });


  updateInfo(`Finale | Replaying ${levelDisplayNames[levelName]}`);
  updateEndingButtonStates();
}

function stopEndingReplaySounds() {
  endingReplayAudios.forEach((audio) => {
    if (!audio) return;

    if (IS_MOBILE_AUDIO_MODE && audioUnlocked) {
      muteAudioSafely(audio);
      return;
    }

    audio.pause();
    audio.currentTime = 0;
  });

  endingReplayAudios = [];
  endingActiveReplayLevel = null;
}

function updateEndingButtonStates() {
  if (!endingRoot) return;

  selectableObjects.forEach((objectRecord) => {
    const entity = objectRecord.el;
    const data = entity.objectData;

    if (!data || data.type !== "ending-replay-button") return;

    const isActive = data.levelName === endingActiveReplayLevel;

    if (data.glowPlane) {
  data.glowPlane.setAttribute("visible", isActive);
  setVisualOpacity(data.glowPlane, isActive ? 0.42 : 0);
}
  });

  updateObjectVisualStates();
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
      if (currentLevelName === "guide") {
        updateInfo("教学页 | 手柄模式：按 A Enter第一关");
      } else {
        updateInfo("手柄模式：左摇杆切换 / 向下选择Done / A确认");
      }
    } else {
      selectedIndex = -1;
      updateObjectVisualStates();
      if (currentLevelName === "guide") {
        updateInfo(`教学页 | 凝视中间白色圆球 ${GAZE_CONFIRM_SECONDS} 秒Enter第一关`);
      } else {
        updateInfo(`${levelDisplayNames[currentLevelName]} | 请看向一个意象，凝视 ${GAZE_CONFIRM_SECONDS} 秒确认`);
      }
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

  // 黑色教学空间 / 未Enter关卡时：两张教学图同时显示。
  // 如果检测到手柄输入，就暗中切到手柄模式；按 A Enter游戏。
  if (!hasEnteredScene) {
    if (isMeaningfulGamepadInput(gamepad)) {
      gamepadIndex = gamepad.index;
      setControlMode("gamepad");
    }

    if (aButtonPressed && !previousAButtonPressed) {
      setControlMode("gamepad");
      enterSceneFromGuide();
    }

    previousAButtonPressed = aButtonPressed;
    return;
  }

  // 已Enter场景后：只要检测到手柄输入，就自动切到手柄模式。
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
    // 教学页：按 Enter Enter场景
    if (event.code === "Enter" && !hasEnteredScene) {
      enterSceneFromGuide();
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
      if (currentLevelName === "guide") {
        enterFirstLevelFromGuide();
        return;
      }

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

  // 结尾页窗口固定在世界空间里，但始终面向玩家并微微漂浮
  if (currentLevelName === "ending") {
  updateEndingRootVisual();
  updateAuthorMatchEasterEggVisual();
}

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
    const isEndingButton = data.type === "ending-replay-button";
const isFinishButton = data.type === "finish-button" || data.type === "guide-enter-button";

if (isEndingButton) {
  const isActive = data.levelName === endingActiveReplayLevel;
  const endingScale = isSelected ? 1.08 : 1;

  entity.object3D.scale.set(endingScale, endingScale, endingScale);

  if (data.mainImage) {
    setVisualOpacity(data.mainImage, isSelected ? 1 : 0.88);
  }

  if (data.glowPlane) {
  const shouldGlow = isSelected || isActive;

  data.glowPlane.setAttribute("visible", shouldGlow);
  setVisualOpacity(data.glowPlane, isActive ? 0.42 : 0.26);
}

  return;
}

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
    // Done按钮
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
