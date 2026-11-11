(() => {
  const canonical = document.querySelector('link[rel="canonical"]')?.href;
  const feedback = document.getElementById('share-feedback');
  const manual = document.getElementById('manual-copy');

  async function copy(value, message) {
    try {
      await navigator.clipboard.writeText(value);
      feedback.textContent = message;
      manual.hidden = true;
    } catch {
      manual.hidden = false;
      manual.value = value;
      manual.focus();
      manual.select();
      feedback.textContent = 'Сонгосон текстийг хуулж аваарай.';
    }
  }

  for (const button of document.querySelectorAll('button[data-action]')) {
    button.hidden = false;
    button.addEventListener('click', async () => {
      switch (button.dataset.action) {
        case 'print':
          window.print();
          break;
        case 'code':
          await copy(document.getElementById('offer-code').textContent, 'Кодыг хууллаа.');
          break;
        case 'share':
          if (navigator.share) {
            try {
              await navigator.share({title: document.title, url: canonical});
              return;
            } catch (error) {
              if (error.name === 'AbortError') return;
            }
          }
          await copy(canonical, 'Саналын холбоосыг хууллаа.');
      }
    });
  }
})();
