// 宣告五道繁體中文的 p5.js 簡易指令選擇題。
const questions = [
  {
    // 設定第一題的題目內容。
    question: "在 p5.js 中，哪一個函式會在程式開始時執行一次？",
    // 設定第一題的四個選項。
    options: ["draw()", "setup()", "start()", "begin()"],
    // 設定第一題正確選項的索引值。
    answer: 1
  },
  {
    // 設定第二題的題目內容。
    question: "在 p5.js 中，哪一個函式會不斷重複執行？",
    // 設定第二題的四個選項。
    options: ["loop()", "repeat()", "draw()", "run()"],
    // 設定第二題正確選項的索引值。
    answer: 2
  },
  {
    // 設定第三題的題目內容。
    question: "哪一個指令可以在畫布上繪製圓形？",
    // 設定第三題的四個選項。
    options: ["circle()", "ellipse()", "round()", "drawCircle()"],
    // 設定第三題正確選項的索引值。
    answer: 1
  },
  {
    // 設定第四題的題目內容。
    question: "哪一個指令可以設定背景顏色？",
    // 設定第四題的四個選項。
    options: ["color()", "background()", "fillColor()", "bg()"],
    // 設定第四題正確選項的索引值。
    answer: 1
  },
  {
    // 設定第五題的題目內容。
    question: "哪一個指令可以設定圖形的填滿顏色？",
    // 設定第五題的四個選項。
    options: ["stroke()", "lineColor()", "fill()", "inside()"],
    // 設定第五題正確選項的索引值。
    answer: 2
  }
];

// 記錄目前顯示的題目索引值。
let currentQuestion = 0;

// 記錄目前累積的答對題數。
let score = 0;

// 記錄目前選取的選項索引值，-1 代表尚未選取。
let selectedAnswer = -1;

// 記錄目前題目是否已經作答。
let hasAnswered = false;

// 記錄目前題目的答案是否正確。
let isCorrect = false;

// 記錄測驗是否已經完成。
let quizFinished = false;

// 記錄觸控後短時間內需要忽略的模擬滑鼠事件時間。
let ignoreMouseUntil = 0;

// 設定整個畫面的背景顏色。
const pageBackground = "#f8f9fa";

// 設定主要文字顏色。
const textColor = "#212529";

// 設定一般選項背景顏色。
const optionBackground = "#ffffff";

// 設定選項外框顏色。
const optionBorder = "#8d99ae";

// 設定答錯時正確選項的指定背景顏色。
const correctBackground = "#caf0f8";

// 設定答錯時使用者所選錯誤選項的背景顏色。
const wrongBackground = "#ffc9c9";

// 設定答對提示文字顏色。
const correctTextColor = "#198754";

// 設定答錯提示文字顏色。
const wrongTextColor = "#dc3545";

// 設定尚未作答提示文字顏色。
const hintTextColor = "#343a40";

// 設定按鈕背景顏色。
const buttonBackground = "#0077b6";

// 設定按鈕文字顏色。
const buttonTextColor = "#ffffff";

// p5.js 初始化函式，只會在程式開始時執行一次。
function setup() {
  // 建立與瀏覽器視窗同樣大小的全螢幕畫布。
  const canvas = createCanvas(windowWidth, windowHeight);

  // 讓畫布固定位於頁面左上角，避免預設邊距影響座標。
  canvas.position(0, 0);

  // 讓畫布以區塊方式顯示，避免底部產生額外空白。
  canvas.style("display", "block");

  // 停用畫布上的瀏覽器觸控手勢，讓觸控事件交由 p5.js 處理。
  canvas.style("touch-action", "none");

  // 移除頁面預設邊距，確保畫布真正佔滿視窗。
  document.documentElement.style.margin = "0";
  document.body.style.margin = "0";

  // 隱藏頁面捲軸，讓版面完全由響應式畫布控制。
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";

  // 限制高解析度裝置的像素密度，降低繪圖負擔但保留清晰度。
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));

  // 使用平滑繪圖效果。
  smooth();

  // 設定矩形使用左上角座標，方便和點擊邊界共用同一套資料。
  rectMode(CORNER);

  // 設定預設文字置中，個別文字區塊仍會重新指定樣式。
  textAlign(CENTER, CENTER);

  // 設定預設文字樣式為一般字體。
  textStyle(NORMAL);
}

