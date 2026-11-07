export default function SourcePreviewPage() {
  return (
    <main className="device-canvas">
      <div className="device-frame" data-testid="source-admin-frame">
        <iframe
          className="device-frame__screen"
          data-testid="source-admin-preview"
          src="/app/sources"
          title="智览时政信源管理"
        />
      </div>
    </main>
  );
}
