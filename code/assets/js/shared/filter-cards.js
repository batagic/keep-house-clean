function filterCards(tag, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.reward-card').forEach(card => {
    const tags = card.dataset.tag || '';
    card.style.display = (tag === 'all' || tags.includes(tag)) ? 'flex' : 'none';
  });
}
