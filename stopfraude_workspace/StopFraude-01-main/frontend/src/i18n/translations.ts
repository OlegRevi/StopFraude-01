export const translations = {
  en: {
    // Welcome Screen
    welcome: {
      title: "Protect Your Loved Ones From Phone Scams",
      subtitle: "AI-powered protection that alerts your family when suspicious calls are detected",
      getStarted: "Get Started",
      features: {
        detect: "Detect scam calls automatically",
        alert: "Alert family members instantly",
        protect: "24/7 protection for loved ones"
      }
    },
    // Permissions Screen
    permissions: {
      title: "We Need Your Permission",
      subtitle: "To protect you from scams, we need access to:",
      contacts: {
        title: "Contacts",
        description: "To select emergency contacts from your phone"
      },
      phone: {
        title: "Phone",
        description: "To detect incoming calls"
      },
      microphone: {
        title: "Microphone",
        description: "To record suspicious calls"
      },
      notifications: {
        title: "Notifications",
        description: "To run protection in background"
      },
      readPhoneNumbers: {
        title: "Phone Number",
        description: "To identify your number and detect spoofed calls"
      },
      answerCalls: {
        title: "Answer Calls",
        description: "To automatically reject confirmed scam calls"
      },
      systemAlert: {
        title: "Display Over Apps",
        description: "To show scam warnings on top of any screen during a call"
      },
      grant: "Grant Permission",
      continue: "Continue",
      granted: "Granted",
      allGranted: "All permissions granted!"
    },
    // Emergency Contacts Screen
    contacts: {
      title: "Emergency Contacts",
      subtitle: "Who should we alert if a scam is detected?",
      searchPlaceholder: "Search your contacts...",
      selected: "contacts selected",
      max: "Maximum 5 contacts allowed",
      min: "Select at least 1 contact",
      continue: "Continue",
      note: "Only contacts already in your phone can be added"
    },
    // User Profile Screen
    profile: {
      title: "Tell us about you",
      subtitle: "We'll include this in alerts so your emergency contacts know exactly who needs help.",
      nameLabel: "Full Name",
      namePlaceholder: "e.g. Ion Popescu",
      phoneLabel: "Phone Number",
      phoneHelper: "Use international format, e.g. +373XXXXXXXX",
      emailLabel: "Email",
      optional: "optional",
      info: "Emergency contacts will see your name and number in every scam alert SMS and email.",
      continue: "Continue",
      errors: {
        title: "Missing info",
        fixFields: "Please fix the highlighted fields to continue.",
        nameRequired: "Please enter your name",
        nameTooShort: "Name must be at least 2 characters",
        phoneRequired: "Please enter your phone number",
        phoneInvalid: "Invalid phone number format",
        emailInvalid: "Invalid email address"
      }
    },
    // Setup Complete Screen
    complete: {
      title: "Protection Activated",
      subtitle: "We'll monitor calls from unknown numbers",
      alertContacts: "These people will receive alerts:",
      testCall: "Test with Sample Call",
      goDashboard: "Go to Dashboard"
    },
    // Dashboard Screen
    dashboard: {
      title: "StopFrauda",
      protected: "Protected",
      notActive: "Not Active",
      watchingCalls: "We're watching for suspicious calls",
      protectionOff: "Protection is off",
      callContact: "Call",
      viewCalls: "View Recent Calls",
      testScamCall: "Test Scam Detection"
    },
    // Call History Screen
    history: {
      title: "Call History",
      empty: "No calls recorded yet",
      emptySubtitle: "Calls from unknown numbers will appear here",
      scam: "SCAM",
      safe: "SAFE",
      analyzing: "Analyzing..."
    },
    // Settings Screen
    settings: {
      title: "Settings",
      language: "Language",
      emergencyContacts: "Emergency Contacts",
      protection: "Protection Status",
      active: "Active",
      inactive: "Inactive",
      about: "About StopFrauda",
      version: "Version 1.0.0"
    },
    // Common
    common: {
      back: "Back",
      next: "Next",
      save: "Save",
      cancel: "Cancel",
      loading: "Loading...",
      error: "An error occurred",
      retry: "Retry"
    },
    // Scam Types
    scamTypes: {
      bank_impersonation: "Bank Impersonation",
      police_scam: "Police Scam",
      utility_scam: "Utility Company Scam",
      family_emergency: "Family Emergency Scam",
      lottery: "Lottery/Prize Scam",
      tech_support: "Tech Support Scam",
      unknown: "Unknown",
      legitimate: "Legitimate Call"
    }
  },
  ro: {
    // Welcome Screen
    welcome: {
      title: "Protejați-vă familia de înșelătorii telefonice",
      subtitle: "Protecție alimentată de AI care alertează familia când sunt detectate apeluri suspecte",
      getStarted: "Începe",
      features: {
        detect: "Detectează automat apelurile frauduloase",
        alert: "Alertează instant membrii familiei",
        protect: "Protecție 24/7 pentru cei dragi"
      }
    },
    // Permissions Screen
    permissions: {
      title: "Avem nevoie de permisiunea ta",
      subtitle: "Pentru a te proteja de înșelătorii, avem nevoie de acces la:",
      contacts: {
        title: "Contacte",
        description: "Pentru a selecta contactele de urgență"
      },
      phone: {
        title: "Telefon",
        description: "Pentru a detecta apelurile primite"
      },
      microphone: {
        title: "Microfon",
        description: "Pentru a înregistra apelurile suspecte"
      },
      notifications: {
        title: "Notificări",
        description: "Pentru a rula protecția în fundal"
      },
      readPhoneNumbers: {
        title: "Număr de telefon",
        description: "Pentru a identifica numărul tău și a detecta apelurile falsificate"
      },
      answerCalls: {
        title: "Răspunde la apeluri",
        description: "Pentru a respinge automat apelurile frauduloase confirmate"
      },
      systemAlert: {
        title: "Afișare peste aplicații",
        description: "Pentru a afișa avertismente de fraudă deasupra oricărui ecran în timpul apelului"
      },
      grant: "Acordă permisiunea",
      continue: "Continuă",
      granted: "Acordat",
      allGranted: "Toate permisiunile acordate!"
    },
    // Emergency Contacts Screen
    contacts: {
      title: "Contacte de urgență",
      subtitle: "Pe cine să alertăm dacă detectăm o înșelătorie?",
      searchPlaceholder: "Caută în contacte...",
      selected: "contacte selectate",
      max: "Maximum 5 contacte permise",
      min: "Selectează cel puțin 1 contact",
      continue: "Continuă",
      note: "Doar contactele din telefon pot fi adăugate"
    },
    // User Profile Screen
    profile: {
      title: "Spune-ne despre tine",
      subtitle: "Vom include aceste date în alerte, pentru ca contactele tale de urgență să știe exact cine are nevoie de ajutor.",
      nameLabel: "Nume complet",
      namePlaceholder: "ex. Ion Popescu",
      phoneLabel: "Număr de telefon",
      phoneHelper: "Folosește format internațional, ex. +373XXXXXXXX",
      emailLabel: "Email",
      optional: "opțional",
      info: "Contactele de urgență vor vedea numele și numărul tău în fiecare SMS și email de alertă.",
      continue: "Continuă",
      errors: {
        title: "Lipsesc informații",
        fixFields: "Te rugăm să corectezi câmpurile evidențiate.",
        nameRequired: "Introdu numele tău",
        nameTooShort: "Numele trebuie să aibă cel puțin 2 caractere",
        phoneRequired: "Introdu numărul tău de telefon",
        phoneInvalid: "Format de telefon invalid",
        emailInvalid: "Adresă de email invalidă"
      }
    },
    // Setup Complete Screen
    complete: {
      title: "Protecție Activată",
      subtitle: "Vom monitoriza apelurile de la numere necunoscute",
      alertContacts: "Aceste persoane vor primi alerte:",
      testCall: "Testează cu un apel demonstrativ",
      goDashboard: "Mergi la Tablou de bord"
    },
    // Dashboard Screen
    dashboard: {
      title: "StopFrauda",
      protected: "Protejat",
      notActive: "Inactiv",
      watchingCalls: "Monitorizăm apelurile suspecte",
      protectionOff: "Protecția este dezactivată",
      callContact: "Sună",
      viewCalls: "Vezi apelurile recente",
      testScamCall: "Testează detectarea înșelătoriilor"
    },
    // Call History Screen
    history: {
      title: "Istoric apeluri",
      empty: "Niciun apel înregistrat încă",
      emptySubtitle: "Apelurile de la numere necunoscute vor apărea aici",
      scam: "FRAUDĂ",
      safe: "SIGUR",
      analyzing: "Se analizează..."
    },
    // Settings Screen
    settings: {
      title: "Setări",
      language: "Limbă",
      emergencyContacts: "Contacte de urgență",
      protection: "Stare protecție",
      active: "Activ",
      inactive: "Inactiv",
      about: "Despre StopFrauda",
      version: "Versiunea 1.0.0"
    },
    // Common
    common: {
      back: "Înapoi",
      next: "Următorul",
      save: "Salvează",
      cancel: "Anulează",
      loading: "Se încarcă...",
      error: "A apărut o eroare",
      retry: "Reîncearcă"
    },
    // Scam Types
    scamTypes: {
      bank_impersonation: "Falsificare Bancă",
      police_scam: "Fraudă Poliție",
      utility_scam: "Fraudă Utilități",
      family_emergency: "Urgență Familie Falsă",
      lottery: "Fraudă Loterie/Premiu",
      tech_support: "Fraudă Suport Tehnic",
      unknown: "Necunoscut",
      legitimate: "Apel Legitim"
    }
  }
};

export type Language = 'en' | 'ro';
export type TranslationKey = keyof typeof translations.en;