// p5.js 主繪圖函式，會持續重複執行。
function draw() {
  // 每一幀清除畫布，避免前一幀內容殘留。
  background(pageBackground);

  // 依照測驗狀態選擇題目畫面或完成畫面。
  if (quizFinished) {
    // 測驗完成後顯示成績與重新開始按鈕。
    drawFinishedScreen();
  } else {
    // 尚未完成時顯示標題、題目、選項與操作提示。
    drawQuizScreen();
  }

  // 重設常用繪圖狀態，避免下一個區塊沿用錯誤設定。
  noStroke();
  textStyle(NORMAL);
  textAlign(CENTER, CENTER);
}

// 繪製尚未完成的測驗畫面。
function drawQuizScreen() {
  // 取得目前題目資料，確保題目內容由題庫直接讀取。
  const currentData = questions[currentQuestion];

  // 如果題目索引異常，就顯示清楚的錯誤訊息。
  if (!currentData) {
    // 在畫布中央顯示錯誤狀態。
    drawCenteredMessage("找不到目前題目，請重新開始。", height / 2, 20, wrongTextColor, BOLD);
    return;
  }

  // 每一幀都依照目前 width、height 重新計算所有版面資料。
  const layout = getQuizLayout();

  // 設定測驗標題的顏色、粗細與大小。
  fill("#023e8a");
  noStroke();
  textStyle(BOLD);
  textSize(layout.titleSize);
  textAlign(CENTER, CENTER);

  // 以逐字換行方式繪製測驗標題。
  drawWrappedText(
    "p5.js 程式設計簡易測驗",
    width / 2,
    layout.titleCenterY,
    layout.contentWidth,
    layout.titleLineHeight
  );

  // 設定進度文字的樣式。
  fill("#495057");
  textStyle(NORMAL);
  textSize(layout.progressSize);

  // 顯示目前題目進度。
  text(`第 ${currentQuestion + 1} 題 / 共 ${questions.length} 題`, width / 2, layout.progressCenterY);

  // 繪製題目背景框。
  rectMode(CORNER);
  fill("#e9ecef");
  stroke("#b8c2cc");
  strokeWeight(1);
  rect(layout.questionX, layout.questionY, layout.questionWidth, layout.questionHeight, layout.cornerRadius);

  // 設定題目文字為深色粗體，確保題目清楚可見。
  fill(textColor);
  noStroke();
  textStyle(BOLD);
  textSize(layout.questionSize);
  textAlign(CENTER, CENTER);

  // 以可靠的逐字換行方式繪製題目內容。
  drawWrappedText(
    currentData.question,
    width / 2,
    layout.questionCenterY,
    layout.questionTextWidth,
    layout.questionLineHeight
  );

  // 逐一繪製目前題目的四個選項。
  for (let i = 0; i < currentData.options.length; i++) {
    // 取得選項目前動畫後的實際 Y 座標。
    const optionY = getAnimatedOptionY(layout, i);

    // 判斷此選項是否為正確答案。
    const isRightOption = i === currentData.answer;

    // 判斷此選項是否為使用者選取的答案。
    const isSelectedOption = i === selectedAnswer;

    // 預設使用白色選項背景。
    let currentOptionColor = optionBackground;

    // 答錯後把正確選項標示為指定的淺藍色。
    if (hasAnswered && !isCorrect && isRightOption) {
      currentOptionColor = correctBackground;
    }

    // 答對後也把使用者選到的正確選項標示為淺藍色。
    if (hasAnswered && isCorrect && isSelectedOption) {
      currentOptionColor = correctBackground;
    }

    // 答錯後把使用者選到的錯誤選項標示為淡紅色。
    if (hasAnswered && !isCorrect && isSelectedOption) {
      currentOptionColor = wrongBackground;
    }

    // 使用和實際點擊邊界相同的 X、Y、寬度與高度繪製選項。
    rectMode(CORNER);
    fill(currentOptionColor);
    stroke(optionBorder);
    strokeWeight(2);
    rect(layout.optionX, optionY, layout.optionWidth, layout.optionHeight, layout.cornerRadius);

    // 設定選項文字樣式並繪製選項內容。
    fill(textColor);
    noStroke();
    textStyle(NORMAL);
    textSize(layout.optionSize);
    textAlign(CENTER, CENTER);
    drawWrappedText(
      `${String.fromCharCode(65 + i)}. ${currentData.options[i]}`,
      width / 2,
      optionY + layout.optionHeight / 2,
      layout.optionTextWidth,
      layout.optionLineHeight
    );
  }

  // 作答後顯示結果訊息與下一題按鈕。
  if (hasAnswered) {
    // 依答案正確與否選擇結果文字顏色。
    fill(isCorrect ? correctTextColor : wrongTextColor);
    noStroke();
    textStyle(BOLD);
    textSize(layout.messageSize);
    textAlign(CENTER, CENTER);

    // 顯示答對或答錯結果，位置一定在最後一個選項下方。
    drawWrappedText(
      isCorrect ? "答對了！" : "答錯了！正確答案已標示。",
      width / 2,
      layout.messageCenterY,
      layout.messageWidth,
      layout.messageLineHeight
    );

    // 繪製下一題或查看成績按鈕。
    rectMode(CORNER);
    fill(buttonBackground);
    noStroke();
    rect(
      layout.nextButtonX,
      layout.nextButtonY,
      layout.nextButtonWidth,
      layout.nextButtonHeight,
      layout.cornerRadius
    );

    // 繪製按鈕文字。
    fill(buttonTextColor);
    textStyle(BOLD);
    textSize(layout.buttonTextSize);
    textAlign(CENTER, CENTER);
    text(
      currentQuestion === questions.length - 1 ? "查看成績" : "下一題",
      width / 2,
      layout.nextButtonY + layout.nextButtonHeight / 2
    );
  } else {
    // 尚未作答時顯示較大且粗體的操作提示。
    fill(hintTextColor);
    noStroke();
    textStyle(BOLD);
    textSize(layout.hintSize);
    textAlign(CENTER, CENTER);
    drawWrappedText(
      "請點擊一個選項作答",
      width / 2,
      layout.messageCenterY,
      layout.messageWidth,
      layout.messageLineHeight
    );
  }
}

