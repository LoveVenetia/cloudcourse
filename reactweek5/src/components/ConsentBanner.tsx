function getConsent(): boolean | null {
  const value = localStorage.getItem("consent");
  if (value === null) return null;
  return value === "true";
}

function setConsent(value: boolean) {
  localStorage.setItem("consent", value.toString());
}

export default function ConsentBanner() {
  if (getConsent() !== null) return null;

  const acceptAnalytics = () => {
    setConsent(true);
    window.location.reload();
  };

  const declineAnalytics = () => {
    setConsent(false);
    window.location.reload();
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "1rem",
        backgroundColor: "#f5f5f5",
        borderTop: "1px solid #ccc",
        zIndex: 1000,
        color: "#222",
      }}
    >
      <p style={{ marginBottom: "0.5rem" }}>
        Tämä sovellus käyttää anonyymia analytiikkaa sovelluksen teknisen
        toimivuuden ja käytettävyyden arviointiin.
      </p>

      <button onClick={acceptAnalytics} style={{ marginRight: "0.5rem" }}>
        Hyväksy analytiikka
      </button>

      <button onClick={declineAnalytics}>Hylkää</button>
    </div>
  );
}
