import { useState, useEffect } from 'react';

function App() {
  const [homepage, setHomepage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Bug : pas de gestion d'erreur réseau
    // Bug : pas de timeout
    // Bug : pas de retry en cas d'échec
    fetch('/api/content/homepage')
      .then(res => res.json())
      .then(data => {
        setHomepage(data);
        setLoading(false);
      })
      .catch(err => {
        // Bug : exposition de l'erreur brute à l'utilisateur
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>Chargement...</div>;
  }

  if (error) {
    // Bug de sécurité : XSS potentiel si error contient du HTML
    return <div>Erreur : {error}</div>;
  }

  if (!homepage || !homepage.data) {
    return <div>Aucun contenu disponible</div>;
  }

  const { hero, formations } = homepage.data;

  return (
    <div className="app">
      {/* Hero Section */}
      <section className="hero">
        <h1>{hero.title}</h1>
        <p>{hero.subtitle}</p>
        <a href={hero.cta.link}>{hero.cta.text}</a>
      </section>

      {/* Formations List */}
      <section className="formations">
        <h2>Nos Formations</h2>
        <div className="formations-grid">
          {formations.map(formation => (
            <div key={formation.id} className="formation-card">
              {/* Bug : pas de validation de l'image, peut être vide */}
              <img src={formation.image} alt={formation.title} />
              <h3>{formation.title}</h3>
              <p>{formation.description}</p>
              <div className="formation-meta">
                <span>{formation.category}</span>
                <span>{formation.level}</span>
                <span>{formation.duration} jours</span>
                <span>{formation.price}€</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default App;

