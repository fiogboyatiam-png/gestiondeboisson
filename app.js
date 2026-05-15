/*
  =============================================
  FICHIER 3 : app.js  (VERSION COMMENTÉE)
  NOUVEAUTÉS PAR RAPPORT À LA VERSION PRÉCÉDENTE :
  1. rechercherCatalogue() → filtre le tableau du catalogue en temps réel
  2. rechercherVentes()    → filtre la liste des produits dans la section ventes
  3. Dans la section ventes, champ de saisie directe de quantité
     (au lieu de cliquer +/- plusieurs fois)
  =============================================
*/


/* =============================================
   DONNÉES GLOBALES
   ============================================= */
let boissons    = chargerBoissons();
let panier      = {};
let historique  = chargerHistorique();
let prochainId  = boissons.length > 0 ? Math.max(...boissons.map(b => b.id)) + 1 : 1;


/* =============================================
   CHARGEMENT ET SAUVEGARDE (localStorage)
   ============================================= */
function chargerBoissons() {
  const sauvegarde = localStorage.getItem('barstock_boissons');
  if (sauvegarde) return JSON.parse(sauvegarde);
  return [
    { id: 1, nom: "Castel Bière",   categorie: "Bière", bbc: 400, vente: 600, stock: 24, seuil: 6 },
    { id: 2, nom: "Coca-Cola 33cl", categorie: "Soda",  bbc: 350, vente: 500, stock:  4, seuil: 6 },
    { id: 3, nom: "Eau Eva 1.5L",   categorie: "Eau",   bbc: 250, vente: 400, stock:  0, seuil: 5 },
    { id: 4, nom: "Jus Fruité",     categorie: "Jus",   bbc: 500, vente: 750, stock: 12, seuil: 4 },
    { id: 5, nom: "Flag Bière",     categorie: "Bière", bbc: 380, vente: 550, stock:  8, seuil: 6 },
  ];
}
function chargerHistorique() {
  const s = localStorage.getItem('barstock_historique');
  return s ? JSON.parse(s) : [];
}
function sauvegarder() {
  localStorage.setItem('barstock_boissons',  JSON.stringify(boissons));
  localStorage.setItem('barstock_historique', JSON.stringify(historique));
}


/* =============================================
   NAVIGATION
   ============================================= */
function showSection(idSection) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(idSection).classList.add('active');
  document.querySelector('[data-section="' + idSection + '"]').classList.add('active');
  if (idSection === 'catalogue')  afficherCatalogue();
  if (idSection === 'stock')      afficherStock();
  if (idSection === 'ventes')     afficherVentes();
  if (idSection === 'historique') afficherHistorique();
}


/* =============================================
   UTILITAIRES
   ============================================= */
function formatPrix(montant) {
  return montant.toLocaleString('fr-FR') + ' FCFA';
}
function getBadge(stock, seuil) {
  if (stock === 0)         return '<span class="badge badge-vide">🔴 Rupture</span>';
  if (stock <= seuil)      return '<span class="badge badge-bas">🟡 Stock bas</span>';
  return                          '<span class="badge badge-ok">🟢 OK</span>';
}
function getStatsHTML() {
  const total   = boissons.length;
  const ok      = boissons.filter(b => b.stock > b.seuil).length;
  const bas     = boissons.filter(b => b.stock > 0 && b.stock <= b.seuil).length;
  const rupture = boissons.filter(b => b.stock === 0).length;
  return `
    <div class="stat-box"><div class="stat-label">Total produits</div><div class="stat-value">${total}</div></div>
    <div class="stat-box"><div class="stat-label">Stock OK</div><div class="stat-value vert">${ok}</div></div>
    <div class="stat-box"><div class="stat-label">Stock bas</div><div class="stat-value orange">${bas}</div></div>
    <div class="stat-box"><div class="stat-label">Rupture</div><div class="stat-value rouge">${rupture}</div></div>
  `;
}


/* =============================================
   SECTION CATALOGUE
   ============================================= */

