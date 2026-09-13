const categories = [
  { name: 'Housing', description: 'Homes, density, and neighbourhood plans.' },
  { name: 'Transportation', description: 'How people move around the city.' },
  { name: 'Climate', description: 'Climate action and resilient communities.' },
  { name: 'Safety', description: 'Vision Zero and public safety.' },
  { name: 'Affordability', description: 'The cost of living in Vancouver.' },
  { name: 'Governance', description: 'Integrity, accountability, and democracy.' },
]

function App() {
  return (
    <main className="page-shell">
      <nav className="topbar" aria-label="Primary navigation">
        <a className="brand" href="/">Vancouver Council <span>Scorecard</span></a>
        <a className="text-link" href="#about">About this project <span aria-hidden="true">↗</span></a>
      </nav>

      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Vancouver · 2022-2026</p>
        <h1 id="page-title">Which council votes<br /><em>matter to you?</em></h1>
        <p className="hero-copy">
          Build a personal report card from the issues you care about. Compare
          parties, explore individual councillors, and see the votes behind every result.
        </p>
        <a className="primary-button" href="#categories">Choose your categories <span aria-hidden="true">↓</span></a>
      </section>

      <section className="selection-panel" id="categories" aria-labelledby="category-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Step 01</p>
            <h2 id="category-heading">Choose up to three priorities</h2>
          </div>
          <span className="selection-count">0 / 3 selected</span>
        </div>
        <div className="category-grid">
          {categories.map((category) => (
            <button className="category-card" key={category.name} type="button">
              <span className="category-check" aria-hidden="true">+</span>
              <span className="category-name">{category.name}</span>
              <span className="category-description">{category.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="preview-panel" aria-labelledby="preview-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Your report card</p>
            <h2 id="preview-heading">The results will appear here</h2>
          </div>
          <span className="status-pill">Waiting for priorities</span>
        </div>
        <div className="empty-state">
          <div className="empty-mark" aria-hidden="true">✦</div>
          <p>Choose at least one category to compare the voting records.</p>
        </div>
      </section>

      <footer id="about" className="footer">
        <span>Vancouver Council Scorecard</span>
        <span>Independent project · Data and methodology coming soon</span>
      </footer>
    </main>
  )
}

export default App
