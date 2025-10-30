import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType } from 'docx';
import type { GeneratedTest, TestSolution } from '../types.ts';

export const exportTestToDocx = (
    testData: GeneratedTest, 
    subject: string, 
    timeLimit: number, 
    className: string, 
    mcqRatio: number
): void => {
  const totalScore = 10;
  const mcqScore = (mcqRatio / 100) * totalScore;
  const writtenScore = totalScore - mcqScore;

  const totalMcqCount = (testData.multipleChoiceQuestions?.length || 0) + 
                        (testData.trueFalseQuestions?.length || 0) + 
                        (testData.matchingQuestions?.length || 0) + 
                        (testData.fillBlankQuestions?.length || 0);

  const pointsPerMCQ = totalMcqCount > 0 ? mcqScore / totalMcqCount : 0;
  const pointsPerWritten = (testData.writtenQuestions?.length || 0) > 0 ? writtenScore / (testData.writtenQuestions?.length || 1) : 0;

  const formatScore = (score: number) => {
    return score.toFixed(1).replace(/\.0$/, '');
  };

  const formatPoints = (points: number) => {
    if (points === 0) return '0';
    return parseFloat(points.toFixed(2)).toString();
  }

  let questionCounter = 0;

  // FIX: Explicitly type the children array to allow both Paragraph and Table objects.
  const children: (Paragraph | Table)[] = [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [ new TextRun({ text: "TRƯỜNG TIỂU HỌC ABC", bold: true, size: 24, }), ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [ new TextRun({ text: "ĐỀ KIỂM TRA CUỐI HỌC KỲ", bold: true, size: 28, }), ],
      }),
      new Paragraph({ text: "" }),
      new Paragraph({ children: [ new TextRun({ text: `Môn: ${subject}`, bold: true, size: 24, }), ], }),
      new Paragraph({ children: [ new TextRun({ text: `Thời gian làm bài: ${timeLimit} phút`, size: 24, }), ], }),
      new Paragraph({ children: [ new TextRun({ text: `Họ và tên: ........................................................`, size: 24, }), ], }),
      new Paragraph({ children: [ new TextRun({ text: `Lớp: ${className || '........................................................'}`, size: 24, }), ], }),
      new Paragraph({ text: "" }), // Spacer
      new Paragraph({
        children: [ new TextRun({ text: `I. PHẦN TRẮC NGHIỆM (${formatScore(mcqScore)} điểm)`, bold: true, size: 26, }), ],
        heading: HeadingLevel.HEADING_1,
      }),
  ];

  // True/False Questions
  (testData.trueFalseQuestions || []).forEach(q => {
      questionCounter++;
      children.push(new Paragraph({
          children: [
              new TextRun({ text: `Câu ${questionCounter} (${formatPoints(pointsPerMCQ)} điểm): `, bold: true, size: 24 }),
              new TextRun({ text: q.questionText, size: 24 }),
          ],
      }));
      children.push(new Paragraph({ children: [new TextRun({ text: `  A. Đúng`, size: 24 })] }));
      children.push(new Paragraph({ children: [new TextRun({ text: `  B. Sai`, size: 24 })] }));
      children.push(new Paragraph({ text: "" }));
  });

  // Matching Questions
  (testData.matchingQuestions || []).forEach(q => {
      questionCounter++;
      children.push(new Paragraph({
          children: [
              new TextRun({ text: `Câu ${questionCounter} (${formatPoints(pointsPerMCQ)} điểm): `, bold: true, size: 24 }),
              new TextRun({ text: q.prompt, size: 24 }),
          ],
      }));
      
      const rows: TableRow[] = [];
      q.pairs.forEach((pair, index) => {
          rows.push(new TableRow({
              children: [
                  new TableCell({ children: [new Paragraph({ text: `${index + 1}. ${pair.itemA}` })], width: { size: 45, type: WidthType.PERCENTAGE } }),
                  new TableCell({ children: [new Paragraph({ text: `${String.fromCharCode(65 + index)}. ${pair.itemB}` })], width: { size: 45, type: WidthType.PERCENTAGE } }),
              ]
          }));
      });
      const table = new Table({ rows, width: { size: 90, type: WidthType.PERCENTAGE } });
      children.push(table);
      children.push(new Paragraph({ text: "" }));
  });

  // Fill in the Blank Questions
  (testData.fillBlankQuestions || []).forEach(q => {
      questionCounter++;
      children.push(new Paragraph({
          children: [
              new TextRun({ text: `Câu ${questionCounter} (${formatPoints(pointsPerMCQ)} điểm): `, bold: true, size: 24 }),
              new TextRun({ text: q.questionText, size: 24 }),
          ],
      }));
      children.push(new Paragraph({ text: "" }));
  });

  // Multiple Choice Questions
  (testData.multipleChoiceQuestions || []).forEach(q => {
      questionCounter++;
      children.push(new Paragraph({
          children: [
              new TextRun({ text: `Câu ${questionCounter} (${formatPoints(pointsPerMCQ)} điểm): `, bold: true, size: 24 }),
              new TextRun({ text: q.questionText, size: 24 }),
          ],
      }));
      q.options.forEach((option, optIndex) => {
          children.push(new Paragraph({ children: [new TextRun({ text: `  ${String.fromCharCode(65 + optIndex)}. ${option}`, size: 24 })] }));
      });
      children.push(new Paragraph({ text: "" }));
  });

  // Written Section
  children.push(new Paragraph({
    children: [ new TextRun({ text: `II. PHẦN TỰ LUẬN (${formatScore(writtenScore)} điểm)`, bold: true, size: 26, }), ],
    heading: HeadingLevel.HEADING_1,
  }));
  (testData.writtenQuestions || []).forEach((q, index) => {
      children.push(new Paragraph({
          children: [
              new TextRun({ text: `Câu ${totalMcqCount + index + 1} (${formatPoints(pointsPerWritten)} điểm): `, bold: true, size: 24 }),
              new TextRun({ text: q.questionText, size: 24 }),
          ],
      }));
      children.push(new Paragraph({ text: "" }), new Paragraph({ text: "" }), new Paragraph({ text: "" }));
  });

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  Packer.toBlob(doc).then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `de-kiem-tra-${subject.toLowerCase().replace(/\s+/g, '-')}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
};

export const exportTestWithSolutionToDocx = (
    testData: GeneratedTest,
    solutionData: TestSolution,
    subject: string, 
    timeLimit: number, 
    className: string, 
    mcqRatio: number
): void => {
  const totalScore = 10;
  const mcqScore = (mcqRatio / 100) * totalScore;
  const writtenScore = totalScore - mcqScore;

  const totalMcqCount = (testData.multipleChoiceQuestions?.length || 0) + 
                        (testData.trueFalseQuestions?.length || 0) + 
                        (testData.matchingQuestions?.length || 0) + 
                        (testData.fillBlankQuestions?.length || 0);

  const pointsPerMCQ = totalMcqCount > 0 ? mcqScore / totalMcqCount : 0;
  const pointsPerWritten = (testData.writtenQuestions?.length || 0) > 0 ? writtenScore / (testData.writtenQuestions?.length || 1) : 0;

  const formatScore = (score: number) => score.toFixed(1).replace(/\.0$/, '');
  const formatPoints = (points: number) => parseFloat(points.toFixed(2)).toString();

  let questionCounter = 0;

  // --- Start of Test Content Generation ---
  const children: (Paragraph | Table)[] = [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: "ĐỀ KIỂM TRA CUỐI HỌC KỲ", bold: true, size: 28, })]}),
      new Paragraph({ text: "" }),
      new Paragraph({ children: [ new TextRun({ text: `Môn: ${subject}`, bold: true, size: 24 })]}),
      new Paragraph({ children: [ new TextRun({ text: `Thời gian làm bài: ${timeLimit} phút`, size: 24 })]}),
      new Paragraph({ children: [ new TextRun({ text: `Lớp: ${className || '..............................'}`, size: 24 })]}),
      new Paragraph({ text: "" }),
      new Paragraph({ children: [ new TextRun({ text: `I. PHẦN TRẮC NGHIỆM (${formatScore(mcqScore)} điểm)`, bold: true, size: 26, })], heading: HeadingLevel.HEADING_1}),
  ];
  (testData.trueFalseQuestions || []).forEach(q => { questionCounter++; children.push(new Paragraph({children: [new TextRun({ text: `Câu ${questionCounter} (${formatPoints(pointsPerMCQ)} điểm): `, bold: true, size: 24 }), new TextRun({ text: q.questionText, size: 24 })]})); children.push(new Paragraph({ children: [new TextRun({ text: `  A. Đúng`, size: 24 })]})); children.push(new Paragraph({ children: [new TextRun({ text: `  B. Sai`, size: 24 })]})); children.push(new Paragraph({ text: "" })); });
  (testData.matchingQuestions || []).forEach(q => { questionCounter++; children.push(new Paragraph({children: [new TextRun({ text: `Câu ${questionCounter} (${formatPoints(pointsPerMCQ)} điểm): `, bold: true, size: 24 }), new TextRun({ text: q.prompt, size: 24 })]})); const rows: TableRow[] = []; q.pairs.forEach((pair, index) => { rows.push(new TableRow({ children: [ new TableCell({ children: [new Paragraph({ text: `${index + 1}. ${pair.itemA}` })], width: { size: 45, type: WidthType.PERCENTAGE } }), new TableCell({ children: [new Paragraph({ text: `${String.fromCharCode(65 + index)}. ${pair.itemB}` })], width: { size: 45, type: WidthType.PERCENTAGE } }), ]})); }); children.push(new Table({ rows, width: { size: 90, type: WidthType.PERCENTAGE } })); children.push(new Paragraph({ text: "" })); });
  (testData.fillBlankQuestions || []).forEach(q => { questionCounter++; children.push(new Paragraph({children: [new TextRun({ text: `Câu ${questionCounter} (${formatPoints(pointsPerMCQ)} điểm): `, bold: true, size: 24 }), new TextRun({ text: q.questionText, size: 24 })]})); children.push(new Paragraph({ text: "" })); });
  (testData.multipleChoiceQuestions || []).forEach(q => { questionCounter++; children.push(new Paragraph({children: [new TextRun({ text: `Câu ${questionCounter} (${formatPoints(pointsPerMCQ)} điểm): `, bold: true, size: 24 }), new TextRun({ text: q.questionText, size: 24 })]})); q.options.forEach((option, optIndex) => { children.push(new Paragraph({ children: [new TextRun({ text: `  ${String.fromCharCode(65 + optIndex)}. ${option}`, size: 24 })]})); }); children.push(new Paragraph({ text: "" })); });
  children.push(new Paragraph({ children: [ new TextRun({ text: `II. PHẦN TỰ LUẬN (${formatScore(writtenScore)} điểm)`, bold: true, size: 26, })], heading: HeadingLevel.HEADING_1}));
  (testData.writtenQuestions || []).forEach((q, index) => { children.push(new Paragraph({children: [new TextRun({ text: `Câu ${totalMcqCount + index + 1} (${formatPoints(pointsPerWritten)} điểm): `, bold: true, size: 24 }), new TextRun({ text: q.questionText, size: 24 })]})); children.push(new Paragraph({ text: "" }), new Paragraph({ text: "" }), new Paragraph({ text: "" })); });
  // --- End of Test Content Generation ---

  // --- Start of Solution Content Generation ---
  children.push(new Paragraph({ pageBreakBefore: true }));
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: "ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM", bold: true, size: 28, })]}));
  children.push(new Paragraph({ text: "" }));
  children.push(new Paragraph({ children: [ new TextRun({ text: `I. PHẦN TRẮC NGHIỆM`, bold: true, size: 26, })], heading: HeadingLevel.HEADING_1}));
  
  let answerCounter = 0;
  (testData.trueFalseQuestions || []).forEach(q => { answerCounter++; children.push(new Paragraph({ children: [new TextRun({ text: `Câu ${answerCounter}: ${q.correctAnswer ? 'Đúng' : 'Sai'}`, size: 24 })]})); });
  (testData.matchingQuestions || []).forEach(q => { answerCounter++; const answers = q.pairs.map(p => `${p.itemA} - ${p.itemB}`).join('; '); children.push(new Paragraph({ children: [new TextRun({ text: `Câu ${answerCounter}: ${answers}`, size: 24 })]})); });
  (testData.fillBlankQuestions || []).forEach(q => { answerCounter++; children.push(new Paragraph({ children: [new TextRun({ text: `Câu ${answerCounter}: ${q.correctAnswer}`, size: 24 })]})); });
  (testData.multipleChoiceQuestions || []).forEach(q => { answerCounter++; const correctOpt = String.fromCharCode(65 + q.options.indexOf(q.correctAnswer)); children.push(new Paragraph({ children: [new TextRun({ text: `Câu ${answerCounter}: ${correctOpt}`, size: 24 })]})); });

  children.push(new Paragraph({ text: "" }));
  children.push(new Paragraph({ children: [ new TextRun({ text: `II. PHẦN TỰ LUẬN - HƯỚNG DẪN CHẤM`, bold: true, size: 26, })], heading: HeadingLevel.HEADING_1}));
  
  (solutionData.writtenGradingGuides || []).forEach((guide, index) => {
      children.push(new Paragraph({ children: [ new TextRun({ text: `Câu ${answerCounter + index + 1}: `, bold: true, size: 24 }), new TextRun({ text: guide.questionText, size: 24, bold: true, italics: true })]}));
      guide.detailedGuide.split('\n').forEach(line => {
           // FIX: Corrected property 'indentation' to 'indent' for paragraph options.
           children.push(new Paragraph({ children: [new TextRun({ text: line, size: 24 })], indent: { left: 400 } }));
      });
      children.push(new Paragraph({ text: "" }));
  });
  // --- End of Solution Content Generation ---

  const doc = new Document({ sections: [{ properties: {}, children }], });

  Packer.toBlob(doc).then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dap-an-de-kiem-tra-${subject.toLowerCase().replace(/\s+/g, '-')}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
};