/*
  afficherCatalogue(liste) :
  PARAMÈTRE OPTIONNEL "liste" :
  → Si on appelle afficherCatalogue()        → affiche TOUTES les boissons.
  → Si on appelle afficherCatalogue(filtree) → affiche seulement celles du tableau "filtree".
  → "liste = boissons" signifie : si aucun argument n'est passé,
    la valeur par défaut est le tableau complet "boissons".
  → Cela permet à la recherche d'appeler la même fonction
    avec un tableau réduit.
*/
function afficherCatalogue(liste = boissons) {
  document.getElementById('stats-catalogue').innerHTML = getStatsHTML();
  const tbody = document.getElementById('tbody-catalogue');

  if (liste.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="vide">Aucun résultat trouvé</td></tr>';
    return;
  }

  tbody.innerHTML = liste.map(function(b) {
    const marge = b.vente - b.bbc;
    const pct   = Math.round((marge / b.bbc) * 100);
    return `
      <tr>
        <td><strong>${b.nom}</strong></td>
        <td>${b.categorie}</td>
        <td>${formatPrix(b.bbc)}</td>
        <td>${formatPrix(b.vente)}</td>
        <td style="color:#0F6E56;font-weight:500">+${formatPrix(marge)} <small style="color:#888">(${pct}%)</small></td>
        <td><strong>${b.stock}</strong></td>
        <td>${getBadge(b.stock, b.seuil)}</td>
        <td><button class="btn btn-danger btn-sm" onclick="supprimerBoisson(${b.id})">🗑️</button></td>
      </tr>`;
  }).join('');
}

/*
  ╔══════════════════════════════════════════════════════════╗
  ║  RECHERCHE CATALOGUE — NOUVEAUTÉ                         ║
  ╚══════════════════════════════════════════════════════════╝

  rechercherCatalogue() est appelée à chaque frappe dans le champ
  id="search-catalogue" grâce à l'événement oninput dans le HTML.

  Étapes :
  1. On lit ce que l'utilisateur a tapé.
  2. On le convertit en minuscules (.toLowerCase()) pour que
     la recherche soit insensible à la casse.
     Ex: "castel" trouvera "Castel" et "CASTEL".
  3. On filtre le tableau "boissons" : on garde seulement les boissons
     dont le nom OU la catégorie contient le texte recherché.
     .includes(texte) → retourne true si la chaîne contient ce texte.
  4. On appelle afficherCatalogue(resultat) avec le tableau filtré.
     Le tableau complet "boissons" n'est pas modifié, on crée juste
     un nouveau tableau temporaire.
*/
function rechercherCatalogue() {
  /* 1. Lire le texte tapé et le mettre en minuscules */
  const texte = document.getElementById('search-catalogue').value.toLowerCase().trim();

  /*
    2. Si le champ est vide, afficher tout (pas besoin de filtrer).
    .trim() enlève les espaces → si l'utilisateur efface tout,
    le champ est vide et on réaffiche la liste complète.
  */
  if (texte === '') {
    afficherCatalogue();
    return;
  }

  /*
    3. Filtrer le tableau.
    Pour chaque boisson "b", on vérifie :
    - b.nom.toLowerCase().includes(texte) → le nom contient le texte ?
    - b.categorie.toLowerCase().includes(texte) → la catégorie contient le texte ?
    Le || (OU logique) → si l'une OU l'autre condition est vraie, on garde la boisson.
  */
  const resultat = boissons.filter(function(b) {
    return (
      b.nom.toLowerCase().includes(texte) ||
      b.categorie.toLowerCase().includes(texte)
    );
  });

  /* 4. Afficher seulement les boissons filtrées */
  afficherCatalogue(resultat);
}

/* Ajouter une boisson */
function ajouterBoisson() {
  const nom       = document.getElementById('f-nom').value.trim();
  const categorie = document.getElementById('f-categorie').value;
  const bbc       = parseInt(document.getElementById('f-bbc').value);
  const vente     = parseInt(document.getElementById('f-vente').value);
  const stock     = parseInt(document.getElementById('f-stock').value) || 0;
  const seuil     = parseInt(document.getElementById('f-seuil').value) || 5;

  if (!nom)                   { alert('❌ Saisissez le nom.');   return; }
  if (isNaN(bbc)||isNaN(vente)){ alert('❌ Saisissez les prix.'); return; }
  if (vente <= bbc)            { alert('❌ Prix vente > BBC !');  return; }

  boissons.push({ id: prochainId++, nom, categorie, bbc, vente, stock, seuil });
  sauvegarder();
  ['f-nom','f-bbc','f-vente','f-stock','f-seuil'].forEach(id => document.getElementById(id).value = '');
  afficherCatalogue();
}

/* Supprimer une boisson */
function supprimerBoisson(id) {
  if (!confirm('Supprimer cette boisson ?')) return;
  boissons = boissons.filter(b => b.id !== id);
  sauvegarder();
  afficherCatalogue();
}


/* =============================================
   SECTION STOCK
   ============================================= */
