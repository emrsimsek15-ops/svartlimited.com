export const tr = {
  app: { name: 'Da Vinci', tagline: 'İşlem günlüğü' },
  nav: { dashboard: 'Panel', trades: 'İşlemler', calendar: 'Takvim', reports: 'Raporlar', settings: 'Ayarlar', debug: 'Hata ayıklama', collapse: 'Kenar çubuğunu daralt', expand: 'Kenar çubuğunu genişlet' },
  common: {
    close: 'Kapat', save: 'Kaydet', saved: 'Kaydedildi', cancel: 'Vazgeç', delete: 'Sil', search: 'Ara', all: 'Tümü', none: 'Yok', loading: 'Yükleniyor…',
    trades: 'işlem', trade: 'işlem', tradesCap: 'İşlemler', days: 'gün', today: 'Bugün', from: 'Başlangıç', to: 'Bitiş', apply: 'Uygula', reset: 'Sıfırla',
    buy: 'Alış', sell: 'Satış', long: 'Long', short: 'Short', win: 'Kazanç', loss: 'Kayıp', breakeven: 'Başabaş', open: 'Açık', closed: 'Kapalı', yes: 'Evet', no: 'Hayır',
  },
  periods: { week: 'Bu hafta', month: 'Bu ay', last30: 'Son 30 gün', ytd: 'Yılbaşından beri', all: 'Tümü', custom: 'Özel' },
  accounts: { all: 'Tüm hesaplar', label: 'Hesap', mixedCurrency: 'Hesaplar farklı para birimlerinde; toplamlar ilk hesabın para birimiyle gösteriliyor.' },
  kpi: {
    net: 'Net K/Z', winRate: 'Kazanma oranı', profitFactor: 'Kâr faktörü', avgWinLoss: 'Ort. kazanç / kayıp', expectancy: 'Beklenti', maxDrawdown: 'Maks. düşüş',
    perTrade: 'işlem başına', winsLosses: '{w} kazanç · {l} kayıp',
  },
  dashboard: { title: 'Panel', equity: 'Kümülatif net K/Z', daily: 'Günlük net K/Z', thisMonth: 'Bu ay', recent: 'Son işlemler', viewAll: 'Tümünü gör', empty: 'Henüz işlem yok', emptyHint: 'Ayarlar’dan cTrader’ı bağlayın veya örnek veriyi açın.', openSettings: 'Ayarlara git', enableDemo: 'Örnek veriyi aç' },
  calendar: {
    title: 'Takvim', today: 'Bugün', prev: 'Önceki ay', next: 'Sonraki ay', month: 'Ay', year: 'Yıl', week: 'Hafta', weekShort: 'H',
    netMonth: 'Aylık net', tradingDays: 'İşlem günü', greenRed: 'Yeşil / kırmızı gün', best: 'En iyi gün', worst: 'En kötü gün', weekTotals: 'Haftalık toplamlar',
    noTrades: 'Bu gün işlem yok', dayNote: 'Gün notu', dayNotePlaceholder: 'Bugün piyasayı nasıl okudun? Ne iyi gitti, ne geliştirilebilir?', pickMonth: 'Ay ve yıl seç', winRate: 'Kazanma', tradesN: '{n} işlem', daysN: '{n} gün',
  },
  trades: {
    title: 'İşlemler', date: 'Tarih', symbol: 'Sembol', side: 'Yön', volume: 'Hacim', duration: 'Süre', net: 'Net K/Z', tags: 'Etiketler', status: 'Durum',
    filters: 'Filtreler', allSymbols: 'Tüm semboller', allSides: 'Tüm yönler', allOutcomes: 'Tümü', allTags: 'Tüm etiketler', searchPlaceholder: 'Sembol, etiket, not, pozisyon no…',
    sortBy: 'Sırala', sortDate: 'Tarih', sortNet: 'Net K/Z', sortDuration: 'Süre', sortVolume: 'Hacim', count: '{n} işlem', noResults: 'Filtrelere uyan işlem yok', clearFilters: 'Filtreleri temizle', includeOpen: 'Açık pozisyonlar',
  },
  detail: {
    title: 'İşlem detayı', gross: 'Brüt K/Z', swap: 'Swap', commission: 'Komisyon', fee: 'Dönüşüm ücreti', net: 'Net K/Z', entry: 'Giriş', exit: 'Çıkış', opened: 'Açılış', closedAt: 'Kapanış', duration: 'Süre', volume: 'Hacim', position: 'Pozisyon',
    partials: '{n} kısmi kapanış', journal: 'Günlük', note: 'Not', notePlaceholder: 'Neden girdin? Plan neydi? Ne öğrendin? (Markdown desteklenir)', tags: 'Etiketler', addTag: 'Etiket ekle', setup: 'Setup', setupPlaceholder: 'ör. Breakout', rating: 'Değerlendirme', mistakes: 'Hatalar', addMistake: 'Hata ekle', openPosition: 'Açık pozisyon — net K/Z kapanışta kesinleşir.', unrealizedNote: 'Gösterilen tutarlar şimdiye kadar gerçekleşen kısmi kapanışlardır.',
  },
  reports: { title: 'Raporlar', bySymbol: 'Sembole göre', byWeekday: 'Haftanın gününe göre', byHour: 'Saate göre (açılış)', byTag: 'Etikete göre', bySetup: 'Setup’a göre', longShort: 'Long ve short', noTags: 'Henüz etiketli işlem yok', trades: 'işlem' },
  weekdays: { short: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'], narrow: ['P', 'P', 'S', 'Ç', 'P', 'C', 'C'], long: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'] },
  months: { long: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'], short: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'] },
  settings: {
    title: 'Ayarlar',
    connection: 'cTrader bağlantısı', connectionHint: 'Kimlik bilgileri ve token’lar yalnızca bu cihazda (IndexedDB) saklanır.',
    clientId: 'Client ID', clientSecret: 'Client Secret', environment: 'Ortam', demo: 'Demo', live: 'Canlı', redirectUri: 'Yönlendirme URI’si (Open API uygulamanıza ekleyin)', copy: 'Kopyala', copied: 'Kopyalandı',
    connect: 'cTrader ile bağlan', manualTokens: 'Token’ları elle gir', manualHint: 'Open API portalındaki Playground’da ürettiğiniz access ve refresh token’ı yapıştırın.', accessToken: 'Access token', refreshToken: 'Refresh token', saveTokens: 'Token’ları kaydet',
    connected: 'Bağlı', notConnected: 'Bağlı değil', tokenExpires: 'Token geçerlilik', disconnect: 'Bağlantıyı kes ve kimlik bilgilerini sil', disconnectConfirm: 'Kimlik bilgileri ve token’lar bu cihazdan silinecek. İşlem verileri kalır. Devam edilsin mi?',
    accounts: 'Hesaplar', loadAccounts: 'Hesapları getir', noAccounts: 'Henüz hesap yok', accountEnabled: 'Senkronize et', removeAccount: 'Hesabı ve verilerini sil',
    sync: 'Senkronizasyon', syncNow: 'Şimdi senkronize et', fullResync: 'Tüm geçmişi yeniden çek', lastSynced: 'Son senkronizasyon', never: 'Hiç', syncing: 'Senkronize ediliyor…', live_: 'Canlı güncellemeler açık',
    preferences: 'Tercihler', timezone: 'Saat dilimi', timezoneHint: 'İşlemler kapanış saatine göre bu saat dilimindeki güne atanır.', weekStart: 'Hafta başlangıcı', monday: 'Pazartesi', sunday: 'Pazar', saturday: 'Cumartesi', showWinRate: 'Takvimde kazanma oranını göster',
    demoData: 'Örnek veri', demoHint: '6 aylık gerçekçi örnek veri (~300 işlem). Gerçek hesaplarınızdan ayrı tutulur.',
    data: 'Veri', export: 'Yedeği dışa aktar (JSON)', import: 'Yedeği içe aktar', importDone: 'Yedek içe aktarıldı', importFailed: 'Geçersiz yedek dosyası', exportHint: 'Yedeğe kimlik bilgileri ve token’lar dahil edilmez.',
    wipe: 'Tüm verileri sil', wipeConfirm: 'Bu cihazdaki TÜM veriler (işlemler, günlük, ayarlar, kimlik bilgileri) silinecek. Geri alınamaz. Devam edilsin mi?',
    debug: 'Hata ayıklama görünümü', debugHint: 'Ham deal’leri hesaplanan net değerle yan yana gösterir.', version: 'Sürüm',
    oauthCorsFailed: 'Token değişimi tarayıcıda engellendi (CORS). Lütfen token’ları Playground’dan alıp elle girin.', oauthStateMismatch: 'OAuth durumu eşleşmedi, lütfen tekrar deneyin.', oauthSuccess: 'cTrader hesabına bağlanıldı',
  },
  sync: {
    connecting: 'Bağlanıyor…', authApp: 'Uygulama doğrulanıyor…', authAccount: 'Hesap doğrulanıyor…', symbols: 'Semboller alınıyor…', positions: 'Açık pozisyonlar alınıyor…', history: 'Geçmiş alınıyor…', cashflow: 'Para hareketleri alınıyor…', done: 'Güncel', idle: 'Beklemede',
    error: 'Senkronizasyon hatası', offline: 'Çevrimdışı — yerel veri gösteriliyor', reconnecting: 'Yeniden bağlanıyor…', progress: '{p}%',
  },
  errors: {
    CH_CLIENT_AUTH_FAILURE: 'Client ID veya Client Secret hatalı.', CH_ACCESS_TOKEN_INVALID: 'Access token geçersiz veya süresi dolmuş.', CH_CLIENT_NOT_AUTHENTICATED: 'Uygulama doğrulanmadı.', ALREADY_LOGGED_IN: 'Hesap zaten doğrulanmış.',
    BLOCKED_PAYLOAD_TYPE: 'İstek limiti aşıldı, bekleniyor…', TIMEOUT: 'Sunucu yanıt vermedi.', NETWORK: 'Bağlantı kurulamadı.', NO_CREDENTIALS: 'Önce Ayarlar’dan Client ID / Secret ve token girin.', UNKNOWN: 'Bilinmeyen hata',
  },
  debug: { title: 'Hata ayıklama', hint: 'Her pozisyonun ham deal’leri ve hesaplanan net değer. cTrader geçmişindeki “Net” ile karşılaştırın.', deals: 'Deal’ler', balanceCheck: 'Bakiye zinciri', ok: 'Tutarlı', mismatch: 'Uyuşmazlık', dealCommission: 'Σ deal.commission', cpdCommission: 'Σ closePositionDetail.commission', limit: 'İlk {n} pozisyon gösteriliyor' },
} as const;

type Widen<T> = T extends string ? string : T extends readonly (infer U)[] ? readonly Widen<U>[] : { readonly [K in keyof T]: Widen<T[K]> };
export type Strings = Widen<typeof tr>;
