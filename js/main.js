const FIBONACCI_WIDTH_UNITS = 8;
const FIBONACCI_HEIGHT_UNITS = 5;
const FIBONACCI_SITES = {
  a: { x: 2, y: 1, size: 1, sequenceIndex: 1 },
  b: { x: 2, y: 0, size: 1, sequenceIndex: 2 },
  c: { x: 0, y: 0, size: 2, sequenceIndex: 3 },
  d: { x: 0, y: 2, size: 3, sequenceIndex: 4 },
  e: { x: 3, y: 0, size: 5, sequenceIndex: 5 },
};

const CANVAS_UPDATE_FREQUENCY_MS = 100;
const FOOTER_HIDE_DELAY_MS = 2500;

const EMPTY_COLOUR = "#F9EBE0";
const HOUR_COLOUR = "#F45B69";
const MINUTE_COLOUR = "#81C14B";
const HOUR_AND_MINUTE_COLOUR = "#208AAE";
const BORDER_COLOUR = "black";
const NUMBER_COLOUR = "black";
const CIRCLE_COLOUR = "rgba(0, 0, 0, 0.5)";
const TEXT_FONT = "Open Sans, sans-serif";
const BORDER_WIDTH = 0.03; // Fraction of site unit size
const CIRCLE_RADIUS = 0.1; // Fraction of site unit size
const NUMBER_FONT_SIZE = 0.3; // Fraction of site unit size

const HELP_MESSAGE = `🔴 Red: hours
🟢 Green: minutes
🔵 Blue: hours and minutes`;

let constrain = true;
let showMins = true;
let showNumbers = false;
let inFooter = false;
let controlsTimeout;

let fibonacciCanvasElem;
let fibonacciCanvasContext;
let constrainButtonElem;
let unconstrainButtonElem;
let showMinutesButtonElem;
let hideMinutesButtonElem;
let showNumbersButtonElem;
let hideNumbersButtonElem;
let helpButtonElem;
let fibonacciFooterElem;

// Computes the dimensions of the largest fibonacci rectangle that can fit within the given width
// and height.
const computeFibDimensions = (width, height) => {
  const canvasRatio = FIBONACCI_HEIGHT_UNITS / FIBONACCI_WIDTH_UNITS;
  let fibWidth, fibHeight;
  if (height < width * canvasRatio) {
    fibWidth = height / canvasRatio;
    fibHeight = height;
  } else {
    fibWidth = width;
    fibHeight = width * canvasRatio;
  }
  return { fibWidth, fibHeight };
};

// Computes the translation to centre a fibonacci rectangle within the given width and height.
const computeFibOffset = (width, height, fibWidth, fibHeight) => ({
  offsetX: (width - fibWidth) / 2,
  offsetY: (height - fibHeight) / 2,
});

// Computes the number of pixels that correspond to one fibonacci unit.
// The width and height will be the same (excluding rounding) for a regular fibonacci rectangle.
const computeFibUnitSize = (width, height) => ({
  unitWidth: width / FIBONACCI_WIDTH_UNITS,
  unitHeight: height / FIBONACCI_HEIGHT_UNITS,
});

const drawFibSite = (site, fibUnitSize, fibOffset, colour, circle, number) => {
  const { unitWidth, unitHeight } = fibUnitSize;
  const unitSizeAverage = (unitWidth + unitHeight) / 2;
  const { offsetX, offsetY } = fibOffset;
  const rX = site.x * unitWidth + offsetX;
  const rY = site.y * unitHeight + offsetY;
  const rect = [rX, rY, site.size * unitWidth, site.size * unitHeight];
  fibonacciCanvasContext.save();
  fibonacciCanvasContext.fillStyle = colour;
  fibonacciCanvasContext.strokeStyle = BORDER_COLOUR;
  fibonacciCanvasContext.lineWidth = BORDER_WIDTH * unitSizeAverage;
  fibonacciCanvasContext.fillRect(...rect);
  fibonacciCanvasContext.strokeRect(...rect);
  if (circle) {
    const cX = rX + (site.size * unitWidth) / 2;
    const cY = rY + (site.size * unitHeight) / 2;
    const radius = CIRCLE_RADIUS * unitSizeAverage;
    fibonacciCanvasContext.beginPath();
    fibonacciCanvasContext.arc(cX, cY, radius, 0, 2 * Math.PI, false);
    fibonacciCanvasContext.fillStyle = CIRCLE_COLOUR;
    fibonacciCanvasContext.fill();
  }
  if (number) {
    const fontSize = NUMBER_FONT_SIZE * unitSizeAverage;
    fibonacciCanvasContext.fillStyle = NUMBER_COLOUR;
    fibonacciCanvasContext.font = `${fontSize}px ${TEXT_FONT}`;
    const tx = rX + fontSize / 4;
    const ty = rY + fontSize;
    fibonacciCanvasContext.fillText(site.size, tx, ty);
  }
  fibonacciCanvasContext.restore();
};