function afficherStock() {
  afficherAlertes();
  const tbody = document.getElementById('tbody-stock');
  if (boissons.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="vide">Aucune boisson enregistrée</td></tr>';
    return;
  }
  tbody.innerHTML = boissons.map(b => `
    <tr>
      <td><strong>${b.nom}</strong><br><small style="color:#888">${b.categorie}</small></td>
      <td style="font-size:18px;font-weight:600">${b.stock}</td>
      <td>${b.seuil}</td>
      <td>${getBadge(b.stock, b.seuil)}</td>
      <td>
        <div class="qty-ctrl">
          <button onclick="ajusterStock(${b.id},-1)">−</button>
          <span class="qty-num">${b.stock}</span>
          <button onclick="ajusterStock(${b.id},+1)">+</button>
        </div>
      </td>
      <td>
        <div style="display:flex;gap:6px;align-items:center">
          <input type="number" id="appr-${b.id}" placeholder="Qté" min="1" class="appr-input" />
          <button class="btn btn-primary btn-sm" onclick="approvisionner(${b.id})">➕ Ajouter</button>
        </div>
      </td>
    </tr>`).join('');
}

function afficherAlertes() {
  const zone = document.getElementById('zone-alertes');
  const enAlerte = boissons.filter(b => b.stock <= b.seuil);
  if (!enAlerte.length) { zone.innerHTML = ''; return; }
  zone.innerHTML = enAlerte.map(b => {
    const estRupture = b.stock === 0;
    return `<div class="alerte ${estRupture ? 'alerte-rouge' : 'alerte-orange'}">
      ${estRupture ? '🔴' : '🟡'}
      <strong>${b.nom}</strong> — ${estRupture
        ? 'Rupture de stock ! Réapprovisionnez immédiatement.'
        : `Stock bas : ${b.stock} unités restantes (seuil : ${b.seuil})`}
    </div>`;
  }).join('');
}

function ajusterStock(id, delta) {
  const b = boissons.find(b => b.id === id);
  if (!b) return;
  b.stock = Math.max(0, b.stock + delta);
  sauvegarder();
  afficherStock();
}

function approvisionner(id) {
  const input = document.getElementById('appr-' + id);
  const q = parseInt(input.value);
  if (!q || q <= 0) { alert('❌ Saisissez une quantité valide.'); return; }
  const b = boissons.find(b => b.id === id);
  if (!b) return;
  b.stock += q;
  input.value = '';
  sauvegarder();
  afficherStock();
}


/* =============================================
   SECTION VENTES
   ============================================= */

/*
  afficherVentes(liste) :
  Même principe que afficherCatalogue(liste) :
  → paramètre optionnel → par défaut on affiche tous les produits en stock.
  → La recherche passera un tableau filtré.

  NOUVEAUTÉ — saisie directe de quantité :
  Au lieu de seulement les boutons +/-, on ajoute un champ input
  où l'utilisateur peut taper directement "12" pour 12 unités.
  L'événement oninput sur ce champ appelle setSaisieDirecte(id, valeur).
*/
function afficherVentes(liste = null) {
  /*
    Si aucune liste n'est passée, on prend toutes les boissons en stock.
    Si une liste filtrée est passée (depuis rechercherVentes), on l'utilise.
  */
  const disponibles = liste !== null
    ? liste
    : boissons.filter(b => b.stock > 0);

  const div = document.getElementById('liste-produits-vente');

  if (disponibles.length === 0) {
    div.innerHTML = '<p class="vide">Aucun produit trouvé.</p>';
    return;
  }

  div.innerHTML = disponibles.map(function(b) {
    const qte = panier[b.id] || 0;
    return `
      <div class="produit-vente">
        <div class="produit-nom">
          <strong>${b.nom}</strong>
          <small>${formatPrix(b.vente)} · Stock : ${b.stock}</small>
        </div>

        <!--
          NOUVEAUTÉ : contrôle de quantité amélioré.

          On garde les boutons − et + pour ajuster de 1 en 1.
          On AJOUTE un champ input numérique entre les deux
          pour saisir directement une quantité.

          oninput="setSaisieDirecte(${b.id}, this.value)" :
          → "this" fait référence à l'élément input lui-même.
          → "this.value" = ce que l'utilisateur a tapé dans ce champ.
          → setSaisieDirecte() mettra à jour le panier avec cette valeur.

          id="saisie-${b.id}" :
          → Identifiant unique pour chaque champ (un par boisson).
          → Les boutons +/- mettront aussi à jour ce champ visuellement.

          min="0" max="${b.stock}" :
          → Le navigateur empêche de saisir moins de 0 ou plus que le stock.
        -->
        <div class="qty-ctrl">
          <button onclick="modifierPanier(${b.id}, -1)">−</button>
          <input
            type="number"
            id="saisie-${b.id}"
            class="qty-input-direct"
            value="${qte}"
            min="0"
            max="${b.stock}"
            oninput="setSaisieDirecte(${b.id}, this.value)"
          />
          <button onclick="modifierPanier(${b.id}, +1)">+</button>
        </div>
      </div>`;
  }).join('');

  mettreAJourTicket();
}

