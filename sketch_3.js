// 題庫陣列只存放本輪從 CSV 題庫抽出的五題。
let questions = [];

// 題庫陣列存放 questions.csv 載入並驗證後的全部 15 題。
let questionBank = [];

// 記錄題庫是否仍在載入中。
let questionsAreLoading = true;

// 記錄題庫載入失敗時要顯示給使用者的明確訊息。
let questionLoadError = "";

// 設定每一輪要隨機抽出的題數。
const questionsPerRound = 5;

// 指定中文與英文數字的第一順位字型名稱。
const chineseFontName = "LXGW WenKai Mono TC";
const latinFontName = "Bitcount Ink";

// 設定畫面色彩，所有文字都使用一般字重呈現。
const pageBackground = "#f8f9fa";
const textColor = "#212529";
const optionBackground = "#ffffff";
const optionBorder = "#8d99ae";
const correctBackground = "#caf0f8";
const wrongBackground = "#ffc9c9";
const correctTextColor = "#198754";
const wrongTextColor = "#dc3545";
const hintTextColor = "#343a40";
const titleColor = "#023e8a";
const progressColor = "#495057";
const buttonBackground = "#0077b6";
const buttonTextColor = "#ffffff";

// 記錄測驗流程與目前的作答狀態。
let currentQuestion = 0;
let score = 0;
let selectedAnswer = -1;
let hasAnswered = false;
let isCorrect = false;
let quizFinished = false;
let ignoreMouseUntil = 0;
let fontsAreReady = false;
let fontWarningShown = false;

// 建立畫布並初始化 p5.js 的繪圖與字型載入流程。
function setup() {
  // 建立與瀏覽器視窗同寬高的全螢幕畫布。
  const canvas = createCanvas(windowWidth, windowHeight);

  // 將畫布固定放在頁面左上角，避免產生額外偏移。
  canvas.position(0, 0);

  // 設定畫布的顯示與觸控行為，讓滑鼠與觸控都交由 p5.js 處理。
  canvas.style("display", "block");
  canvas.style("touch-action", "none");

  // 移除頁面預設間距並隱藏捲軸，維持完整畫布視圖。
  document.documentElement.style.margin = "0";
  document.body.style.margin = "0";
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";

  // 依照螢幕解析度設定像素密度，同時限制最高密度以維持手機效能。
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));

  // 設定矩形模式、文字對齊與所有文字的初始一般樣式。
  rectMode(CORNER);
  textAlign(CENTER, CENTER);
  textStyle(NORMAL);

  // 先使用合理 fallback，等 Google Fonts 載入完成後再重新測量與繪製。
  fontsAreReady = areRequiredFontsReady();
  watchGoogleFonts();

  // 讀取外部 CSV 題庫；載入完成前畫面會顯示載入提示。
  loadQuestionsFromCsv();

  // 先繪製載入中的狀態畫面，避免畫布出現空白。
  redraw();
}

// 使用 p5.js loadTable 載入 UTF-8 CSV 題庫。
function loadQuestionsFromCsv() {
  // 顯示載入狀態並清除上一輪可能留下的錯誤。
  questionsAreLoading = true;
  questionLoadError = "";

  // 使用標題列讀取方式，讓每一列可依固定欄位名稱取得資料。
  loadTable(
    "questions.csv",
    "csv",
    "header",
    handleQuestionsTableLoaded,
    handleQuestionsTableFailed
  );
}

// 將 CSV 的 p5.Table 內容驗證並轉成題目物件。
function handleQuestionsTableLoaded(table) {
  try {
    // 確認 CSV 題庫確實包含固定欄位。
    const requiredColumns = ["question", "option1", "option2", "option3", "option4", "answer"];
    const tableColumns = Array.isArray(table.columns) ? table.columns : [];
    const hasAllColumns = requiredColumns.every((column) => tableColumns.includes(column));
    if (!hasAllColumns) {
      throw new Error("CSV 欄位必須固定為 question, option1, option2, option3, option4, answer。");
    }

    // 題庫規格要求正好 15 題，避免題數錯誤造成抽題流程異常。
    if (table.getRowCount() !== 15) {
      throw new Error(`CSV 題庫必須有 15 題，目前讀到 ${table.getRowCount()} 題。`);
    }

    // 將每列轉成 { question, options, answer }，並把答案由 1-based 轉成 0-based。
    const parsedQuestions = [];
    for (let rowIndex = 0; rowIndex < table.getRowCount(); rowIndex += 1) {
      const row = table.getRow(rowIndex);
      const question = String(row.getString("question") || "").trim();
      const options = [1, 2, 3, 4].map((optionNumber) => (
        String(row.getString(`option${optionNumber}`) || "").trim()
      ));
      const answerNumber = Number.parseInt(String(row.getString("answer") || "").trim(), 10);

      // 每列都必須有題目、四個選項與 1 到 4 的正確答案。
      if (!question || options.some((option) => !option) || !Number.isInteger(answerNumber) || answerNumber < 1 || answerNumber > 4) {
        throw new Error(`CSV 第 ${rowIndex + 2} 列資料不完整，或 answer 不是 1 到 4。`);
      }

      parsedQuestions.push({
        question,
        options,
        answer: answerNumber - 1
      });
    }

    // 保存完整題庫，並從中使用 Fisher-Yates 洗牌抽出本輪五題。
    questionBank = parsedQuestions;
    questionsAreLoading = false;
    startNewRound();
    console.info(`[測驗] 題庫載入成功，共 ${questionBank.length} 題；本輪抽出 ${questions.length} 題。`);
    redraw();
  } catch (error) {
    // 驗證失敗也走明確錯誤狀態，避免使用者看到白屏。
    handleQuestionsTableFailed(error);
  }
}

