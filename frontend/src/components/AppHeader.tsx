export function AppHeader() {
  return (
    <>
      <header className="brand">
        <a className="brand-mark" data-wml-openURL="https://v3.wails.io" aria-label="Wails website">
          <img src="/wails.png" className="brand-logo" alt="Wails logo"/>
        </a>
        <a className="brand-badge" data-wml-openURL="https://reactjs.org" aria-label="React">
          <img src="/react.svg" alt="React logo"/>
        </a>
      </header>

      <h1 className="title"><span className="title-accent">HTTP</span> Client</h1>
      <p className="subtitle">Send a request through the Go HTTP client and inspect the response.</p>
    </>
  );
}
