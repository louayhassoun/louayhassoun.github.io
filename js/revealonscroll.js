function revealOnScroll() {
    const revealElements = document.querySelectorAll('.reveal');
    const options = { threshold: 0.1 };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            } else {
                entry.target.classList.remove('active');
            }
        });
    }, options);

    revealElements.forEach(el => observer.observe(el));
}
export { revealOnScroll };