// 處理 CSV 找不到、格式錯誤或載入失敗的情況。
function handleQuestionsTableFailed(error) {
  // 記錄完整錯誤，方便在瀏覽器 console 追查檔案路徑或格式問題。
  console.error("[測驗] questions.csv 載入失敗。", error);
  questionsAreLoading = false;
  questionLoadError = "題庫載入失敗，請確認 questions.csv 與網頁位於同一個資料夾。";
  questions = [];
  questionBank = [];
  redraw();
}

// 使用 Fisher-Yates 演算法複製並隨機打亂題目陣列。
function fisherYatesShuffle(items) {
  // 複製陣列，避免改動完整題庫的原始順序。
  const shuffled = items.slice();

  // 從最後一項往前，將目前項目與隨機位置交換。
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

// 重設測驗狀態並從 15 題中抽出不重複的五題。
function startNewRound() {
  // 洗牌後取前五題，確保同一輪不會抽到重複題目。
  questions = fisherYatesShuffle(questionBank).slice(0, questionsPerRound);

  // 重設本輪題號、分數、選項與完成狀態。
  currentQuestion = 0;
  score = 0;
  selectedAnswer = -1;
  hasAnswered = false;
  isCorrect = false;
  quizFinished = false;
}

// 繪製題庫載入中的明確狀態畫面。
function drawLoadingScreen() {
  // 載入狀態明確設定背景、文字色、一般字型樣式與對齊方式。
  background(pageBackground);
  textStyle(NORMAL);
  textAlign(CENTER, CENTER);
  fill(titleColor);
  noStroke();
  textFont(chineseFontName);
  textSize(Math.max(18, Math.min(30, width * 0.06)));
  drawMixedWrappedText("正在載入題庫……", width / 2, height / 2, Math.max(1, width * 0.86), 38);
  textStyle(NORMAL);
}

// 繪製題庫載入失敗的明確錯誤畫面。
function drawQuestionLoadErrorScreen() {
  // 錯誤狀態明確設定背景、深色文字、一般樣式與 fallback 字型。
  background(pageBackground);
  textStyle(NORMAL);
  textAlign(CENTER, CENTER);
  fill(wrongTextColor);
  noStroke();
  textFont(chineseFontName);
  textSize(Math.max(16, Math.min(26, width * 0.055)));
  drawMixedWrappedText("題庫載入失敗", width / 2, height * 0.38, Math.max(1, width * 0.86), 34);
  fill(textColor);
  textSize(Math.max(12, Math.min(19, width * 0.04)));
  drawMixedWrappedText(questionLoadError, width / 2, height * 0.55, Math.max(1, width * 0.86), 28);
  textStyle(NORMAL);
}

// 檢查兩個指定 Google Fonts 是否已經可以被瀏覽器使用。
function areRequiredFontsReady() {
  // 沒有 Font Loading API 時仍讓畫面使用 CSS 與瀏覽器 fallback 顯示。
  if (!document.fonts || typeof document.fonts.check !== "function") {
    return true;
  }

  // 明確檢查一般字重的中文與英文數字字型。
  const chineseReady = document.fonts.check('normal 16px "LXGW WenKai Mono TC"');
  const latinReady = document.fonts.check('normal 16px "Bitcount Ink"');
  return chineseReady && latinReady;
}

// 監聽 Google Fonts 載入完成事件，完成後立即重新繪製畫面。
function watchGoogleFonts() {
  // 使用 document.fonts.ready 監聽 Google Fonts 載入完成時機。
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      // 更新字型狀態，未載入時仍使用瀏覽器 fallback 字型。
      fontsAreReady = areRequiredFontsReady();
      if (!fontsAreReady && !fontWarningShown) {
        // 只在字型未載入時提示一次，不能阻止測驗繪製。
        console.warn("[測驗] Google Fonts 尚未完成載入，將使用 fallback 字型；畫面仍會繼續繪製。");
        fontWarningShown = true;
      }
      // 字型狀態更新後重新測量混合文字寬度。
      redraw();
    }).catch((error) => {
      // 字型檢查失敗只記錄診斷，不阻止完成頁。
      console.warn("[測驗] 字型載入檢查失敗，將使用 fallback 字型。", error);
      redraw();
    });
  }

  // 監聽部分瀏覽器的字型完成事件。
  if (document.fonts && typeof document.fonts.addEventListener === "function") {
    document.fonts.addEventListener("loadingdone", () => {
      // 重新檢查指定中文字型與英文字型。
      fontsAreReady = areRequiredFontsReady();
      if (!fontsAreReady && !fontWarningShown) {
        // 字型不可用時只顯示一次警告，測驗功能仍保持可用。
        console.warn("[測驗] 指定字型未載入，將使用 fallback 字型；測驗功能不受影響。");
        fontWarningShown = true;
      }
      // 載入事件完成後重新繪製畫面。
      redraw();
    });
  }
}

