import React from 'react';
import type { TestMatrix } from '../types.ts';

interface TestMatrixProps {
  matrix: TestMatrix;
}

const TestMatrixComponent: React.FC<TestMatrixProps> = ({ matrix }) => {
  if (!matrix || matrix.length === 0) {
    return null;
  }

  const totals = {
    mcq: { recognition: 0, comprehension: 0, application: 0, total: 0 },
    written: { recognition: 0, comprehension: 0, application: 0, total: 0 },
    total: 0,
  };

  matrix.forEach(row => {
    totals.mcq.recognition += row.mcq.recognition;
    totals.mcq.comprehension += row.mcq.comprehension;
    totals.mcq.application += row.mcq.application;
    totals.written.recognition += row.written.recognition;
    totals.written.comprehension += row.written.comprehension;
    totals.written.application += row.written.application;
  });

  totals.mcq.total = totals.mcq.recognition + totals.mcq.comprehension + totals.mcq.application;
  totals.written.total = totals.written.recognition + totals.written.comprehension + totals.written.application;
  totals.total = totals.mcq.total + totals.written.total;

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return '0%';
    return `${Math.round((value / total) * 100)}%`;
  };

  return (
    <div className="mt-8 p-4 sm:p-6 lg:p-8 bg-white rounded-2xl shadow-lg border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Ma Trận Đề Kiểm Tra</h2>
      <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th rowSpan={2} className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider border-r">
                Bài
              </th>
              <th colSpan={4} className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider border-r bg-blue-50">
                Trắc nghiệm
              </th>
              <th colSpan={4} className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider border-r bg-red-50">
                Tự luận
              </th>
              <th rowSpan={2} className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">
                Tổng
              </th>
            </tr>
            <tr>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 tracking-wider bg-blue-50">NB</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 tracking-wider bg-blue-50">TH</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 tracking-wider bg-blue-50">VD</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 tracking-wider border-r bg-blue-100">Tổng TN</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 tracking-wider bg-red-50">NB</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 tracking-wider bg-red-50">TH</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 tracking-wider bg-red-50">VD</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 tracking-wider border-r bg-red-100">Tổng TL</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {matrix.map((row, index) => {
              const rowMcqTotal = row.mcq.recognition + row.mcq.comprehension + row.mcq.application;
              const rowWrittenTotal = row.written.recognition + row.written.comprehension + row.written.application;
              const rowTotal = rowMcqTotal + rowWrittenTotal;
              return (
                <tr key={index} className="group transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border-r group-hover:text-blue-600">{row.topic}</td>
                  <td className="px-2 py-3 text-center text-sm text-gray-700">{row.mcq.recognition}</td>
                  <td className="px-2 py-3 text-center text-sm text-gray-700">{row.mcq.comprehension}</td>
                  <td className="px-2 py-3 text-center text-sm text-gray-700">{row.mcq.application}</td>
                  <td className="px-2 py-3 text-center text-sm font-semibold text-gray-800 border-r bg-blue-50/50 transition-colors group-hover:bg-blue-100/60">{rowMcqTotal}</td>
                  <td className="px-2 py-3 text-center text-sm text-gray-700">{row.written.recognition}</td>
                  <td className="px-2 py-3 text-center text-sm text-gray-700">{row.written.comprehension}</td>
                  <td className="px-2 py-3 text-center text-sm text-gray-700">{row.written.application}</td>
                  <td className="px-2 py-3 text-center text-sm font-semibold text-gray-800 border-r bg-red-50/50 transition-colors group-hover:bg-red-100/60">{rowWrittenTotal}</td>
                  <td className="px-2 py-3 text-center text-sm font-bold text-gray-900 bg-gray-50/50 transition-colors group-hover:bg-gray-100">{rowTotal}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-gray-300">
            <tr className="bg-gray-100">
              <td className="px-4 py-3 text-left text-sm font-bold text-gray-800 border-r">Tổng cộng</td>
              <td className="px-2 py-3 text-center text-sm font-bold text-gray-800">{totals.mcq.recognition}</td>
              <td className="px-2 py-3 text-center text-sm font-bold text-gray-800">{totals.mcq.comprehension}</td>
              <td className="px-2 py-3 text-center text-sm font-bold text-gray-800">{totals.mcq.application}</td>
              <td className="px-2 py-3 text-center text-sm font-bold text-blue-700 border-r bg-blue-100">{totals.mcq.total}</td>
              <td className="px-2 py-3 text-center text-sm font-bold text-gray-800">{totals.written.recognition}</td>
              <td className="px-2 py-3 text-center text-sm font-bold text-gray-800">{totals.written.comprehension}</td>
              <td className="px-2 py-3 text-center text-sm font-bold text-gray-800">{totals.written.application}</td>
              <td className="px-2 py-3 text-center text-sm font-bold text-red-700 border-r bg-red-100">{totals.written.total}</td>
              <td className="px-2 py-3 text-center text-sm font-extrabold text-gray-900 bg-gray-200">{totals.total}</td>
            </tr>
            <tr className="bg-gray-50">
                <td className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-r italic">Tỉ lệ %</td>
                <td className="px-2 py-2 text-center text-xs text-gray-600 italic">{formatPercentage(totals.mcq.recognition, totals.total)}</td>
                <td className="px-2 py-2 text-center text-xs text-gray-600 italic">{formatPercentage(totals.mcq.comprehension, totals.total)}</td>
                <td className="px-2 py-2 text-center text-xs text-gray-600 italic">{formatPercentage(totals.mcq.application, totals.total)}</td>
                <td className="px-2 py-2 text-center text-xs font-bold text-blue-800 border-r bg-blue-100 italic">{formatPercentage(totals.mcq.total, totals.total)}</td>
                <td className="px-2 py-2 text-center text-xs text-gray-600 italic">{formatPercentage(totals.written.recognition, totals.total)}</td>
                <td className="px-2 py-2 text-center text-xs text-gray-600 italic">{formatPercentage(totals.written.comprehension, totals.total)}</td>
                <td className="px-2 py-2 text-center text-xs text-gray-600 italic">{formatPercentage(totals.written.application, totals.total)}</td>
                <td className="px-2 py-2 text-center text-xs font-bold text-red-800 border-r bg-red-100 italic">{formatPercentage(totals.written.total, totals.total)}</td>
                <td className="px-2 py-2 text-center text-xs font-extrabold text-gray-900 bg-gray-200 italic">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default TestMatrixComponent;