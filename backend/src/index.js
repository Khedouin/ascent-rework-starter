import http from 'http';
import url from 'url';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { PORT_LISTEN } from '../config/network.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = PORT_LISTEN || 4200;
const HOMEPAGE_FILE = path.join(__dirname, '../../data/homepage.json');

async function loadHomepage() {
  try {
    const data = await fs.readFile(HOMEPAGE_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    // Bug subtil : pas de validation du schéma JSON
    if (!parsed || typeof parsed !== 'object') {
      console.warn('Le fichier homepage.json ne contient pas un objet valide');
      return null;
    }
    return parsed;
  } catch (error) {
    // Bug : en cas d'erreur, on retourne null sans loguer l'erreur complète
    console.error('Erreur lors du chargement de la page d\'accueil:', error);
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // Bug de sécurité : CORS trop permissif (allow-origin: *)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // Bug : pas de headers de sécurité (X-Content-Type-Options, etc.)

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Endpoint de récupération du contenu de la page d'accueil
  if (req.method === 'GET' && pathname === '/api/content/homepage') {
    try {
      const homepage = await loadHomepage();
      // Bug de performance : charge le fichier à chaque requête (pas de cache)
      
      if (!homepage) {
        res.writeHead(404);
        res.end(JSON.stringify({
          success: false,
          error: 'Contenu de la page d\'accueil non trouvé'
        }));
        return;
      }

      // Bug de sécurité : pas de validation/sanitization des paramètres
      const page = parseInt(query.page) || 1;
      const limit = parseInt(query.limit) || 6;
      const category = query.category;
      const level = query.level;
      const sort = query.sort || 'date';
      const order = query.order || 'desc';

      // Filtrage et pagination basiques (à améliorer)
      let formations = homepage.formations || [];
      
      if (category) {
        formations = formations.filter(f => f.category === category);
      }
      
      if (level) {
        formations = formations.filter(f => f.level === level);
      }

      // Tri basique
      formations.sort((a, b) => {
        if (sort === 'date') {
          return order === 'asc' ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date);
        }
        return 0;
      });

      // Pagination basique
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedFormations = formations.slice(start, end);

      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        data: {
          hero: homepage.hero,
          formations: paginatedFormations,
          pagination: {
            page,
            limit,
            total: formations.length,
            totalPages: Math.ceil(formations.length / limit)
          }
        }
      }));
    } catch (error) {
      // Bug de sécurité : exposition d'informations sensibles dans les erreurs
      res.writeHead(500);
      res.end(JSON.stringify({
        success: false,
        error: 'Erreur lors du chargement de la page d\'accueil',
        details: error.message // Ne devrait pas être exposé en production
      }));
    }
    return;
  }

  // Route par défaut
  res.writeHead(404);
  res.end(JSON.stringify({
    success: false,
    error: 'Route non trouvée'
  }));
});

server.listen(PORT, () => {
  console.log(`🚀 Serveur backend démarré sur http://localhost:${PORT}`);
  console.log(`📚 Endpoints disponibles:`);
  console.log(`   GET /api/content/homepage - Contenu de la page d'accueil`);
});

server.on('error', (error) => {
  console.error('❌ Erreur du serveur:', error);
  process.exit(1);
});