// 繪製測驗完成後的成績畫面。
function drawFinishedScreen() {
  // 依照目前畫布尺寸取得完成畫面的動態版面。
  const layout = getFinishedLayout();

  // 繪製完成標題。
  fill("#023e8a");
  noStroke();
  textStyle(BOLD);
  textSize(layout.titleSize);
  textAlign(CENTER, CENTER);
  drawWrappedText("測驗完成！", width / 2, layout.titleCenterY, layout.contentWidth, layout.titleLineHeight);

  // 繪製答對題數。
  fill(textColor);
  textStyle(BOLD);
  textSize(layout.scoreSize);
  drawWrappedText(
    `你答對 ${score} / ${questions.length} 題`,
    width / 2,
    layout.scoreCenterY,
    layout.contentWidth,
    layout.scoreLineHeight
  );

  // 根據分數決定鼓勵文字。
  let encouragement = "";
  if (score === questions.length) {
    // 全部答對時顯示最強鼓勵。
    encouragement = "太厲害了！全部答對！";
  } else if (score >= 3) {
    // 答對三題以上時顯示正向鼓勵。
    encouragement = "表現不錯，繼續加油！";
  } else {
    // 其他分數時顯示練習鼓勵。
    encouragement = "再練習一下，你一定可以！";
  }

  // 繪製鼓勵文字。
  fill("#495057");
  textStyle(NORMAL);
  textSize(layout.messageSize);
  drawWrappedText(
    encouragement,
    width / 2,
    layout.messageCenterY,
    layout.contentWidth,
    layout.messageLineHeight
  );

  // 繪製重新開始按鈕。
  rectMode(CORNER);
  fill(buttonBackground);
  noStroke();
  rect(
    layout.restartButtonX,
    layout.restartButtonY,
    layout.restartButtonWidth,
    layout.restartButtonHeight,
    layout.cornerRadius
  );

  // 繪製重新開始按鈕文字。
  fill(buttonTextColor);
  textStyle(BOLD);
  textSize(layout.buttonTextSize);
  textAlign(CENTER, CENTER);
  text("重新開始", width / 2, layout.restartButtonY + layout.restartButtonHeight / 2);
}

