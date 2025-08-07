// languageUtils.ts

// Available languages
export const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ar', name: 'Arabic' }
];

// Translation data
const translations: Record<string, Record<string, any>> = {
  en: {
    app: {
      title: 'Qrosity',
      menu: {
        profile: 'Profile',
        settings: 'Settings',
        logout: 'Logout'
      },
      theme: {
        light: 'Light Mode',
        dark: 'Dark Mode',
        colors: 'Theme Colors'
      },
      search: 'Search menu...'
    },
    languages: {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      hi: 'Hindi',
      ar: 'Arabic'
    },
    sidenav: {
      aiPlatform: 'AI Platform',
      tenantAdmin: 'Tenant Admin',
      serviceManagement: 'Service Management',
      engagement: 'Engagement',
      crm: 'CRM',
      masters: 'Masters',
      customer: 'Customer',
      inventory: 'Inventory',
      pricing: 'Pricing',
      configuration: 'Settings',
      product: 'Product',
      orders: 'Orders',
      checkout: 'Checkout',
      opportunities: 'Opportunities',
      paymentMethods: 'Payment Methods',
      items: {
        aiPlatform: 'AI Platform',
        webhooks: 'Webhooks',
        promptTemplate: 'Prompt Template',
        workbench: 'Workbench',
        apiKey: 'API Key',
        apiCredits: 'API Credits',
        roleManagement: 'Role Management',
        userManagement: 'User Management',

       "usersManagement": "Users Management",
       "invoicing": "Invoicing",
       "subscriptions": "Subscriptions",
       "geofences": "Geofences",
       "sources" : "Sources",
       "settings" : "Tenant Settings",
       "paymentGateway": "Payment Gateway",
       "bankAccount": "Bank Account",
       "configurations" : "Configurations",
      


        dashboard: 'Dashboard',
        contacts: 'Contacts',
        deals: 'Deals',
        leads: 'Leads',
        roles: 'Roles',
        inventory: 'Inventory',
        orders: 'Orders',
        invoices: 'Invoices',
        accounts: 'Accounts',
        customerGroups: 'Customer Groups',
        adjustmentHistory: 'Adjustment History',
        adjustmentReasons: 'Adjustment Reasons',
        locations: 'Locations',
        serializedInventory: 'Serialized Inventory',
        lotInventory: 'Lot Inventory',
        divisions: 'Divisions',
        categories: 'Categories',
        subcategories: 'Subcategories',
        products: 'Products',
        unitOfMeasurement: 'Unit of Measurement',
        productStatuses: 'Product Statuses',
        attributeGroups: 'Attribute Groups',
        attributes: 'Attributes',
        sellingChannels: 'Selling Channels',
        taxRegions: 'Tax Regions',
        taxRates: 'Tax Rates',
        taxRateProfiles: 'Tax Rate Profiles',
        onboarding: 'Onboarding',
        configuration: 'Store Settings',
        storeConfiguration: 'Global Layout',
        pageManagement: 'Landing Page',
        countries: 'Countries',
        currencies: 'Currencies',
        storePickup: 'Store Pickup',
        timeSlots: 'Time Slots',
        shippingMethods: 'Shipping Methods',
        paymentMethods: 'Payment Methods',
        opportunities: "Opportunities",
        opportunityStages: "Sale Stages",
        opportunityProcesses: "Sale Processes",
        opportunityRoles: "Roles",
        opportunityStatuses: "Statuses",
        opportunityTypes: "Types",
        opportunityLeadSources: "Lead Sources",
        shippingZones: "Shipping Zones",
      }
    }
  },
  es: {
    app: {
      title: 'Qrosity',
      menu: {
        profile: 'Perfil',
        settings: 'Configuración',
        logout: 'Cerrar sesión'
      },
      theme: {
        light: 'Modo Claro',
        dark: 'Modo Oscuro',
        colors: 'Colores de Tema'
      },
      search: 'Buscar menú...'
    },
    languages: {
      en: 'Inglés',
      es: 'Español',
      fr: 'Francés',
      de: 'Alemán',
      hi: 'Hindi',
      ar: 'Árabe'
    },
    sidenav: {
      crm: 'CRM',
      masters: 'Maestros',
      customer: 'Cliente',
      inventory: 'Inventario',
      pricing: 'Precios',
      configuration: 'Ajustes',
      product: 'Producto',
      orders: 'Pedidos',
      checkout: 'Pago',
      paymentMethods: 'Métodos de pago',
      items: {
        dashboard: 'Panel de Control',
        contacts: 'Contactos',
        deals: 'Negocios',
        leads: 'Clientes Potenciales',
        roles: 'Roles',
        inventory: 'Inventario',
        orders: 'Pedidos',
        invoices: 'Facturas',
        accounts: 'Cuentas',
        customerGroups: 'Grupos de Clientes',
        adjustmentHistory: 'Historial de Ajustes',
        adjustmentReasons: 'Razones de Ajuste',
        locations: 'Ubicaciones',
        serializedInventory: 'Inventario Serializado',
        lotInventory: 'Inventario de Lotes',
        divisions: 'Divisiones',
        categories: 'Categorías',
        subcategories: 'Subcategorías',
        products: 'Productos',
        unitOfMeasurement: 'Unidad de Medida',
        productStatuses: 'Estados de Producto',
        attributeGroups: 'Grupos de Atributos',
        attributes: 'Atributos',
        sellingChannels: 'Canales de Venta',
        taxRegions: 'Regiones Fiscales',
        taxRates: 'Tasas de Impuestos',
        taxRateProfiles: 'Perfiles de Tasas de Impuestos',
        onboarding: 'Incorporación',
        configuration: 'Configuración de Tienda',
        storeConfiguration: 'Diseño Global',
        pageManagement: 'Página de Destino',
        countries: 'Países',
        currencies: 'Monedas',
        storePickup: 'Recogida en tienda',
        timeSlots: 'Slots de tiempo',
        shippingMethods: 'Métodos de envío',
        shippingZones: 'Zonas de envío',
      }
    }
  },
  fr: {
    app: {
      title: 'Qrosity',
      menu: {
        profile: 'Profil',
        settings: 'Paramètres',
        logout: 'Déconnexion'
      },
      theme: {
        light: 'Mode Clair',
        dark: 'Mode Sombre',
        colors: 'Couleurs du Thème'
      },
      search: 'Rechercher dans le menu...'
    },
    languages: {
      en: 'Anglais',
      es: 'Espagnol',
      fr: 'Français',
      de: 'Allemand',
      hi: 'Hindi',
      ar: 'Arabe'
    },
    sidenav: {
      crm: 'CRM',
      masters: 'Maîtres',
      customer: 'Client',
      inventory: 'Inventaire',
      pricing: 'Tarification',
      configuration: 'Paramètres',
      product: 'Produit',
      orders: 'Commandes',
      checkout: 'Paiement',
      paymentMethods: 'Moyens de paiement',
      items: {
        dashboard: 'Tableau de Bord',
        contacts: 'Contacts',
        deals: 'Affaires',
        leads: 'Prospects',
        roles: 'Rôles',
        inventory: 'Inventaire',
        orders: 'Commandes',
        invoices: 'Factures',
        accounts: 'Comptes',
        customerGroups: 'Groupes de Clients',
        adjustmentHistory: 'Historique des Ajustements',
        adjustmentReasons: 'Motifs d\'Ajustement',
        locations: 'Emplacements',
        serializedInventory: 'Inventaire Sérialisé',
        lotInventory: 'Inventaire par Lot',
        divisions: 'Divisions',
        categories: 'Catégories',
        subcategories: 'Sous-catégories',
        products: 'Produits',
        unitOfMeasurement: 'Unité de Mesure',
        productStatuses: 'Statuts de Produit',
        attributeGroups: 'Groupes d\'Attributs',
        attributes: 'Attributs',
        sellingChannels: 'Canaux de Vente',
        taxRegions: 'Régions Fiscales',
        taxRates: 'Taux de Taxe',
        taxRateProfiles: 'Profils de Taux de Taxe',
        onboarding: 'Intégration',
        configuration: 'Paramètres du Magasin',
        storeConfiguration: 'Mise en Page Globale',
        pageManagement: 'Page d\'Accueil',
        countries: 'Pays',
        currencies: 'Devises',
        storePickup: 'Recogida en tienda',
        timeSlots: 'Slots de tiempo',
        shippingMethods: 'Métodos de envío',
        shippingZones: 'Zonas de envío',
      }
    }
  },
  de: {
    app: {
      title: 'Qrosity',
      menu: {
        profile: 'Profil',
        settings: 'Einstellungen',
        logout: 'Abmelden'
      },
      theme: {
        light: 'Heller Modus',
        dark: 'Dunkler Modus',
        colors: 'Themenfarben'
      },
      search: 'Menü durchsuchen...'
    },
    languages: {
      en: 'Englisch',
      es: 'Spanisch',
      fr: 'Französisch',
      de: 'Deutsch',
      hi: 'Hindi',
      ar: 'Arabisch'
    },
    sidenav: {
      crm: 'CRM',
      masters: 'Meister',
      customer: 'Kunde',
      inventory: 'Inventar',
      pricing: 'Preisgestaltung',
      configuration: 'Einstellungen',
      product: 'Produkt',
      orders: 'Bestellungen',
      storePickup: 'Abholung im Geschäft',
      paymentMethods: 'Zahlungsmethoden',
      items: {
        dashboard: 'Dashboard',
        contacts: 'Kontakte',
        deals: 'Geschäfte',
        leads: 'Leads',
        roles: 'Rollen',
        inventory: 'Inventar',
        orders: 'Bestellungen',
        invoices: 'Rechnungen',
        accounts: 'Konten',
        customerGroups: 'Kundengruppen',
        adjustmentHistory: 'Anpassungsverlauf',
        adjustmentReasons: 'Anpassungsgründe',
        locations: 'Standorte',
        serializedInventory: 'Serialisiertes Inventar',
        lotInventory: 'Chargeninventar',
        divisions: 'Abteilungen',
        categories: 'Kategorien',
        subcategories: 'Unterkategorien',
        products: 'Produkte',
        unitOfMeasurement: 'Maßeinheit',
        productStatuses: 'Produktstatus',
        attributeGroups: 'Attributgruppen',
        attributes: 'Attribute',
        sellingChannels: 'Verkaufskanäle',
        taxRegions: 'Steuerregionen',
        taxRates: 'Steuersätze',
        taxRateProfiles: 'Steuersatzprofile',
        onboarding: 'Einarbeitung',
        storeConfiguration: 'Globales Layout',
        configuration: 'Shopeinstellungen',
        pageManagement: 'Zielseite',
        countries: 'Länder',
        currencies: 'Währungen',
        storePickup: 'Recogida en tienda',
        timeSlots: 'Slots de tiempo',
        shippingMethods: 'Métodos de envío',
      }
    }
  },
  hi: {
    app: {
      title: 'क्रोसिटी',
      menu: {
        profile: 'प्रोफाइल',
        settings: 'सेटिंग्स',
        logout: 'लॉगआउट'
      },
      theme: {
        light: 'लाइट मोड',
        dark: 'डार्क मोड',
        colors: 'थीम रंग'
      },
      search: 'मेनू खोजें...'
    },
    languages: {
      en: 'अंग्रेज़ी',
      es: 'स्पेनिश',
      fr: 'फ्रेंच',
      de: 'जर्मन',
      hi: 'हिंदी',
      ar: 'अरबी'
    },
    sidenav: {
      crm: 'सीआरएम',
      masters: 'मास्टर्स',
      customer: 'ग्राहक',
      inventory: 'इन्वेंटरी',
      pricing: 'मूल्य निर्धारण',
      configuration: 'सेटिंग्स',
      product: 'उत्पाद',
      orders: 'आदेश',
      items: {
        dashboard: 'डैशबोर्ड',
        contacts: 'संपर्क',
        deals: 'सौदे',
        leads: 'लीड्स',
        roles: 'भूमिकाएँ',
        inventory: 'इन्वेंटरी',
        orders: 'आदेश',
        invoices: 'चालान',
        accounts: 'खाते',
        customerGroups: 'ग्राहक समूह',
        adjustmentHistory: 'समायोजन इतिहास',
        adjustmentReasons: 'समायोजन के कारण',
        locations: 'स्थान',
        serializedInventory: 'क्रमबद्ध इन्वेंटरी',
        lotInventory: 'लॉट इन्वेंटरी',
        divisions: 'विभाग',
        categories: 'श्रेणियाँ',
        subcategories: 'उपश्रेणियाँ',
        products: 'उत्पाद',
        unitOfMeasurement: 'माप की इकाई',
        productStatuses: 'उत्पाद स्थितियाँ',
        attributeGroups: 'विशेषता समूह',
        attributes: 'विशेषताएँ',
        sellingChannels: 'बिक्री चैनल',
        taxRegions: 'कर क्षेत्र',
        taxRates: 'कर दरें',
        taxRateProfiles: 'कर दर प्रोफाइल',
        onboarding: 'ऑनबोर्डिंग',
        configuration: 'स्टोर सेटिंग्स',
        storeConfiguration: 'वैश्विक लेआउट',
        pageManagement: 'लैंडिंग पेज',
        countries: 'देश',
        currencies: 'मुद्राएँ',
        shippingMethods: 'शिपिंग विधियाँ',
        paymentMethods: 'भुगतान के तरीके',
        shippingZones: 'शिपिंग जोन्स',
      }
    }
  },
  ar: {
    app: {
      title: 'كروسيتي',
      menu: {
        profile: 'الملف الشخصي',
        settings: 'الإعدادات',
        logout: 'تسجيل الخروج'
      },
      theme: {
        light: 'الوضع الفاتح',
        dark: 'الوضع الداكن',
        colors: 'ألوان السمة'
      },
      search: 'البحث في القائمة...'
    },
    languages: {
      en: 'الإنجليزية',
      es: 'الإسبانية',
      fr: 'الفرنسية',
      de: 'الألمانية',
      hi: 'الهندية',
      ar: 'العربية'
    },
    sidenav: {
      crm: 'إدارة علاقات العملاء',
      masters: 'الإدارة الرئيسية',
      customer: 'العميل',
      inventory: 'المخزون',
      pricing: 'التسعير',
      configuration: 'الإعدادات',
      product: 'المنتج',
      orders: 'الطلبات',
      items: {
        dashboard: 'لوحة التحكم',
        contacts: 'جهات الاتصال',
        deals: 'الصفقات',
        leads: 'العملاء المحتملين',
        roles: 'الأدوار',
        inventory: 'المخزون',
        orders: 'الطلبات',
        invoices: 'الفواتير',
        accounts: 'الحسابات',
        customerGroups: 'مجموعات العملاء',
        adjustmentHistory: 'سجل التعديلات',
        adjustmentReasons: 'أسباب التعديل',
        locations: 'المواقع',
        serializedInventory: 'المخزون التسلسلي',
        lotInventory: 'مخزون الدُفعات',
        divisions: 'الأقسام',
        categories: 'الفئات',
        subcategories: 'الفئات الفرعية',
        products: 'المنتجات',
        unitOfMeasurement: 'وحدة القياس',
        productStatuses: 'حالات المنتج',
        attributeGroups: 'مجموعات السمات',
        attributes: 'السمات',
        sellingChannels: 'قنوات البيع',
        taxRegions: 'المناطق الضريبية',
        taxRates: 'معدلات الضرائب',
        taxRateProfiles: 'ملفات تعريف معدلات الضرائب',
        onboarding: 'الإعداد',
        configuration: 'إعدادات المتجر',
        storeConfiguration: 'تخطيط عام',
        pageManagement: 'الصفحة المقصودة',
        countries: 'الدول',
        currencies: 'العملات',
        shippingMethods: 'طرق الشحن',
        paymentMethods: 'طرق الدفع'
      }
    }
  }
};

// Get translation for a key
export function getTranslation(key: string, language?: string): string {
  const currentLang = language || getCurrentLanguage();

  // Split the key by dots to navigate the nested object
  const keys = key.split('.');
  let result = translations[currentLang];

  // Navigate through the nested object
  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = result[k];
    } else {
      // If translation not found, return the key
      return key;
    }
  }

  return typeof result === 'string' ? result : key;
}

// Get current language from localStorage or browser
export function getCurrentLanguage(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('appLanguage') ||
           navigator.language.split('-')[0] ||
           'en';
  }
  return 'en';
}

// Set language
export function setLanguage(lang: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('appLanguage', lang);
    // Force a reload to apply the language change
    window.location.reload();
  }
}