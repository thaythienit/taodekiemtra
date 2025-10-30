import { GoogleGenAI, Type } from '@google/genai';
import type { FormData, GeneratedTest, TestMatrix, TestSolution } from '../types.ts';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const matrixSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            topic: { type: Type.STRING },
            mcq: {
                type: Type.OBJECT,
                properties: {
                    recognition: { type: Type.NUMBER },
                    comprehension: { type: Type.NUMBER },
                    application: { type: Type.NUMBER },
                },
                required: ['recognition', 'comprehension', 'application'],
            },
            written: {
                type: Type.OBJECT,
                properties: {
                    recognition: { type: Type.NUMBER },
                    comprehension: { type: Type.NUMBER },
                    application: { type: Type.NUMBER },
                },
                required: ['recognition', 'comprehension', 'application'],
            },
        },
        required: ['topic', 'mcq', 'written'],
    },
};

const testSchema = {
  type: Type.OBJECT,
  properties: {
    multipleChoiceQuestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionText: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctAnswer: { type: Type.STRING },
          cognitiveLevel: { type: Type.STRING, enum: ['Nhận biết', 'Thông hiểu', 'Vận dụng'] },
        },
        required: ['questionText', 'options', 'correctAnswer', 'cognitiveLevel'],
      },
    },
    trueFalseQuestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionText: { type: Type.STRING },
          correctAnswer: { type: Type.BOOLEAN },
          cognitiveLevel: { type: Type.STRING, enum: ['Nhận biết', 'Thông hiểu', 'Vận dụng'] },
        },
        required: ['questionText', 'correctAnswer', 'cognitiveLevel'],
      },
    },
    matchingQuestions: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                prompt: { type: Type.STRING },
                pairs: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            itemA: { type: Type.STRING },
                            itemB: { type: Type.STRING },
                        },
                        required: ['itemA', 'itemB'],
                    }
                },
                cognitiveLevel: { type: Type.STRING, enum: ['Nhận biết', 'Thông hiểu', 'Vận dụng'] },
            },
            required: ['prompt', 'pairs', 'cognitiveLevel'],
        },
    },
    fillBlankQuestions: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                questionText: { type: Type.STRING, description: "Câu hỏi có chứa '___' để biểu thị chỗ trống cần điền." },
                correctAnswer: { type: Type.STRING },
                cognitiveLevel: { type: Type.STRING, enum: ['Nhận biết', 'Thông hiểu', 'Vận dụng'] },
            },
            required: ['questionText', 'correctAnswer', 'cognitiveLevel'],
        },
    },
    writtenQuestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionText: { type: Type.STRING },
          suggestedAnswer: { type: Type.STRING },
          cognitiveLevel: { type: Type.STRING, enum: ['Nhận biết', 'Thông hiểu', 'Vận dụng'] },
        },
        required: ['questionText', 'suggestedAnswer', 'cognitiveLevel'],
      },
    },
  },
  required: ['writtenQuestions'],
};

const solutionSchema = {
    type: Type.OBJECT,
    properties: {
        writtenGradingGuides: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    questionText: { type: Type.STRING },
                    detailedGuide: { type: Type.STRING, description: "Hướng dẫn chấm chi tiết, bao gồm cả phân bổ điểm cho từng ý nếu có." },
                },
                required: ['questionText', 'detailedGuide'],
            },
        },
    },
    required: ['writtenGradingGuides'],
};

// Helper function to create multimodal content
const createMultimodalContent = (prompt: string, images: string[]) => {
    const contentParts: any[] = [{ text: prompt }];
    
    for (const image of images) {
        contentParts.push({
            inlineData: {
                mimeType: 'image/jpeg',
                data: image,
            }
        });
    }
    return contentParts;
};