// 取得測驗畫面的響應式版面資料。
function getQuizLayout() {
  // 以畫布高度作為主要縮放依據，兼顧手機直向、橫向與桌面畫面。
  let scale = constrain(height / 720, 0.20, 1);

  // 建立初始版面資料。
  let layout = buildQuizLayout(scale);

  // 反覆縮小文字、間距與元件高度，直到內容不超出畫布。
  for (let attempt = 0; attempt < 12; attempt++) {
    // 預留上下少量安全邊界。
    const availableHeight = max(1, height - 6);

    // 內容放得下時立即採用目前版面。
    if (layout.contentBottom <= availableHeight) {
      break;
    }

    // 依照實際超出比例縮小下一次版面，避免只靠固定斷點。
    const ratio = availableHeight / max(layout.contentBottom, 1);
    scale = max(0.12, scale * ratio * 0.97);
    layout = buildQuizLayout(scale);
  }

  // 回傳繪圖與點擊判定共用的同一份版面資料。
  return layout;
}

// 依照指定縮放比例建立測驗畫面的每一個實際區塊。
function buildQuizLayout(scale) {
  // 依照畫布寬度設定左右邊距，手機接近滿寬、桌面保留較寬留白。
  const sideMargin = width < 480
    ? max(12, width * 0.045)
    : width < 900
      ? max(20, width * 0.06)
      : min(80, width * 0.075);

  // 限制桌面內容最大寬度，同時讓手機使用接近滿寬的內容區域。
  const contentWidth = min(
    max(1, width - sideMargin * 2),
    width < 600 ? 620 : width < 1100 ? 820 : 980
  );

  // 依照縮放比例計算文字大小，極矮畫面也會保留可讀的下限。
  const titleSize = max(10, round(31 * scale));
  const progressSize = max(9, round(17 * scale));
  const questionSize = max(10, round(22 * scale));
  const optionSize = max(10, round(19 * scale));
  const hintSize = max(11, round(21 * scale));
  const messageSize = max(11, round(20 * scale));
  const buttonTextSize = max(10, round(19 * scale));

  // 設定不同文字的行高，確保逐字換行後行與行之間不重疊。
  const titleLineHeight = titleSize * 1.22;
  const questionLineHeight = questionSize * 1.34;
  const optionLineHeight = optionSize * 1.30;
  const messageLineHeight = messageSize * 1.28;

  // 計算各區塊內距，畫面越矮時內距也會同步縮小。
  const questionPadding = max(4, round(14 * scale));
  const optionPadding = max(4, round(11 * scale));
  const topPadding = max(4, round(16 * scale));
  const titleProgressGap = max(2, round(7 * scale));
  const progressQuestionGap = max(3, round(14 * scale));
  const questionOptionGap = max(3, round(13 * scale));
  const optionGap = max(2, round(10 * scale));
  const messageGap = max(4, round(19 * scale));
  const buttonGap = max(3, round(13 * scale));
  const bottomPadding = max(3, round(8 * scale));

  // 計算文字可使用的實際寬度。
  const questionTextWidth = max(1, contentWidth - questionPadding * 2);
  const optionTextWidth = max(1, contentWidth - optionPadding * 2);
  const messageWidth = contentWidth;

  // 使用目前題目樣式測量標題與題目需要的行數。
  textStyle(BOLD);
  textSize(titleSize);
  const titleLines = getWrappedLines("p5.js 程式設計簡易測驗", contentWidth);
  textSize(questionSize);
  const questionLines = getWrappedLines(
    (questions[currentQuestion] || questions[0]).question,
    questionTextWidth
  );

  // 取得四個選項中最多的換行行數，讓每個選項使用一致高度。
  textStyle(NORMAL);
  textSize(optionSize);
  let optionLineCount = 1;
  const currentData = questions[currentQuestion] || questions[0];
  for (let i = 0; i < currentData.options.length; i++) {
    // 將選項字母與內容合併後再測量，確保整行都不會超出方框。
    const optionText = `${String.fromCharCode(65 + i)}. ${currentData.options[i]}`;
    optionLineCount = max(optionLineCount, getWrappedLines(optionText, optionTextWidth).length);
  }

  // 依照作答狀態測量提示或結果訊息需要的行數。
  const messageText = hasAnswered
    ? (isCorrect ? "答對了！" : "答錯了！正確答案已標示。")
    : "請點擊一個選項作答";
  textStyle(BOLD);
  textSize(hasAnswered ? messageSize : hintSize);
  const messageLines = getWrappedLines(messageText, messageWidth);
  const actualMessageLineHeight = hasAnswered ? messageLineHeight : hintSize * 1.28;

  // 由文字行數計算標題、題目、選項與訊息的實際高度。
  const titleHeight = max(titleLineHeight, titleLines.length * titleLineHeight);
  const progressHeight = max(1, progressSize * 1.22);
  const questionHeight = max(
    max(24, round(52 * scale)),
    questionLines.length * questionLineHeight + questionPadding * 2
  );
  const optionHeight = max(
    max(22, round(60 * scale)),
    optionLineCount * optionLineHeight + optionPadding * 2
  );
  const messageHeight = max(
    max(16, round(30 * scale)),
    messageLines.length * actualMessageLineHeight
  );
  const nextButtonHeight = max(28, round(54 * scale));

  // 從畫布上方依序排放區塊，所有下方位置都以前一區塊底部計算。
  const titleY = topPadding;
  const titleCenterY = titleY + titleHeight / 2;
  const progressY = titleY + titleHeight + titleProgressGap;
  const progressCenterY = progressY + progressHeight / 2;
  const questionY = progressY + progressHeight + progressQuestionGap;
  const questionCenterY = questionY + questionHeight / 2;
  const firstOptionY = questionY + questionHeight + questionOptionGap;
  const optionYs = [];

  // 依序建立四個選項的基準位置。
  for (let i = 0; i < currentData.options.length; i++) {
    // 使用同一個選項高度與間距，確保每個選項都能點擊。
    optionYs.push(firstOptionY + i * (optionHeight + optionGap));
  }

  // 計算最後一個選項底部，提示文字會從這裡往下排放。
  const lastOptionBottom = optionYs[optionYs.length - 1] + optionHeight;
  const messageY = lastOptionBottom + messageGap;
  const messageCenterY = messageY + messageHeight / 2;

  // 計算按鈕尺寸，並確保按鈕寬度不會超出目前畫布。
  const buttonWidth = min(max(130, round(210 * scale)), max(1, width - 2 * max(8, sideMargin * 0.5)));
  const nextButtonX = (width - buttonWidth) / 2;
  const nextButtonY = messageY + messageHeight + buttonGap;

  // 答題後包含按鈕，未答題時內容底部停在提示文字下方。
  const contentBottom = hasAnswered
    ? nextButtonY + nextButtonHeight + bottomPadding
    : messageY + messageHeight + bottomPadding;

  // 回傳所有繪圖與點擊判定都會使用的實際版面資料。
  return {
    // 回傳內容區域資料。
    contentWidth,
    // 回傳題目框資料。
    questionX: (width - contentWidth) / 2,
    questionY,
    questionWidth: contentWidth,
    questionHeight,
    questionTextWidth,
    questionCenterY,
    // 回傳選項框資料。
    optionX: (width - contentWidth) / 2,
    optionWidth: contentWidth,
    optionHeight,
    optionYs,
    optionTextWidth,
    lastOptionBottom,
    // 回傳提示、結果與按鈕資料。
    messageCenterY,
    messageWidth,
    messageHeight,
    nextButtonX,
    nextButtonY,
    nextButtonWidth: buttonWidth,
    nextButtonHeight,
    contentBottom,
    // 回傳文字樣式資料。
    titleSize,
    progressSize,
    questionSize,
    optionSize,
    hintSize,
    messageSize,
    buttonTextSize,
    titleLineHeight,
    questionLineHeight,
    optionLineHeight,
    messageLineHeight: actualMessageLineHeight,
    // 回傳動畫與外觀資料。
    optionGap,
    cornerRadius: max(4, round(12 * scale)),
    titleCenterY,
    progressCenterY
  };
}

