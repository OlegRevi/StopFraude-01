export type SupportedLanguage = 'ro' | 'en';

export interface Translations {
  // Navigation / Tabs
  tabDashboard: string;
  tabGuardians: string;
  tabSettings: string;

  // Welcome Screen
  welcomeTagline: string;
  welcomeFeature1: string;
  welcomeFeature2: string;
  welcomeFeature3: string;
  welcomeActivateBtn: string;
  welcomeLanguageLabel: string;

  // Permissions Screen
  permStepBadge: string;
  permTitle: string;
  permSubtitle: string;
  permContactsTitle: string;
  permContactsDesc: string;
  permPhoneTitle: string;
  permPhoneDesc: string;
  permNotifTitle: string;
  permNotifDesc: string;
  permContinueBtn: string;

  // Contact Picker Screen
  contactsStepBadge: string;
  contactsTitle: string;
  contactsSubtitle: string;
  contactsSearchPlaceholder: string;
  contactsInfoBanner: string;
  contactsSelectedLabel: string;
  contactsEmptyTitle: string;
  contactsEmptySubtext: string;
  contactsMandatoryNotice: string;
  contactsContinueBtn: string;
  contactsContinueSelected: string;
  contactsAlertRequiredTitle: string;
  contactsAlertRequiredMsg: string;
  contactsMaxReachedTitle: string;
  contactsMaxReachedMsg: string;

  // Paywall / Plans Screen
  paywallStepBadge: string;
  paywallTitle: string;
  paywallSubtitle: string;
  paywallPromoTitle: string;
  paywallPromoDesc: string;
  paywallEarlyBirdBadge: string;
  paywallEarlyBirdTitle: string;
  paywallEarlyBirdPrice: string;
  paywallEarlyBirdPeriod: string;
  paywallEarlyBirdDesc: string;
  paywallAnnualBadge: string;
  paywallAnnualTitle: string;
  paywallAnnualPrice: string;
  paywallAnnualPeriod: string;
  paywallAnnualDesc: string;
  paywallBenefit1: string;
  paywallBenefit2: string;
  paywallBenefit3: string;
  paywallBenefit4: string;
  paywallContinueBtn: string;
  paywallActivating: string;

  // Setup Complete Screen
  setupStepBadge: string;
  setupTitle: string;
  setupSubtitle: string;
  setupSmsHeader: string;
  setupSmsSending: string;
  setupSmsSuccess: string;
  setupSimTitle: string;
  setupSimSubtitle: string;
  setupSimUnknownBtn: string;
  setupSimSafeBtn: string;
  setupGoDashboardBtn: string;

  // Dashboard Screen
  dashProtectionActive: string;
  dashProtectionDesc: string;
  dashGuardiansCount: string;
  dashSimTitle: string;
  dashSimSubtitle: string;
  dashSimUnknownBtn: string;
  dashSimSafeBtn: string;
  dashRecentCalls: string;
  dashNoCalls: string;
  dashNoCallsSubtext: string;
  dashSafeCall: string;
  dashUnknownCall: string;

  // Guardians Screen
  guardiansTitle: string;
  guardiansSubtitle: string;
  guardiansAddBtn: string;
  guardiansEmptyTitle: string;
  guardiansEmptySubtext: string;
  guardiansDeleteConfirmTitle: string;
  guardiansDeleteConfirmMsg: string;
  guardiansDeleteBtn: string;
  guardiansCancelBtn: string;

  // Settings Screen
  settingsTitle: string;
  settingsLanguageHeader: string;
  settingsLanguageDesc: string;
  settingsPlanHeader: string;
  settingsPlanActive: string;
  settingsAutoRejectHeader: string;
  settingsAutoRejectDesc: string;
  settingsBackendHeader: string;
  settingsBackendSaveBtn: string;
  settingsBackendSavedAlert: string;
  settingsResetHeader: string;
  settingsResetDesc: string;
  settingsResetBtn: string;
  settingsResetConfirmTitle: string;
  settingsResetConfirmMsg: string;

  // Common
  cancel: string;
  back: string;
  save: string;
  active: string;
}

