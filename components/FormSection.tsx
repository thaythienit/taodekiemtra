import React from 'react';
import type { FormData } from '../types.ts';
import { BrainCircuitIcon, MatrixIcon, UploadIcon, PlusCircleIcon, TrashIcon } from './IconComponents.tsx';
import LoadingSpinner from './LoadingSpinner.tsx';

interface FormSectionProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onGenerateMatrix: (e: React.FormEvent) => void;
  onGenerateTest: (e: React.FormEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileName: string | null;
  isMatrixLoading: boolean;
  isTestLoading: boolean;
  error: string | null;
  hasMatrix: boolean;
}

const FormSection: React.FC<FormSectionProps> = ({ 
  formData, 
  setFormData, 
  onGenerateMatrix, 
  onGenerateTest, 
  onFileChange,
  fileName,
  isMatrixLoading, 
  isTestLoading, 
  error,
  hasMatrix
}) => {
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseInt(value, 10) }));
  };

  const handleRatioSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const mcqRatio = parseInt(e.target.value, 10);
    setFormData(prev => ({
        ...prev,
        mcqRatio,
        writtenRatio: 100 - mcqRatio,
    }));
  };

  const handleMcqTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
        ...prev,
        mcqTypes: {
            ...prev.mcqTypes,
            [name]: checked,
        }
    }));
  };

  const handleAddTopic = () => {
    setFormData(prev => ({
      ...prev,
      lessonTopics: [
        ...prev.lessonTopics,
        { id: Date.now().toString(), name: '', startPage: 1, endPage: 1 }
      ]
    }));
  };

  const handleRemoveTopic = (idToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      lessonTopics: prev.lessonTopics.filter(topic => topic.id !== idToRemove)
    }));
  };

  const handleTopicChange = (id: string, field: keyof FormData['lessonTopics'][0], value: string | number) => {
    setFormData(prev => ({
      ...prev,
      lessonTopics: prev.lessonTopics.map(topic =>
        topic.id === id ? { ...topic, [field]: value } : topic
      )
    }));
  };

  const isFormValid = formData.subject.trim() !== '' && 
                      (formData.fileContent.trim() !== '' || (formData.fileImages && formData.fileImages.length > 0)) && 
                      formData.lessonTopics.length > 0 &&
                      formData.lessonTopics.every(topic => topic.name.trim() !== '' && topic.startPage > 0 && topic.endPage >= topic.startPage) &&
                      formData.mcqCount > 0 && 
                      formData.writtenCount > 0;

  return (
    <form className="space-y-8 p-4 sm:p-6 lg:p-8 bg-white rounded-2xl shadow-lg border border-gray-200">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="className" className="block text-sm font-medium text-gray-700">Lớp</label>
          <input type="text" name="className" id="className" value={formData.className} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" placeholder="5A" />
        </div>
        <div className="space-y-2">
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Môn học <span className="text-red-500">*</span></label>
          <input type="text" name="subject" id="subject" value={formData.subject} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" placeholder="Toán, Tiếng Việt,..." />
        </div>
        <div className="space-y-2">
          <label htmlFor="timeLimit" className="block text-sm font-medium text-gray-700">Thời gian làm bài (phút)</label>
          <input type="number" name="timeLimit" id="timeLimit" value={formData.timeLimit} onChange={handleSliderChange} min="1" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Số câu trắc nghiệm</label>
            <input type="number" name="mcqCount" value={formData.mcqCount} onChange={handleSliderChange} min="1" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Số câu tự luận</label>
            <input type="number" name="writtenCount" value={formData.writtenCount} onChange={handleSliderChange} min="1" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
        </div>
      </div>
       <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700">Các dạng câu hỏi trắc nghiệm</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-center">
            <input id="multipleChoice" name="multipleChoice" type="checkbox" checked={formData.mcqTypes.multipleChoice} onChange={handleMcqTypeChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
            <label htmlFor="multipleChoice" className="ml-2 block text-sm text-gray-900">Nhiều lựa chọn</label>
          </div>
          <div className="flex items-center">
            <input id="trueFalse" name="trueFalse" type="checkbox" checked={formData.mcqTypes.trueFalse} onChange={handleMcqTypeChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
            <label htmlFor="trueFalse" className="ml-2 block text-sm text-gray-900">Đúng - Sai</label>
          </div>
          <div className="flex items-center">
            <input id="matching" name="matching" type="checkbox" checked={formData.mcqTypes.matching} onChange={handleMcqTypeChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
            <label htmlFor="matching" className="ml-2 block text-sm text-gray-900">Ghép đôi</label>
          </div>
          <div className="flex items-center">
            <input id="fillBlank" name="fillBlank" type="checkbox" checked={formData.mcqTypes.fillBlank} onChange={handleMcqTypeChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
            <label htmlFor="fillBlank" className="ml-2 block text-sm text-gray-900">Điền khuyết</label>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Phân bổ tỉ lệ điểm (%)</h3>
        <div className="space-y-3">
            <div>
                <label className="block text-sm font-medium text-gray-700">Trắc nghiệm: {formData.mcqRatio}% / Tự luận: {formData.writtenRatio}%</label>
                <input 
                    type="range" 
                    name="mcqRatio" 
                    min="0" 
                    max="100" 
                    step="5"
                    value={formData.mcqRatio} 
                    onChange={handleRatioSliderChange} 
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" 
                />
            </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Phân bổ mức độ nhận thức (%)</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Mức 1 (Nhận biết): {formData.recognitionRatio}%</label>
            <input type="range" name="recognitionRatio" min="0" max="100" value={formData.recognitionRatio} onChange={handleSliderChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Mức 2 (Thông hiểu): {formData.comprehensionRatio}%</label>
            <input type="range" name="comprehensionRatio" min="0" max="100" value={formData.comprehensionRatio} onChange={handleSliderChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Mức 3 (Vận dụng): {formData.applicationRatio}%</label>
            <input type="range" name="applicationRatio" min="0" max="100" value={formData.applicationRatio} onChange={handleSliderChange} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Nguồn học liệu: Tải lên file sách giáo khoa (.pdf) <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                  <span>Tải lên một file</span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={onFileChange} accept=".pdf" />
                </label>
                <p className="pl-1">hoặc kéo và thả</p>
              </div>
              {fileName ? (
                <p className="text-sm text-green-600 font-semibold">Đã tải lên: {fileName}</p>
              ) : (
                <p className="text-xs text-gray-500">Chỉ hỗ trợ file .pdf</p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-gray-700">
                Nội dung cần tạo đề <span className="text-red-500">*</span>
            </label>
            <button type="button" onClick={handleAddTopic} className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800">
                <PlusCircleIcon className="w-5 h-5 mr-1"/>
                Thêm bài
            </button>
        </div>
        <div className="space-y-3">
            {formData.lessonTopics.map((topic, index) => (
                <div key={topic.id} className="grid grid-cols-1 sm:grid-cols-[1fr,auto,auto,auto] gap-2 items-center p-2 bg-gray-50 rounded-md border">
                    <input 
                        type="text" 
                        placeholder={`Tên bài/chủ đề ${index + 1}`}
                        value={topic.name}
                        onChange={(e) => handleTopicChange(topic.id, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        aria-label="Tên bài học"
                    />
                    <div className="flex items-center gap-1">
                      <label htmlFor={`startPage-${topic.id}`} className="text-sm text-gray-600">Từ trang</label>
                      <input 
                          type="number"
                          id={`startPage-${topic.id}`}
                          value={topic.startPage}
                          onChange={(e) => handleTopicChange(topic.id, 'startPage', parseInt(e.target.value, 10) || 1)}
                          className="w-20 px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          aria-label="Trang bắt đầu"
                          min="1"
                      />
                    </div>
                     <div className="flex items-center gap-1">
                      <label htmlFor={`endPage-${topic.id}`} className="text-sm text-gray-600">đến</label>
                      <input 
                          type="number"
                          id={`endPage-${topic.id}`}
                          value={topic.endPage}
                          onChange={(e) => handleTopicChange(topic.id, 'endPage', parseInt(e.target.value, 10) || 1)}
                          className="w-20 px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          aria-label="Trang kết thúc"
                          min={topic.startPage}
                      />
                     </div>
                    <button 
                        type="button" 
                        onClick={() => handleRemoveTopic(topic.id)} 
                        disabled={formData.lessonTopics.length <= 1}
                        className="p-2 text-red-500 hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed rounded-full hover:bg-red-100 transition-colors"
                        aria-label="Xóa bài học"
                    >
                        <TrashIcon className="w-5 h-5"/>
                    </button>
                </div>
            ))}
        </div>
      </div>


      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button type="button" onClick={onGenerateMatrix} disabled={isMatrixLoading || isTestLoading || !isFormValid} className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
            {isMatrixLoading ? <LoadingSpinner /> : <><MatrixIcon className="w-5 h-5 mr-2" /> Tạo Ma Trận Đề</>}
            </button>
            <button type="button" onClick={onGenerateTest} disabled={isTestLoading || !hasMatrix || !isFormValid} className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
            {isTestLoading ? <LoadingSpinner /> : <><BrainCircuitIcon className="w-5 h-5 mr-2" /> Tạo Đề Kiểm Tra</>}
            </button>
        </div>
        {!isFormValid && <p className="text-xs text-center text-gray-500 mt-2">Vui lòng điền Môn học, tải file, nhập tên và số trang hợp lệ cho các bài học, và số lượng câu hỏi.</p>}
        {!hasMatrix && isFormValid && <p className="text-xs text-center text-indigo-600 mt-2">Bước 1: Hãy tạo ma trận đề trước.</p>}
        {error && <p className="text-sm text-red-600 mt-2 text-center">{error}</p>}
      </div>
    </form>
  );
};

export default FormSection;