// 取得完成畫面的響應式版面資料。
function getFinishedLayout() {
  // 以畫布高度作為完成畫面主要縮放依據。
  let scale = constrain(height / 600, 0.25, 1);

  // 建立初始完成畫面版面。
  let layout = buildFinishedLayout(scale);

  // 內容超出時縮小文字、間距與按鈕高度。
  for (let attempt = 0; attempt < 12; attempt++) {
    // 保留上下少量安全距離。
    const availableHeight = max(1, height - 8);
    if (layout.contentBottom <= availableHeight) {
      break;
    }

    // 依照實際超出比例重新計算，避免固定百分比造成重疊。
    const ratio = availableHeight / max(layout.contentBottom, 1);
    scale = max(0.15, scale * ratio * 0.97);
    layout = buildFinishedLayout(scale);
  }

  // 回傳完成畫面各元件的實際邊界。
  return layout;
}

// 依照指定縮放比例建立完成畫面版面。
function buildFinishedLayout(scale) {
  // 設定響應式內容寬度，手機保留左右邊距、桌面限制最大寬度。
  const sideMargin = width < 600 ? max(16, width * 0.08) : min(100, width * 0.12);
  const contentWidth = min(max(1, width - sideMargin * 2), width < 900 ? 820 : 980);

  // 設定完成畫面的文字大小與行高。
  const titleSize = max(16, round(40 * scale));
  const scoreSize = max(14, round(32 * scale));
  const messageSize = max(12, round(21 * scale));
  const buttonTextSize = max(11, round(19 * scale));
  const titleLineHeight = titleSize * 1.22;
  const scoreLineHeight = scoreSize * 1.22;
  const messageLineHeight = messageSize * 1.28;

  // 設定完成畫面各區塊之間的間距。
  const titleGap = max(5, round(18 * scale));
  const scoreGap = max(5, round(18 * scale));
  const buttonGap = max(7, round(24 * scale));
  const bottomPadding = max(4, round(10 * scale));
  const buttonWidth = min(max(140, round(220 * scale)), max(1, width - 24));
  const buttonHeight = max(30, round(56 * scale));

  // 依照目前字體大小測量每個文字區塊的換行行數。
  textStyle(BOLD);
  textSize(titleSize);
  const titleLines = getWrappedLines("測驗完成！", contentWidth);
  textSize(scoreSize);
  const scoreLines = getWrappedLines(`你答對 ${score} / ${questions.length} 題`, contentWidth);
  textStyle(NORMAL);
  textSize(messageSize);
  const message = score === questions.length
    ? "太厲害了！全部答對！"
    : score >= 3
      ? "表現不錯，繼續加油！"
      : "再練習一下，你一定可以！";
  const messageLines = getWrappedLines(message, contentWidth);

  // 計算文字區塊高度。
  const titleHeight = titleLines.length * titleLineHeight;
  const scoreHeight = scoreLines.length * scoreLineHeight;
  const messageHeight = messageLines.length * messageLineHeight;

  // 計算整個完成畫面的內容總高度，再以畫布中央為基準排列。
  const totalHeight = titleHeight + titleGap + scoreHeight + scoreGap + messageHeight + buttonGap + buttonHeight + bottomPadding;
  const topY = max(4, (height - totalHeight) / 2);
  const titleCenterY = topY + titleHeight / 2;
  const scoreY = topY + titleHeight + titleGap;
  const scoreCenterY = scoreY + scoreHeight / 2;
  const messageY = scoreY + scoreHeight + scoreGap;
  const messageCenterY = messageY + messageHeight / 2;
  const restartButtonY = messageY + messageHeight + buttonGap;

  // 回傳完成畫面繪圖與點擊判定共用的資料。
  return {
    contentWidth,
    titleCenterY,
    scoreCenterY,
    messageCenterY,
    messageWidth: contentWidth,
    messageLineHeight,
    restartButtonX: (width - buttonWidth) / 2,
    restartButtonY,
    restartButtonWidth: buttonWidth,
    restartButtonHeight: buttonHeight,
    contentBottom: restartButtonY + buttonHeight + bottomPadding,
    titleSize,
    scoreSize,
    messageSize,
    buttonTextSize,
    titleLineHeight,
    scoreLineHeight,
    cornerRadius: max(4, round(12 * scale))
  };
}

