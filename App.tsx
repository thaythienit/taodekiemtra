
import React, { useState, useCallback, useEffect } from 'react';
import * as pdfjs from 'pdfjs-dist';
import type { FormData, GeneratedTest, TestMatrix, SavedTest, TestSolution } from './types.ts';
import Header from './components/Header.tsx';
import FormSection from './components/FormSection.tsx';
import GeneratedTestComponent from './components/GeneratedTest.tsx';
import TestMatrixComponent from './components/TestMatrixComponent.tsx';
import SavedTestsList from './components/SavedTestsList.tsx';
import SolutionComponent from './components/SolutionComponent.tsx';
import { generateMatrixFromGemini, generateTestFromGemini, generateSolutionFromGemini } from './services/geminiService.ts';
import { exportTestToDocx, exportTestWithSolutionToDocx } from './services/docxService.ts';
import ProgressBar from './components/ProgressBar.tsx';


// Configure the PDF.js worker from a CDN
pdfjs.GlobalWorkerOptions.workerSrc = `https://aistudiocdn.com/pdfjs-dist@^4.4.183/build/pdf.worker.mjs`;

const LOCAL_STORAGE_KEY = 'savedElementaryTests';

const App: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    subject: 'Toán',
    className: '',
    mcqRatio: 70,
    writtenRatio: 30,
    mcqCount: 7,
    writtenCount: 3,
    recognitionRatio: 30,
    comprehensionRatio: 40,
    applicationRatio: 30,
    fileContent: '', // Now used as a placeholder/flag
    fileImages: [],    // No longer used to store all images
    lessonTopics: [{ id: Date.now().toString(), name: '', startPage: 1, endPage: 1 }],
    timeLimit: 40,
    mcqTypes: {
      multipleChoice: true,
      trueFalse: false,
      matching: false,
      fillBlank: false,
    },
  });

  const [perPageContent, setPerPageContent] = useState<{ text: string; image: string }[]>([]);
  
  const [testMatrix, setTestMatrix] = useState<TestMatrix | null>(null);
  const [generatedTest, setGeneratedTest] = useState<GeneratedTest | null>(null);
  const [solutionData, setSolutionData] = useState<TestSolution | null>(null);
  const [isMatrixLoading, setIsMatrixLoading] = useState<boolean>(false);
  const [isTestLoading, setIsTestLoading] = useState<boolean>(false);
  const [isSolutionLoading, setIsSolutionLoading] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [savedTests, setSavedTests] = useState<SavedTest[]>([]);

  useEffect(() => {
    try {
      const savedTestsJson = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedTestsJson) {
        setSavedTests(JSON.parse(savedTestsJson));
      }
    } catch (error) {
      console.error("Không thể tải các đề đã lưu từ local storage:", error);
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (generatedTest) {
        event.preventDefault();
        event.returnValue = 'Bạn có chắc chắn muốn rời đi? Các thay đổi chưa được lưu sẽ bị mất.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [generatedTest]);

  useEffect(() => {
    let interval: number;
    if (isMatrixLoading || isTestLoading) {
      setLoadingProgress(0);
      let currentProgress = 0;
      interval = window.setInterval(() => {
        currentProgress += Math.random() * 10;
        if (currentProgress > 95) {
          currentProgress = 95;
        }
        setLoadingProgress(currentProgress);
      }, 500);
    }
    return () => {
      if(interval) clearInterval(interval);
    };
  }, [isMatrixLoading, isTestLoading]);


  const updateSavedTests = (newSavedTests: SavedTest[]) => {
    setSavedTests(newSavedTests);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newSavedTests));
    } catch (error) {
      console.error("Không thể lưu đề vào local storage:", error);
      if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.message.includes('exceeded the quota'))) {
        setError("Lỗi: Không đủ dung lượng lưu trữ trên trình duyệt để lưu đề này. Vui lòng xóa bớt các đề cũ.");
      } else {
        setError("Đã xảy ra lỗi khi lưu đề.");
      }
    }
  };


  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    setUploadedFileName(null);
    setPerPageContent([]);
    setFormData(prev => ({ ...prev, fileContent: '', fileImages: [] }));
    setError(null);
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Lỗi: Vui lòng chỉ tải lên file có định dạng .pdf.');
        e.target.value = '';
        return;
      }
      
      setUploadedFileName(file.name);

      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        
        const textItems: string[] = [];
        const imageItems: string[] = [];
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          
          const textContent = await page.getTextContent();
          
          let lastY, text = '';
          textContent.items.sort((a, b) => {
              if ('transform' in a && 'transform' in b) {
                  if (a.transform[5] > b.transform[5]) return -1;
                  if (a.transform[5] < b.transform[5]) return 1;
                  if (a.transform[4] < b.transform[4]) return -1;
                  if (a.transform[4] > b.transform[4]) return 1;
              }
              return 0;
          });

          for (let item of textContent.items) {
              if ('str' in item) {
                  if (lastY !== undefined && lastY !== item.transform[5]) {
                      text += '\n';
                  }
                  text += item.str;
                  if (lastY !== undefined && lastY === item.transform[5]) {
                    text += ' ';
                  }
                  lastY = item.transform[5];
              }
          }
          textItems.push(text);

          if (context) {
            const viewport = page.getViewport({ scale: 1.5 });
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport: viewport, canvas } as any).promise;
            const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            imageItems.push(imageDataUrl.split(',')[1]);
          }
        }
        
        canvas.remove();

        const pageContents = textItems.map((text, index) => ({
            text,
            image: imageItems[index],
        }));
        setPerPageContent(pageContents);

        // Update formData for validation purposes without storing large data
        setFormData(prev => ({ ...prev, fileContent: file.name, fileImages: [] }));
        
        if (pageContents.length === 0 || pageContents.every(p => p.text.trim() === '' && !p.image)) {
          setError("Lỗi: Không tìm thấy nội dung văn bản hoặc hình ảnh nào trong file PDF.");
        } else {
          setError(null);
        }

      } catch (err) {
        console.error("Lỗi khi xử lý PDF:", err);
        setError('Không thể đọc được file PDF. File có thể bị hỏng hoặc không tương thích.');
        setUploadedFileName(null);
      }
    }
  };

  const handleGenerateMatrix = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMatrixLoading(true);
    setError(null);
    setTestMatrix(null);
    setGeneratedTest(null);
    setSolutionData(null);

    const totalRatio = formData.recognitionRatio + formData.comprehensionRatio + formData.applicationRatio;
    if (totalRatio !== 100) {
      setError('Tổng tỉ lệ các mức độ nhận thức phải bằng 100%.');
      setIsMatrixLoading(false);
      return;
    }

    const relevantPages = new Set<number>();
    formData.lessonTopics.forEach(topic => {
        if (topic.startPage && topic.endPage && topic.endPage >= topic.startPage) {
            for (let i = topic.startPage; i <= topic.endPage; i++) {
                relevantPages.add(i);
            }
        }
    });

    if (relevantPages.size === 0) {
        setError('Vui lòng nhập số trang hợp lệ cho ít nhất một bài học.');
        setIsMatrixLoading(false);
        return;
    }

    let relevantText = `Bối cảnh: Nội dung sau được trích xuất từ các trang có liên quan trong tài liệu học liệu.\n`;
    const relevantImages: string[] = [];
    const sortedPages = Array.from(relevantPages).sort((a, b) => a - b);

    for (const pageNum of sortedPages) {
        const pageIndex = pageNum - 1;
        if (pageIndex >= 0 && pageIndex < perPageContent.length) {
            const content = perPageContent[pageIndex];
            relevantText += `\n--- NỘI DUNG TRANG ${pageNum} ---\n${content.text}`;
            if (content.image) {
                relevantImages.push(content.image);
            }
        }
    }

    if (relevantText.trim() === '') {
        setError('Không tìm thấy nội dung cho các trang đã chọn. Vui lòng kiểm tra lại số trang.');
        setIsMatrixLoading(false);
        return;
    }
    
    const payload: FormData = {
        ...formData,
        fileContent: relevantText,
        fileImages: relevantImages,
    };
    
    try {
      const matrixData = await generateMatrixFromGemini(payload);
      setTestMatrix(matrixData);
      setLoadingProgress(100);
    } catch (err: unknown) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('Đã xảy ra lỗi không xác định khi tạo ma trận.');
        }
    } finally {
      setIsMatrixLoading(false);
    }
  }, [formData, perPageContent]);

  const handleGenerateTest = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testMatrix) {
        setError("Vui lòng tạo ma trận đề trước khi tạo đề kiểm tra.");
        return;
    }
    setIsTestLoading(true);
    setError(null);
    setGeneratedTest(null);
    setSolutionData(null);
    
    const relevantPages = new Set<number>();
    formData.lessonTopics.forEach(topic => {
        if (topic.startPage && topic.endPage && topic.endPage >= topic.startPage) {
            for (let i = topic.startPage; i <= topic.endPage; i++) {
                relevantPages.add(i);
            }
        }
    });

    let relevantText = `Bối cảnh: Nội dung sau được trích xuất từ các trang có liên quan trong tài liệu học liệu.\n`;
    const relevantImages: string[] = [];
    const sortedPages = Array.from(relevantPages).sort((a, b) => a - b);

    for (const pageNum of sortedPages) {
        const pageIndex = pageNum - 1;
        if (pageIndex >= 0 && pageIndex < perPageContent.length) {
            const content = perPageContent[pageIndex];
            relevantText += `\n--- NỘI DUNG TRANG ${pageNum} ---\n${content.text}`;
            if (content.image) {
                relevantImages.push(content.image);
            }
        }
    }

    const payload: FormData = {
        ...formData,
        fileContent: relevantText,
        fileImages: relevantImages,
    };

    try {
      const testData = await generateTestFromGemini(payload, testMatrix);
      setGeneratedTest(testData);
      setLoadingProgress(100);
    } catch (err: unknown) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('Đã xảy ra lỗi không xác định khi tạo đề.');
        }
    } finally {
      setIsTestLoading(false);
    }
  }, [formData, testMatrix, perPageContent]);

  const handleGenerateSolution = useCallback(async () => {
    if (!generatedTest) return;

    setIsSolutionLoading(true);
    setError(null);
    setSolutionData(null);

    try {
        const solution = await generateSolutionFromGemini(generatedTest, formData);
        setSolutionData(solution);
    } catch (err: unknown) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('Đã xảy ra lỗi không xác định khi tạo hướng dẫn chấm.');
        }
    } finally {
        setIsSolutionLoading(false);
    }
  }, [generatedTest, formData]);

  const handleSaveTest = useCallback(() => {
    if (!generatedTest) return;

    const formDataToSave = { ...formData };
    formDataToSave.fileContent = '';
    formDataToSave.fileImages = [];

    const newSavedTest: SavedTest = {
      id: Date.now().toString(),
      name: `Đề ${formData.subject} - ${new Date().toLocaleString('vi-VN')}`,
      createdAt: new Date().toISOString(),
      testData: generatedTest,
      formData: formDataToSave,
    };
    
    updateSavedTests([newSavedTest, ...savedTests]);
    if(!error) {
        alert("Đã lưu đề kiểm tra thành công!");
    }
  }, [generatedTest, formData, savedTests, error]);

  const handleLoadTest = useCallback((testId: string) => {
    const testToLoad = savedTests.find(t => t.id === testId);
    if (testToLoad) {
      setFormData(testToLoad.formData);
      setGeneratedTest(testToLoad.testData);
      setTestMatrix(null);
      setSolutionData(null);
      setError(null);
      setUploadedFileName(null);
      setPerPageContent([]); // Clear page content as it's not saved
      setTimeout(() => {
          const generatedTestElement = document.getElementById('generated-test-section');
          if (generatedTestElement) {
              generatedTestElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
      }, 100);
    }
  }, [savedTests]);

  const handleDeleteTest = useCallback((testId: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa đề kiểm tra này? Thao tác này không thể hoàn tác.")) {
      const updatedTests = savedTests.filter(t => t.id !== testId);
      updateSavedTests(updatedTests);
    }
  }, [savedTests]);


  const handleExport = (editedData: GeneratedTest) => {
    exportTestToDocx(editedData, formData.subject, formData.timeLimit, formData.className, formData.mcqRatio);
  };

  const handleExportWithSolution = () => {
    if (generatedTest && solutionData) {
        exportTestWithSolutionToDocx(
            generatedTest,
            solutionData,
            formData.subject,
            formData.timeLimit,
            formData.className,
            formData.mcqRatio
        );
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          
          <SavedTestsList
            savedTests={savedTests}
            onLoad={handleLoadTest}
            onDelete={handleDeleteTest}
          />
          
          <FormSection 
            formData={formData}
            setFormData={setFormData}
            onGenerateMatrix={handleGenerateMatrix}
            onGenerateTest={handleGenerateTest}
            onFileChange={handleFileChange}
            fileName={uploadedFileName}
            isMatrixLoading={isMatrixLoading}
            isTestLoading={isTestLoading}
            error={error}
            hasMatrix={!!testMatrix}
          />

          {(isMatrixLoading || isTestLoading) && (
            <div className="mt-8 p-8 bg-white rounded-2xl shadow-lg border border-gray-200">
                <ProgressBar 
                    progress={loadingProgress} 
                    text={isMatrixLoading ? 'AI đang phân tích để tạo ma trận...' : 'AI đang soạn câu hỏi theo ma trận...'}
                />
            </div>
          )}

          {testMatrix && !isMatrixLoading && (
            <TestMatrixComponent matrix={testMatrix} />
          )}

          {generatedTest && !isTestLoading && (
            <div id="generated-test-section">
                <GeneratedTestComponent 
                    testData={generatedTest} 
                    onExport={handleExport}
                    onSave={handleSaveTest}
                    subject={formData.subject}
                    timeLimit={formData.timeLimit}
                    className={formData.className}
                    mcqRatio={formData.mcqRatio}
                    writtenRatio={formData.writtenRatio}
                    onGenerateSolution={handleGenerateSolution}
                    isSolutionLoading={isSolutionLoading}
                    hasSolution={!!solutionData}
                    onExportWithSolution={handleExportWithSolution}
                />
            </div>
          )}
          
          {solutionData && !isSolutionLoading && generatedTest && (
            <SolutionComponent 
                testData={generatedTest}
                solutionData={solutionData}
                mcqRatio={formData.mcqRatio}
                writtenRatio={formData.writtenRatio}
            />
          )}

        </div>
      </main>
      <footer className="text-center py-4 text-sm text-gray-500">
        <p>Phát triển bởi Hứa Văn Thiện. &copy; {new Date().getFullYear()}</p>
         <p>Điện thoại: 0843.48.2345</p>
      </footer>
    </div>
  );
};

export default App;
