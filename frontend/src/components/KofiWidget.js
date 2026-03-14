import { useEffect } from 'react';

const SCRIPT_ID = 'kofi-overlay-script';

const KofiWidget = () => {
  useEffect(() => {
    // Only inject the script once — if it's already in the DOM, skip
    if (document.getElementById(SCRIPT_ID)) return;

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://storage.ko-fi.com/cdn/scripts/overlay-widget.js';
    script.async = true;
    script.addEventListener('load', () => {
      window.kofiWidgetOverlay.draw('josephjones1', {
        'type': 'floating-chat',
        'floating-chat.donateButton.text': 'Support me',
        'floating-chat.donateButton.background-color': '#5bc0de',
        'floating-chat.donateButton.text-color': '#fff',
      });
    });
    document.body.appendChild(script);
  }, []);
  return null;
};

export default KofiWidget;