const encodeTimeAsFib = (date) => {
  const hour = date.getHours() % 12;
  const hour12 = hour === 0 ? 12 : hour;
  const minute = Math.floor(date.getMinutes() / 5);
  const minuteRemainder = date.getMinutes() % 5;

  const encodeAsFib = (value) => {
    return Object.entries(FIBONACCI_SITES)
      .sort((a, b) => a.sequenceIndex - b.sequenceIndex)
      .reverse()
      .reduce((encoded, [siteKey, site]) => {
        if (value >= site.size) {
          value -= site.size;
          encoded.push(siteKey);
        }
        return encoded;
      }, []);
  };

  const hourSites = encodeAsFib(hour12);
  const minuteSites = encodeAsFib(minute);
  const minuteRemainderSites = encodeAsFib(minuteRemainder);
  return { hourSites, minuteSites, minuteRemainderSites };
};

const getSiteColour = (siteKey, hourSites, minuteSites) => {
  const inHour = hourSites.includes(siteKey);
  const inMinute = minuteSites.includes(siteKey);
  let colour = EMPTY_COLOUR;
  if (inHour && inMinute) colour = HOUR_AND_MINUTE_COLOUR;
  else if (inHour) colour = HOUR_COLOUR;
  else if (inMinute) colour = MINUTE_COLOUR;
  return colour;
};

const canvasUpdate = () => {
  const { width, height } = fibonacciCanvasElem.getBoundingClientRect();
  fibonacciCanvasElem.width = width;
  fibonacciCanvasElem.height = height;

  const { fibWidth, fibHeight } = constrain
    ? computeFibDimensions(width, height)
    : { fibWidth: width, fibHeight: height };
  const fibOffset = computeFibOffset(width, height, fibWidth, fibHeight);
  const fibUnitSize = computeFibUnitSize(fibWidth, fibHeight);

  const now = new Date();
  const { hourSites, minuteSites, minuteRemainderSites } = encodeTimeAsFib(now);

  Object.entries(FIBONACCI_SITES).forEach(([siteKey, site]) => {
    const colour = getSiteColour(siteKey, hourSites, minuteSites);
    const circle = showMins && minuteRemainderSites.includes(siteKey);
    drawFibSite(site, fibUnitSize, fibOffset, colour, circle, showNumbers);
  });
};

const loadDOMElements = () => {
  fibonacciCanvasElem = document.getElementById("fibonacci-canvas");
  fibonacciCanvasContext = fibonacciCanvasElem.getContext("2d");
  fibonacciFooterElem = document.getElementById("fibonacci-controls");
  constrainButtonElem = document.getElementById("constrain-button");
  unconstrainButtonElem = document.getElementById("unconstrain-button");
  showMinutesButtonElem = document.getElementById("show-minutes-button");
  hideMinutesButtonElem = document.getElementById("hide-minutes-button");
  showNumbersButtonElem = document.getElementById("show-numbers-button");
  hideNumbersButtonElem = document.getElementById("hide-numbers-button");
  helpButtonElem = document.getElementById("help-button");
};

const setFooterVisibility = (visible) =>
  fibonacciFooterElem.classList.toggle("hidden", !visible);

const hideFooterAfterDelay = () => {
  if (controlsTimeout) clearTimeout(controlsTimeout);
  setFooterVisibility(true);
  if (inFooter) return;
  const hideFooter = () => setFooterVisibility(false);
  controlsTimeout = setTimeout(hideFooter, FOOTER_HIDE_DELAY_MS);
};

const addEventListeners = () => {
  constrainButtonElem.addEventListener("click", () => (constrain = true));
  unconstrainButtonElem.addEventListener("click", () => (constrain = false));
  showMinutesButtonElem.addEventListener("click", () => (showMins = true));
  hideMinutesButtonElem.addEventListener("click", () => (showMins = false));
  showNumbersButtonElem.addEventListener("click", () => (showNumbers = true));
  hideNumbersButtonElem.addEventListener("click", () => (showNumbers = false));
  helpButtonElem.addEventListener("click", () => alert(HELP_MESSAGE));
  document.addEventListener("mousemove", hideFooterAfterDelay);
  fibonacciFooterElem.addEventListener("mouseenter", () => (inFooter = true));
  fibonacciFooterElem.addEventListener("mouseleave", () => (inFooter = false));
};

const startCanvasUpdateLoop = () =>
  setInterval(canvasUpdate, CANVAS_UPDATE_FREQUENCY_MS);

document.addEventListener("DOMContentLoaded", () => {
  loadDOMElements();
  addEventListeners();
  hideFooterAfterDelay();
  startCanvasUpdateLoop();
});
