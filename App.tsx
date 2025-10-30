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
    fileContent: '',
    fileImages: [],
    lessonTopics: [{ id: Date.now().toString(), name: '', startPage: 1, endPage: 1 }],
    timeLimit: 40,
    mcqTypes: {
      multipleChoice: true,
      trueFalse: false,
      matching: false,
      fillBlank: false,
    },
  });
  
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
      // If there's a generated test, there are unsaved changes.
      if (generatedTest) {
        // Standard way to trigger the browser's confirmation dialog.
        event.preventDefault();
        // This is required for some browsers. The actual message is controlled by the browser.
        event.returnValue = 'Bạn có chắc chắn muốn rời đi? Các thay đổi chưa được lưu sẽ bị mất.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup the event listener when the component unmounts
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [generatedTest]); // Dependency array ensures the listener knows about the current state of generatedTest

  // Effect for simulating loading progress
  useEffect(() => {
    let interval: number;
    if (isMatrixLoading || isTestLoading) {
      setLoadingProgress(0);
      let currentProgress = 0;
      interval = window.setInterval(() => {
        currentProgress += Math.random() * 10;
        if (currentProgress > 95) {
          currentProgress = 95; // Cap at 95% until completion
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

    // Reset state for new file selection
    setUploadedFileName(null);
    setFormData(prev => ({ ...prev, fileContent: '', fileImages: [] }));
    setError(null);
    if (!e.target.files || e.target.files.length === 0) {
      return; // No file selected or selection was cancelled
    }

    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Lỗi: Vui lòng chỉ tải lên file có định dạng .pdf.');
        e.target.value = ''; // Reset file input
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
          
          // Extract text
          const textContent = await page.getTextContent();
          
          // More robust text extraction
          let lastY, text = '';
          textContent.items.sort((a, b) => { // Sort items by vertical, then horizontal position
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
                      text += '\n'; // New line
                  }
                  text += item.str;
                  if (lastY !== undefined && lastY === item.transform[5]) {
                    text += ' '; // Add space for items on the same line.
                  }
                  lastY = item.transform[5];
              }
          }
          textItems.push(text);

          // Extract image by rendering page
          if (context) {
            const viewport = page.getViewport({ scale: 1.5 });
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // FIX: The type definition for 'RenderParameters' requires the 'canvas' property.
            await page.render({ canvasContext: context, viewport: viewport, canvas } as any).promise;
            // Get image as base64 and remove the data URL prefix
            const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            imageItems.push(imageDataUrl.split(',')[1]);
          }
        }
        
        canvas.remove(); // Clean up canvas element

        const fullText = textItems.join('\n\n');
        
        setFormData(prev => ({ ...prev, fileContent: fullText, fileImages: imageItems }));

        if (fullText.trim() === '' && imageItems.length === 0) {
          setError("Lỗi: Không tìm thấy nội dung văn bản hoặc hình ảnh nào trong file PDF.");
        } else {
          setError(null); // Clear previous errors if content is found
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
    
    try {
      const matrixData = await generateMatrixFromGemini(formData);
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
  }, [formData]);

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
    
    try {
      const testData = await generateTestFromGemini(formData, testMatrix);
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
  }, [formData, testMatrix]);

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

    // Create a copy of formData and remove the large fields before saving to prevent quota issues.
    const formDataToSave = { ...formData };
    formDataToSave.fileContent = ''; // Clear the large text content.
    formDataToSave.fileImages = [];   // Clear the large image array.

    const newSavedTest: SavedTest = {
      id: Date.now().toString(),
      name: `Đề ${formData.subject} - ${new Date().toLocaleString('vi-VN')}`,
      createdAt: new Date().toISOString(),
      testData: generatedTest,
      formData: formDataToSave, // Use the sanitized, smaller version of formData
    };
    
    updateSavedTests([newSavedTest, ...savedTests]);
    // Do not show alert if there was an error saving
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
      setSolutionData(null); // Clear solution when loading an old test
      setError(null);
      setUploadedFileName(null); // Clear file name as content is not loaded
      // Scroll to the generated test for better UX
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