export default function Home() {
  return (
    <main className="device-canvas">
      <div className="device-frame" data-testid="mobile-frame">
        <iframe
          className="device-frame__screen"
          data-testid="mobile-preview"
          src="/app"
          title="智览时政手机预览"
        />
      </div>
    </main>
  );
}
