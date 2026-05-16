import { I18n } from 'i18n-js';

const fr = {
  tabs: { today: 'Aujourd\'hui', appts: 'RDV', clients: 'Clients', revenue: 'Revenus', ai: 'IA' },
  today: { title: 'Aujourd\'hui', empty: 'Aucun RDV programmé.' },
  ai: {
    title: 'AI Studio',
    sub: 'Génère du contenu en 1 tap.',
    caption: 'Caption Instagram',
    story: 'Story créneaux',
    reminder: 'Rappel SMS',
    generate: 'Générer',
    generating: 'Génération…',
    copy: 'Copier',
  },
};

const en: typeof fr = {
  tabs: { today: 'Today', appts: 'Appts', clients: 'Clients', revenue: 'Revenue', ai: 'AI' },
  today: { title: 'Today', empty: 'No appointments scheduled.' },
  ai: {
    title: 'AI Studio',
    sub: 'Generate content in 1 tap.',
    caption: 'Instagram caption',
    story: 'Slots story',
    reminder: 'SMS reminder',
    generate: 'Generate',
    generating: 'Generating…',
    copy: 'Copy',
  },
};

export const i18n = new I18n({ fr, en });
i18n.defaultLocale = 'fr';
i18n.locale = 'fr';
i18n.enableFallback = true;
