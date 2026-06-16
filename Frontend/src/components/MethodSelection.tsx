import { useState } from 'react';

export type InputMethod = 'mouse' | 'gesture';

interface MethodSelectionPageProps {
  onBack?: () => void;
  onMethodSelect: (method: InputMethod) => void;
  mode: 'latihan' | 'kuis';
}

const MethodSelectionPage = ({ onBack, onMethodSelect, mode }: MethodSelectionPageProps) => {
  const [selectedMethod, setSelectedMethod] = useState<InputMethod | null>(null);

  const handleMethodClick = (method: InputMethod) => {
    setSelectedMethod(method);
  };

  const handleContinue = () => {
    if (selectedMethod) {
      onMethodSelect(selectedMethod);
    }
  };

  const title = mode === 'latihan' ? 'Latihan Menulis' : 'Kuis Aksara';
  const description = mode === 'latihan' 
    ? 'Pilih metode input untuk latihan menulis Aksara Sunda'
    : 'Pilih metode input untuk kuis Aksara Sunda';

  return (
    <div className="min-h-screen bg-background-light flex items-center justify-center p-5">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-lg border border-gray-200 p-8 md:p-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-4">
            <span className="material-symbols-outlined text-primary text-5xl">
              {mode === 'latihan' ? 'edit' : 'quiz'}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">{title}</h1>
          <p className="text-lg text-gray-600">{description}</p>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
            Pilih Metode Input
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mouse Method */}
            <button
              onClick={() => handleMethodClick('mouse')}
              className={`group relative flex flex-col items-center justify-center gap-4 p-8 rounded-xl border-2 transition-all duration-300 ${
                selectedMethod === 'mouse'
                  ? 'border-primary bg-primary/5 shadow-lg'
                  : 'border-gray-300 hover:border-primary hover:shadow-md'
              }`}
            >
              {selectedMethod === 'mouse' && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-sm">check</span>
                </div>
              )}
              
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                <span className="material-symbols-outlined text-blue-600 text-4xl">mouse</span>
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900">Mouse / Touchpad</h3>
              <p className="text-sm text-gray-600 text-center">
                Tulis menggunakan mouse atau touchpad seperti biasa
              </p>
              
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  ✓ Mudah digunakan
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  ✓ Presisi tinggi
                </span>
              </div>
            </button>

            {/* Gesture Method */}
            <button
              onClick={() => handleMethodClick('gesture')}
              className={`group relative flex flex-col items-center justify-center gap-4 p-8 rounded-xl border-2 transition-all duration-300 ${
                selectedMethod === 'gesture'
                  ? 'border-primary bg-primary/5 shadow-lg'
                  : 'border-gray-300 hover:border-primary hover:shadow-md'
              }`}
            >
              {selectedMethod === 'gesture' && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-sm">check</span>
                </div>
              )}
              
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-2">
                <span className="material-symbols-outlined text-purple-600 text-4xl">back_hand</span>
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900">Gesture Recognition</h3>
              <p className="text-sm text-gray-600 text-center">
                Tulis menggunakan gerakan tangan melalui webcam
              </p>
              
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                  ✨ Inovatif
                </span>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                  🎯 Natural
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Instructions for Gesture */}
        {selectedMethod === 'gesture' && (
          <div className="mb-8 p-6 bg-purple-50 rounded-xl border border-purple-200">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-600">info</span>
              Cara Menggunakan Gesture Recognition
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-purple-600 text-lg mt-0.5">circle</span>
                <span>Pastikan webcam Anda aktif dan tangan terlihat jelas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-purple-600 text-lg mt-0.5">circle</span>
                <span><strong>Untuk menulis:</strong> Dekatkan ibu jari dan telunjuk (gesture pinch/cubit)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-purple-600 text-lg mt-0.5">circle</span>
                <span><strong>Untuk berhenti menulis:</strong> Jauhkan ibu jari dan telunjuk</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-purple-600 text-lg mt-0.5">circle</span>
                <span>Gunakan jari telunjuk sebagai pointer untuk menggambar</span>
              </li>
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onBack}
            className="px-8 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-bold hover:border-primary hover:text-primary transition-all"
          >
            <span className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">arrow_back</span>
              Kembali
            </span>
          </button>
          
          <button
            onClick={handleContinue}
            disabled={!selectedMethod}
            className="px-10 py-3 rounded-lg bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:bg-red-600 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
          >
            <span className="flex items-center justify-center gap-2">
              Lanjutkan
              <span className="material-symbols-outlined">arrow_forward</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MethodSelectionPage;