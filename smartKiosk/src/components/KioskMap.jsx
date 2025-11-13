export default function KioskMap() {
  return (
    <iframe
      id='map-frame'
      src='https://app.mappedin.com/map/68e942afb47af0000bc1385b?embedded=true'
      title='Mappedin Map'
      allow="clipboard-write 'self' https://app.mappedin.com; web-share 'self' https://app.mappedin.com"
      sandbox='allow-scripts allow-same-origin allow-popups'
      scrolling='no'
      frameBorder='0'
    />
  );
}
