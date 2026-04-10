import { useTranslation } from 'react-i18next';

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const isFr = i18n.language === 'fr';

  return (
    <button
      onClick={() => i18n.changeLanguage(isFr ? 'en' : 'fr')}
      className="px-2 py-1 rounded-lg text-sm font-medium bg-muted hover:bg-muted/80 text-foreground transition-colors"
      title={isFr ? 'Switch to English' : 'Passer en français'}
    >
      {isFr ? '🇬🇧' : '🇫🇷'}
    </button>
  );
}
