import React from 'react';

const KioskMap = () => {
  return (
    <div
      id='map-container'
      className='flex-1 p-6 flex items-center justify-center box-border max-w-1/2 lg:max-w-none'
    >
      <iframe
        id='map-frame'
        className='w-full h-full border-none rounded-xl shadow-2xl overflow-hidden'
        src='https://app.mappedin.com/map/68e942afb47af0000bc1385b?embedded=true'
        title='Mappedin Map'
        allow="clipboard-write 'self' https://app.mappedin.com; web-share 'self' https://app.mappedin.com"
        scrolling='no'
        frameBorder='0'
      />
    </div>
  );
};

export default KioskMap;