export const translations: Record<SupportedLanguage, Translations> = {
  ro: {
    // Navigation / Tabs
    tabDashboard: 'Scut',
    tabGuardians: 'Gardieni',
    tabSettings: 'Setări',

    // Welcome Screen
    welcomeTagline: 'Protejează-ți familia de apelurile de tip fraudă',
    welcomeFeature1: 'Detectare automată a apelurilor suspecte',
    welcomeFeature2: 'Alerte SMS instant către cei dragi',
    welcomeFeature3: 'Protecție 24/7 în fundal',
    welcomeActivateBtn: 'Activează Scutul Antifraudă',
    welcomeLanguageLabel: 'Limbă',

    // Permissions Screen
    permStepBadge: 'PASUL 2 DIN 5',
    permTitle: 'Avem Nevoie de Permisiuni',
    permSubtitle: 'Pentru a te proteja de escrocherii, avem nevoie de acces la:',
    permContactsTitle: 'Contacte',
    permContactsDesc: 'Pentru a verifica numerele necunoscute și a alege gardienii',
    permPhoneTitle: 'Telefon & Filtrare Apeluri',
    permPhoneDesc: 'Pentru a detecta apelurile primite în timp real',
    permNotifTitle: 'Notificări',
    permNotifDesc: 'Pentru a te alerta imediat când sună un număr suspect',
    permContinueBtn: 'Continuă',

    // Contact Picker Screen
    contactsStepBadge: 'PASUL 3 DIN 5',
    contactsTitle: 'Gardieni de Urgență',
    contactsSubtitle: 'Pe cine să alertăm când este detectat un apel suspect?',
    contactsSearchPlaceholder: 'Caută în contactele tale...',
    contactsInfoBanner: 'Doar contactele existente în telefon pot fi adăugate',
    contactsSelectedLabel: 'Selectați',
    contactsEmptyTitle: 'Nu s-au găsit contacte',
    contactsEmptySubtext: 'Asigură-te că permisiunea pentru contacte este activată.',
    contactsMandatoryNotice: '⚠️ Cel puțin 1 gardian de urgență este obligatoriu',
    contactsContinueBtn: 'Selectează cel puțin 1 gardian',
    contactsContinueSelected: 'Continuă cu',
    contactsAlertRequiredTitle: 'Gardian Obligatoriu',
    contactsAlertRequiredMsg: 'Este obligatoriu să alegi cel puțin 1 gardian de urgență pentru a continua.',
    contactsMaxReachedTitle: 'Număr Maxim Atins',
    contactsMaxReachedMsg: 'Poți desemna maxim 5 gardieni de urgență.',

    // Paywall / Plans Screen
    paywallStepBadge: 'PASUL 4 DIN 5',
    paywallTitle: 'Alege Planul de Protecție',
    paywallSubtitle: 'Activează protecția avansată cu alerte SMS instantanee.',
    paywallPromoTitle: 'Ofertă Specială Activă',
    paywallPromoDesc: '1 an întreg de protecție complet gratuit!',
    paywallEarlyBirdBadge: 'OFERTĂ SPECIALĂ',
    paywallEarlyBirdTitle: 'Plan Special Gratuit',
    paywallEarlyBirdPrice: '$0',
    paywallEarlyBirdPeriod: 'primul an complet gratuit',
    paywallEarlyBirdDesc: 'Alerte nelimitate și protecție activă',
    paywallAnnualBadge: 'STANDARD',
    paywallAnnualTitle: 'Abonament Anual',
    paywallAnnualPrice: '$10',
    paywallAnnualPeriod: '/ an după perioada gratuită',
    paywallAnnualDesc: 'Pentru liniștea deplină a familiei',
    paywallBenefit1: 'Filtrare avansată a apelurilor în timp real',
    paywallBenefit2: 'Alerte SMS de urgență prin Twilio',
    paywallBenefit3: 'Până la 5 gardieni de urgență desemnați',
    paywallBenefit4: 'Simulare apeluri pentru testare și instruire',
    paywallContinueBtn: 'Activează Protecția Gratuită',
    paywallActivating: 'Se activează protecția...',

    // Setup Complete Screen
    setupStepBadge: 'CONFIGURARE FINALIZATĂ',
    setupTitle: 'Ești Protejat!',
    setupSubtitle: 'păzește activ telefonul tău împotriva apelurilor frauduloase.',
    setupSmsHeader: '📱 Stare SMS Gardieni',
    setupSmsSending: 'Se trimite SMS-ul de întâmpinare către gardieni...',
    setupSmsSuccess: 'SMS de întâmpinare trimis cu succes către gardieni!',
    setupSimTitle: 'Simulator Apel de Test',
    setupSimSubtitle: 'Testează cum te avertizează când sună un escroc.',
    setupSimUnknownBtn: 'Simulează Număr Necunoscut 🔔',
    setupSimSafeBtn: 'Simulează Contact Sigur ✅',
    setupGoDashboardBtn: 'Mergi la Panou de Control →',

    // Dashboard Screen
    dashProtectionActive: 'Protecție Activă',
    dashProtectionDesc: 'Scutul monitorizează apelurile în timp real',
    dashGuardiansCount: 'Gardieni desemnați',
    dashSimTitle: '🧪 Simulare Apel în Direct',
    dashSimSubtitle: 'Testează reacția aplicației la apeluri primite:',
    dashSimUnknownBtn: '🚨 Număr Necunoscut',
    dashSimSafeBtn: '✅ Contact Sigur',
    dashRecentCalls: 'Istoric Apeluri Recente',
    dashNoCalls: 'Niciun apel suspect detectat',
    dashNoCallsSubtext: 'Apelurile suspecte vor apărea aici automat.',
    dashSafeCall: 'Contact Sigur',
    dashUnknownCall: 'Număr Necunoscut (Alertă Trimisă)',

    // Guardians Screen
    guardiansTitle: 'Gardieni de Urgență',
    guardiansSubtitle: 'Persoane de încredere alertate prin SMS în caz de fraudă.',
    guardiansAddBtn: '+ Adaugă Gardian',
    guardiansEmptyTitle: 'Niciun gardian salvat',
    guardiansEmptySubtext: 'Adaugă cel puțin un gardian pentru a fi alertat în caz de fraudă.',
    guardiansDeleteConfirmTitle: 'Șterge Gardian',
    guardiansDeleteConfirmMsg: 'Sigur dorești să elimini acest contact din lista de urgență?',
    guardiansDeleteBtn: 'Șterge',
    guardiansCancelBtn: 'Anulează',

    // Settings Screen
    settingsTitle: 'Setări',
    settingsLanguageHeader: '🌐 Limbă / Language',
    settingsLanguageDesc: 'Alege limba aplicației (salvată permanent)',
    settingsPlanHeader: '💳 Abonament de Protecție',
    settingsPlanActive: 'ACTIV',
    settingsAutoRejectHeader: '🛡️ Respingere Automată Numere Necunoscute',
    settingsAutoRejectDesc: 'Respinge automat apelurile care nu se află în agenda telefonică',
    settingsBackendHeader: '☁️ Endpoint Cloud Run Backend',
    settingsBackendSaveBtn: 'Salvează Endpoint',
    settingsBackendSavedAlert: 'Setările au fost salvate cu succes.',
    settingsResetHeader: '🔄 Resetare Configurare',
    settingsResetDesc: 'Reia procesul inițial de onboarding și acordare permisiuni',
    settingsResetBtn: 'Resetează Onboarding',
    settingsResetConfirmTitle: 'Resetare Configurare',
    settingsResetConfirmMsg: 'Ești sigur că vrei să reiei configurarea inițială?',

    // Common
    cancel: 'Anulează',
    back: 'Înapoi',
    save: 'Salvează',
    active: 'Activ',
  },

  en: {
    // Navigation / Tabs
    tabDashboard: 'Shield',
    tabGuardians: 'Guardians',
    tabSettings: 'Settings',

    // Welcome Screen
    welcomeTagline: 'Protect your loved ones from phone scams',
    welcomeFeature1: 'Detect scam calls automatically',
    welcomeFeature2: 'Instant SMS alerts to family',
    welcomeFeature3: 'Always on, zero setup required',
    welcomeActivateBtn: 'Activate Scam Shield',
    welcomeLanguageLabel: 'Language',

    // Permissions Screen
    permStepBadge: 'STEP 2 OF 5',
    permTitle: 'We Need Your Permission',
    permSubtitle: 'To protect you from scams, we need access to:',
    permContactsTitle: 'Contacts',
    permContactsDesc: 'To verify unknown numbers and choose guardians',
    permPhoneTitle: 'Phone & Call Screening',
    permPhoneDesc: 'To detect incoming calls in real-time',
    permNotifTitle: 'Notifications',
    permNotifDesc: 'To alert you when an unknown call is detected',
    permContinueBtn: 'Continue',

    // Contact Picker Screen
    contactsStepBadge: 'STEP 3 OF 5',
    contactsTitle: 'Emergency Contacts',
    contactsSubtitle: 'Who should we alert if a scam is detected?',
    contactsSearchPlaceholder: 'Search your contacts...',
    contactsInfoBanner: 'Only contacts already in your phone can be added',
    contactsSelectedLabel: 'Selected',
    contactsEmptyTitle: 'No contacts found',
    contactsEmptySubtext: 'Make sure contacts permission is granted in Settings.',
    contactsMandatoryNotice: '⚠️ At least 1 emergency guardian is mandatory',
    contactsContinueBtn: 'Select at Least 1 Guardian',
    contactsContinueSelected: 'Continue with',
    contactsAlertRequiredTitle: 'Guardian Required',
    contactsAlertRequiredMsg: 'At least one emergency guardian is mandatory to protect your phone.',
    contactsMaxReachedTitle: 'Maximum Reached',
    contactsMaxReachedMsg: 'You can designate up to 5 emergency guardians.',

    // Paywall / Plans Screen
    paywallStepBadge: 'STEP 4 OF 5',
    paywallTitle: 'Choose Your Protection Plan',
    paywallSubtitle: 'Activate comprehensive scam protection with instant SMS alerts.',
    paywallPromoTitle: 'Early Bird Special Active',
    paywallPromoDesc: '1 full year of protection completely free!',
    paywallEarlyBirdBadge: 'EARLY BIRD',
    paywallEarlyBirdTitle: 'Early Bird Special',
    paywallEarlyBirdPrice: '$0',
    paywallEarlyBirdPeriod: 'first year completely free',
    paywallEarlyBirdDesc: 'Free SMS alerts & call protection',
    paywallAnnualBadge: 'STANDARD',
    paywallAnnualTitle: 'Standard Annual',
    paywallAnnualPrice: '$10',
    paywallAnnualPeriod: '/ year after promo period',
    paywallAnnualDesc: 'Full protection & priority alerts',
    paywallBenefit1: 'Real-time unknown call detection',
    paywallBenefit2: 'Instant SMS alerts to emergency guardians',
    paywallBenefit3: 'Up to 5 designated emergency contacts',
    paywallBenefit4: 'Test call simulation & QA tools',
    paywallContinueBtn: 'Activate Free Protection',
    paywallActivating: 'Activating protection...',

    // Setup Complete Screen
    setupStepBadge: 'SETUP COMPLETE',
    setupTitle: 'You Are Now Protected!',
    setupSubtitle: 'is actively guarding your phone against incoming fraud calls.',
    setupSmsHeader: '📱 Guardian SMS Status',
    setupSmsSending: 'Notifying emergency guardians via SMS...',
    setupSmsSuccess: 'Welcome SMS successfully sent to emergency guardians!',
    setupSimTitle: 'Test Call Simulator',
    setupSimSubtitle: 'Experience how alerts you when a scammer calls.',
    setupSimUnknownBtn: 'Simulate Unknown Call 🔔',
    setupSimSafeBtn: 'Simulate Safe Contact ✅',
    setupGoDashboardBtn: 'Go to Dashboard →',

    // Dashboard Screen
    dashProtectionActive: 'Protection Active',
    dashProtectionDesc: 'Shield is monitoring incoming calls in real-time',
    dashGuardiansCount: 'Emergency Guardians',
    dashSimTitle: '🧪 Live Call Simulation',
    dashSimSubtitle: 'Test how the app responds to incoming calls:',
    dashSimUnknownBtn: '🚨 Unknown Caller',
    dashSimSafeBtn: '✅ Safe Contact',
    dashRecentCalls: 'Recent Calls',
    dashNoCalls: 'No suspicious calls detected',
    dashNoCallsSubtext: 'Incoming screened calls will appear here automatically.',
    dashSafeCall: 'Safe Contact',
    dashUnknownCall: 'Unknown Caller (Alert Dispatched)',

    // Guardians Screen
    guardiansTitle: 'Emergency Guardians',
    guardiansSubtitle: 'Trusted family members alerted via SMS during scam calls.',
    guardiansAddBtn: '+ Add Guardian',
    guardiansEmptyTitle: 'No guardians designated',
    guardiansEmptySubtext: 'Add emergency contacts to notify them when scam calls occur.',
    guardiansDeleteConfirmTitle: 'Remove Guardian',
    guardiansDeleteConfirmMsg: 'Are you sure you want to remove this emergency contact?',
    guardiansDeleteBtn: 'Remove',
    guardiansCancelBtn: 'Cancel',

    // Settings Screen
    settingsTitle: 'Settings',
    settingsLanguageHeader: '🌐 Language / Limbă',
    settingsLanguageDesc: 'Choose app language (saved permanently)',
    settingsPlanHeader: '💳 Protection Subscription',
    settingsPlanActive: 'ACTIVE',
    settingsAutoRejectHeader: '🛡️ Auto-Reject Unknown Callers',
    settingsAutoRejectDesc: 'Automatically block calls from numbers not in your contacts',
    settingsBackendHeader: '☁️ Cloud Run Backend Endpoint',
    settingsBackendSaveBtn: 'Save Endpoint',
    settingsBackendSavedAlert: 'Settings saved successfully.',
    settingsResetHeader: '🔄 Reset Onboarding',
    settingsResetDesc: 'Re-run the initial onboarding and permissions flow',
    settingsResetBtn: 'Reset Onboarding',
    settingsResetConfirmTitle: 'Reset Setup',
    settingsResetConfirmMsg: 'Are you sure you want to re-run the onboarding guide?',

    // Common
    cancel: 'Cancel',
    back: 'Back',
    save: 'Save',
    active: 'Active',
  },
};
