export default function KioskMap() {
  return (
    <iframe
      id='map-frame'
      src='https://app.mappedin.com/map/692e274ca10fac000b4ee632?embedded=true'
      title='Mappedin Map'
      allow="clipboard-write 'self' https://app.mappedin.com; web-share 'self' https://app.mappedin.com"
      sandbox='allow-scripts allow-same-origin allow-popups'
      scrolling='yes'
      frameBorder='0'
    />
  );
}