// 每一幀重繪背景、測驗內容與答錯時的跳動動畫。
function draw() {
  // 清除上一幀內容並填滿頁面背景色。
  background(pageBackground);

  // 先明確設定全域文字樣式，避免任何畫面沿用錯誤狀態。
  textStyle(NORMAL);
  textAlign(CENTER, CENTER);
  textFont(chineseFontName);

  // 依照題庫狀態繪製載入、錯誤、答題或完成畫面。
  if (questionsAreLoading) {
    drawLoadingScreen();
  } else if (questionLoadError) {
    drawQuestionLoadErrorScreen();
  } else if (quizFinished) {
    // 完成頁若發生例外，使用安全畫面確保成績仍可見。
    try {
      drawFinishedScreen();
    } catch (error) {
      drawFinishedFallbackScreen(error);
    }
  } else if (questions.length === questionsPerRound) {
    drawQuizScreen();
  } else {
    // 題目數量異常時仍顯示明確訊息，不讓畫布變成白屏。
    drawCenteredMessage("題庫資料不完整，請重新整理頁面。", height / 2, 18, wrongTextColor);
  }

  // 每幀結束都恢復一般文字樣式，避免任何狀態殘留。
  textStyle(NORMAL);
  textAlign(CENTER, CENTER);
}

// 判斷字元是否屬於中文、中文標點或中文相關 Unicode 區段。
function isChineseCharacter(character) {
  // 涵蓋常用漢字、擴充漢字與 CJK 標點符號。
  return /[\u2e80-\u2fff\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u.test(character);
}

// 取得單一字元應使用的字型類別。
function getFontForCharacter(character) {
  // 中文與中文標點第一順位使用 LXGW WenKai Mono TC。
  if (isChineseCharacter(character)) {
    return "chinese";
  }

  // 英文、數字與 ASCII 符號第一順位使用 Bitcount Ink。
  if (/^[\x00-\x7f]$/.test(character)) {
    return "latin";
  }

  // 其他 Unicode 字元使用中文字型作為較穩定的 fallback。
  return "chinese";
}

// 將混合文字分割為連續且應使用同一字型的區段。
function getMixedTextSegments(message) {
  // 將輸入轉成安全字串，避免空值造成測量錯誤。
  const safeMessage = String(message == null ? "" : message);
  const segments = [];
  let currentType = "";
  let currentText = "";

  // 逐一處理 Unicode 字元，保留中英文分段繪製邏輯。
  for (const character of Array.from(safeMessage)) {
    const type = getFontForCharacter(character);
    if (currentText !== "" && type !== currentType) {
      segments.push({ text: currentText, type: currentType });
      currentText = "";
    }
    currentType = type;
    currentText += character;
  }

  // 將最後尚未加入的文字區段放入結果陣列。
  if (currentText !== "") {
    segments.push({ text: currentText, type: currentType });
  }

  return segments;
}

// 依照指定字型類別明確套用一般字重的 canvas 字型。
function applyCanvasFont(type) {
  // 先記錄目前文字大小，避免 p5.js 將第二參數 normal 解讀成文字尺寸。
  const currentTextSize = textSize();

  // 中文區段明確使用 LXGW WenKai Mono TC 的 normal 樣式。
  if (type === "chinese") {
    textFont(chineseFontName);
    textSize(currentTextSize);
    return;
  }

  // 英文與數字區段明確使用 Bitcount Ink 的 normal 樣式。
  textFont(latinFontName);
  textSize(currentTextSize);
}

// 使用和實際繪製相同的字型切換規則計算混合字串寬度。
function getMixedTextWidth(message) {
  // 先確保寬度測量不會受到其他文字樣式影響。
  textStyle(NORMAL);
  let totalWidth = 0;

  // 逐段切換字型並累加 canvas 回報的實際寬度。
  for (const segment of getMixedTextSegments(message)) {
    textStyle(NORMAL);
    applyCanvasFont(segment.type);
    totalWidth += textWidth(segment.text);
    textStyle(NORMAL);
  }

  // 寬度測量結束後再次明確恢復一般文字樣式。
  textStyle(NORMAL);
  return totalWidth;
}

// 從左側座標開始繪製一行中英文混合文字。
function drawMixedText(message, x, y) {
  // 取得連續的中文或英文數字區段。
  const segments = getMixedTextSegments(message);
  let cursorX = x;
  const previousAlign = textAlign();

  // 讓每個區段從上一段結尾接續，不因字型切換而產生間隔。
  textAlign(LEFT, CENTER);
  for (const segment of segments) {
    // 每個 canvas 文字區段繪製前都明確設定一般樣式與指定字型。
    textStyle(NORMAL);
    applyCanvasFont(segment.type);
    text(segment.text, cursorX, y);
    // 每個 canvas 文字區段繪製後都明確恢復一般樣式。
    textStyle(NORMAL);
    cursorX += textWidth(segment.text);
  }

  // 還原繪製前的文字對齊方式並再次確保一般樣式。
  textAlign(previousAlign[0], previousAlign[1]);
  textStyle(NORMAL);
}

// 依照字型實際寬度逐字換行，支援中文與英文數字混合內容。
function getMixedWrappedLines(message, maxWidth) {
  // 依照原始換行符號切開段落，保留空白段落的高度。
  const paragraphs = String(message == null ? "" : message).split("\n");
  const lines = [];

  // 逐段、逐字測量，確保換行寬度和繪製寬度完全一致。
  for (const paragraph of paragraphs) {
    let currentLine = "";
    for (const character of Array.from(paragraph)) {
      const candidate = currentLine + character;
      if (currentLine !== "" && getMixedTextWidth(candidate) > maxWidth) {
        lines.push(currentLine);
        currentLine = character;
      } else {
        currentLine = candidate;
      }
    }
    lines.push(currentLine);
  }

  // 空字串至少保留一行，讓高度計算保持穩定。
  return lines.length > 0 ? lines : [""];
}

// 以垂直置中方式繪製可換行的中英文混合文字。
function drawMixedWrappedText(message, centerX, centerY, maxWidth, lineHeight) {
  // 先依目前字型與文字大小建立換行結果。
  textStyle(NORMAL);
  const lines = getMixedWrappedLines(message, maxWidth);
  const widths = lines.map((line) => getMixedTextWidth(line));
  const totalHeight = lines.length * lineHeight;

  // 逐行計算左側位置後，使用同一套分段函式繪製。
  for (let index = 0; index < lines.length; index += 1) {
    textStyle(NORMAL);
    const lineY = centerY - totalHeight / 2 + lineHeight / 2 + index * lineHeight;
    const lineX = centerX - widths[index] / 2;
    drawMixedText(lines[index], lineX, lineY);
    textStyle(NORMAL);
  }

  // 換行文字繪製完成後維持畫面預設的置中與一般樣式。
  textAlign(CENTER, CENTER);
  textStyle(NORMAL);
}

// 繪製答題中的標題、題目、選項、訊息與按鈕。
function drawQuizScreen() {
  // 取得目前題目與目前尺寸對應的響應式版面。
  const currentData = questions[currentQuestion];
  const layout = getQuizLayout();

  // 題目資料遺失時顯示可理解的錯誤訊息。
  if (!currentData) {
    drawCenteredMessage("找不到目前題目，請重新開始。", height / 2, 18, wrongTextColor);
    return;
  }

  // 繪製測驗標題，使用一般樣式與混合字型分段。
  fill(titleColor);
  noStroke();
  textStyle(NORMAL);
  textSize(layout.titleSize);
  drawMixedWrappedText("p5.js 程式設計簡易測驗", width / 2, layout.titleCenterY, layout.contentWidth, layout.titleLineHeight);
  textStyle(NORMAL);

  // 繪製目前題數進度文字。
  fill(progressColor);
  textStyle(NORMAL);
  textSize(layout.progressSize);
  drawMixedWrappedText(`第 ${currentQuestion + 1} 題 / 共 ${questions.length} 題`, width / 2, layout.progressCenterY, layout.contentWidth, layout.progressLineHeight);
  textStyle(NORMAL);

  // 繪製題目背景框，讓題目在各種裝置上都清楚可見。
  rectMode(CORNER);
  fill("#e9ecef");
  stroke("#b8c2cc");
  strokeWeight(1);
  rect(layout.questionX, layout.questionY, layout.questionWidth, layout.questionHeight, layout.cornerRadius);

  // 在題目框中繪製可逐字換行的題目文字。
  fill(textColor);
  noStroke();
  textStyle(NORMAL);
  textSize(layout.questionSize);
  drawMixedWrappedText(currentData.question, width / 2, layout.questionCenterY, layout.questionTextWidth, layout.questionLineHeight);
  textStyle(NORMAL);

  // 逐一繪製四個選項，繪圖與點擊共用相同的實際座標。
  for (let index = 0; index < currentData.options.length; index += 1) {
    // 取得答錯動畫中的目前選項位置。
    const optionY = getAnimatedOptionY(layout, index);
    const isRightOption = index === currentData.answer;
    const isSelectedOption = index === selectedAnswer;
    let currentOptionBackground = optionBackground;

    // 答錯時將正確選項背景設定為指定的 #caf0f8。
    if (hasAnswered && !isCorrect && isRightOption) {
      currentOptionBackground = correctBackground;
    }

    // 答對時也以淺藍色標示使用者選取的正確選項。
    if (hasAnswered && isCorrect && isSelectedOption) {
      currentOptionBackground = correctBackground;
    }

    // 答錯時以淡紅色標示使用者選取的錯誤選項。
    if (hasAnswered && !isCorrect && isSelectedOption) {
      currentOptionBackground = wrongBackground;
    }

    // 繪製選項背景與外框。
    rectMode(CORNER);
    fill(currentOptionBackground);
    stroke(optionBorder);
    strokeWeight(2);
    rect(layout.optionX, optionY, layout.optionWidth, layout.optionHeight, layout.cornerRadius);

    // 繪製選項文字，英文數字與中文會依字元切換字型。
    fill(textColor);
    noStroke();
    textStyle(NORMAL);
    textSize(layout.optionSize);
    drawMixedWrappedText(`${String.fromCharCode(65 + index)}. ${currentData.options[index]}`, width / 2, optionY + layout.optionHeight / 2, layout.optionTextWidth, layout.optionLineHeight);
    textStyle(NORMAL);
  }

  // 尚未作答時顯示操作提示，作答後顯示結果與下一步按鈕。
  if (hasAnswered) {
    // 使用顏色與大小區分答對及答錯，但不使用粗體。
    fill(isCorrect ? correctTextColor : wrongTextColor);
    noStroke();
    textStyle(NORMAL);
    textSize(layout.messageSize);
    drawMixedWrappedText(isCorrect ? "答對了！" : "答錯了！正確答案已標示。", width / 2, layout.messageCenterY, layout.messageWidth, layout.messageLineHeight);
    textStyle(NORMAL);

    // 繪製下一題或查看成績按鈕。
    rectMode(CORNER);
    fill(buttonBackground);
    noStroke();
    rect(layout.nextButtonX, layout.nextButtonY, layout.nextButtonWidth, layout.nextButtonHeight, layout.cornerRadius);

    // 繪製按鈕文字，維持一般樣式與混合字型規則。
    fill(buttonTextColor);
    textStyle(NORMAL);
    textSize(layout.buttonTextSize);
    drawMixedWrappedText(currentQuestion === questions.length - 1 ? "查看成績" : "下一題", width / 2, layout.nextButtonY + layout.nextButtonHeight / 2, layout.nextButtonWidth - layout.buttonTextPadding * 2, layout.buttonLineHeight);
    textStyle(NORMAL);
  } else {
    // 顯示尚未作答的操作提示。
    fill(hintTextColor);
    noStroke();
    textStyle(NORMAL);
    textSize(layout.hintSize);
    drawMixedWrappedText("請點擊一個選項作答", width / 2, layout.messageCenterY, layout.messageWidth, layout.hintLineHeight);
    textStyle(NORMAL);
  }
}

// 繪製答完五題後的分數與重新開始畫面。
function drawFinishedScreen() {
  // 完成頁每次繪製前明確填滿背景，避免白色畫布或狀態殘留。
  background(pageBackground);
  // 完成頁不使用外框，避免沿用選項的 stroke 狀態。
  noStroke();
  // 完成頁明確使用一般字樣與置中對齊。
  textStyle(NORMAL);
  textAlign(CENTER, CENTER);
  // 先設定可見的深色填色與有效文字大小。
  fill(textColor);
  textSize(18);
  // 取得完成頁響應式版面。
  const layout = getFinishedLayout();
  const encouragement = score === questions.length
    ? "太厲害了！全部答對！"
    : score >= 3
      ? "表現不錯，繼續加油！"
      : "再練習一下，你一定可以！";

  // 繪製完成標題。
  fill(titleColor);
  noStroke();
  textStyle(NORMAL);
  textSize(layout.titleSize);
  drawMixedWrappedText("測驗完成！", width / 2, layout.titleCenterY, layout.contentWidth, layout.titleLineHeight);
  textStyle(NORMAL);

  // 繪製答對題數。
  fill(textColor);
  textStyle(NORMAL);
  textSize(layout.scoreSize);
  drawMixedWrappedText(`你答對 ${score} / ${questions.length} 題`, width / 2, layout.scoreCenterY, layout.contentWidth, layout.scoreLineHeight);
  textStyle(NORMAL);

  // 繪製鼓勵訊息。
  fill(progressColor);
  textStyle(NORMAL);
  textSize(layout.messageSize);
  drawMixedWrappedText(encouragement, width / 2, layout.messageCenterY, layout.contentWidth, layout.messageLineHeight);
  textStyle(NORMAL);

  // 繪製重新開始按鈕。
  rectMode(CORNER);
  fill(buttonBackground);
  noStroke();
  rect(layout.restartButtonX, layout.restartButtonY, layout.restartButtonWidth, layout.restartButtonHeight, layout.cornerRadius);

  // 繪製重新開始按鈕文字。
  fill(buttonTextColor);
  textStyle(NORMAL);
  textSize(layout.buttonTextSize);
  drawMixedWrappedText("重新開始", width / 2, layout.restartButtonY + layout.restartButtonHeight / 2, layout.restartButtonWidth - layout.buttonTextPadding * 2, layout.buttonLineHeight);
  textStyle(NORMAL);
}

// 依照畫布尺寸取得不會重疊的答題版面。
function getQuizLayout() {
  // 先依寬高比例建立初始縮放，兼顧直向與橫向裝置。
  let scale = constrain(Math.min(width / 760, height / 720), 0.16, 1);
  let layout = buildQuizLayout(scale);

  // 若內容超出畫布高度，逐步縮小所有元件直到能放入安全範圍。
  for (let attempt = 0; attempt < 18 && layout.contentBottom > height - 4; attempt += 1) {
    const ratio = Math.max(0.5, (height - 4) / Math.max(layout.contentBottom, 1));
    scale = Math.max(0.11, scale * ratio * 0.96);
    layout = buildQuizLayout(scale);
  }

  return layout;
}

// 依指定縮放比例建立答題頁面的文字與元件座標。
function buildQuizLayout(scale) {
  // 計算左右安全邊界與內容最大寬度。
  const sideMargin = width < 480
    ? Math.max(10, width * 0.04)
    : width < 900
      ? Math.max(18, width * 0.055)
      : Math.min(76, width * 0.075);
  const contentWidth = Math.min(Math.max(1, width - sideMargin * 2), width < 600 ? 620 : width < 1100 ? 820 : 980);

  // 依比例設定文字大小，最小值確保手機橫向仍可閱讀。
  const titleSize = Math.max(9, Math.round(31 * scale));
  const progressSize = Math.max(8, Math.round(17 * scale));
  const questionSize = Math.max(9, Math.round(22 * scale));
  const optionSize = Math.max(9, Math.round(19 * scale));
  const hintSize = Math.max(9, Math.round(20 * scale));
  const messageSize = Math.max(9, Math.round(19 * scale));
  const buttonTextSize = Math.max(9, Math.round(19 * scale));

  // 設定中文逐字換行時使用的行高。
  const titleLineHeight = titleSize * 1.22;
  const progressLineHeight = progressSize * 1.28;
  const questionLineHeight = questionSize * 1.34;
  const optionLineHeight = optionSize * 1.3;
  const hintLineHeight = hintSize * 1.28;
  const messageLineHeight = messageSize * 1.28;
  const buttonLineHeight = buttonTextSize * 1.25;

  // 設定各區塊內距與區塊之間的間距。
  const questionPadding = Math.max(3, Math.round(14 * scale));
  const optionPadding = Math.max(3, Math.round(10 * scale));
  const topPadding = Math.max(3, Math.round(14 * scale));
  const titleProgressGap = Math.max(2, Math.round(6 * scale));
  const progressQuestionGap = Math.max(3, Math.round(12 * scale));
  const questionOptionGap = Math.max(3, Math.round(11 * scale));
  const optionGap = Math.max(2, Math.round(8 * scale));
  const messageGap = Math.max(3, Math.round(15 * scale));
  const buttonGap = Math.max(3, Math.round(11 * scale));
  const bottomPadding = Math.max(3, Math.round(7 * scale));
  const buttonTextPadding = Math.max(5, Math.round(16 * scale));

  // 計算題目、選項與訊息可使用的文字寬度。
  const questionTextWidth = Math.max(1, contentWidth - questionPadding * 2);
  const optionTextWidth = Math.max(1, contentWidth - optionPadding * 2);
  const currentData = questions[currentQuestion] || questions[0];

  // 以一般樣式測量標題與題目所需的行數。
  textStyle(NORMAL);
  textSize(titleSize);
  const titleLines = getMixedWrappedLines("p5.js 程式設計簡易測驗", contentWidth);
  textSize(questionSize);
  const questionLines = getMixedWrappedLines(currentData.question, questionTextWidth);

  // 以一般樣式測量四個選項中最多的換行行數。
  textStyle(NORMAL);
  textSize(optionSize);
  let optionLineCount = 1;
  for (const [index, option] of currentData.options.entries()) {
    const optionText = `${String.fromCharCode(65 + index)}. ${option}`;
    optionLineCount = Math.max(optionLineCount, getMixedWrappedLines(optionText, optionTextWidth).length);
  }

  // 測量提示或答題結果訊息的換行行數。
  const messageText = hasAnswered
    ? (isCorrect ? "答對了！" : "答錯了！正確答案已標示。")
    : "請點擊一個選項作答";
  const currentMessageSize = hasAnswered ? messageSizeForLayout(messageSize, scale) : hintSize;
  const messageLineHeightForLayout = hasAnswered ? currentMessageSize * 1.28 : hintLineHeight;
  textStyle(NORMAL);
  textSize(currentMessageSize);
  const messageLines = getMixedWrappedLines(messageText, contentWidth);

  // 將文字行數轉成每個視覺區塊的實際高度。
  const titleHeight = Math.max(titleLineHeight, titleLines.length * titleLineHeight);
  const progressHeight = Math.max(progressLineHeight, progressSize * 1.28);
  const questionHeight = Math.max(Math.round(50 * scale), questionLines.length * questionLineHeight + questionPadding * 2);
  const optionHeight = Math.max(Math.round(57 * scale), optionLineCount * optionLineHeight + optionPadding * 2);
  const messageHeight = Math.max(Math.round(28 * scale), messageLines.length * messageLineHeightForLayout);
  const buttonHeight = Math.max(26, Math.round(53 * scale));

  // 從上到下排列標題、進度、題目與四個選項。
  const titleY = topPadding;
  const titleCenterY = titleY + titleHeight / 2;
  const progressY = titleY + titleHeight + titleProgressGap;
  const progressCenterY = progressY + progressHeight / 2;
  const questionY = progressY + progressHeight + progressQuestionGap;
  const questionCenterY = questionY + questionHeight / 2;
  const firstOptionY = questionY + questionHeight + questionOptionGap;
  const optionYs = currentData.options.map((_, index) => firstOptionY + index * (optionHeight + optionGap));
  const lastOptionBottom = optionYs[optionYs.length - 1] + optionHeight;
  const messageY = lastOptionBottom + messageGap;
  const messageCenterY = messageY + messageHeight / 2;

  // 建立下一題按鈕的尺寸與位置。
  const buttonWidth = Math.min(Math.max(122, Math.round(208 * scale)), Math.max(1, width - 18));
  const nextButtonX = (width - buttonWidth) / 2;
  const nextButtonY = messageY + messageHeight + buttonGap;
  const contentBottom = hasAnswered ? nextButtonY + buttonHeight + bottomPadding : messageY + messageHeight + bottomPadding;

  // 恢復一般文字樣式後回傳繪圖與點擊共用的版面資料。
  textStyle(NORMAL);
  return {
    contentWidth,
    questionX: (width - contentWidth) / 2,
    questionY,
    questionWidth: contentWidth,
    questionHeight,
    questionTextWidth,
    questionCenterY,
    optionX: (width - contentWidth) / 2,
    optionWidth: contentWidth,
    optionHeight,
    optionYs,
    optionTextWidth,
    optionGap,
    messageCenterY,
    messageWidth: contentWidth,
    messageHeight,
    nextButtonX,
    nextButtonY,
    nextButtonWidth: buttonWidth,
    nextButtonHeight: buttonHeight,
    contentBottom,
    titleSize,
    progressSize,
    questionSize,
    optionSize,
    hintSize,
    messageSize,
    buttonTextSize,
    titleLineHeight,
    progressLineHeight,
    questionLineHeight,
    optionLineHeight,
    hintLineHeight,
    messageLineHeight: messageLineHeightForLayout,
    buttonLineHeight,
    buttonTextPadding,
    cornerRadius: Math.max(4, Math.round(11 * scale)),
    titleCenterY,
    progressCenterY
  };
}

// 讓答題結果文字尺寸與版面計算使用同一個穩定值。
function messageSizeForLayout(baseSize, scale) {
  // 保持結果訊息不小於手機畫面可辨識的尺寸。
  return Math.max(9, Math.round(19 * scale));
}

// 完成頁發生非預期例外時繪製安全畫面，避免只剩背景色。
function drawFinishedFallbackScreen(error) {
  // 將錯誤記錄到主控台，方便釐清真正原因，但不阻止使用者看到結果。
  console.error("[測驗] 完成頁繪製發生例外，已切換安全畫面。", error);
  // 重新設定背景、外框與文字狀態。
  background(pageBackground);
  noStroke();
  textStyle(NORMAL);
  textAlign(CENTER, CENTER);
  // 使用深色標題確保完成狀態可見。
  const titleSize = Math.max(20, Math.min(42, width * 0.07));
  fill(titleColor);
  textSize(titleSize);
  drawMixedWrappedText("測驗完成！", width / 2, height * 0.28, Math.max(1, width * 0.86), titleSize * 1.25);
  // 使用深色文字確保實際分數可見。
  const scoreSize = Math.max(16, Math.min(32, width * 0.055));
  fill(textColor);
  textSize(scoreSize);
  drawMixedWrappedText(`你答對 ${score} / ${questions.length} 題`, width / 2, height * 0.44, Math.max(1, width * 0.88), scoreSize * 1.25);
  // 明確繪製深色按鈕背景，避免白底白字。
  const buttonWidth = Math.min(240, Math.max(150, width * 0.42));
  const buttonHeight = 54;
  const buttonX = (width - buttonWidth) / 2;
  const buttonY = height * 0.62;
  fill(buttonBackground);
  rect(buttonX, buttonY, buttonWidth, buttonHeight, 10);
  // 深色按鈕上使用白色按鈕文字。
  fill(buttonTextColor);
  const buttonTextSize = Math.max(16, Math.min(24, width * 0.04));
  textSize(buttonTextSize);
  drawMixedWrappedText("重新開始", width / 2, buttonY + buttonHeight / 2, buttonWidth - 20, buttonTextSize * 1.25);
  // fallback 完成後恢復一般樣式與置中對齊。
  textStyle(NORMAL);
  textAlign(CENTER, CENTER);
}

// 依畫布尺寸取得完成頁面的響應式版面。
function getFinishedLayout() {
  // 先依照寬高比例建立完成頁面初始縮放。
  let scale = constrain(Math.min(width / 620, height / 560), 0.2, 1);
  let layout = buildFinishedLayout(scale);

  // 畫面過矮時縮小元件，直到整個完成畫面能安全放入畫布。
  for (let attempt = 0; attempt < 18 && layout.contentBottom > height - 4; attempt += 1) {
    const ratio = Math.max(0.5, (height - 4) / Math.max(layout.contentBottom, 1));
    scale = Math.max(0.13, scale * ratio * 0.96);
    layout = buildFinishedLayout(scale);
  }

  return layout;
}

// 依指定縮放比例建立完成頁面的文字與按鈕座標。
function buildFinishedLayout(scale) {
  // 計算完成頁面左右安全邊界與內容寬度。
  const sideMargin = width < 600 ? Math.max(14, width * 0.08) : Math.min(96, width * 0.12);
  const contentWidth = Math.min(Math.max(1, width - sideMargin * 2), width < 900 ? 820 : 980);

  // 設定完成畫面文字大小與一般樣式行高。
  const titleSize = Math.max(15, Math.round(40 * scale));
  const scoreSize = Math.max(13, Math.round(32 * scale));
  const messageSize = Math.max(10, Math.round(21 * scale));
  const buttonTextSize = Math.max(9, Math.round(19 * scale));
  const titleLineHeight = titleSize * 1.22;
  const scoreLineHeight = scoreSize * 1.22;
  const messageLineHeight = messageSize * 1.28;
  const buttonLineHeight = buttonTextSize * 1.25;

  // 設定完成畫面區塊間距與按鈕尺寸。
  const titleGap = Math.max(4, Math.round(17 * scale));
  const scoreGap = Math.max(4, Math.round(17 * scale));
  const buttonGap = Math.max(6, Math.round(23 * scale));
  const bottomPadding = Math.max(4, Math.round(9 * scale));
  const buttonTextPadding = Math.max(5, Math.round(16 * scale));
  const buttonWidth = Math.min(Math.max(135, Math.round(218 * scale)), Math.max(1, width - 22));
  const buttonHeight = Math.max(29, Math.round(55 * scale));
  const message = score === questions.length
    ? "太厲害了！全部答對！"
    : score >= 3
      ? "表現不錯，繼續加油！"
      : "再練習一下，你一定可以！";

  // 使用同一套混合字型換行規則測量每個文字區塊。
  textStyle(NORMAL);
  textSize(titleSize);
  const titleLines = getMixedWrappedLines("測驗完成！", contentWidth);
  textSize(scoreSize);
  const scoreLines = getMixedWrappedLines(`你答對 ${score} / ${questions.length} 題`, contentWidth);
  textSize(messageSize);
  const messageLines = getMixedWrappedLines(message, contentWidth);

  // 計算整體高度並將內容垂直置中。
  const titleHeight = titleLines.length * titleLineHeight;
  const scoreHeight = scoreLines.length * scoreLineHeight;
  const messageHeight = messageLines.length * messageLineHeight;
  const totalHeight = titleHeight + titleGap + scoreHeight + scoreGap + messageHeight + buttonGap + buttonHeight + bottomPadding;
  const topY = Math.max(3, (height - totalHeight) / 2);
  const titleCenterY = topY + titleHeight / 2;
  const scoreY = topY + titleHeight + titleGap;
  const scoreCenterY = scoreY + scoreHeight / 2;
  const messageY = scoreY + scoreHeight + scoreGap;
  const messageCenterY = messageY + messageHeight / 2;
  const restartButtonY = messageY + messageHeight + buttonGap;

  // 回傳完成頁面繪圖與互動共用的所有資料。
  textStyle(NORMAL);
  return {
    contentWidth,
    titleCenterY,
    scoreCenterY,
    messageCenterY,
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
    messageLineHeight,
    buttonLineHeight,
    buttonTextPadding,
    cornerRadius: Math.max(4, Math.round(11 * scale))
  };
}

// 取得答錯後正確選項目前上下跳動的 Y 座標。
function getAnimatedOptionY(layout, optionIndex) {
  // 先取出該選項的基本位置。
  let optionY = layout.optionYs[optionIndex];

  // 只有答錯時的正確選項會進行上下跳動。
  if (hasAnswered && !isCorrect && optionIndex === questions[currentQuestion].answer) {
    // 以選項間距限制振幅，避免遮蓋其他選項過多。
    const amplitude = Math.min(8, Math.max(1, layout.optionGap * 0.45));
    optionY += sin(frameCount * 0.12) * amplitude;
  }

  return optionY;
}

// 使用混合字型繪製畫面中央的狀態訊息。
function drawCenteredMessage(message, centerY, size, color) {
  // 設定訊息色彩、一般樣式與文字大小。
  fill(color);
  noStroke();
  textStyle(NORMAL);
  textSize(size);
  drawMixedWrappedText(message, width / 2, centerY, Math.max(1, width * 0.9), size * 1.3);
  textStyle(NORMAL);
}

// 判斷點擊位置是否落在指定矩形內。
function isInsideRect(pointX, pointY, rectX, rectY, rectWidth, rectHeight) {
  // 同時檢查水平與垂直範圍。
  return pointX >= rectX && pointX <= rectX + rectWidth && pointY >= rectY && pointY <= rectY + rectHeight;
}

// 處理滑鼠或觸控的一次點擊操作。
function handlePointerClick(pointX, pointY) {
  // 完成頁面只處理重新開始按鈕。
  if (quizFinished) {
    const layout = getFinishedLayout();
    if (isInsideRect(pointX, pointY, layout.restartButtonX, layout.restartButtonY, layout.restartButtonWidth, layout.restartButtonHeight)) {
      restartQuiz();
    }
    return false;
  }

  // 取得和目前畫面相同的響應式版面與題目資料。
  const layout = getQuizLayout();
  const currentData = questions[currentQuestion];
  if (!currentData) {
    return false;
  }

  // 尚未作答時檢查四個選項，並使用動畫後的實際位置判定。
  if (!hasAnswered) {
    for (let index = 0; index < currentData.options.length; index += 1) {
      const optionY = getAnimatedOptionY(layout, index);
      if (isInsideRect(pointX, pointY, layout.optionX, optionY, layout.optionWidth, layout.optionHeight)) {
        selectedAnswer = index;
        hasAnswered = true;
        isCorrect = selectedAnswer === currentData.answer;
        if (isCorrect) {
          score += 1;
        }
        break;
      }
    }
  } else if (isInsideRect(pointX, pointY, layout.nextButtonX, layout.nextButtonY, layout.nextButtonWidth, layout.nextButtonHeight)) {
    // 已作答時只處理下一題或最後一題的查看成績按鈕。
    if (currentQuestion === questions.length - 1) {
      // 第五題按下查看成績後切換完成狀態，下一幀即顯示完成頁。
      quizFinished = true;
      // 只在關鍵狀態切換時輸出診斷訊息。
      console.warn(`[測驗] quizFinished=true，完成五題，成績 ${score}/${questions.length}。`);
    } else {
      currentQuestion += 1;
      selectedAnswer = -1;
      hasAnswered = false;
      isCorrect = false;
    }
  }

  // 阻止瀏覽器預設點擊、捲動與觸控手勢。
  return false;
}

// 處理滑鼠點擊，並避免觸控後的模擬滑鼠事件重複執行。
function mousePressed() {
  // 若剛剛已處理觸控事件，暫時忽略瀏覽器產生的滑鼠事件。
  if (millis() < ignoreMouseUntil) {
    return false;
  }

  // p5.js 滑鼠座標可直接對應全螢幕畫布座標。
  return handlePointerClick(mouseX, mouseY);
}

// 處理手機與平板的第一個觸控點。
function touchStarted() {
  // 只取第一個觸控點，避免多指同時造成重複作答。
  if (touches && touches.length > 0) {
    handlePointerClick(touches[0].x, touches[0].y);
    ignoreMouseUntil = millis() + 700;
  }

  // 阻止瀏覽器捲動、縮放與其他預設觸控手勢。
  return false;
}

// 將測驗狀態全部重設到第一題。
function restartQuiz() {
  // 重新開始時從完整 15 題題庫再次洗牌並抽出五題。
  if (questionBank.length === 15) {
    startNewRound();
  }

  // 重新開始後立即重繪第一題，清除完成頁殘留。
  redraw();
}

// 視窗大小改變或裝置旋轉時重新調整畫布。
function windowResized() {
  // 將畫布調整為最新的瀏覽器視窗尺寸。
  resizeCanvas(windowWidth, windowHeight);

  // 重新設定像素密度，維持不同螢幕上的清晰度。
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));

  // 尺寸變更後立即重繪，讓響應式版面即時更新。
  redraw();
}