// 取得答錯後正確選項動畫中的實際 Y 座標。
function getAnimatedOptionY(layout, optionIndex) {
  // 先使用版面計算出的選項基準位置。
  let optionY = layout.optionYs[optionIndex];

  // 只有答錯後的正確選項需要上下跳動。
  if (
    hasAnswered &&
    !isCorrect &&
    questions[currentQuestion] &&
    optionIndex === questions[currentQuestion].answer
  ) {
    // 以選項間距限制動畫振幅，避免跳動時蓋住相鄰選項。
    const amplitude = min(8, max(1, layout.optionGap * 0.45));

    // 使用 sin() 產生平滑的上下往返動畫。
    optionY += sin(frameCount * 0.12) * amplitude;
  }

  // 回傳畫面目前真正使用的選項 Y 座標。
  return optionY;
}

// 依照最大寬度將文字以 Unicode 字元逐字換行，支援繁體中文與英文。
function getWrappedLines(message, maxWidth) {
  // 將輸入安全轉成字串，避免未定義值造成繪圖錯誤。
  const safeMessage = String(message == null ? "" : message);

  // 依照原始換行符號分段處理。
  const paragraphs = safeMessage.split("\n");
  const lines = [];

  // 逐一處理每個段落。
  for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex++) {
    // 使用 Array.from 正確拆分中文與其他 Unicode 字元。
    const characters = Array.from(paragraphs[paragraphIndex]);
    let currentLine = "";

    // 逐字測量寬度，超過可用寬度就換行。
    for (let i = 0; i < characters.length; i++) {
      // 測試加入下一個字元後的寬度。
      const testLine = currentLine + characters[i];

      // 有既有文字且超過寬度時，先儲存目前行。
      if (textWidth(testLine) > maxWidth && currentLine !== "") {
        // 將已完成的行加入結果。
        lines.push(currentLine);

        // 以目前字元作為下一行的開頭。
        currentLine = characters[i];
      } else {
        // 尚未超過寬度時繼續累積文字。
        currentLine = testLine;
      }
    }

    // 保留段落最後一行，即使它是空字串也要保留換行位置。
    lines.push(currentLine);
  }

  // 空內容至少回傳一行，確保後續高度計算正常。
  if (lines.length === 0) {
    lines.push("");
  }

  // 回傳逐字換行後的文字行。
  return lines;
}

