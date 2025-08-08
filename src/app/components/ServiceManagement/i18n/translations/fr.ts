const frTranslations = {
  app: {
    title: 'Portail Client',
    theme: {
      light: 'Mode Clair',
      dark: 'Mode Sombre',
      colors: 'Couleurs du Thème'
    },
    font: {
      family: 'Famille de Police'
    },
    menu: {
      logout: 'Déconnexion',
      selectLanguage: 'Choisir la Langue'
    }
  },
  languages: {
    en: 'Anglais',
    hi: 'Hindi',
    fr: 'Français'
  },
  common: {
    search: 'Rechercher',
    loading: 'Chargement...',
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    actions: 'Actions',
    view: 'Voir',
    success: 'Succès',
    error: 'Erreur',
    warning: 'Avertissement',
    info: 'Information',
  },
  auth: {
    login: 'Connexion',
    logout: 'Déconnexion',
    email: 'Email',
    password: 'Mot de passe',
    forgotPassword: 'Mot de passe oublié?',
    register: 'S\'inscrire',
    accountSettings: 'Paramètres du compte',
    profile: 'Profil'
  },
  dashboard: {
    title: 'Tableau de bord',
    welcome: 'Bienvenue sur le portail client {tenant}',
    stats: {
      totalInvoices: 'Total des Factures',
      pendingPayments: 'Paiements en Attente',
      totalCustomers: 'Total des Clients',
      activeProducts: 'Produits Actifs'
    },
    recentActivity: {
      title: 'Activité Récente',
      viewAll: 'Voir Toutes les Activités',
      status: {
        completed: 'Terminé',
        pending: 'En attente',
        failed: 'Échoué'
      }
    },
    upcomingInvoices: {
      title: 'Factures à Venir',
      viewAll: 'Voir Toutes les Factures',
      columns: {
        id: 'ID Facture',
        customer: 'Client',
        amount: 'Montant',
        dueDate: 'Date d\'échéance',
        actions: 'Actions'
      },
      actions: {
        view: 'Voir',
        pay: 'Payer'
      }
    },
    serviceUsage: {
      title: 'Résumé d\'Utilisation du Service',
      placeholder: 'Emplacement du graphique - La visualisation des données d\'utilisation du service apparaîtrait ici'
    }
  },
  sidenav: {
    search: 'Rechercher dans le menu',
    items: {
      dashboard: 'Tableau de bord',
      serviceTickets: 'Tickets de Service',
      configuration: 'Configuration'
    }
  },
};

export default frTranslations;
