const ASSETS = {
  bowling: "./assets/bowling.png",
  pin: "./assets/pin.png",
  bat: "./assets/bat.png",
  baseball: "./assets/baseball.png",
  redball: "./assets/redball.png",
  powerball: "./assets/powerball.png",
};

const TYPES = {
  bowling: { label: "Bowling ball", size: 76, target: true },
  pin: { label: "Bowling pin", size: 54, target: true },
  bat: { label: "Bat", size: 92, target: true },
  baseball: { label: "Baseball", size: 46, target: false, next: "pin" },
  redball: { label: "Red ball", size: 50, target: false, next: "baseball" },
  powerball: { label: "Magic ball", size: 58, target: false, next: "bat" },
};

const TARGETS = ["bowling", "pin", "bat"];

const layout = [
  ...pieces("bowling", [
    [17, 20, 22, 11], [35, 22, -14, 16], [60, 20, 17, 12], [83, 22, -24, 14], [25, 36, 13, 19],
    [52, 35, -17, 20], [73, 37, 8, 17], [14, 51, 17, 12], [39, 52, -16, 10], [62, 52, 18, 15],
    [86, 53, -12, 16], [23, 68, -18, 15], [49, 69, 22, 13], [75, 70, -21, 14], [91, 83, -24, 13],
  ]),
  ...pieces("pin", [
    [28, 20, -35, 8], [72, 21, 21, 9], [15, 33, 28, 6], [44, 35, -35, 14], [78, 35, 28, 13],
    [92, 45, 27, 6], [26, 50, -24, 5], [55, 50, 36, 4], [13, 64, -31, 6], [38, 65, 35, 8],
    [69, 65, 30, 11], [84, 66, 22, 10], [19, 82, 24, 7], [46, 84, 35, 8], [80, 85, 22, 10],
  ]),
  ...pieces("bat", [
    [45, 20, 42, 18], [20, 34, -58, 16], [33, 32, 70, 17], [64, 33, -54, 15], [86, 35, 48, 14],
    [18, 47, 83, 18], [47, 47, -58, 16], [72, 48, 70, 17], [29, 60, 76, 2], [58, 61, 83, 18],
    [88, 62, -54, 15], [24, 76, 48, 14], [52, 76, 76, 2], [70, 80, -58, 16], [39, 88, 83, 18],
  ]),
  ...pieces("redball", [
    [54, 28, -22, 10], [31, 44, 18, 3], [66, 58, -18, 7],
  ]),
  ...pieces("baseball", [
    [15, 74, 24, 9], [57, 85, -21, 4], [91, 67, 12, 2],
  ]),
  ...pieces("powerball", [
    [18, 18, -18, 21], [55, 70, 16, 21], [83, 79, -14, 21],
  ]),
];

const state = {
  remaining: {},
  slots: Array(6).fill(null),
  seconds: 97,
  energy: 0,
  energyMax: 4,
  locked: false,
  completed: false,
};

const pile = document.getElementById("pile");
const slotsEl = document.getElementById("slots");
const targetsEl = document.getElementById("targets");
const toast = document.getElementById("toast");
const finish = document.getElementById("finish");
const timeEl = document.getElementById("time");
const hint = document.getElementById("hint");
const game = document.getElementById("game");
const energyWheel = document.getElementById("energyWheel");
const energyRing = document.getElementById("energyRing");

let active = null;
let idCounter = 0;
let timerId = 0;

function pieces(type, entries) {
  return entries.map(([x, y, rot, z]) => [type, x, y, rot, z]);
}

function init() {
  state.remaining = countTargets();
  renderTargets();
  renderSlots();
  renderPile();
  renderEnergy();
  startTimer();
  document.getElementById("cta").addEventListener("click", () => {
    finish.classList.remove("show");
    finish.setAttribute("aria-hidden", "true");
    showToast("Done");
  });
}

function countTargets() {
  return TARGETS.reduce((counts, type) => {
    counts[type] = layout.filter(([itemType]) => itemType === type).length;
    return counts;
  }, {});
}

function renderTargets() {
  targetsEl.innerHTML = "";
  TARGETS.forEach((type) => {
    const card = document.createElement("div");
    card.className = "target-card";
    card.dataset.target = type;

    const count = document.createElement("span");
    count.className = "target-count";
    count.textContent = state.remaining[type];

    const img = document.createElement("img");
    img.src = ASSETS[type];
    img.alt = TYPES[type].label;

    card.append(count, img);
    targetsEl.append(card);
  });
}