// 將可換行文字以垂直置中方式逐行繪製。
function drawWrappedText(message, x, centerY, maxWidth, lineHeight) {
  // 依照目前文字樣式取得換行後的行陣列。
  const lines = getWrappedLines(message, maxWidth);

  // 計算全部文字行的總高度。
  const totalHeight = lines.length * lineHeight;

  // 逐行計算 Y 座標並繪製文字。
  for (let i = 0; i < lines.length; i++) {
    // 讓整段文字以 centerY 為中心上下排列。
    const lineY = centerY - totalHeight / 2 + lineHeight / 2 + i * lineHeight;

    // 使用呼叫端已設定的顏色、粗細、大小與對齊方式繪製文字。
    text(lines[i], x, lineY);
  }
}

// 在畫布中央繪製錯誤或狀態訊息。
function drawCenteredMessage(message, centerY, size, color, style) {
  // 設定訊息顏色。
  fill(color);

  // 移除文字外框，保持文字清晰。
  noStroke();

  // 設定訊息字體樣式與大小。
  textStyle(style);
  textSize(size);
  textAlign(CENTER, CENTER);

  // 繪製中央訊息。
  text(message, width / 2, centerY);
}

// 接收滑鼠或觸控座標並執行一次測驗互動。
function handlePointerClick(pointX, pointY) {
  // 完成畫面只允許點擊重新開始按鈕。
  if (quizFinished) {
    // 重新依目前畫布尺寸取得完成畫面的按鈕邊界。
    const layout = getFinishedLayout();

    // 點擊位於按鈕內時重設整個測驗。
    if (isInsideRect(
      pointX,
      pointY,
      layout.restartButtonX,
      layout.restartButtonY,
      layout.restartButtonWidth,
      layout.restartButtonHeight
    )) {
      // 執行重新開始。
      restartQuiz();
    }

    // 完成畫面處理完畢，不再檢查其他元件。
    return false;
  }

  // 重新取得與當前畫面相同的動態版面資料。
  const layout = getQuizLayout();
  const currentData = questions[currentQuestion];

  // 題目資料不存在時不執行任何互動。
  if (!currentData) {
    return false;
  }

  // 尚未作答時只檢查四個選項。
  if (!hasAnswered) {
    // 逐一檢查每個選項的實際動畫後邊界。
    for (let i = 0; i < currentData.options.length; i++) {
      // 使用和繪圖完全相同的動畫 Y 座標。
      const optionY = getAnimatedOptionY(layout, i);

      // 判斷目前指標是否位於選項矩形內。
      if (isInsideRect(
        pointX,
        pointY,
        layout.optionX,
        optionY,
        layout.optionWidth,
        layout.optionHeight
      )) {
        // 記錄使用者選取的選項索引。
        selectedAnswer = i;

        // 將題目狀態切換為已作答。
        hasAnswered = true;

        // 判斷答案是否正確。
        isCorrect = selectedAnswer === currentData.answer;

        // 答對時增加分數。
        if (isCorrect) {
          score++;
        }

        // 一次點擊只處理一個選項。
        break;
      }
    }
  } else {
    // 已作答時只檢查下一題或查看成績按鈕。
    if (isInsideRect(
      pointX,
      pointY,
      layout.nextButtonX,
      layout.nextButtonY,
      layout.nextButtonWidth,
      layout.nextButtonHeight
    )) {
      // 最後一題按下按鈕後進入完成畫面。
      if (currentQuestion === questions.length - 1) {
        // 將測驗狀態切換為完成。
        quizFinished = true;
      } else {
        // 前往下一題。
        currentQuestion++;

        // 清除上一題的選項狀態。
        selectedAnswer = -1;
        hasAnswered = false;
        isCorrect = false;
      }
    }
  }

  // 阻止瀏覽器預設點擊或觸控行為。
  return false;
}

