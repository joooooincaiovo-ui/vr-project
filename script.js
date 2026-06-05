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
const OUTLINE_SCALE = 1.1;

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
    loadPanoramas();
  });

  initLoadingFlow();
  setupGuideButtons();
  setupKeyboardInput();
  setupGamepadEvents();
  setupImageFallbacks();

  requestAnimationFrame(updateLoop);
});

const vrToggleBtn = document.createElement("button");
vrToggleBtn.id = "vr-toggle-btn";
vrToggleBtn.innerText = "VR / 3D";
Object.assign(vrToggleBtn.style, {
  position: "fixed",
  bottom: "16px",
  right: "16px",
  zIndex: "50",
  padding: "10px 16px",
  borderRadius: "12px",
  background: "rgba(255,255,255,0.85)",
  color: "black",
  fontWeight: "bold",
  border: "none"
});
document.body.appendChild(vrToggleBtn);

vrToggleBtn.addEventListener("click", () => {
  if (!sceneEl.is("vr-mode")) sceneEl.enterVR();
  else sceneEl.exitVR();
});


// ===============================
// 教学页点击进入场景
// ===============================

// ===============================
// 浮动意象创建
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

  // ===============================
  // 底层：原图
  // ===============================
  const mainImage = document.createElement("a-image");

// 临时测试：如果是金鱼，就先不加载金鱼图片
// 目的：确认白色叠层是不是 f1-fish.png 这张透明 PNG 导致的
if (item.id === "f1-fish") {
  mainImage.setAttribute(
    "material",
    "shader: flat; color: #ffffff; transparent: true; opacity: 0.15; depthWrite: false; depthTest: false; side: double"
  );
} else {
  if (item.imageSrc) {
    mainImage.setAttribute("src", `#${item.id}-img`);
  }

  mainImage.setAttribute(
    "material",
    "shader: flat; transparent: true; opacity: 0.94; depthWrite: false; depthTest: false; alphaTest: 0.05; side: double"
  );
}

mainImage.setAttribute("width", IMAGE_SIZE);
mainImage.setAttribute("height", IMAGE_SIZE);
mainImage.classList.add("interactive-hitbox");
mainImage.setAttribute("position", "0 0 0");

mainImage.object3D.renderOrder = 15;

group.appendChild(mainImage);
group.objectData.mainImage = mainImage;
  // ===============================
  // 上层：selected 白色描边图
  // 注意：这里不是替换原图，而是叠加在原图上
  // ===============================
// ===============================
// 上层：selected 白色描边图
// 注意：这里不是替换原图，而是叠加在原图上
// ===============================
// ===============================
// VR稳定版选中提示：不用 selected PNG，改用几何白圈
// 这样可以避开手机分屏 VR 对透明 PNG 的渲染错误
// ===============================
const selectionRing = document.createElement("a-entity");

selectionRing.setAttribute(
  "geometry",
  "primitive: torus; radius: 0.78; radiusTubular: 0.018; segmentsRadial: 12; segmentsTubular: 64"
);

selectionRing.setAttribute(
  "material",
  "shader: flat; color: #ffffff; transparent: true; opacity: 0; depthWrite: false; depthTest: false"
);

selectionRing.setAttribute("position", "0 0 0.04");
selectionRing.setAttribute("visible", false);

selectionRing.object3D.renderOrder = 20;

group.appendChild(selectionRing);
group.objectData.selectionRing = selectionRing;

// 保险：不再使用旧的 selected 描边 PNG
group.objectData.outlineImage = null;
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
    sceneEl.appendChild(sky);
  }

  sky.removeAttribute("src");
  sky.removeAttribute("material");

  sky.setAttribute("src", panoramas[levelName]);

  // 强制材质不透明，避免 PNG alpha 导致的残影
  sky.setAttribute(
    "material",
    [
      "shader: flat",
      "side: back",
      "transparent: false",
      "opacity: 1",
      "depthWrite: false",
      "depthTest: false"
    ].join("; ")
  );

  // 场景背景黑色
  if (sceneEl.object3D) {
    sceneEl.object3D.background = new THREE.Color(0x000000);
  }
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

    // 保留电脑点击测试，但手机眼神模式主要不再依赖点击
    target.addEventListener("click", () => {
      if (!hasEnteredScene || controlMode !== "gaze") return;

      selectedIndex = selectableObjects.findIndex(o => o.el === group);
      updateObjectVisualStates();

      // 点击不再直接确认，只作为电脑测试时的辅助预选
      updateSelectionInfo();
    });

    target.addEventListener("touchstart", () => {
      if (!hasEnteredScene || controlMode !== "gaze") return;

      selectedIndex = selectableObjects.findIndex(o => o.el === group);
      updateObjectVisualStates();

      // 手机触屏不再作为确认方式，避免触屏失灵影响流程
      updateSelectionInfo();
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
      let finishScale = 1;

      if (isSelected) {
        finishScale = 1.28;
      }

      entity.object3D.scale.set(finishScale, finishScale, finishScale);

      if (data.mainImage) {
        data.mainImage.setAttribute("material", "opacity", isSelected ? 1 : 0.9);
      }

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
    // 原图透明度
    // ===============================
    if (data.mainImage) {
      if (isConfirmed) {
        data.mainImage.setAttribute("material", "opacity", 1);
      } else if (isSelected) {
        data.mainImage.setAttribute("material", "opacity", 1);
      } else {
        data.mainImage.setAttribute("material", "opacity", 0.92);
      }
    }

    // ===============================
    // 白色描边层
    // 预选：半透明描边
    // 确认：完整描边
    // 普通：隐藏描边
    // ===============================
    // ===============================
// VR稳定版选中白圈
// ===============================
if (data.selectionRing) {
  if (isConfirmed) {
    data.selectionRing.setAttribute("visible", true);
    data.selectionRing.setAttribute("material", "opacity", 1);

    const breatheScale = 1 + Math.sin(time * 2.4) * 0.04;
    data.selectionRing.object3D.scale.set(
      breatheScale,
      breatheScale,
      breatheScale
    );
  } else if (isSelected) {
    data.selectionRing.setAttribute("visible", true);
    data.selectionRing.setAttribute("material", "opacity", 0.65);
    data.selectionRing.object3D.scale.set(1, 1, 1);
  } else {
    data.selectionRing.setAttribute("visible", false);
    data.selectionRing.setAttribute("material", "opacity", 0);
    data.selectionRing.object3D.scale.set(1, 1, 1);
  }
}

// 保险：如果旧描边图层还残留，强制隐藏
if (data.outlineImage) {
  data.outlineImage.setAttribute("visible", false);
  data.outlineImage.setAttribute("material", "opacity", 0);
}

    // 如果你代码里还残留旧的白色滤镜层，强制关掉
    if (data.highlightImage) {
      data.highlightImage.setAttribute("visible", false);
    }

    // 如果你代码里还残留旧的白圈层，也强制关掉
    if (data.preselectRing) {
      data.preselectRing.setAttribute("visible", false);
    }

    // 如果你代码里还残留旧的 solidOutlineImage，也强制关掉
    // 因为现在统一使用 data.outlineImage
    if (data.solidOutlineImage) {
      data.solidOutlineImage.setAttribute("visible", false);
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