function renderSlots() {
  slotsEl.innerHTML = "";
  state.slots.forEach((slotItem, index) => {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.dataset.index = index;
    if (slotItem) {
      slot.classList.add("filled");
      const img = document.createElement("img");
      img.src = ASSETS[slotItem.type];
      img.alt = TYPES[slotItem.type].label;
      slot.append(img);
    }
    slotsEl.append(slot);
  });
}

function renderPile() {
  pile.innerHTML = "";
  layout.forEach(([type, x, y, rot, z]) => {
    pile.append(createPileItem(type, x, y, rot, z));
  });
}

function createPileItem(type, x, y, rot, z) {
  const button = document.createElement("button");
  button.className = "item";
  button.type = "button";
  button.dataset.type = type;
  button.dataset.id = String(++idCounter);
  button.ariaLabel = TYPES[type].label;
  button.style.left = `${x}%`;
  button.style.top = `${y}%`;
  button.style.setProperty("--rot", `${rot}deg`);
  button.style.setProperty("--size", `${TYPES[type].size}px`);
  button.style.zIndex = z;

  const img = document.createElement("img");
  img.src = ASSETS[type];
  img.alt = "";
  button.append(img);

  button.addEventListener("pointerdown", onPointerDown);
  return button;
}

function createSlotItem(type) {
  return {
    id: String(++idCounter),
    type,
  };
}

function onPointerDown(event) {
  if (state.locked || state.completed || nextEmptySlot() === -1) return;

  const item = event.currentTarget;
  const rect = item.getBoundingClientRect();
  const pileRect = pile.getBoundingClientRect();
  active = {
    item,
    startLeft: rect.left - pileRect.left + rect.width / 2,
    startTop: rect.top - pileRect.top + rect.height / 2,
    offsetX: event.clientX - (rect.left + rect.width / 2),
    offsetY: event.clientY - (rect.top + rect.height / 2),
    moved: false,
  };

  item.classList.add("dragging");
  item.setPointerCapture(event.pointerId);
  item.addEventListener("pointermove", onPointerMove);
  item.addEventListener("pointerup", onPointerUp);
  item.addEventListener("pointercancel", onPointerUp);
}

function onPointerMove(event) {
  if (!active) return;
  const pileRect = pile.getBoundingClientRect();
  const x = event.clientX - pileRect.left - active.offsetX;
  const y = event.clientY - pileRect.top - active.offsetY;
  active.item.style.left = `${x}px`;
  active.item.style.top = `${y}px`;
  active.moved = true;
}

function onPointerUp(event) {
  if (!active) return;
  const { item, moved, startLeft, startTop } = active;
  item.classList.remove("dragging");
  item.releasePointerCapture?.(event.pointerId);
  item.removeEventListener("pointermove", onPointerMove);
  item.removeEventListener("pointerup", onPointerUp);
  item.removeEventListener("pointercancel", onPointerUp);

  const overTray = isOverTray(event.clientX, event.clientY);
  if (!moved || overTray) {
    collectFromPile(item);
  } else {
    item.style.left = `${startLeft}px`;
    item.style.top = `${startTop}px`;
  }
  active = null;
}

function isOverTray(x, y) {
  const rect = slotsEl.getBoundingClientRect();
  return x >= rect.left - 24 && x <= rect.right + 24 && y >= rect.top - 40 && y <= rect.bottom + 28;
}

function collectFromPile(item) {
  if (state.locked) {
    return;
  }

  const type = item.dataset.type;
  const slotIndex = nextEmptySlot();
  if (slotIndex === -1) {
    showToast("Slots full");
    return;
  }

  hint.classList.add("hidden");
  state.locked = true;
  flyToSlot(item, slotIndex, () => {
    state.slots[slotIndex] = { id: item.dataset.id, type };
    renderSlots();
    scheduleResolve();
  });
}

function nextEmptySlot() {
  return state.slots.findIndex((item) => item === null);
}

