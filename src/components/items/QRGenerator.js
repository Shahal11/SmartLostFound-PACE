// src/components/items/QRGenerator.js
import React from 'react';
import { QRCodeSVG } from 'qrcode.react'; // Use the SVG version
import PropTypes from 'prop-types';
import { Download } from 'lucide-react'; // Icon

const QRGenerator = ({ itemID }) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://pace-lostfound.app';
    const qrValue = `${baseUrl}/student/report-found?itemId=${itemID}`;

    const downloadQR = () => {
        const svgElement = document.getElementById(`qrcode-svg-${itemID}`);
        if (svgElement) {
            try {
                const serializer = new XMLSerializer();
                let source = serializer.serializeToString(svgElement);
                if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
                    source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
                }
                if (!source.match(/^<svg[^>]+"http:\/\/www\.w3\.org\/1999\/xlink"/)) {
                    source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
                }
                source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
                const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
                const link = document.createElement('a');
                link.href = url;
                link.download = `PACE_LF_QR_${itemID}.svg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } catch (error) {
                console.error("Error generating SVG data URL:", error);
                alert("Could not download QR code SVG.");
            }
        } else {
            console.error("QR Code SVG element not found.");
        }
    };

    // --- This JSX uses Tailwind classes (`className`) ---
    return (
        <div className="flex flex-col items-center justify-center p-6 bg-pace-blue-light rounded-xl shadow-inner border border-gray-200">
            <h3 className="text-lg font-semibold text-ink-darkest mb-3">Unique Item Tag</h3>
            <div className="p-2 bg-white rounded-lg border border-gray-300 mb-4">
                <QRCodeSVG
                    id={`qrcode-svg-${itemID}`}
                    value={qrValue}
                    size={160}
                    level="H"
                    bgColor="#ffffff"
                    fgColor="#0052CC" // Use pace-blue
                    includeMargin={true}
                />
            </div>
            <p className="text-xs text-ink-light mb-4 text-center break-all">
                {qrValue}
            </p>
            <p className="text-sm text-ink-light text-center mb-4 max-w-[200px]">
                Print and attach this tag securely to your item.
            </p>
            <button
                onClick={downloadQR}
                className="flex items-center justify-center gap-2 px-5 py-2 bg-pace-blue text-white font-semibold rounded-lg shadow-md hover:bg-pace-blue-dark transition-colors"
            >
                <Download size={16} />
                Download QR (SVG)
            </button>
        </div>
    );
};

QRGenerator.propTypes = {
    itemID: PropTypes.string.isRequired,
};

export default QRGenerator;