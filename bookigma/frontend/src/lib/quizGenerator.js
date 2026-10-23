/**
 * Bộ sinh câu hỏi kiểm tra đọc hiểu tự động dựa trên nội dung trang sách vừa đọc.
 * Giúp người đọc ôn tập kiến thức, tăng độ tập trung và chỉ ghi nhận tiến độ khi hiểu bài.
 */

/** Tách văn bản thành các câu hoàn chỉnh */
function extractSentences(paragraphs) {
  if (!paragraphs || !paragraphs.length) return [];
  const text = paragraphs.join(' ');
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 25 && s.length <= 160);
}

/** Trích xuất từ khóa hoặc cụm từ trọng tâm */
function findKeywords(sentence) {
  const words = sentence
    .replace(/[.,/#!$%^&*;:{}=\-_`~()""'']/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 3);
  return words;
}

/**
 * Sinh câu hỏi trắc nghiệm cho trang hiện tại
 * @param {Array<string>} paragraphs - Danh sách đoạn văn trong trang vừa đọc
 * @param {string} chapterTitle - Tiêu đề chương
 * @param {number} pageNumber - Số trang
 */
export function generatePageQuiz(paragraphs, chapterTitle = '', pageNumber = 1) {
  const sentences = extractSentences(paragraphs);

  // Fallback nếu trang quá ngắn hoặc không có câu phù hợp
  if (sentences.length === 0) {
    const fallbackText = (paragraphs[0] || '').slice(0, 100);
    return {
      question: `Bạn đã hoàn thành trang ${pageNumber} của "${chapterTitle}". Hãy xác nhận bạn đã đọc kỹ nội dung:`,
      options: [
        'Tôi đã đọc kỹ và sẵn sàng tiếp tục trang tiếp theo.',
        'Tôi chỉ lướt qua chưa đọc nội dung.',
        'Nội dung trang này bị trống.',
        'Tôi muốn bỏ qua cuốn sách này.',
      ],
      correctIndex: 0,
      hint: fallbackText || 'Hãy đọc lại nội dung trang trước khi chuyển trang.',
    };
  }

  // Chọn 1 câu có ý nghĩa trong đoạn văn để làm nguồn câu hỏi
  const targetSentence = sentences[Math.min(sentences.length - 1, Math.floor(sentences.length / 2))];
  const otherSentences = sentences.filter((s) => s !== targetSentence);

  // Loại 1: Điền từ vào chỗ trống (Fill in the blank)
  const words = findKeywords(targetSentence);
  if (words.length >= 4) {
    // Chọn từ khóa ở giữa câu để che đi
    const targetWordIndex = Math.floor(words.length / 2);
    const targetWord = words[targetWordIndex];

    const maskedSentence = targetSentence.replace(
      new RegExp(`\\b${targetWord}\\b`, 'i'),
      '【 ... 】'
    );

    // Tạo các từ gây nhiễu
    const distractorWords = [
      'không gian',
      'thời gian',
      'cảm xúc',
      'suy nghĩ',
      'hành động',
      'con đường',
      'mục tiêu',
      'tâm trí',
    ].filter((w) => w.toLowerCase() !== targetWord.toLowerCase());

    const wrongOptions = distractorWords.slice(0, 3);
    const allOptions = [targetWord, ...wrongOptions];

    // Trộn ngẫu nhiên các lựa chọn
    const shuffled = allOptions
      .map((val) => ({ val, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map((obj) => obj.val);

    const correctIndex = shuffled.indexOf(targetWord);

    return {
      question: `Dựa vào trang vừa đọc, chọn từ thích hợp để hoàn thiện câu sau:\n"${maskedSentence}"`,
      options: shuffled,
      correctIndex,
      hint: `Gợi ý: Tìm lại câu trong trang: "${targetSentence.slice(0, 80)}..."`,
    };
  }

  // Loại 2: Nhận định đúng theo nội dung trang sách
  const wrongSentences = [
    'Tác giả hoàn toàn phủ nhận và phản bác quan điểm nêu trong trang này.',
    'Nhân vật chính quyết định từ bỏ mọi dự định và quay về vạch xuất phát.',
    'Không có bất kỳ sự kiện hay cảm xúc nào được nhắc đến ở trang này.',
  ];

  const candidateOptions = [targetSentence, ...wrongSentences];
  const shuffled = candidateOptions
    .map((val) => ({ val, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map((obj) => obj.val);

  const correctIndex = shuffled.indexOf(targetSentence);

  return {
    question: `Ý nào dưới đây được đề cập CHÍNH XÁC trong trang vừa đọc?`,
    options: shuffled,
    correctIndex,
    hint: `Gợi ý: Đoạn văn có viết: "${targetSentence.slice(0, 90)}..."`,
  };
}