export const generateMatrixFromGemini = async (formData: FormData): Promise<TestMatrix> => {
    const topicsWithPages = formData.lessonTopics
        .map(t => `- "${t.name}" (phạm vi từ trang ${t.startPage} đến trang ${t.endPage}).`)
        .join('\n');
    
    const prompt = `
    Bạn là chuyên gia thiết kế chương trình giảng dạy cho trường tiểu học Việt Nam.
    Nhiệm vụ của bạn là tạo một ma trận đề kiểm tra (ma trận đề) chi tiết dựa trên thông tin sau.

    Môn học: ${formData.subject}
    
    Bối cảnh: Nội dung được trích từ một file sách giáo khoa, có thể bao gồm cả văn bản và hình ảnh. Bạn cần phân tích cả hai để hiểu toàn bộ ngữ cảnh.
    
    Nội dung chính từ sách giáo khoa để phân tích:
    ---
    (Văn bản)
    ${formData.fileContent}
    ---
    (Các hình ảnh liên quan cũng được cung cấp. Hãy phân tích chúng cùng với văn bản.)

    Các bài học cần tạo đề và phạm vi trang tương ứng trong tài liệu:
    ${topicsWithPages}

    Cấu trúc đề (tổng cộng):
    - Tổng số câu trắc nghiệm: ${formData.mcqCount}
    - Tổng số câu tự luận: ${formData.writtenCount}
    - Tỉ lệ điểm trắc nghiệm: ${formData.mcqRatio}%
    - Tỉ lệ điểm tự luận: ${formData.writtenRatio}%
    
    Phân bổ câu hỏi theo 3 mức độ nhận thức (tính trên tổng số):
    - Mức 1 (Nhận biết): ${formData.recognitionRatio}%
    - Mức 2 (Thông hiểu): ${formData.comprehensionRatio}%
    - Mức 3 (Vận dụng): ${formData.applicationRatio}%

    Yêu cầu:
    1.  Phân tích danh sách "Các bài học cần tạo đề". Tạo một hàng trong ma trận cho MỖI bài học được liệt kê.
    2.  Tên của mỗi bài học trong cột 'topic' phải khớp chính xác với tên được cung cấp.
    3.  Phân bổ TỔNG SỐ câu hỏi trắc nghiệm và tự luận một cách hợp lý vào các hàng (các bài học) này.
    4.  Với mỗi bài học, hãy tiếp tục phân bổ số câu hỏi theo 3 mức độ nhận thức (Nhận biết, Thông hiểu, Vận dụng), dựa trên nội dung trong PHẠM VI TRANG đã chỉ định.
    5.  Tổng số câu hỏi trong toàn bộ ma trận (tất cả các hàng cộng lại) phải khớp chính xác với tổng số câu đã cho. Sự phân bổ tổng thể theo mức độ nhận thức phải gần đúng nhất với tỷ lệ phần trăm đã cho.
    6.  Chỉ trả về một mảng JSON tuân thủ đúng schema. Không thêm bất kỳ văn bản giải thích nào.
  `;
  const multimodalContents = createMultimodalContent(prompt, formData.fileImages || []);
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: multimodalContents },
      config: {
        responseMimeType: 'application/json',
        responseSchema: matrixSchema,
        temperature: 0.2,
      },
    });
    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as TestMatrix;
  } catch (error) {
    console.error("Lỗi khi tạo ma trận đề:", error);
    throw new Error("Không thể tạo ma trận đề. Vui lòng kiểm tra lại thông tin đầu vào và nội dung file.");
  }
};

const getSelectedMcqTypes = (mcqTypes: FormData['mcqTypes']) => {
    return Object.entries(mcqTypes)
        .filter(([, isSelected]) => isSelected)
        .map(([key]) => {
            if (key === 'multipleChoice') return 'Nhiều lựa chọn (A, B, C, D)';
            if (key === 'trueFalse') return 'Đúng - Sai';
            if (key === 'matching') return 'Ghép đôi';
            if (key === 'fillBlank') return 'Điền khuyết';
            return '';
        })
        .join(', ');
};