/*
  ╔══════════════════════════════════════════════════════════╗
  ║  RECHERCHE VENTES — NOUVEAUTÉ                            ║
  ╚══════════════════════════════════════════════════════════╝

  rechercherVentes() fonctionne exactement comme rechercherCatalogue()
  mais elle filtre UNIQUEMENT les produits disponibles (stock > 0).

  Points importants :
  → On filtre d'abord les produits en stock, puis on applique
    le filtre de recherche par dessus.
  → Le panier (ticket à droite) n'est PAS effacé quand on cherche.
    Les articles déjà ajoutés restent dans le ticket.
  → Si l'utilisateur efface sa recherche, tous les produits
    disponibles réapparaissent.
*/
function rechercherVentes() {
  /* 1. Lire le texte tapé */
  const texte = document.getElementById('search-ventes').value.toLowerCase().trim();

  /* 2. Si vide → afficher tous les produits disponibles */
  if (texte === '') {
    afficherVentes();
    return;
  }

  /* 3. Filtrer parmi les produits en stock */
  const resultat = boissons
    .filter(b => b.stock > 0)             /* d'abord : seulement ceux en stock */
    .filter(b => b.nom.toLowerCase().includes(texte)); /* ensuite : recherche par nom */

  /* 4. Afficher seulement les résultats filtrés */
  afficherVentes(resultat);
}

/*
  ╔══════════════════════════════════════════════════════════╗
  ║  SAISIE DIRECTE DE QUANTITÉ — NOUVEAUTÉ                  ║
  ╚══════════════════════════════════════════════════════════╝

  setSaisieDirecte(id, valeurTexte) :
  Appelée quand l'utilisateur tape directement dans le champ input.

  Paramètres :
  → id          : l'id de la boisson concernée
  → valeurTexte : la valeur tapée (c'est encore un texte, pas un nombre)

  Étapes :
  1. Convertir le texte en nombre entier avec parseInt().
  2. Vérifier que c'est un nombre valide et dans les bornes.
  3. Mettre à jour le panier.
  4. Recalculer le ticket.

  On ne re-dessine PAS toute la liste afficherVentes() pour ne pas
  perdre le curseur dans le champ input (mauvaise expérience utilisateur).
*/
function setSaisieDirecte(id, valeurTexte) {
  const boisson = boissons.find(b => b.id === id);
  if (!boisson) return;

  /* parseInt convertit "12" en 12, ou "abc" en NaN */
  let qte = parseInt(valeurTexte);

  /* Si la valeur n'est pas un nombre (NaN) ou négative → 0 */
  if (isNaN(qte) || qte < 0) qte = 0;

  /* Ne pas dépasser le stock disponible */
  if (qte > boisson.stock) qte = boisson.stock;

  /* Mettre à jour le panier */
  if (qte === 0) {
    delete panier[id]; /* retire du panier si quantité = 0 */
  } else {
    panier[id] = qte;
  }

  /* Synchroniser la valeur affichée dans le champ (au cas où on a corrigé) */
  const champ = document.getElementById('saisie-' + id);
  if (champ) champ.value = qte;

  /* Recalculer le ticket */
  mettreAJourTicket();
}

/*
  modifierPanier(id, delta) — MISE À JOUR :
  Cette fonction existait déjà pour les boutons +/-.
  NOUVEAUTÉ : elle met aussi à jour le champ input numérique
  id="saisie-${id}" pour que l'affichage reste cohérent
  entre les boutons et le champ de saisie.
*/
function modifierPanier(id, delta) {
  const boisson = boissons.find(b => b.id === id);
  if (!boisson) return;

  const qteActuelle = panier[id] || 0;
  const nouvelleQte = Math.max(0, Math.min(boisson.stock, qteActuelle + delta));

  if (nouvelleQte === 0) delete panier[id];
  else panier[id] = nouvelleQte;

  /*
    NOUVEAUTÉ : on met à jour le champ input en plus.
    Sans ça, le champ resterait afficher l'ancienne valeur
    même après un clic sur + ou -.
  */
  const champ = document.getElementById('saisie-' + id);
  if (champ) champ.value = nouvelleQte;

  mettreAJourTicket();
}

