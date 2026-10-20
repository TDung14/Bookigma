const GA_ID = import.meta.env.VITE_GA_ID;

/**
 * Gắn Google Analytics 4. Chỉ chạy trên bản build production và khi có VITE_GA_ID,
 * nên chạy local (npm run dev) không bị tính vào số liệu.
 * Chuyển trang trong React Router được GA4 tự ghi nhận (Enhanced measurement).
 */
export function initAnalytics() {
  if (!GA_ID || !import.meta.env.PROD) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);
}