function flyToSlot(item, slotIndex, onComplete) {
  const slot = slotsEl.children[slotIndex];
  const itemRect = item.getBoundingClientRect();
  const slotRect = slot.getBoundingClientRect();
  const gameRect = game.getBoundingClientRect();
  const type = item.dataset.type;
  const start = {
    x: itemRect.left - gameRect.left + itemRect.width / 2,
    y: itemRect.top - gameRect.top + itemRect.height / 2,
  };
  const end = {
    x: slotRect.left - gameRect.left + slotRect.width / 2,
    y: slotRect.top - gameRect.top + slotRect.height / 2,
  };
  const control = getFlightControl(start, end);

  slot.classList.add("incoming");
  item.style.opacity = "0";
  item.style.pointerEvents = "none";

  const flyer = document.createElement("div");
  flyer.className = "flight-item";
  flyer.style.left = `${start.x}px`;
  flyer.style.top = `${start.y}px`;
  flyer.style.width = `${itemRect.width}px`;
  flyer.style.height = `${itemRect.height}px`;
  flyer.style.transform = "translate(-50%, -50%)";
  flyer.innerHTML = `<img src="${ASSETS[type]}" alt="">`;
  game.append(flyer);

  let done = false;
  const finishFlight = () => {
    if (done) return;
    done = true;
    flyer.remove();
    item.remove();
    slot.classList.remove("incoming");
    onComplete();
  };
  animateFlyer(flyer, start, end, control, finishFlight);
}

function scheduleResolve() {
  state.locked = true;
  setTimeout(resolveBoard, 260);
}

function getFlightControl(start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);
  const side = start.x < end.x ? 1 : -1;
  return {
    x: start.x + dx * 0.45 + side * Math.min(42, distance * 0.12),
    y: start.y + dy * 0.38 - Math.min(120, 54 + distance * 0.14),
  };
}

function animateFlyer(flyer, start, end, control, onComplete) {
  const duration = 680;
  const startTime = performance.now();
  const spin = start.x < end.x ? 1 : -1;

  function frame(now) {
    const raw = Math.min(1, (now - startTime) / duration);
    const t = easeInOutCubic(raw);
    const p = quadraticPoint(start, control, end, t);
    const lift = Math.sin(Math.PI * t);
    const settle = raw > 0.82 ? Math.sin((raw - 0.82) / 0.18 * Math.PI) : 0;
    const scale = 1 + lift * 0.36 - raw * 0.28 + settle * 0.08;
    const z = lift * 118;
    const rotZ = spin * (-9 + t * 22 - settle * 7);
    const rotX = lift * 18 - settle * 9;

    flyer.style.left = `${p.x}px`;
    flyer.style.top = `${p.y}px`;
    flyer.style.transform = `translate(-50%, -50%) translateZ(${z}px) scale(${scale}) rotateX(${rotX}deg) rotateZ(${rotZ}deg)`;
    flyer.style.opacity = raw > 0.92 ? String(1 - (raw - 0.92) / 0.08 * 0.72) : "1";

    if (raw < 1) {
      requestAnimationFrame(frame);
    } else {
      onComplete();
    }
  }

  requestAnimationFrame(frame);
}

