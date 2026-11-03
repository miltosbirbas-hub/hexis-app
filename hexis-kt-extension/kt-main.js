// Τρέχει στη σελίδα του Κτηματολογίου (MAIN world): όταν το πρόσθετο περιμένει αρχείο,
// ένα PDF που θα άνοιγε σε νέο παράθυρο στέλνεται για αποθήκευση με σωστό όνομα.
(() => {
  const open0 = window.open;
  window.open = function (url, ...rest) {
    try {
      if (document.documentElement.dataset.hxCapture === "1" && url) {
        window.postMessage({ src: "hx-main", url: String(url) }, location.origin);
        return null;
      }
    } catch (e) {}
    return open0.call(this, url, ...rest);
  };
})();