/* Recalcule et affiche le ticket */
function mettreAJourTicket() {
  const detail = document.getElementById('ticket-detail');
  const lignes = Object.entries(panier);

  if (!lignes.length) {
    detail.innerHTML = '<p class="vide">Aucun article sélectionné</p>';
    document.getElementById('total-montant').textContent = '0 FCFA';
    document.getElementById('recap-bbc').textContent     = '0 FCFA';
    document.getElementById('recap-benef').textContent   = '0 FCFA';
    return;
  }

  let totalVente = 0, totalBBC = 0;

  detail.innerHTML = lignes.map(function([id, qte]) {
    const b = boissons.find(b => b.id === parseInt(id));
    if (!b) return '';
    const sousTotal = b.vente * qte;
    totalVente += sousTotal;
    totalBBC   += b.bbc * qte;
    return `
      <div class="ticket-ligne">
        <span>${b.nom} <small style="color:#888">×${qte}</small></span>
        <span class="ticket-ligne-prix">${formatPrix(sousTotal)}</span>
      </div>`;
  }).join('');

  document.getElementById('total-montant').textContent = formatPrix(totalVente);
  document.getElementById('recap-bbc').textContent     = formatPrix(totalBBC);
  document.getElementById('recap-benef').textContent   = formatPrix(totalVente - totalBBC);
}

/* Valider la vente */
function validerVente() {
  const lignes = Object.entries(panier);
  if (!lignes.length) { alert('❌ Le panier est vide !'); return; }

  let totalVente = 0, totalBBC = 0;
  const articlesVendus = [];

  lignes.forEach(function([id, qte]) {
    const b = boissons.find(b => b.id === parseInt(id));
    if (!b) return;
    b.stock    -= qte;
    totalVente += b.vente * qte;
    totalBBC   += b.bbc * qte;
    articlesVendus.push({ nom: b.nom, qte, prixUnitaire: b.vente });
  });

  historique.unshift({
    date:     new Date().toLocaleString('fr-FR'),
    articles: articlesVendus,
    total:    totalVente,
    benef:    totalVente - totalBBC,
  });

  panier = {};
  sauvegarder();
  alert(`✅ Vente validée !\nTotal : ${formatPrix(totalVente)}\nBénéfice : ${formatPrix(totalVente - totalBBC)}`);
  afficherVentes();
}

/* Annuler la vente */
function annulerVente() {
  panier = {};
  afficherVentes();
}


/* =============================================
   SECTION HISTORIQUE
   ============================================= */
function afficherHistorique() {
  const totalCA    = historique.reduce((acc, h) => acc + h.total, 0);
  const totalBenef = historique.reduce((acc, h) => acc + h.benef, 0);

  document.getElementById('stats-historique').innerHTML = `
    <div class="stat-box"><div class="stat-label">Nombre de ventes</div><div class="stat-value">${historique.length}</div></div>
    <div class="stat-box"><div class="stat-label">Chiffre d'affaires</div><div class="stat-value vert">${formatPrix(totalCA)}</div></div>
    <div class="stat-box"><div class="stat-label">Bénéfice total</div><div class="stat-value vert">${formatPrix(totalBenef)}</div></div>
  `;

  const liste = document.getElementById('liste-historique');
  if (!historique.length) { liste.innerHTML = '<p class="vide">Aucune vente enregistrée</p>'; return; }

  liste.innerHTML = historique.map(function(vente, index) {
    const num    = historique.length - index;
    const detail = vente.articles.map(a => `${a.nom} ×${a.qte}`).join(' · ');
    return `
      <div class="histo-item">
        <div class="histo-header">
          <span class="histo-num">Vente #${num}</span>
          <span class="histo-date">📅 ${vente.date}</span>
        </div>
        <div class="histo-detail">${detail}</div>
        <div class="histo-totaux">
          <span>Total : <strong>${formatPrix(vente.total)}</strong></span>
          <span>Bénéfice : <strong class="vert">${formatPrix(vente.benef)}</strong></span>
        </div>
      </div>`;
  }).join('');
}

function effacerHistorique() {
  if (!confirm("Effacer tout l'historique ?")) return;
  historique = [];
  sauvegarder();
  afficherHistorique();
}


/* =============================================
   INITIALISATION AU CHARGEMENT
   ============================================= */
window.addEventListener('DOMContentLoaded', function() {
  afficherCatalogue();
});