function quadraticPoint(start, control, end, t) {
  const inv = 1 - t;
  return {
    x: inv * inv * start.x + 2 * inv * t * control.x + t * t * end.x,
    y: inv * inv * start.y + 2 * inv * t * control.y + t * t * end.y,
  };
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function resolveBoard() {
  let changed = false;
  do {
    changed = mergeThree();
  } while (changed);

  compactSlots();
  renderSlots();
  state.locked = false;

  if (allTargetsDone()) {
    setTimeout(win, 520);
    return;
  }

  if (nextEmptySlot() === -1) {
    showToast("Match 3 first");
  }
}

function mergeThree() {
  const counts = new Map();
  state.slots.forEach((slot, index) => {
    if (!slot) return;
    if (!counts.has(slot.type)) counts.set(slot.type, []);
    counts.get(slot.type).push(index);
  });

  const match = [...counts.entries()].find(([, indexes]) => indexes.length >= 3);
  if (!match) return false;

  const [type, indexes] = match;
  const use = indexes.slice(0, 3);
  const targetIndex = use[0];

  use.forEach((index) => {
    state.slots[index] = null;
  });

  if (TYPES[type].target) {
    state.remaining[type] = Math.max(0, state.remaining[type] - 3);
    updateTarget(type);
    showToast("-3");
  } else if (TYPES[type].next) {
    state.slots[targetIndex] = createSlotItem(TYPES[type].next);
    showToast("Merge");
  } else {
    showToast("Clear");
  }

  addEnergy();
  burstAtSlot(targetIndex);
  return true;
}

function addEnergy() {
  state.energy += 1;
  if (state.energy >= state.energyMax) {
    state.energy = 0;
    renderEnergy();
    popPowerBall();
    return;
  }
  renderEnergy();
}

function renderEnergy() {
  energyRing.style.setProperty("--energy", state.energy / state.energyMax);
}

function popPowerBall() {
  energyWheel.classList.remove("ready");
  void energyWheel.offsetWidth;
  energyWheel.classList.add("ready");
  burstAtWheel();

  const wheelRect = energyWheel.getBoundingClientRect();
  const gameRect = game.getBoundingClientRect();
  const startX = wheelRect.left - gameRect.left + wheelRect.width / 2;
  const startY = wheelRect.top - gameRect.top + wheelRect.height / 2;
  const targetX = 86 + Math.random() * 68;
  const targetY = -150 - Math.random() * 62;

  const preview = document.createElement("button");
  preview.className = "spawn-ball";
  preview.type = "button";
  preview.style.left = `${startX}px`;
  preview.style.top = `${startY}px`;
  preview.style.setProperty("--spawn-dx", `${targetX}px`);
  preview.style.setProperty("--spawn-dy", `${targetY}px`);
  preview.innerHTML = `<img src="${ASSETS.powerball}" alt="">`;
  game.append(preview);

  preview.addEventListener("animationend", () => {
    preview.remove();
    const pileRect = pile.getBoundingClientRect();
    const finalX = startX + targetX - (pileRect.left - gameRect.left);
    const finalY = startY + targetY - (pileRect.top - gameRect.top);
    const percentX = Math.max(13, Math.min(88, (finalX / pileRect.width) * 100));
    const percentY = Math.max(18, Math.min(82, (finalY / pileRect.height) * 100));
    pile.append(createPileItem("powerball", percentX, percentY, -18 + Math.random() * 36, 24));
  });
}

function compactSlots() {
  const compacted = state.slots.filter(Boolean);
  while (compacted.length < 6) compacted.push(null);
  state.slots = compacted;
}

function updateTarget(type) {
  const card = targetsEl.querySelector(`[data-target="${type}"]`);
  if (!card) return;

  card.querySelector(".target-count").textContent = state.remaining[type];
  card.animate(
    [
      { transform: "scale(1)" },
      { transform: "scale(1.16)" },
      { transform: "scale(1)" },
    ],
    { duration: 240, easing: "ease-out" },
  );
  if (state.remaining[type] === 0) {
    card.classList.add("done");
    card.append(createCheck());
  }
}

function createCheck() {
  const check = document.createElement("span");
  check.className = "check";
  check.textContent = "✓";
  return check;
}

function allTargetsDone() {
  return TARGETS.every((type) => state.remaining[type] === 0);
}

function burstAtSlot(slotIndex) {
  const slot = slotsEl.children[slotIndex] || slotsEl;
  const rect = slot.getBoundingClientRect();
  const base = game.getBoundingClientRect();
  const cx = rect.left - base.left + rect.width / 2;
  const cy = rect.top - base.top + rect.height / 2;
  for (let i = 0; i < 15; i += 1) {
    const spark = document.createElement("span");
    spark.className = "spark";
    spark.style.left = `${cx}px`;
    spark.style.top = `${cy}px`;
    spark.style.setProperty("--dx", `${Math.cos(i * 1.14) * (24 + Math.random() * 44)}px`);
    spark.style.setProperty("--dy", `${Math.sin(i * 1.14) * (20 + Math.random() * 46)}px`);
    game.append(spark);
    spark.addEventListener("animationend", () => spark.remove());
  }
}

function burstAtWheel() {
  const rect = energyWheel.getBoundingClientRect();
  const base = game.getBoundingClientRect();
  const cx = rect.left - base.left + rect.width / 2;
  const cy = rect.top - base.top + rect.height / 2;
  for (let i = 0; i < 22; i += 1) {
    const spark = document.createElement("span");
    spark.className = "spark";
    spark.style.left = `${cx}px`;
    spark.style.top = `${cy}px`;
    spark.style.setProperty("--dx", `${Math.cos(i * 0.78) * (36 + Math.random() * 62)}px`);
    spark.style.setProperty("--dy", `${Math.sin(i * 0.78) * (28 + Math.random() * 58)}px`);
    game.append(spark);
    spark.addEventListener("animationend", () => spark.remove());
  }
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.remove("show");
  void toast.offsetWidth;
  toast.classList.add("show");
}

function startTimer() {
  updateTimer();
  timerId = window.setInterval(() => {
    if (state.seconds > 0 && !finish.classList.contains("show")) {
      state.seconds -= 1;
      updateTimer();
    }
  }, 1000);
}

function updateTimer() {
  const min = String(Math.floor(state.seconds / 60)).padStart(2, "0");
  const sec = String(state.seconds % 60).padStart(2, "0");
  timeEl.textContent = `${min}:${sec}`;
}

function win() {
  if (state.completed) return;
  clearInterval(timerId);
  state.completed = true;
  state.locked = true;
  finish.classList.add("show");
  finish.setAttribute("aria-hidden", "false");
}

init();