export const generateTestFromGemini = async (formData: FormData, matrix: TestMatrix): Promise<GeneratedTest> => {
  const selectedTypes = getSelectedMcqTypes(formData.mcqTypes);
  const topicsWithPages = formData.lessonTopics
      .map(t => `- "${t.name}" (dựa trên nội dung từ trang ${t.startPage} đến trang ${t.endPage}).`)
      .join('\n');

  const prompt = `
    Bạn là một trợ lý chuyên tạo đề kiểm tra cho học sinh tiểu học tại Việt Nam, tuân thủ nghiêm ngặt theo Thông tư 27/2020/TT-BGDĐT.

    Hãy tạo một đề kiểm tra hoàn chỉnh dựa trên MA TRẬN ĐỀ sau đây:
    ---
    ${JSON.stringify(matrix, null, 2)}
    ---

    Môn học: ${formData.subject}
    Các bài học trọng tâm và phạm vi trang tương ứng:
    ${topicsWithPages}
    
    Tỉ lệ điểm: ${formData.mcqRatio}% Trắc nghiệm, ${formData.writtenRatio}% Tự luận.
    Nội dung tham khảo từ sách giáo khoa (bao gồm văn bản và hình ảnh):
    ---
    (Văn bản)
    ${formData.fileContent}
    ---
    (Các hình ảnh liên quan cũng được cung cấp trong yêu cầu này. Hãy sử dụng chúng làm ngữ cảnh khi cần thiết, đặc biệt cho các câu hỏi yêu cầu phân tích hình ảnh.)
    
    Yêu cầu quan trọng:
    -   Tổng số câu trắc nghiệm cần tạo là ${formData.mcqCount}. Hãy phân bổ số lượng này một cách hợp lý vào các dạng câu hỏi sau đây đã được chọn: ${selectedTypes}.
    -   Tạo ra số lượng câu hỏi chính xác cho mỗi chủ đề, mỗi loại (trắc nghiệm/tự luận) và mỗi mức độ nhận thức như đã quy định trong ma trận.
    -   Nội dung câu hỏi phải liên quan mật thiết đến "topic" tương ứng trong ma trận và dựa trên kiến thức của bài học trong tài liệu đã cho, ĐẶC BIỆT chú ý đến PHẠM VI TRANG đã được chỉ định cho mỗi bài học.
    -   Nếu một câu hỏi liên quan đến một hình ảnh, hãy mô tả hình ảnh đó một cách ngắn gọn trong câu hỏi nếu cần.
    -   Ngôn ngữ phải phù hợp với học sinh tiểu học.
    -   Đối với dạng "Nhiều lựa chọn": phải có 4 lựa chọn và chỉ có một đáp án đúng.
    -   Đối với dạng "Đúng - Sai": câu trả lời đúng phải là true (Đúng) hoặc false (Sai).
    -   Đối với dạng "Ghép đôi": tạo một câu dẫn (prompt) và một bộ các cặp (pairs) tương ứng, thường từ 3-5 cặp.
    -   Đối với dạng "Điền khuyết": câu hỏi (questionText) phải chứa một ký tự gạch dưới dài '___' để biểu thị chỗ trống cần điền.
    -   Câu tự luận cần có câu trả lời mẫu hoặc gợi ý chấm điểm.

    Vui lòng trả về kết quả dưới dạng JSON theo đúng cấu trúc đã định nghĩa. Nếu một loại câu hỏi không được yêu cầu hoặc không có câu nào được tạo cho loại đó, hãy trả về một mảng rỗng cho loại đó.
  `;

  const multimodalContents = createMultimodalContent(prompt, formData.fileImages || []);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: multimodalContents },
      config: {
        responseMimeType: 'application/json',
        responseSchema: testSchema,
        temperature: 0.7,
      },
    });

    const jsonText = response.text.trim();
    const parsedData = JSON.parse(jsonText);
    
    const finalData: GeneratedTest = {
        multipleChoiceQuestions: parsedData.multipleChoiceQuestions || [],
        trueFalseQuestions: parsedData.trueFalseQuestions || [],
        matchingQuestions: parsedData.matchingQuestions || [],
        fillBlankQuestions: parsedData.fillBlankQuestions || [],
        writtenQuestions: parsedData.writtenQuestions || [],
    };
    
    if (!finalData.writtenQuestions) {
        throw new Error("Phản hồi từ AI không có cấu trúc như mong đợi (thiếu câu hỏi tự luận).");
    }

    return finalData;

  } catch (error) {
    console.error("Lỗi khi gọi Gemini API:", error);
    throw new Error("Không thể tạo đề kiểm tra. Vui lòng thử lại sau.");
  }
};

export const generateSolutionFromGemini = async (testData: GeneratedTest, formData: FormData): Promise<TestSolution> => {
    const writtenQuestionsText = testData.writtenQuestions.map((q, index) => `Câu ${index + 1}: ${q.questionText}`).join('\n');
    const writtenScore = (formData.writtenRatio / 100 * 10);
    const pointsPerWritten = testData.writtenQuestions.length > 0 ? writtenScore / testData.writtenQuestions.length : 0;

    const prompt = `
    Bạn là một chuyên gia giáo dục tiểu học, nhiệm vụ của bạn là tạo ra một hướng dẫn chấm điểm chi tiết và công bằng cho các câu hỏi tự luận của một đề kiểm tra.

    Môn học: ${formData.subject}
    Tổng điểm cho phần tự luận: ${writtenScore} điểm.
    Số câu tự luận: ${testData.writtenQuestions.length}
    Điểm trung bình mỗi câu: ${pointsPerWritten.toFixed(2)} điểm.

    Đây là các câu hỏi tự luận cần tạo hướng dẫn chấm:
    ---
    ${writtenQuestionsText}
    ---
    
    Yêu cầu:
    1.  Với MỖI câu hỏi tự luận ở trên, hãy cung cấp một "hướng dẫn chấm chi tiết".
    2.  Hướng dẫn này cần nêu rõ các ý chính mà học sinh cần trả lời để đạt điểm tối đa.
    3.  Phân bổ điểm một cách hợp lý cho từng ý hoặc từng phần của câu trả lời. Tổng điểm cho mỗi câu hỏi phải gần đúng với điểm trung bình đã tính ở trên.
    4.  Đảm bảo rằng 'questionText' trong output JSON phải khớp chính xác với câu hỏi đã cho.
    5.  Ngôn ngữ phải rõ ràng, dễ hiểu cho giáo viên chấm bài.

    Chỉ trả về một đối tượng JSON tuân thủ đúng schema đã cho.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: solutionSchema,
                temperature: 0.3,
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as TestSolution;
    } catch (error) {
        console.error("Lỗi khi tạo đáp án và hướng dẫn chấm:", error);
        throw new Error("Không thể tạo hướng dẫn chấm. Vui lòng thử lại.");
    }
};
