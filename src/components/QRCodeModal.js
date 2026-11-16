import React from 'react';
import { Download, Share2 } from 'lucide-react';
import { RECOMMEND_URL } from '../constants';
import Modal from './Modal';

const QR_CODE_URL = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(RECOMMEND_URL)}`;

const QRCodeModal = ({ onClose }) => {
  const copyLink = () => {
    navigator.clipboard.writeText(RECOMMEND_URL);
    alert('Recommendation link copied to clipboard!');
  };

  return (
    <Modal
      title="Save QR code or link to recommend stuff to Noah whenever you feel like it"
      onClose={onClose}
      maxWidth="28rem"
    >
      <div className="text-center">
        <div className="bg-gray-50 p-6 rounded-lg mb-4">
          <img
            src={QR_CODE_URL}
            alt="WatchCraft QR Code"
            className="mx-auto"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        <h3 className="font-semibold text-lg mb-2">🎬🪄 Recommend Shows & Movies!</h3>
        <p className="text-gray-600 text-sm mb-4">Scan to add your recommendations to my WatchCraft</p>

        <div className="space-y-3">
          <a
            href={QR_CODE_URL}
            download="watchcraft-recommendations-qr.png"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download QR Code
          </a>

          <button
            onClick={copyLink}
            className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 flex items-center justify-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            Copy Recommendation Link
          </button>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <p className="text-xs text-blue-800">
            <strong>Tip:</strong> type anonymous if you don't want to take credit for your recommendation!
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default QRCodeModal;