// 處理滑鼠點擊事件。
function mousePressed() {
  // 忽略觸控後瀏覽器產生的模擬滑鼠事件，避免一次觸控重複作答。
  if (millis() < ignoreMouseUntil) {
    return false;
  }

  // 將 p5.js CSS 座標交給共用互動處理函式。
  return handlePointerClick(mouseX, mouseY);
}

// 處理觸控裝置點擊事件。
function touchStarted() {
  // 只取第一個觸控點，避免多指同時造成重複作答。
  if (touches && touches.length > 0) {
    // 使用 p5.js 提供的畫布座標，和 mouseX、mouseY 使用相同 CSS 座標系。
    handlePointerClick(touches[0].x, touches[0].y);

    // 設定短暫鎖定時間，攔截觸控後產生的模擬滑鼠事件。
    ignoreMouseUntil = millis() + 700;
  }

  // 阻止瀏覽器捲動或縮放等預設觸控行為。
  return false;
}

// 判斷指定點是否位於矩形的實際邊界內。
function isInsideRect(pointX, pointY, rectX, rectY, rectWidth, rectHeight) {
  // 同時檢查水平與垂直方向的座標範圍。
  return (
    pointX >= rectX &&
    pointX <= rectX + rectWidth &&
    pointY >= rectY &&
    pointY <= rectY + rectHeight
  );
}

// 將測驗狀態全部重設為初始值。
function restartQuiz() {
  // 回到第一題。
  currentQuestion = 0;

  // 將分數歸零。
  score = 0;

  // 清除使用者選取的答案。
  selectedAnswer = -1;

  // 設定為尚未作答。
  hasAnswered = false;

  // 清除答案正確狀態。
  isCorrect = false;

  // 設定測驗尚未完成。
  quizFinished = false;
}

// 當瀏覽器視窗大小改變或裝置旋轉時重新調整畫布。
function windowResized() {
  // 將畫布調整為最新的瀏覽器視窗寬高。
  resizeCanvas(windowWidth, windowHeight);

  // 重新套用像素密度，避免旋轉或縮放後產生邏輯座標偏差。
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
}
